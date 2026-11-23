// ═══════════════════════════════════════════════════════════════════════════
// ZentraBite — Nightly Analytics
// Fills analytics_daily, which Analytics and Financials read, so their charts
// load instantly. Runs daily at 16:00 UTC (2:30am Adelaide in summer) from
// the nightly-analytics pg_cron job.
//
// Since 23 Nov 2026 (v3) each run works out the last 90 days again, not just
// yesterday, in each shop's own time zone, so a refund made after the day
// comes off that day. The sums are in totals.ts, which the CRM's tests check.
// One run a day (edge_function_runs, migration 017), so a repeat call with
// the public key does nothing. A run that finishes also writes
// "nightly-analytics-done", which Super Admin's Daily jobs light reads, so a
// night that fails shows there. Before v3 every save failed (the live table
// had no unique key until migration 032) and nothing said so.
//
// Deploy with totals.ts beside it.
// ═══════════════════════════════════════════════════════════════════════════

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { DEFAULT_TIMEZONE, WINDOW_DAYS, dailyTotals, shopDate, windowDays } from "./totals.ts";

const db = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

const PAGE = 1000;

/** Claims today's run. False when it already ran today. */
async function claimRun(runDate: string): Promise<boolean> {
  const { error } = await db.from("edge_function_runs").insert({ function_name: "nightly-analytics", run_date: runDate });
  if (!error) return true;
  if ((error as { code?: string }).code === "23505") return false;
  console.warn(`[nightly-analytics] run guard unavailable, carrying on: ${error.message}`);
  return true;
}

/** Every row of a query, a page at a time. */
// deno-lint-ignore no-explicit-any
async function all<T>(query: () => any): Promise<T[]> {
  const out: T[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await query().range(from, from + PAGE - 1);
    if (error) throw new Error(error.message);
    out.push(...((data ?? []) as T[]));
    if (!data || data.length < PAGE) return out;
  }
}

serve(async () => {
  try {
    const now = new Date();
    if (!(await claimRun(now.toISOString().slice(0, 10)))) {
      return new Response(JSON.stringify({ skipped: "already ran today" }), { status: 200, headers: { "Content-Type": "application/json" } });
    }

    const { data: businesses } = await db.from("businesses").select("id, settings, created_at");
    if (!businesses?.length) return new Response(JSON.stringify({ message: "No businesses" }), { status: 200 });

    let processed = 0;
    for (const biz of businesses) {
      const tz = (biz.settings as { timezone?: string } | null)?.timezone || DEFAULT_TIMEZONE;
      // From the day the shop was set up, so a new shop doesn't get 90 empty days.
      const opened = biz.created_at ? shopDate(biz.created_at, tz) : "";
      const days = windowDays(now, tz, WINDOW_DAYS).filter(d => d >= opened);
      if (days.length === 0) { processed++; continue; }
      // A day either side, then each row is placed in the shop's own day.
      const since = new Date(Date.parse(`${days[0]}T00:00:00Z`) - 86_400_000).toISOString();
      const until = new Date(Date.parse(`${days[days.length - 1]}T00:00:00Z`) + 2 * 86_400_000).toISOString();

      const [orders, customers, sms] = await Promise.all([
        all<{ total: number; refunded_amount: number | null; source: string | null; created_at: string }>(() =>
          db.from("orders").select("total, refunded_amount, source, created_at").eq("business_id", biz.id).gte("created_at", since).lt("created_at", until).order("created_at")),
        all<{ created_at: string }>(() =>
          db.from("customers").select("created_at").eq("business_id", biz.id).gte("created_at", since).lt("created_at", until).order("created_at")),
        // Only texts that went out. Held back and failed sends don't count.
        all<{ sent_at: string | null; converted: boolean | null }>(() =>
          db.from("sms_logs").select("sent_at, converted").eq("business_id", biz.id).eq("status", "sent").gte("sent_at", since).lt("sent_at", until).order("sent_at")),
      ]);

      const rows = dailyTotals(days, tz, orders, customers, sms).map(r => ({ business_id: biz.id, ...r }));
      const { error } = await db.from("analytics_daily").upsert(rows, { onConflict: "business_id,date" });
      if (error) throw new Error(`analytics_daily for ${biz.id}: ${error.message}`);
      processed++;
    }

    await db.from("edge_function_runs").insert({ function_name: "nightly-analytics-done", run_date: now.toISOString().slice(0, 10) });
    return new Response(JSON.stringify({ success: true, processed, days: WINDOW_DAYS }), {
      status: 200, headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Nightly analytics error:", err);
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 });
  }
});
