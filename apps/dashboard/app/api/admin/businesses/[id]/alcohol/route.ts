// ─── /api/admin/businesses/[id]/alcohol ─────────────────────────────────────
// Super admins only (migration 042, lib/alcohol.ts).
//
// POST   { licence }  turns alcohol on for the shop's ordering page and
//                     website, once staff have checked its liquor licence
//                     covers online and delivery sales.
// DELETE              turns it off again. Items with alcohol go back to the
//                     POS only.
//
// Saved in businesses.settings.alcohol, which browsers can't change (042).

import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-server";
import { assertSuperAdmin } from "@/lib/admin-auth";
import type { AlcoholSetting } from "@/lib/alcohol";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const LICENCE_MAX = 60;

async function saveAlcohol(id: string, value: AlcoholSetting | null): Promise<NextResponse> {
  const db = createAdminClient();
  const { data: biz, error } = await db.from("businesses").select("id, name, settings").eq("id", id).maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!biz) return NextResponse.json({ error: "Shop not found" }, { status: 404 });

  const settings = { ...((biz.settings ?? {}) as Record<string, unknown>) };
  if (value) settings.alcohol = value;
  else delete settings.alcohol;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: saveErr } = await (db.from("businesses") as any).update({ settings }).eq("id", id);
  if (saveErr) return NextResponse.json({ error: saveErr.message }, { status: 500 });
  return NextResponse.json({ ok: true, alcohol: value });
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await assertSuperAdmin();
  if (!user) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const { id } = await params;
  const body = (await req.json().catch(() => ({}))) as { licence?: unknown };
  const licence = typeof body.licence === "string" ? body.licence.trim() : "";
  if (!licence) return NextResponse.json({ error: "Add the liquor licence number you checked." }, { status: 400 });
  if (licence.length > LICENCE_MAX) return NextResponse.json({ error: "That licence number is too long." }, { status: 400 });

  const res = await saveAlcohol(id, { allowed: true, licence, by: user.email ?? user.id, at: new Date().toISOString() });
  if (res.ok) console.info(`[admin] ${user.email ?? user.id} turned alcohol on for ${id} (licence ${licence})`);
  return res;
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await assertSuperAdmin();
  if (!user) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const { id } = await params;
  const res = await saveAlcohol(id, null);
  if (res.ok) console.info(`[admin] ${user.email ?? user.id} turned alcohol off for ${id}`);
  return res;
}
