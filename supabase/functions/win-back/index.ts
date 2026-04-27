// ═══════════════════════════════════════════════════════════════════════════
// ZentraBite — Win-Back Edge Function
// Runs daily at 9:00 AM ACST via Supabase cron (scheduled in migration 011).
//
// Deploy: supabase functions deploy win-back
//
// Reads from `winback_rules` (the /biteback CRM page) — not campaigns.
// ═══════════════════════════════════════════════════════════════════════════

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL         = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const TWILIO_ACCOUNT_SID   = Deno.env.get("TWILIO_ACCOUNT_SID")!;
const TWILIO_AUTH_TOKEN    = Deno.env.get("TWILIO_AUTH_TOKEN")!;
const TWILIO_PHONE_NUMBER  = Deno.env.get("TWILIO_PHONE_NUMBER")!;

const db = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// ─── Helpers ──────────────────────────────────────────────────────────────────

function generateDiscountCode(businessName: string): string {
  const prefix = businessName.replace(/[^A-Z]/gi, "").toUpperCase().slice(0, 4);
  const suffix = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `${prefix}${suffix}`;
}

function buildSMS(template: string, vars: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (_, key) => vars[key] ?? `{${key}}`);
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
    const results = { processed: 0, sent: 0, errors: 0 };

    // 1. Load all active rules from winback_rules (written by /biteback UI)
    const { data: rules, error: rulesErr } = await db
      .from("winback_rules")
      .select("*, businesses(id, name, subdomain)")
      .eq("is_active", true);

    if (rulesErr) throw rulesErr;

    if (!rules?.length) {
      return new Response(
        JSON.stringify({ message: "No active win-back rules", ...results }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    for (const rule of rules) {
      const business = (rule as any).businesses;
      if (!business) continue;

      // 2. Find customers who haven't ordered in inactive_days
      const triggerDate = new Date();
      triggerDate.setDate(triggerDate.getDate() - rule.inactive_days);

      const { data: candidates } = await db
        .from("customers")
        .select("id, name, phone, opted_out")
        .eq("business_id", business.id)
        .eq("opted_out", false)
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
        results.processed++;
        try {
          const discountCode = generateDiscountCode(business.name);
          const storefront   = `https://${business.subdomain}.zentrabite.com.au`;
          const linkWithCode = `${storefront}?code=${discountCode}`;

          const offerLabel =
            rule.offer_type === "percent"        ? `${rule.offer_value}% off`      :
            rule.offer_type === "dollar"         ? `$${rule.offer_value} off`       :
            rule.offer_type === "free_delivery"  ? "free delivery"                  :
            rule.offer_type === "free_item"      ? "a free item"                    :
            `${rule.offer_value} off`;

          const smsBody = buildSMS(
            rule.template ?? "Hey {name}, we miss you at {business}! Here's {offer} on your next order: {link}",
            {
              name:     customer.name.split(" ")[0],
              business: business.name,
              offer:    offerLabel,
              link:     linkWithCode,
              amount:   String(rule.offer_value),
            }
          );

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
            channel:     rule.channel ?? "sms",
          });

          // 6. Log to campaign_events for attribution tracking on /biteback
          await db.from("campaign_events").insert({
            business_id: business.id,
            customer_id: customer.id,
            event_type:  "win_back_sent",
            metadata:    { rule_id: rule.id, rule_name: rule.name, offer_type: rule.offer_type },
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
