// ═══════════════════════════════════════════════════════════════════════════
// ZentraBite — Birthday Loyalty Bonus
// Runs daily; awards birthday_points to every customer whose date_of_birth
// matches today's month/day (year ignored).
//
// Safe to call any number of times (the cron job uses the public anon key,
// so anyone with that key can call it):
//   • one run per day, claimed in edge_function_runs (migration 017)
//   • a customer gets birthday points at most once a year. The event row
//     (source "birthday-year-<YYYY>") is written BEFORE the points, and a
//     unique index from migration 017 refuses a second one for the same
//     customer and year, even if two runs overlap
//   • the older check for a birthday event in the last 11 months stays, so
//     it's still safe before migration 017 is applied
//   • points are added only if the balance hasn't changed since it was read,
//     so a points-earning order at the same moment isn't overwritten
// Apply migration 017 before redeploying.
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

/** Adds points without losing a change made between the read and the write. */
async function addPoints(customerId: string, points: number): Promise<boolean> {
  for (let attempt = 0; attempt < 5; attempt++) {
    const { data: cust, error: readErr } = await db
      .from("customers")
      .select("points_balance")
      .eq("id", customerId)
      .single();
    if (readErr) throw readErr;
    const current = Number((cust as any)?.points_balance ?? 0);

    let q = db.from("customers").update({ points_balance: current + points }).eq("id", customerId);
    q = (cust as any)?.points_balance == null ? q.is("points_balance", null) : q.eq("points_balance", current);
    const { data: updated, error: updErr } = await q.select("id");
    if (updErr) throw updErr;
    if ((updated ?? []).length > 0) return true;
  }
  return false;
}

serve(async () => {
  try {
    if (!(await claimDailyRun("birthday-loyalty"))) {
      return new Response(
        JSON.stringify({ message: "Already ran today", awarded: 0 }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }

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

        // Claim this year's birthday first. A second claim fails on the
        // unique index (migration 017), so the points below run once.
        const { data: claimed, error: claimErr } = await db.from("loyalty_events").insert({
          business_id: customer.business_id,
          customer_id: customer.id,
          event_type:  "birthday",
          points,
          multiplier:  1.0,
          source:      `birthday-year-${today.getFullYear()}`,
        }).select("id").single();
        if (claimErr) {
          if ((claimErr as any).code === "23505") { skipped++; continue; }
          throw claimErr;
        }

        // If the balance can't be written, remove the claim so the record
        // doesn't show points that were never added.
        let added = false;
        try {
          added = await addPoints(customer.id, points);
        } finally {
          if (!added) await db.from("loyalty_events").delete().eq("id", (claimed as any).id);
        }
        if (!added) throw new Error("points balance kept changing, gave up");

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
