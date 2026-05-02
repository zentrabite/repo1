// ─── POST /api/automations/run ────────────────────────────────────────────────
// Two ways to invoke this:
//
//   1. Manually from the dashboard UI:
//        POST /api/automations/run   body: { businessId }
//      Runs the rules for a single business. No auth required (the UI is
//      already behind Supabase auth).
//
//   2. Daily from Vercel cron:
//        POST /api/automations/run   header: Authorization: Bearer $CRON_SECRET
//      Iterates EVERY business with active rules. Rejects without the secret.
//
// The runner processes `winback_rules` (Zentra Rewards rules from the dashboard) AND
// the legacy `campaigns` table so old data keeps working while we migrate.
// Channel dispatch:
//   • sms   → Twilio REST
//   • email → Resend (via lib/email.ts)
//   • push  → no-op for now (logged so UI shows it tried)
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-server";
import { sendEmail } from "@/lib/email";

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

    // Cron auth: if no businessId, require CRON_SECRET
    const authHeader = req.headers.get("authorization") ?? "";
    const cronSecret = process.env.CRON_SECRET;
    const isCron = !body.businessId;

    if (isCron) {
      if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: "unauthorized" }, { status: 401 });
      }
    }

    const db = createAdminClient();
    const now = new Date();

    // Target businesses
    let businessIds: string[] = [];
    if (body.businessId) {
      businessIds = [body.businessId];
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function runForBusiness(db: any, businessId: string, now: Date): Promise<{ sent: number; results: RunResult[] }> {
  const results: RunResult[] = [];
  let sent = 0;

  // Business (for {business} placeholder + storefront URL)
  const { data: business } = await db
    .from("businesses")
    .select("id, name, subdomain, settings")
    .eq("id", businessId)
    .single();

  const businessName = business?.name ?? "your favourite spot";
  const storeUrl = business?.subdomain
    ? `https://${business.subdomain}.${process.env.NEXT_PUBLIC_STOREFRONT_HOST ?? "shop.zentrabite.com.au"}`
    : "";

  // Rules + legacy campaigns
  const [rulesRes, campaignsRes, customersRes] = await Promise.all([
    db.from("winback_rules").select("*").eq("business_id", businessId).eq("is_active", true),
    db.from("campaigns").select("*").eq("business_id", businessId).eq("active", true),
    db.from("customers")
      .select("id, name, phone, email, last_order_date")
      .eq("business_id", businessId)
      .eq("opted_out", false),
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

      const offerLabel = formatOffer(rule);
      const message = render(rule.template ?? "Hey {name}, we miss you! {offer} on your next order at {business}. {link}", {
        name:     (customer.name ?? "").split(" ")[0] ?? "there",
        offer:    offerLabel,
        business: businessName,
        link:     storeUrl,
      });

      let status = "sent";
      let providerId: string | null = null;

      if (channel === "sms") {
        const out = await sendSms(recipient, message);
        status = out.status;
        providerId = out.sid;
      } else if (channel === "email") {
        const subject = `${offerLabel} at ${businessName}`;
        const out = await sendEmail({ to: recipient, subject, text: message });
        status = out.ok ? "sent" : (out.skipped ? "skipped" : "failed");
        providerId = out.ok ? out.id : null;
      } else {
        // push — not wired yet
        status = "skipped";
      }

      if (status === "sent") sent++;

      // Log it
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (db.from("sms_logs") as any).insert({
        business_id: businessId,
        customer_id: customer.id,
        rule_id:     rule.id,
        campaign_id: null,
        channel,
        recipient,
        message,
        status,
        twilio_sid:  channel === "sms" ? providerId : null,
      });

      results.push({
        business_id: businessId,
        rule_id:     rule.id,
        rule_name:   rule.name,
        customer_id: customer.id,
        customer:    customer.name,
        channel,
        status,
      });
    }
  }

  // ── Legacy campaigns (kept for back-compat; SMS only) ───────────────────
  for (const campaign of legacyCampaigns) {
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

      const message = render(campaign.template ?? "Hey {name}, we miss you! Come back for ${discount} off your next order.", {
        name:     (customer.name ?? "").split(" ")[0] ?? "there",
        discount: String(campaign.discount_amount ?? 0),
      });

      const out = await sendSms(customer.phone, message);
      if (out.status === "sent") sent++;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (db.from("sms_logs") as any).insert({
        business_id: businessId,
        customer_id: customer.id,
        campaign_id: campaign.id,
        rule_id:     null,
        channel:     "sms",
        recipient:   customer.phone,
        message,
        status:      out.status,
        twilio_sid:  out.sid,
      });

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

function daysBetween(a: Date, b: Date): number {
  return Math.floor(Math.abs(b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));
}

function render(tpl: string, vars: Record<string, string>): string {
  return tpl.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? "");
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function formatOffer(rule: any): string {
  const t = rule.offer_type as string;
  const v = rule.offer_value as number;
  if (t === "percent") return `${v}% off`;
  if (t === "dollar")  return `$${v} off`;
  if (t === "free_delivery") return "Free delivery";
  if (t === "free_item")     return "A free item";
  return "A special offer";
}

async function sendSms(to: string, body: string): Promise<{ status: string; sid: string | null }> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken  = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_PHONE_NUMBER;

  if (!accountSid || !authToken || !fromNumber) {
    console.warn("[automations/run] Twilio not configured — SMS skipped");
    return { status: "skipped", sid: null };
  }

  try {
    const res = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
      {
        method:  "POST",
        headers: {
          "Authorization": `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`,
          "Content-Type":  "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({ To: to, From: fromNumber, Body: body }).toString(),
      },
    );
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { status: "failed", sid: null };
    return { status: "sent", sid: data.sid ?? null };
  } catch {
    return { status: "failed", sid: null };
  }
}
