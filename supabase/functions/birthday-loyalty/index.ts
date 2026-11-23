// ═══════════════════════════════════════════════════════════════════════════
// ZentraBite — Birthday Loyalty Bonus
// Runs daily; awards birthday_points to every customer whose birthday (a
// day and a month only, migration 033) is today in their shop's time zone.
// Since v3 (23 Nov 2026) the day is the shop's own. Before that it was the
// UTC date at 10pm UTC, which is a day behind in Australia, and it read a
// full date of birth.
//
// Only our own pg_cron job can start it (since v4): the job sends x-zb-cron,
// a secret kept in Supabase Vault (migration 034), and anything without it
// gets a 401. Deployed with Supabase's JWT check off (verify_jwt false) since
// v5, because that check only knows the older keys and x-zb-cron does the job.
// It's also safe to run more than once:
//   • one run per day, claimed in edge_function_runs (migration 017)
//   • a customer gets birthday points at most once a year. The event row
//     (source "birthday-year-<YYYY>") is written BEFORE the points, and a
//     unique index from migration 017 refuses a second one for the same
//     customer and year, even if two runs overlap
//   • the older check for a birthday event in the last 11 months stays, so
//     it's still safe before migration 017 is applied
//   • points are added only if the balance hasn't changed since it was read,
//     so a points-earning order at the same moment isn't overwritten
// Needs migrations 017, 033, 034 and 035. Deploy with birthdays.ts beside it,
// with the JWT check off (supabase functions deploy birthday-loyalty --no-verify-jwt).
//
// Schedule: 0 22 * * *  (8 AM ACST → 10 PM UTC previous day)
// ═══════════════════════════════════════════════════════════════════════════

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { DEFAULT_TIMEZONE, candidateDays, isBirthday, shopToday } from "./birthdays.ts";

/** The server's key. The newer secret key once one is made (Supabase gives
 *  functions SUPABASE_SECRET_KEYS, a JSON list by name), else the older
 *  service_role key. */
function serverKey(): string {
  try {
    const keys = JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") ?? "{}");
    if (typeof keys?.default === "string" && keys.default) return keys.default;
  } catch { /* none made yet */ }
  return Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
}

const db = createClient(Deno.env.get("SUPABASE_URL")!, serverKey());

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

/** True when the call came from our own pg_cron job, which sends the Vault secret (migration 034). */
async function fromOurScheduler(req: Request): Promise<boolean> {
  const secret = req.headers.get("x-zb-cron") ?? "";
  if (!secret) return false;
  const { data, error } = await db.rpc("cron_secret_ok", { p_secret: secret });
  return !error && data === true;
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

serve(async (req: Request) => {
  try {
    if (!(await fromOurScheduler(req))) {
      return new Response(JSON.stringify({ error: "Not allowed" }), { status: 401, headers: { "Content-Type": "application/json" } });
    }
    if (!(await claimDailyRun("birthday-loyalty"))) {
      return new Response(
        JSON.stringify({ message: "Already ran today", awarded: 0 }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }

    const now = new Date();

    // Customers whose birthday is near today anywhere, then each one checked
    // against their own shop's date. 29 Feb is read too, for 28 Feb.
    const months = Array.from(new Set(candidateDays(now).map(d => d.month).concat(2)));
    const { data: candidates, error } = await db
      .from("customers")
      .select("id, business_id, name, birth_month, birth_day")
      .in("birth_month", months)
      .not("birth_day", "is", null);

    if (error) throw error;

    const shopIds = Array.from(new Set((candidates ?? []).map((c: any) => c.business_id)));
    const { data: shops } = shopIds.length
      ? await db.from("businesses").select("id, settings").in("id", shopIds)
      : { data: [] };
    const todayOf = new Map<string, ReturnType<typeof shopToday>>();
    for (const b of shops ?? []) todayOf.set(b.id, shopToday(now, (b as any).settings?.timezone || DEFAULT_TIMEZONE));

    const todays = (candidates ?? []).filter((c: any) => {
      const today = todayOf.get(c.business_id) ?? shopToday(now, DEFAULT_TIMEZONE);
      return isBirthday(c.birth_month, c.birth_day, today);
    });

    if (todays.length === 0) {
      return new Response(
        JSON.stringify({ message: "No birthdays today", awarded: 0 }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }

    // Each shop's birthday points.
    const settingsByBiz = new Map<string, number>();
    for (const b of shops ?? []) {
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
          source:      `birthday-year-${(todayOf.get(customer.business_id) ?? shopToday(now, DEFAULT_TIMEZONE)).year}`,
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
