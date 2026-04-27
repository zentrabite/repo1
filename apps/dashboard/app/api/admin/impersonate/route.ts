// ─── /api/admin/impersonate ──────────────────────────────────────────────────
// POST   { businessId }  → sets zb_impersonate cookie (super-admin only)
// DELETE                 → clears the impersonation cookie
//
// The cookie is read by useBusiness (client) and by server components that
// need to know which business to act as. Only users with is_super_admin=true
// are allowed to set this cookie.

import { NextRequest, NextResponse } from "next/server";
import { createSessionClient, createAdminClient } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

const COOKIE = "zb_impersonate";

async function assertSuperAdmin() {
  const supa = await createSessionClient();
  const { data: { user } } = await supa.auth.getUser();
  if (!user) return null;

  const db = createAdminClient();
  const { data } = await db
    .from("users")
    .select("is_super_admin")
    .eq("id", user.id)
    .single();

  if (!data?.is_super_admin) return null;
  return user;
}

export async function POST(req: NextRequest) {
  const user = await assertSuperAdmin();
  if (!user) return NextResponse.json({ error: "Not authorized" }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const businessId = typeof body.businessId === "string" ? body.businessId : null;
  if (!businessId) return NextResponse.json({ error: "businessId required" }, { status: 400 });

  const db = createAdminClient();
  const { data: biz } = await db
    .from("businesses")
    .select("id, name")
    .eq("id", businessId)
    .single();

  if (!biz) return NextResponse.json({ error: "Business not found" }, { status: 404 });

  const res = NextResponse.json({ ok: true, business: biz });
  res.cookies.set({
    name: COOKIE,
    value: businessId,
    path: "/",
    httpOnly: false,     // readable by useBusiness on the client
    sameSite: "lax",
    maxAge: 60 * 60 * 4, // 4 hours
  });
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set({
    name: COOKIE,
    value: "",
    path: "/",
    httpOnly: false,
    sameSite: "lax",
    maxAge: 0,
  });
  return res;
}
