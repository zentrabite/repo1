// ═══════════════════════════════════════════════════════════════════════════
// ZentraBite — Win-Back Edge Function
// Runs daily at 9:00 AM ACST via Supabase cron.
//
// Deploy:
//   supabase functions deploy win-back
//
// Schedule (run in Supabase SQL Editor after deploying):
//   SELECT cron.schedule(
//     'win-back-daily',
//     '0 23 * * *',   -- 9 AM ACST = 11 PM UTC (UTC+10)
//     $$SELECT net.http_post(
//       url := 'https://ojwzberovbhgnwfpgaoh.supabase.co/functions/v1/win-back',
//       headers := '{"Authorization":"Bearer YOUR_ANON_KEY"}'::jsonb
//     )$$
//   );
// ═══════════════════════════════════════════════════════════════════════════

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL        = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const TWILIO_ACCOUNT_SID  = Deno.env.get("TWILIO_ACCOUNT_SID")!;
const TWILIO_AUTH_TOKEN   = Deno.env.get("TWILIO_AUTH_TOKEN")!;
const TWILIO_PHONE_NUMBER = Deno.env.get("TWILIO_PHONE_NUMBER")!;

const db = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// ─── Helpers ─────────────────────────────────────────────────────────────────

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
  const res  = await fetch(url, {
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
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 14);

    // 1. Get all active win-back campaigns across all businesses
    const { data: campaigns } = await db
      .from("campaigns")
      .select("*, businesses(id, name, subdomain)")
      .eq("type", "win_back")
      .eq("active", true);

    if (!campaigns?.length) {
      return new Response(JSON.stringify({ message:"No active win-back campaigns", ...results }), { status:200 });
    }

    for (const campaign of campaigns) {
      const business = (campaign as any).businesses;
      if (!business) continue;

      // 2. Find customers who haven't ordered in trigger_days
      const triggerDate = new Date();
      triggerDate.setDate(triggerDate.getDate() - campaign.trigger_days);

      const { data: candidates } = await db
        .from("customers")
        .select("id, name, phone, opted_out")
        .eq("business_id", business.id)
        .eq("source", "direct")           // Only direct customers (we own the relationship)
        .eq("opted_out", false)           // Respect opt-outs
        .lte("last_order_date", triggerDate.toISOString())
        .not("phone", "is", null);

      if (!candidates?.length) continue;

      // 3. Apply cooldown filter — exclude anyone messaged in the last cooldown_days
      const cooldownDate = new Date();
      cooldownDate.setDate(cooldownDate.getDate() - campaign.cooldown_days);

      const { data: recentlySent } = await db
        .from("sms_logs")
        .select("customer_id")
        .eq("business_id", business.id)
        .gte("sent_at", cooldownDate.toISOString());

      const recentIds = new Set((recentlySent ?? []).map((r: any) => r.customer_id));
      const eligible  = candidates.filter((c: any) => !recentIds.has(c.id));

      // 4. Send SMS to each eligible customer
      for (const customer of eligible) {
        results.processed++;
        try {
          const discountCode = generateDiscountCode(business.name);
          const storefront   = `https://${business.subdomain}.zentrabite.com.au`;
          const linkWithCode = `${storefront}?code=${discountCode}`;

          const smsBody = buildSMS(
            campaign.template ?? "Hey {name}, we miss you at {shop}! Here's ${amount} off your next order: {link}",
            { name: customer.name.split(" ")[0], shop: business.name, link: linkWithCode, amount: String(campaign.discount_amount) }
          );

          const twilioSid = await sendSMS(customer.phone, smsBody);

          // 5. Log to sms_logs
          await db.from("sms_logs").insert({
            business_id:  business.id,
            customer_id:  customer.id,
            campaign_id:  campaign.id,
            message:      smsBody,
            status:       "sent",
            twilio_sid:   twilioSid,
            converted:    false,
          });

          results.sent++;
          console.log(`✓ Win-back sent to ${customer.name} (${business.name})`);
        } catch (err) {
          results.errors++;
          console.error(`✗ Failed for customer ${customer.id}:`, err);
        }
      }
    }

    return new Response(JSON.stringify({ success: true, ...results }), {
      status: 200, headers: { "Content-Type":"application/json" },
    });
  } catch (err) {
    console.error("Win-back function error:", err);
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 });
  }
});
