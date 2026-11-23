// ─── POST /api/orders/pause ──────────────────────────────────────────────────
// The Orders page's "Pause online orders" switch. Anyone on the shop's team
// can use it, kitchen staff included. Since 030 only owners and managers can
// change the shop's own row from a browser, so the switch saves through here.
//
//   { businessId?, paused: boolean } → { paused }

import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-server";
import { requireBusiness } from "@/lib/request-business";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  let body: { businessId?: string; paused?: unknown } = {};
  try { body = (await req.json()) ?? {}; } catch { /* checked below */ }
  if (typeof body.paused !== "boolean") return NextResponse.json({ error: "paused must be true or false" }, { status: 400 });

  const auth = await requireBusiness(body.businessId);
  if (!auth.ok) return auth.response;

  const db = createAdminClient();
  const { data, error: readErr } = await db.from("businesses").select("settings").eq("id", auth.businessId).maybeSingle();
  if (readErr || !data) return NextResponse.json({ error: "Couldn't change online orders. Try again." }, { status: 500 });

  // Read first and merge, so the pause can't wipe another setting saved since.
  const settings = ((data as { settings?: Record<string, unknown> | null }).settings ?? {}) as Record<string, unknown>;
  const ordering = (settings.ordering && typeof settings.ordering === "object" ? settings.ordering : {}) as Record<string, unknown>;
  const { error } = await db
    .from("businesses")
    .update({ settings: { ...settings, ordering: { ...ordering, paused: body.paused } } })
    .eq("id", auth.businessId);
  if (error) return NextResponse.json({ error: "Couldn't change online orders. Try again." }, { status: 500 });
  return NextResponse.json({ paused: body.paused });
}
