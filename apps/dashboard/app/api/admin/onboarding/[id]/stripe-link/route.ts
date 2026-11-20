// ─── /api/admin/onboarding/[id]/stripe-link ─────────────────────────────────
// Super admin only. The owner's Stripe setup link (lib/stripe-setup-link.ts),
// from the onboarding wizard's Payments step.
//
// GET  → { link: { created_at, expires_at, opened_at } | null }
//        Never the link itself: only a hash is stored.
// POST → makes a new link (the old one stops working) and emails it to the
//        owner. → { url, expiresAt, emailed, to }
//        The url comes back so staff can send it themselves until Resend sends
//        emails. Shown to staff only, never to a seller.

import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-server";
import { assertSuperAdmin } from "@/lib/admin-auth";
import { emailSetupLink, newSetupLink } from "@/lib/stripe-setup-link";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await assertSuperAdmin())) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const { id } = await params;
  if (!UUID_RE.test(id)) return NextResponse.json({ error: "Not found" }, { status: 404 });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (createAdminClient().from("stripe_setup_links") as any)
    .select("created_at, expires_at, opened_at").eq("business_id", id).maybeSingle();
  return NextResponse.json({ link: data ?? null });
}

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await assertSuperAdmin();
  if (!admin) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const { id } = await params;
  if (!UUID_RE.test(id)) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = createAdminClient() as any;
  const { data: biz } = await db.from("businesses").select("id, name, contact_email, settings").eq("id", id).maybeSingle();
  if (!biz) return NextResponse.json({ error: "Not found" }, { status: 404 });

  try {
    const { url, expiresAt } = await newSetupLink(db, biz.id, admin.id);
    const ob = (biz.settings?.onboarding ?? {}) as { owner_email?: string; owner_name?: string };
    const to = ob.owner_email || biz.contact_email || null;
    const emailed = await emailSetupLink(to, ob.owner_name, biz.name, url);
    return NextResponse.json({ url, expiresAt, emailed, to });
  } catch (err) {
    console.error("[onboarding/stripe-link]", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "Couldn't make the link. Try again." }, { status: 500 });
  }
}
