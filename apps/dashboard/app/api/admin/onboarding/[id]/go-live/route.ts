// ─── GET /api/admin/onboarding/[id]/go-live ─────────────────────────────────
// The shop's go-live check (lib/go-live.ts), for the wizard's Website step.
// Super admins only.
//
// Returns: { checks: GoLiveCheck[], ready: boolean }

import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-server";
import { assertSuperAdmin } from "@/lib/admin-auth";
import { readGoLive } from "@/lib/go-live";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await assertSuperAdmin();
  if (!user) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const { id } = await params;
  const result = await readGoLive(createAdminClient() as never, id);
  if (!result) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(result);
}
