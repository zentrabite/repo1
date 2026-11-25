// ─── /api/delivery/keys ──────────────────────────────────────────────────────
// Settings → Delivery. Owners and managers save the shop's courier keys here.
// They're kept in business_secrets (038), server only, and this route never
// sends one back, only whether each is saved (lib/courier-keys.ts).
//
//   GET  ?businessId=…                          → { saved: { field: boolean } }
//   POST { businessId?, set?: { field: value }, clear?: [field] } → { saved }

import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-server";
import { MANAGER_ROLES, requireBusiness } from "@/lib/request-business";
import { keyStatus, readCourierKeys, readKeyChange, saveCourierKeys } from "@/lib/courier-keys";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const noStore = { "Cache-Control": "no-store" };

export async function GET(req: Request) {
  const auth = await requireBusiness(new URL(req.url).searchParams.get("businessId"), { roles: MANAGER_ROLES });
  if (!auth.ok) return auth.response;
  try {
    const keys = await readCourierKeys(createAdminClient(), auth.businessId);
    return NextResponse.json({ saved: keyStatus(keys) }, { headers: noStore });
  } catch (err) {
    console.error("[delivery/keys] read failed", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "Couldn't load the courier keys" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const auth = await requireBusiness(typeof body?.businessId === "string" ? body.businessId : null, { roles: MANAGER_ROLES });
  if (!auth.ok) return auth.response;

  const parsed = readKeyChange(body);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
  try {
    const saved = await saveCourierKeys(createAdminClient(), auth.businessId, parsed.change, auth.userId);
    return NextResponse.json({ saved }, { headers: noStore });
  } catch (err) {
    console.error("[delivery/keys] save failed", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "Couldn't save the courier keys" }, { status: 500 });
  }
}
