// ─── /api/admin/modules ──────────────────────────────────────────────────────
// PATCH { businessId, modules }  → merge-update businesses.settings.modules
// Super-admin only.

import { NextRequest, NextResponse } from "next/server";
import { createSessionClient, createAdminClient } from "@/lib/supabase-server";
import { updateBusinessModules } from "@/lib/admin-queries";

export const dynamic = "force-dynamic";

async function assertSuperAdmin() {
  const supa = await createSessionClient();
  const { data: { user } } = await supa.auth.getUser();
  if (!user) return null;
  const db = createAdminClient();
  const { data } = await db.from("users").select("is_super_admin").eq("id", user.id).single();
  if (!data?.is_super_admin) return null;
  return user;
}

export async function PATCH(req: NextRequest) {
  const user = await assertSuperAdmin();
  if (!user) return NextResponse.json({ error: "Not authorized" }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const businessId = typeof body.businessId === "string" ? body.businessId : null;
  const modules    = body.modules && typeof body.modules === "object" ? body.modules : null;
  if (!businessId || !modules) {
    return NextResponse.json({ error: "businessId + modules required" }, { status: 400 });
  }

  try {
    const settings = await updateBusinessModules(businessId, modules);
    return NextResponse.json({ ok: true, settings });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Update failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
