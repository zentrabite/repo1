// ─── GET /api/winback/report?month=2026-11 ─────────────────────────────────
// The win-back report for the logged-in owner's or manager's shop, for one
// month in the shop's time zone (this month if none is given). Messages
// sent against customers held back, codes used, and where online orders
// came from. See lib/winback-report.ts.

import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-server";
import { MANAGER_ROLES, requireBusiness } from "@/lib/request-business";
import { readOrderingRules, shopToday } from "@/lib/pickup-times";
import { buildWinbackReport, readMonth, verdict } from "@/lib/winback-report";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const auth = await requireBusiness(undefined, { roles: MANAGER_ROLES });
  if (!auth.ok) return auth.response;

  const db = createAdminClient();
  const { data: biz } = await db.from("businesses").select("settings").eq("id", auth.businessId).maybeSingle();
  const timezone = readOrderingRules(biz?.settings).timezone;

  const asked = new URL(req.url).searchParams.get("month");
  const today = shopToday(new Date(), timezone);
  const month = asked ? readMonth(asked) : { y: today.y, m: today.m };
  if (!month) return NextResponse.json({ error: "Month should look like 2026-11" }, { status: 400 });

  try {
    const report = await buildWinbackReport(db, auth.businessId, month.y, month.m, timezone);
    return NextResponse.json({ report, verdict: verdict(report), current: `${today.y}-${String(today.m).padStart(2, "0")}` });
  } catch (err) {
    console.error("[winback/report]", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "Couldn't build the report. Try again." }, { status: 500 });
  }
}
