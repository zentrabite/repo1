// ═══════════════════════════════════════════════════════════════════════════
// ZentraBite — Win-Back Edge Function
// Runs daily at 9:00 AM ACST via Supabase cron (scheduled in migration 011).
// Only texts customers with marketing_opt_in = true and opted_out = false
// (columns added in migration 015). Redeploy after merging:
//   supabase functions deploy win-back
//
// Deploy: supabase functions deploy win-back
//
// Reads from `winback_rules` (the /biteback CRM page) — not campaigns.
//
// Guards (the cron job calls this with the public anon key, so anyone with
// that key can call it too):
//   • one run per day, claimed in edge_function_runs (migration 017). A
//     second call the same day stops straight away.
//   • the same monthly text cap per business as the CRM (lib/sms.ts):
//     settings.sms_monthly_cap, default 1000 sent texts a month.
//   • only SMS rules. Email rules are sent by the CRM's /api/automations/run,
//     which adds the unsubscribe link.
// Apply migration 017 before redeploying. Without it the run guard is off
// (logged) and everything else still works.
// ═══════════════════════════════════════════════════════════════════════════

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL         = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const TWILIO_ACCOUNT_SID   = Deno.env.get("TWILIO_ACCOUNT_SID")!;
const TWILIO_AUTH_TOKEN    = Deno.env.get("TWILIO_AUTH_TOKEN")!;
const TWILIO_PHONE_NUMBER  = Deno.env.get("TWILIO_PHONE_NUMBER")!;

const db = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Same default as DEFAULT_SMS_MONTHLY_CAP in apps/dashboard/lib/sms.ts.
const DEFAULT_SMS_MONTHLY_CAP = 1000;

// ─── Guards ───────────────────────────────────────────────────────────────────

/** True if this is the first run today (UTC). False means stop. */
async function claimDailyRun(functionName: string): Promise<boolean> {
  const runDate = new Date().toISOString().slice(0, 10);
  const { error } = await db.from("edge_function_runs").insert({ function_name: functionName, run_date: runDate });
  if (!error) return true;
  if ((error as any).code === "23505") return false;
  // Most likely migration 017 isn't applied yet. Keep working without the guard.
  console.warn(`[${functionName}] run guard unavailable, carrying on: ${error.message}`);
  return true;
}

/** Texts this business can still send this month under the CRM's cap. */
async function smsLeftThisMonth(businessId: string, settings: Record<string, unknown> | null): Promise<number> {
  const cap = Number(settings?.sms_monthly_cap ?? DEFAULT_SMS_MONTHLY_CAP);
  const now = new Date();
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
  const { count, error } = await db
    .from("sms_logs")
    .select("id", { count: "exact", head: true })
    .eq("business_id", businessId)
    .eq("channel", "sms")
    .eq("status", "sent")
    .gte("sent_at", monthStart);
  if (error) throw new Error(`sms count failed for ${businessId}: ${error.message}`);
  return Math.max(0, (Number.isFinite(cap) ? cap : DEFAULT_SMS_MONTHLY_CAP) - (count ?? 0));
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function generateDiscountCode(businessName: string): string {
  const prefix = businessName.replace(/[^A-Z]/gi, "").toUpperCase().slice(0, 4);
  const suffix = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `${prefix}${suffix}`;
}

function buildSMS(template: string, vars: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (_, key) => vars[key] ?? `{${key}}`);
}

// Spam Act: name the sender and give a working opt-out on every text.
// STOP replies are handled by the dashboard's /api/sms/inbound route.
function withSenderAndOptOut(message: string, businessName: string): string {
  let text = message.trim();
  if (businessName && !text.toLowerCase().includes(businessName.toLowerCase())) text = `${businessName}: ${text}`;
  if (!/reply\s+stop/i.test(text)) text = `${text} Reply STOP to opt out`;
  return text;
}

// Ordering page link. Each restaurant's own site at name.zentrabite.com/order
// (wildcard domain live since 22 Oct 2026). STOREFRONT_HOST overrides the domain.
const STOREFRONT_HOST = Deno.env.get("STOREFRONT_HOST") ?? "zentrabite.com";
function storefrontUrl(subdomain: string): string {
  return `https://${subdomain}.${STOREFRONT_HOST}/order`;
}

async function sendSMS(to: string, body: string): Promise<string> {
  const url = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Authorization": `Basic ${btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`)}`,
      "Content-Type":  "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({ To: to, From: TWILIO_PHONE_NUMBER, Body: body }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`Twilio error: ${data.message}`);
  return data.sid;
}

// ─── Main handler ─────────────────────────────────────────────────────────────

serve(async () => {
  try {
    const results = { processed: 0, sent: 0, errors: 0, capped: 0 };

    if (!(await claimDailyRun("win-back"))) {
      return new Response(
        JSON.stringify({ message: "Already ran today", ...results }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    // 1. Load all active rules from winback_rules (written by /biteback UI)
    const { data: rules, error: rulesErr } = await db
      .from("winback_rules")
      .select("*, businesses(id, name, subdomain, settings)")
      .eq("is_active", true);

    if (rulesErr) throw rulesErr;

    if (!rules?.length) {
      return new Response(
        JSON.stringify({ message: "No active win-back rules", ...results }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    // Texts left this month per business, worked out once and counted down.
    const smsLeft = new Map<string, number>();

    for (const rule of rules) {
      const business = (rule as any).businesses;
      if (!business) continue;

      // Email rules belong to the CRM's automations runner.
      if ((rule.channel ?? "sms") !== "sms") continue;

      if (!smsLeft.has(business.id)) {
        let left = 0; // can't count, so don't send
        try {
          left = await smsLeftThisMonth(business.id, business.settings ?? null);
        } catch (err) {
          console.error(`[win-back] ${business.id}`, err);
        }
        smsLeft.set(business.id, left);
      }
      if ((smsLeft.get(business.id) ?? 0) <= 0) {
        console.warn(`[win-back] ${business.id} monthly text cap reached, skipping rule ${rule.id}`);
        results.capped++;
        continue;
      }

      // 2. Find customers who haven't ordered in inactive_days
      const triggerDate = new Date();
      triggerDate.setDate(triggerDate.getDate() - rule.inactive_days);

      const { data: candidates } = await db
        .from("customers")
        .select("id, name, phone, opted_out")
        .eq("business_id", business.id)
        .eq("opted_out", false)
        .eq("marketing_opt_in", true)   // only customers who ticked the consent box
        .lte("last_order_date", triggerDate.toISOString())
        .not("phone", "is", null);

      if (!candidates?.length) continue;

      // 3. Apply cooldown — skip anyone messaged within cooldown_days
      const cooldownDays = rule.cooldown_days ?? 30;
      const cooldownDate = new Date();
      cooldownDate.setDate(cooldownDate.getDate() - cooldownDays);

      const { data: recentlySent } = await db
        .from("sms_logs")
        .select("customer_id")
        .eq("business_id", business.id)
        .eq("rule_id", rule.id)
        .gte("sent_at", cooldownDate.toISOString());

      const recentIds = new Set((recentlySent ?? []).map((r: any) => r.customer_id));
      const eligible  = candidates.filter((c: any) => !recentIds.has(c.id));

      if (!eligible.length) continue;

      // 4. Send SMS to each eligible customer
      for (const customer of eligible) {
        if ((smsLeft.get(business.id) ?? 0) <= 0) {
          console.warn(`[win-back] ${business.id} monthly text cap reached mid-run`);
          results.capped++;
          break;
        }
        results.processed++;
        try {
          const discountCode = generateDiscountCode(business.name);
          const storefront   = storefrontUrl(business.subdomain);
          const linkWithCode = `${storefront}?code=${discountCode}`;

          const offerLabel =
            rule.offer_type === "percent"        ? `${rule.offer_value}% off`      :
            rule.offer_type === "dollar"         ? `$${rule.offer_value} off`       :
            rule.offer_type === "free_delivery"  ? "free delivery"                  :
            rule.offer_type === "free_item"      ? "a free item"                    :
            `${rule.offer_value} off`;

          const smsBody = withSenderAndOptOut(buildSMS(
            rule.template ?? "Hey {name}, we miss you at {business}! Here's {offer} on your next order: {link}",
            {
              name:     customer.name.split(" ")[0],
              business: business.name,
              offer:    offerLabel,
              link:     linkWithCode,
              amount:   String(rule.offer_value),
            }
          ), business.name);

          // Count it before sending, so a failed send can't push past the cap.
          smsLeft.set(business.id, (smsLeft.get(business.id) ?? 0) - 1);
          const twilioSid = await sendSMS(customer.phone, smsBody);

          // 5. Log to sms_logs with rule_id so cooldown filter works next run
          await db.from("sms_logs").insert({
            business_id: business.id,
            customer_id: customer.id,
            rule_id:     rule.id,
            message:     smsBody,
            status:      "sent",
            twilio_sid:  twilioSid,
            converted:   false,
            channel:     "sms",
          });

          // 6. Log to campaign_events for attribution tracking
          await db.from("campaign_events").insert({
            business_id:     business.id,
            customer_id:     customer.id,
            winback_rule_id: rule.id,
            event_type:      "sent",
            coupon_code:     discountCode,
          });

          results.sent++;
          console.log(`✓ Win-back sent → ${customer.name} (${business.name} · rule: ${rule.name})`);
        } catch (err) {
          results.errors++;
          console.error(`✗ Failed for customer ${customer.id}:`, err);
        }
      }
    }

    return new Response(JSON.stringify({ success: true, ...results }), {
      status: 200, headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Win-back function error:", err);
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 });
  }
});
