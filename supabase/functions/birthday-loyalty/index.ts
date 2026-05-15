// ═══════════════════════════════════════════════════════════════════════════
// ZentraBite — Birthday Loyalty Bonus
// Runs daily; awards birthday_points to every customer whose date_of_birth
// matches today's month/day (year ignored). Idempotent — only awards once
// per customer per year by checking loyalty_events for a "birthday" event
// already logged within the last 11 months.
//
// Deploy:   supabase functions deploy birthday-loyalty
// Schedule: 0 22 * * *  (8 AM ACST → 10 PM UTC previous day)
// ═══════════════════════════════════════════════════════════════════════════

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL         = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const db = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const DEFAULT_BIRTHDAY_POINTS = 200;

serve(async () => {
  try {
    const today = new Date();
    const month = today.getMonth() + 1; // 1-12
    const day   = today.getDate();      // 1-31

    // Pull all customers with a DOB matching today's month/day.
    // Using a SQL function would be cleaner; here we filter in JS for
    // portability across Postgres versions.
    const { data: candidates, error } = await db
      .from("customers")
      .select("id, business_id, name, date_of_birth")
      .not("date_of_birth", "is", null);

    if (error) throw error;

    const todays = (candidates ?? []).filter((c: any) => {
      if (!c.date_of_birth) return false;
      const d = new Date(c.date_of_birth);
      return d.getMonth() + 1 === month && d.getDate() === day;
    });

    if (todays.length === 0) {
      return new Response(
        JSON.stringify({ message: "No birthdays today", awarded: 0 }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }

    // Pull business loyalty settings for each unique business in batch.
    const businessIds = Array.from(new Set(todays.map((c: any) => c.business_id)));
    const { data: businesses } = await db
      .from("businesses")
      .select("id, settings")
      .in("id", businessIds);
    const settingsByBiz = new Map<string, number>();
    for (const b of businesses ?? []) {
      const pts = (b as any).settings?.loyalty?.birthday_points ?? DEFAULT_BIRTHDAY_POINTS;
      settingsByBiz.set(b.id, Number(pts));
    }

    // Eleven-month cutoff — prevents double-awarding if function runs twice.
    const elevenMonthsAgo = new Date();
    elevenMonthsAgo.setMonth(elevenMonthsAgo.getMonth() - 11);

    let awarded = 0;
    let skipped = 0;
    let errors  = 0;

    for (const customer of todays) {
      try {
        // Skip if already awarded this birthday cycle
        const { data: recent } = await db
          .from("loyalty_events")
          .select("id")
          .eq("customer_id", customer.id)
          .eq("event_type", "birthday")
          .gte("created_at", elevenMonthsAgo.toISOString())
          .limit(1);
        if (recent && recent.length > 0) {
          skipped++;
          continue;
        }

        const points = settingsByBiz.get(customer.business_id) ?? DEFAULT_BIRTHDAY_POINTS;

        // Read balance + update
        const { data: cust } = await db
          .from("customers")
          .select("points_balance")
          .eq("id", customer.id)
          .single();
        const newBal = ((cust as any)?.points_balance ?? 0) + points;

        await db
          .from("customers")
          .update({ points_balance: newBal })
          .eq("id", customer.id);

        await db.from("loyalty_events").insert({
          business_id: customer.business_id,
          customer_id: customer.id,
          event_type:  "birthday",
          points,
          multiplier:  1.0,
          source:      `birthday-${today.toISOString().slice(0, 10)}`,
        });

        awarded++;
        console.log(`✓ Birthday +${points}pts → ${customer.name}`);
      } catch (err) {
        errors++;
        console.error(`✗ Failed for ${customer.id}:`, err);
      }
    }

    return new Response(
      JSON.stringify({ success: true, found: todays.length, awarded, skipped, errors }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("Birthday loyalty error:", err);
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 });
  }
});
