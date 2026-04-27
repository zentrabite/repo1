// ═══════════════════════════════════════════════════════════════════════════
// ZentraBite — Nightly Analytics Aggregation
// Runs at 2:00 AM ACST (4:00 PM UTC) daily.
// Aggregates orders into analytics_daily so charts load instantly.
//
// Schedule (run in Supabase SQL Editor after deploying):
//   SELECT cron.schedule(
//     'nightly-analytics',
//     '0 16 * * *',   -- 2 AM ACST = 4 PM UTC
//     $$SELECT net.http_post(
//       url := 'https://ojwzberovbhgnwfpgaoh.supabase.co/functions/v1/nightly-analytics',
//       headers := '{"Authorization":"Bearer YOUR_ANON_KEY"}'::jsonb
//     )$$
//   );
// ═══════════════════════════════════════════════════════════════════════════

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const db = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

serve(async () => {
  try {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const date = yesterday.toISOString().split("T")[0];

    // Get all businesses
    const { data: businesses } = await db.from("businesses").select("id");
    if (!businesses?.length) return new Response(JSON.stringify({ message:"No businesses" }), { status:200 });

    let processed = 0;

    for (const biz of businesses) {
      // Aggregate yesterday's orders for this business
      const { data: orders } = await db
        .from("orders")
        .select("total, source, customer_id, created_at")
        .eq("business_id", biz.id)
        .gte("created_at", `${date}T00:00:00`)
        .lt("created_at",  `${date}T23:59:59`);

      const o = orders ?? [];

      const totalOrders   = o.length;
      const totalRevenue  = o.reduce((a, x) => a + x.total, 0);
      const directOrders  = o.filter(x => x.source === "direct").length;
      const aggOrders     = o.filter(x => x.source !== "direct").length;

      // New customers that day
      const { count: newCustomers } = await db
        .from("customers")
        .select("*", { count:"exact", head:true })
        .eq("business_id", biz.id)
        .gte("created_at", `${date}T00:00:00`)
        .lt("created_at",  `${date}T23:59:59`);

      // SMS sent that day
      const { count: smsSent } = await db
        .from("sms_logs")
        .select("*", { count:"exact", head:true })
        .eq("business_id", biz.id)
        .gte("sent_at", `${date}T00:00:00`)
        .lt("sent_at",  `${date}T23:59:59`);

      const { count: smsConverted } = await db
        .from("sms_logs")
        .select("*", { count:"exact", head:true })
        .eq("business_id", biz.id)
        .eq("converted", true)
        .gte("sent_at", `${date}T00:00:00`)
        .lt("sent_at",  `${date}T23:59:59`);

      // Upsert into analytics_daily
      await db.from("analytics_daily").upsert({
        business_id:   biz.id,
        date,
        total_orders:  totalOrders,
        total_revenue: totalRevenue,
        direct_orders: directOrders,
        agg_orders:    aggOrders,
        new_customers: newCustomers ?? 0,
        sms_sent:      smsSent      ?? 0,
        sms_converted: smsConverted ?? 0,
      }, { onConflict: "business_id,date" });

      processed++;
    }

    return new Response(JSON.stringify({ success:true, processed, date }), {
      status:200, headers:{ "Content-Type":"application/json" },
    });
  } catch (err) {
    console.error("Nightly analytics error:", err);
    return new Response(JSON.stringify({ error: String(err) }), { status:500 });
  }
});
