// ─── POST /api/admin/onboarding/[id]/owner-invite ───────────────────────────
// Sends the owner their login (lib/owner-invite.ts), from the go-live check.
// For shops a seller sold, where nobody has sent it yet, or to send it again.
// Super admins only, because the link logs in as the owner.
//
// Returns: { link, emailed, to }

import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-server";
import { assertSuperAdmin } from "@/lib/admin-auth";
import { inviteOwner } from "@/lib/owner-invite";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await assertSuperAdmin();
  if (!user) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const { id } = await params;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = createAdminClient() as any;
  const { data: biz } = await db.from("businesses").select("id, name, settings").eq("id", id).maybeSingle();
  if (!biz) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const ob = (biz.settings?.onboarding ?? {}) as { owner_email?: string; owner_name?: string; owner_phone?: string };
  if (!ob.owner_email) return NextResponse.json({ error: "There's no owner email for this shop." }, { status: 400 });

  const invite = await inviteOwner(db, {
    businessId: biz.id, businessName: biz.name ?? "your shop", email: ob.owner_email,
    name: ob.owner_name, phone: ob.owner_phone, invitedBy: user.id,
  });
  if (!invite.ok) return NextResponse.json({ error: invite.error }, { status: 409 });
  return NextResponse.json({ link: invite.link, emailed: invite.emailed, to: ob.owner_email });
}
