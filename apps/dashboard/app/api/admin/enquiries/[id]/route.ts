// ─── /api/admin/enquiries/[id] ──────────────────────────────────────────────
// PATCH { status: "new" | "contacted" | "closed" } → { enquiry }
// Only the status can change. Super admin only.

import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-server";
import { assertSuperAdmin } from "@/lib/admin-auth";
import { isEnquiryStatus } from "@/lib/enquiries";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await assertSuperAdmin();
  if (!user) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const { id } = await params;
  if (!UUID_RE.test(id)) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const status = (body as { status?: unknown })?.status;
  if (!isEnquiryStatus(status)) {
    return NextResponse.json({ error: "status must be new, contacted or closed" }, { status: 400 });
  }

  const db = createAdminClient();
  const { data, error } = await db
    .from("enquiries")
    .update({ status })
    .eq("id", id)
    .select("id, status")
    .maybeSingle();

  if (error) {
    console.error("[admin/enquiries] update failed:", error.message);
    return NextResponse.json({ error: "Couldn't save the status" }, { status: 500 });
  }
  if (!data) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ enquiry: data });
}
