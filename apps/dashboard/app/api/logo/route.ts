// POST /api/logo — Settings' Upload logo. Owners and managers only, the same
// people the database lets change the shop's details. Multipart form with
// `file` and an optional `business_id` (a super admin acting on a shop).
// The shop comes from the login, never the form. Returns { logo_url }.
// The checks and where it's kept are in lib/logo.ts.

import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-server";
import { MANAGER_ROLES, requireBusiness } from "@/lib/request-business";
import { LOGO_MAX_BYTES, saveLogo } from "@/lib/logo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  // Refuse a big upload before reading it.
  if (Number(req.headers.get("content-length") ?? 0) > LOGO_MAX_BYTES + 64 * 1024) {
    return NextResponse.json({ error: "File too large (max 5 MB)" }, { status: 413 });
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Send the logo as a file" }, { status: 400 });
  }
  const requested = form.get("business_id");
  const auth = await requireBusiness(typeof requested === "string" ? requested : null, { roles: MANAGER_ROLES });
  if (!auth.ok) return auth.response;

  const file = form.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "No file" }, { status: 400 });
  if (file.size > LOGO_MAX_BYTES) return NextResponse.json({ error: "File too large (max 5 MB)" }, { status: 400 });

  const out = await saveLogo(createAdminClient(), auth.businessId, Buffer.from(await file.arrayBuffer()));
  if (!out.ok) return NextResponse.json({ error: out.error }, { status: out.status });
  return NextResponse.json({ logo_url: out.url });
}
