// ─── /api/admin/businesses/[id]/suspend ─────────────────────────────────────
// Super admins only (migration 041, lib/shop-status.ts).
//
// POST   { reason }  suspends the shop. Its logins see a "paused" screen, its
//                    ordering page and website are off, and it sends no texts.
// DELETE            undoes it.

import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-server";
import { assertSuperAdmin } from "@/lib/admin-auth";
import { resumeShop, suspendShop } from "@/lib/shop-status";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await assertSuperAdmin();
  if (!user) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const { id } = await params;
  const body = (await req.json().catch(() => ({}))) as { reason?: unknown };
  const out = await suspendShop(createAdminClient(), id, user.id, body.reason);
  if (!out.ok) return NextResponse.json({ error: out.error }, { status: out.status });
  console.info(`[admin] ${user.email ?? user.id} suspended ${id} (${out.name})`);
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await assertSuperAdmin();
  if (!user) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const { id } = await params;
  const out = await resumeShop(createAdminClient(), id);
  if (!out.ok) return NextResponse.json({ error: out.error }, { status: out.status });
  console.info(`[admin] ${user.email ?? user.id} resumed ${id} (${out.name})`);
  return NextResponse.json({ ok: true });
}
