// ─── DELETE /api/admin/sellers/[id] ─────────────────────────────────────────
// Super admin only. Takes away seller access straight away. The login stays
// (it may also own a shop), and the shops they sold keep their name on them.

import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-server";
import { assertSuperAdmin } from "@/lib/admin-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await assertSuperAdmin())) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const { id } = await params;
  if (!UUID_RE.test(id)) return NextResponse.json({ error: "Not found" }, { status: 404 });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (createAdminClient().from("users") as any).update({ is_seller: false }).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
