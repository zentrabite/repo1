// ─── PATCH /api/admin/onboarding/[id] ───────────────────────────────────────
// Updates a business during the onboarding wizard. Every call deep-merges
// whatever settings object you send onto the existing one, so you can send
// just the slice that changed on this step (hours, delivery, payments, etc.).
//
// Body:
//   {
//     name?:      string,
//     type?:      string,
//     subdomain?: string,
//     suburb?:    string,
//     logo_url?:  string,
//     settings?:  object,     // merged onto existing settings
//   }
//
// Returns: { business }
//
// GET /api/admin/onboarding/[id] — fetch the in-progress business (for resume).

import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-server";
import { assertSuperAdmin } from "@/lib/admin-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Deep-merge that prefers plain objects. Arrays and primitives are replaced
// wholesale — the wizard always sends full arrays for lists like tip_options.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function deepMerge(base: any, patch: any): any {
  if (base === null || typeof base !== "object") return patch;
  if (patch === null || typeof patch !== "object") return patch;
  if (Array.isArray(patch)) return patch;
  const out = Array.isArray(base) ? [] : { ...base };
  for (const [k, v] of Object.entries(patch)) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (out as any)[k] = deepMerge((base as any)[k], v);
  }
  return out;
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await assertSuperAdmin();
  if (!user) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const { id } = await params;
  const db = createAdminClient();
  const { data, error } = await db.from("businesses").select("*").eq("id", id).single();
  if (error || !data) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ business: data });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await assertSuperAdmin();
  if (!user) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const { id } = await params;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const body = (await req.json().catch(() => ({}))) as any;

  const db = createAdminClient();

  // If settings are being patched, read-then-merge to avoid wiping unrelated
  // keys (same pattern used in /api/stripe/webhook).
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const update: any = {};
  if (typeof body.name      === "string") update.name      = body.name.trim();
  if (typeof body.type      === "string") update.type      = body.type.trim();
  if (typeof body.subdomain === "string") update.subdomain = body.subdomain.trim();
  if (typeof body.suburb    === "string") update.suburb    = body.suburb.trim() || null;
  if (typeof body.logo_url  === "string") update.logo_url  = body.logo_url;

  if (body.settings && typeof body.settings === "object") {
    const { data: current } = await db.from("businesses").select("settings").eq("id", id).single();
    const existing = (current?.settings ?? {}) as Record<string, unknown>;
    update.settings = deepMerge(existing, body.settings);
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (db.from("businesses") as any)
    .update(update).eq("id", id).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ business: data });
}
