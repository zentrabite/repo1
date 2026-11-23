// ─── GET /api/access-log ─────────────────────────────────────────────────────
// The latest times ZentraBite staff opened this shop's CRM as its owner
// (lib/access-log.ts, migration 036), for the Settings page. Owners and
// managers only.

import { NextResponse } from "next/server";
import { MANAGER_ROLES, requireBusiness } from "@/lib/request-business";
import { createAdminClient } from "@/lib/supabase-server";
import { recentAccess } from "@/lib/access-log";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const auth = await requireBusiness(new URL(req.url).searchParams.get("businessId"), { roles: MANAGER_ROLES });
  if (!auth.ok) return auth.response;
  try {
    return NextResponse.json({ access: await recentAccess(createAdminClient(), auth.businessId, 10) });
  } catch (err) {
    console.error("[access-log]", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "Couldn't load the list" }, { status: 500 });
  }
}
