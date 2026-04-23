// ─── /api/admin/businesses/[id] ─────────────────────────────────────────────
// Super-admin-only read/write for the per-business About page.
//
// GET  → { business, owner } full detail (contact fields + owner row with phone)
// PATCH body accepts any subset of:
//   {
//     description?:   string,
//     contact_phone?: string,
//     contact_email?: string,
//     website?:       string,
//     abn?:           string,
//     address?:       string,
//     name?:          string,
//     type?:          string,
//     suburb?:        string,
//     owner?: { name?: string; phone?: string; email?: string },
//   }
// Empty strings are normalised to NULL so "clear the field" works.

import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-server";
import { assertSuperAdmin } from "@/lib/admin-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function clean(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t === "" ? null : t;
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await assertSuperAdmin();
  if (!user) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const { id } = await params;
  const db = createAdminClient();

  const [bizRes, ownerRes] = await Promise.all([
    db.from("businesses").select("*").eq("id", id).single(),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (db.from("users") as any)
      .select("id, name, email, phone, role, created_at")
      .eq("business_id", id)
      .eq("role", "owner")
      .maybeSingle(),
  ]);

  if (bizRes.error || !bizRes.data) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({
    business: bizRes.data,
    owner:    ownerRes.data ?? null,
  });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await assertSuperAdmin();
  if (!user) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const { id } = await params;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const body = (await req.json().catch(() => ({}))) as any;

  const db = createAdminClient();

  // ── Business fields ───────────────────────────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const bizUpdate: any = {};
  if ("name"          in body) bizUpdate.name          = clean(body.name)          ?? undefined;
  if ("type"          in body) bizUpdate.type          = clean(body.type)          ?? undefined;
  if ("suburb"        in body) bizUpdate.suburb        = clean(body.suburb);
  if ("description"   in body) bizUpdate.description   = clean(body.description);
  if ("contact_phone" in body) bizUpdate.contact_phone = clean(body.contact_phone);
  if ("contact_email" in body) bizUpdate.contact_email = clean(body.contact_email);
  if ("website"       in body) bizUpdate.website       = clean(body.website);
  if ("abn"           in body) bizUpdate.abn           = clean(body.abn);
  if ("address"       in body) bizUpdate.address       = clean(body.address);

  // Drop undefined keys (where name/type was sent blank — don't overwrite).
  for (const k of Object.keys(bizUpdate)) {
    if (bizUpdate[k] === undefined) delete bizUpdate[k];
  }

  if (Object.keys(bizUpdate).length > 0) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (db.from("businesses") as any).update(bizUpdate).eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // ── Owner fields ──────────────────────────────────────────────────────────
  if (body.owner && typeof body.owner === "object") {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ownerUpdate: any = {};
    if ("name"  in body.owner) ownerUpdate.name  = clean(body.owner.name);
    if ("phone" in body.owner) ownerUpdate.phone = clean(body.owner.phone);
    if ("email" in body.owner) ownerUpdate.email = clean(body.owner.email);

    if (Object.keys(ownerUpdate).length > 0) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (db.from("users") as any)
        .update(ownerUpdate)
        .eq("business_id", id)
        .eq("role", "owner");
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  // ── Return fresh state ────────────────────────────────────────────────────
  const [bizRes, ownerRes] = await Promise.all([
    db.from("businesses").select("*").eq("id", id).single(),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (db.from("users") as any)
      .select("id, name, email, phone, role")
      .eq("business_id", id)
      .eq("role", "owner")
      .maybeSingle(),
  ]);

  return NextResponse.json({
    business: bizRes.data ?? null,
    owner:    ownerRes.data ?? null,
  });
}
