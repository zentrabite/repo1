// ─── POST /api/automations/run ────────────────────────────────────────────────
// Two ways to invoke this:
//
//   1. Manually from the dashboard UI:
//        POST /api/automations/run   body: { businessId }
//      Runs the rules for the logged-in user's business only. The business is
//      checked against the login (requireBusiness), not trusted from the body.
//
//   2. Daily from Vercel cron (vercel.json, GET with the secret):
//        GET /api/automations/run    header: Authorization: Bearer $CRON_SECRET
//      Iterates EVERY business with active rules. Rejects without the secret.
//      This path is let through the login gate in proxy.ts.
//
// Spam Act: only customers who opted in to marketing and haven't opted out
// are contacted. Every text names the business and says "Reply STOP". Every
// email goes through sendMarketingEmail, which checks consent again right
// before sending and adds the unsubscribe link and headers.
//
// The runner processes `winback_rules` (Zentra Rewards rules from the dashboard) AND
// the legacy `campaigns` table so old data keeps working while we migrate.
// Offers are real: each message gets its own one-use code in its link
// (lib/offer-codes.ts), and checkout takes it off. A rule whose offer can't
// be used online (free item, a shop not taking payments, free delivery from
// a shop that doesn't deliver) isn't sent at all. This is the only sender of
// win-back messages. The old Supabase edge function is switched off (025).
//
// Channel dispatch:
//   • sms   → Twilio REST
//   • email → Resend (via sendMarketingEmail in lib/email.ts)
//   • push  → no-op for now (logged so UI shows it tried)
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-server";
import { sendMarketingEmail } from "@/lib/email";
import { MANAGER_ROLES, requireBusiness } from "@/lib/request-business";
import { checkSmsAllowance, sendTwilioSms, withSenderAndOptOut } from "@/lib/sms";
import { orderUrl } from "@/lib/tenant";
import { issueCode, offerSubject, readOffer, winbackMessage } from "@/lib/offer-codes";
import { readDeliveryRules } from "@/lib/own-delivery";
import { readOrderingRules } from "@/lib/pickup-times";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RunResult = {
  business_id: string;
  rule_id:     string | null;
  rule_name:   string;
  customer_id: string;
  customer:    string;
  channel:     string;
  status:      string;
};

export async function POST(req: Request) {
  try {
    // Parse body (optional — cron invocations send none)
    let body: { businessId?: string } = {};
    try { body = await req.json(); } catch { /* no body, fine */ }

    // Cron auth: a matching CRON_SECRET means "run every business".
    // Anything else must be a logged-in user running their own business.
    const authHeader = req.headers.get("authorization") ?? "";
    const cronSecret = process.env.CRON_SECRET;
    const isCron = Boolean(cronSecret) && authHeader === `Bearer ${cronSecret}`;

    let manualBusinessId: string | null = null;
    if (!isCron) {
      const auth = await requireBusiness(body.businessId, { roles: MANAGER_ROLES });
      if (!auth.ok) return auth.response;
      manualBusinessId = auth.businessId;
    }

    const db = createAdminClient();
    const now = new Date();

    // Target businesses
    let businessIds: string[] = [];
    if (manualBusinessId) {
      businessIds = [manualBusinessId];
    } else {
      // Everyone with at least one active rule (or active campaign)
      const [rulesRes, campRes] = await Promise.all([
        db.from("winback_rules").select("business_id").eq("is_active", true),
        db.from("campaigns").select("business_id").eq("active", true),
      ]);
      const set = new Set<string>();
      (rulesRes.data ?? []).forEach((r: { business_id: string }) => set.add(r.business_id));
      (campRes.data  ?? []).forEach((r: { business_id: string }) => set.add(r.business_id));
      businessIds = [...set];
    }

    if (businessIds.length === 0) {
      return NextResponse.json({ message: "No businesses with active rules", sent: 0 });
    }

    const results: RunResult[] = [];
    let totalSent = 0;

    for (const businessId of businessIds) {
      const perBusiness = await runForBusiness(db, businessId, now);
      results.push(...perBusiness.results);
      totalSent += perBusiness.sent;
    }

    return NextResponse.json({ success: true, sent: totalSent, processed: businessIds.length, results });

  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[automations/run]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// Let GET also trigger (Vercel cron uses GET by default on free tier)
export async function GET(req: Request) {
  return POST(req);
}

// ─── Per-business runner ──────────────────────────────────────────────────────

const DEFAULT_TEMPLATE = "Hey {name}, we miss you at {business}. Here's {offer} on your next online order: {link}";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function runForBusiness(db: any, businessId: string, now: Date): Promise<{ sent: number; results: RunResult[] }> {
  const results: RunResult[] = [];
  let sent = 0;

  // Business (for {business} placeholder + storefront URL)
  const { data: business } = await db
    .from("businesses")
    .select("id, name, subdomain, settings, stripe_account_id, stripe_charges_enabled")
    .eq("id", businessId)
    .single();

  const businessName = business?.name ?? "your favourite spot";
  // Link to the restaurant's ordering page at name.zentrabite.com/order.
  const storeUrl = business?.subdomain ? orderUrl(business.subdomain) : "";
  const settings = (business?.settings ?? null) as Record<string, unknown> | null;
  // An offer is only sent when the customer can use it: the shop takes
  // online payments, and for free delivery, it delivers.
  const takingOrders = Boolean(storeUrl && business?.stripe_account_id && business?.stripe_charges_enabled);
  const deliveryOn = readDeliveryRules(settings).enabled;
  const timezone = readOrderingRules(settings).timezone;

  // Rules + legacy campaigns
  const [rulesRes, campaignsRes, customersRes] = await Promise.all([
    db.from("winback_rules").select("*").eq("business_id", businessId).eq("is_active", true),
    db.from("campaigns").select("*").eq("business_id", businessId).eq("active", true),
    db.from("customers")
      .select("id, name, phone, email, last_order_date")
      .eq("business_id", businessId)
      .eq("opted_out", false)
      .eq("marketing_opt_in", true),
  ]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rules: any[] = rulesRes.data ?? [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const legacyCampaigns: any[] = campaignsRes.data ?? [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const customers: any[] = customersRes.data ?? [];

  if (customers.length === 0) return { sent, results };
  if (rules.length === 0 && legacyCampaigns.length === 0) return { sent, results };

  // Look back 120 days for cooldown checks (longest typical cooldown is ~90)
  const cooldownFrom = new Date(now);
  cooldownFrom.setDate(cooldownFrom.getDate() - 120);

  const { data: recentLogs } = await db
    .from("sms_logs")
    .select("customer_id, rule_id, campaign_id, sent_at")
    .eq("business_id", businessId)
    .gte("sent_at", cooldownFrom.toISOString());

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const logs: any[] = recentLogs ?? [];

  // ── Winback rules ────────────────────────────────────────────────────────
  for (const rule of rules) {
    const offer = readOffer(rule.offer_type, rule.offer_value);
    const notSent = !offer ? "its offer can't be used online"
      : !takingOrders ? "the shop isn't taking online payments"
      : offer.type === "free_delivery" && !deliveryOn ? "the shop doesn't deliver"
      : null;
    if (notSent || !offer) {
      console.warn(`[automations/run] ${businessId} rule ${rule.id} not sent, ${notSent}`);
      continue;
    }

    for (const customer of customers) {
      if (!customer.last_order_date) continue;

      const lastOrder = new Date(customer.last_order_date);
      const daysSince = daysBetween(lastOrder, now);
      if (daysSince < (rule.inactive_days ?? 0)) continue;

      // Recipient check per channel
      const channel = (rule.channel ?? "sms") as string;
      const recipient = channel === "email" ? customer.email : customer.phone;
      if (!recipient) continue;

      // Cooldown — "did we already send this rule to this customer recently?"
      const lastSent = logs.find(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (l: any) => l.customer_id === customer.id && l.rule_id === rule.id,
      );
      if (lastSent) {
        const daysSinceLast = daysBetween(new Date(lastSent.sent_at), now);
        if (daysSinceLast < (rule.cooldown_days ?? 30)) continue;
      }

      // Push isn't wired up yet. Logged so the page shows it tried.
      if (channel !== "sms" && channel !== "email") {
        await logSend(db, { businessId, customerId: customer.id, ruleId: rule.id, channel, recipient, message: "", status: "skipped", providerId: null });
        results.push({ business_id: businessId, rule_id: rule.id, rule_name: rule.name, customer_id: customer.id, customer: customer.name, channel, status: "skipped" });
        continue;
      }

      if (channel === "sms") {
        const allowance = await checkSmsAllowance(db, businessId, settings, { skipRate: true });
        if (!allowance.ok) {
          console.warn(`[automations/run] ${businessId} ${allowance.reason}`);
          break;
        }
      }

      // The customer's own code. No code, no message: it would promise a
      // discount checkout won't give. Tried again on the next run.
      const issued = await issueCode(db, { businessId, customerId: customer.id, ruleId: rule.id, offer, timezone, now });
      if (!issued) continue;

      const message = winbackMessage(rule.template || DEFAULT_TEMPLATE, {
        name:     (customer.name ?? "").split(" ")[0] || "there",
        business: businessName,
        shop:     businessName,
      }, { offer, link: `${storeUrl}?code=${issued.code}&src=winback`, code: issued.code, ends: issued.ends });

      let status = "sent";
      let providerId: string | null = null;
      let finalMessage = message;
      if (channel === "sms") {
        finalMessage = withSenderAndOptOut(message, businessName);
        const out = await sendTwilioSms(recipient, finalMessage);
        status = out.status;
        providerId = out.sid;
      } else {
        const out = await sendMarketingEmail({
          db, businessId, businessName, customerId: customer.id, to: recipient, subject: offerSubject(offer, businessName), text: message,
        });
        status = out.ok ? "sent" : (out.skipped ? "skipped" : "failed");
        providerId = out.ok ? out.id : null;
      }

      if (status === "sent") sent++;
      await logSend(db, { businessId, customerId: customer.id, ruleId: rule.id, channel, recipient, message: finalMessage, status, providerId });
      results.push({ business_id: businessId, rule_id: rule.id, rule_name: rule.name, customer_id: customer.id, customer: customer.name, channel, status });
    }
  }

  // ── Legacy campaigns (kept for back-compat; SMS only) ───────────────────
  // discount_amount is dollars off, so it gets a code the same way. A
  // campaign with no discount is a plain "we miss you" text.
  for (const campaign of legacyCampaigns) {
    const offer = readOffer("dollar", campaign.discount_amount);
    if (offer && !takingOrders) {
      console.warn(`[automations/run] ${businessId} campaign ${campaign.id} not sent, the shop isn't taking online payments`);
      continue;
    }

    for (const customer of customers) {
      if (!customer.phone || !customer.last_order_date) continue;

      const lastOrder = new Date(customer.last_order_date);
      const daysSince = daysBetween(lastOrder, now);
      if (daysSince < (campaign.trigger_days ?? 0)) continue;

      const lastSent = logs.find(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (l: any) => l.customer_id === customer.id && l.campaign_id === campaign.id,
      );
      if (lastSent) {
        const daysSinceLast = daysBetween(new Date(lastSent.sent_at), now);
        if (daysSinceLast < (campaign.cooldown_days ?? 30)) continue;
      }

      const allowance = await checkSmsAllowance(db, businessId, settings, { skipRate: true });
      if (!allowance.ok) {
        console.warn(`[automations/run] ${businessId} ${allowance.reason}`);
        break;
      }

      const issued = offer ? await issueCode(db, { businessId, customerId: customer.id, campaignId: campaign.id, offer, timezone, now }) : null;
      if (offer && !issued) continue;

      const link = issued ? `${storeUrl}?code=${issued.code}&src=winback` : storeUrl ? `${storeUrl}?src=winback` : "";
      const message = withSenderAndOptOut(winbackMessage(campaign.template ?? "Hey {name}, we miss you! Come back for ${discount} off your next order.", {
        name:     (customer.name ?? "").split(" ")[0] || "there",
        discount: String(campaign.discount_amount ?? 0),
        shop:     businessName,
        business: businessName,
      }, { offer, link, code: issued?.code, ends: issued?.ends }), businessName);

      const out = await sendTwilioSms(customer.phone, message);
      if (out.status === "sent") sent++;

      await logSend(db, { businessId, customerId: customer.id, campaignId: campaign.id, channel: "sms", recipient: customer.phone, message, status: out.status, providerId: out.sid });
      results.push({
        business_id: businessId,
        rule_id:     null,
        rule_name:   campaign.name ?? campaign.type,
        customer_id: customer.id,
        customer:    customer.name,
        channel:     "sms",
        status:      out.status,
      });
    }
  }

  return { sent, results };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function logSend(db: any, l: {
  businessId: string; customerId: string; ruleId?: string | null; campaignId?: string | null;
  channel: string; recipient: string; message: string; status: string; providerId: string | null;
}) {
  await db.from("sms_logs").insert({
    business_id: l.businessId,
    customer_id: l.customerId,
    rule_id:     l.ruleId ?? null,
    campaign_id: l.campaignId ?? null,
    channel:     l.channel,
    recipient:   l.recipient,
    message:     l.message,
    status:      l.status,
    twilio_sid:  l.channel === "sms" ? l.providerId : null,
  });
}

function daysBetween(a: Date, b: Date): number {
  return Math.floor(Math.abs(b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));
}
