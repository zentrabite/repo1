// ─── /api/rewards/redeem ─────────────────────────────────────────────────────
// Swapping a customer's points for a reward at the counter (migration 031).
//
//   POST   { businessId?, customerId, rewardId } → anyone on the shop's team.
//          Takes the points and records it, or says why not.
//   DELETE { businessId?, redemptionId }         → owners and managers undo a
//          mistake. The points go back.
//
// Both run as one step in the database, so the same points can't be spent
// twice and a balance never goes below 0. Customers can't spend points online
// yet, because nothing proves who's typing a phone number until texts work.

import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-server";
import { MANAGER_ROLES, requireBusiness } from "@/lib/request-business";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Result = { ok: boolean; error?: string; balance?: number; cost?: number; [k: string]: unknown };

async function body(req: Request): Promise<Record<string, unknown>> {
  try { return ((await req.json()) ?? {}) as Record<string, unknown>; } catch { return {}; }
}

export async function POST(req: Request) {
  const b = await body(req);
  const customerId = String(b.customerId ?? ""), rewardId = String(b.rewardId ?? "");
  if (!UUID.test(customerId) || !UUID.test(rewardId)) return NextResponse.json({ error: "Pick a customer and a reward." }, { status: 400 });

  const auth = await requireBusiness(typeof b.businessId === "string" ? b.businessId : null);
  if (!auth.ok) return auth.response;

  const { data, error } = await createAdminClient().rpc("redeem_reward", { p_business: auth.businessId, p_customer: customerId, p_reward: rewardId });
  if (error || !data) return NextResponse.json({ error: "Couldn't swap the points. Try again." }, { status: 500 });
  const r = data as Result;
  if (r.ok) return NextResponse.json(r);
  if (r.error === "points") return NextResponse.json({ ...r, error: `They have ${r.balance ?? 0} points. This reward needs ${r.cost}.` }, { status: 409 });
  if (r.error === "reward") return NextResponse.json({ error: "That reward isn't on offer any more." }, { status: 404 });
  return NextResponse.json({ error: "That customer isn't in this shop." }, { status: 404 });
}

export async function DELETE(req: Request) {
  const b = await body(req);
  const redemptionId = String(b.redemptionId ?? "");
  if (!UUID.test(redemptionId)) return NextResponse.json({ error: "Pick a redemption." }, { status: 400 });

  const auth = await requireBusiness(typeof b.businessId === "string" ? b.businessId : null, { roles: MANAGER_ROLES });
  if (!auth.ok) return auth.response;

  const { data, error } = await createAdminClient().rpc("undo_redemption", { p_business: auth.businessId, p_redemption: redemptionId });
  if (error || !data) return NextResponse.json({ error: "Couldn't undo it. Try again." }, { status: 500 });
  const r = data as Result;
  if (!r.ok) return NextResponse.json({ error: "That one was already undone, or isn't in this shop." }, { status: 404 });
  return NextResponse.json(r);
}
