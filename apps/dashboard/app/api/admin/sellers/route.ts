// ─── /api/admin/sellers ─────────────────────────────────────────────────────
// Super admin only. Sellers can fill in the sale handover form and see the
// shops they sold (lib/seller-auth.ts), nothing else.
//
// GET   → { sellers: [{ id, name, email, phone, shops, last_sale }] }
// POST  { name, email, phone? } → makes the login a seller.
//       A new address gets a login and an invite link. Emails don't send
//       until Resend is set up, so the link comes back for staff to pass on.
//       An address that already has a login just becomes a seller.
//       → { seller, inviteLink?: string, existing: boolean }

import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-server";
import { assertSuperAdmin } from "@/lib/admin-auth";
import { sendEmail } from "@/lib/email";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const clip = (v: unknown, n: number) => (typeof v === "string" ? v.trim().slice(0, n) : "");

type SellerRow = { id: string; name: string | null; email: string | null; phone: string | null };

export async function GET() {
  if (!(await assertSuperAdmin())) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = createAdminClient() as any;
  const { data: rows, error } = await db.from("users").select("id, name, email, phone").eq("is_seller", true);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const sellers = (rows ?? []) as SellerRow[];

  const ids = sellers.map(s => s.id);
  const { data: sales } = ids.length
    ? await db.from("businesses").select("sold_by, sold_at").in("sold_by", ids)
    : { data: [] };
  const tally = new Map<string, { shops: number; last: string | null }>();
  for (const s of (sales ?? []) as { sold_by: string; sold_at: string | null }[]) {
    const t = tally.get(s.sold_by) ?? { shops: 0, last: null };
    t.shops += 1;
    if (s.sold_at && (!t.last || s.sold_at > t.last)) t.last = s.sold_at;
    tally.set(s.sold_by, t);
  }
  return NextResponse.json({
    sellers: sellers
      .map(s => ({ ...s, shops: tally.get(s.id)?.shops ?? 0, last_sale: tally.get(s.id)?.last ?? null }))
      .sort((a, b) => (a.name ?? a.email ?? "").localeCompare(b.name ?? b.email ?? "")),
  });
}

export async function POST(req: Request) {
  const admin = await assertSuperAdmin();
  if (!admin) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const name  = clip(body.name, 120);
  const email = clip(body.email, 200).toLowerCase();
  const phone = clip(body.phone, 40);
  if (!name) return NextResponse.json({ error: "Enter the seller's name." }, { status: 400 });
  if (!EMAIL_RE.test(email)) return NextResponse.json({ error: "Enter a valid email." }, { status: 400 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = createAdminClient() as any;

  // Someone who already has a login (an owner, say) just becomes a seller too.
  const { data: existing } = await db.from("users").select("id, name, phone").eq("email", email).maybeSingle();
  if (existing) {
    const { error } = await db.from("users").update({
      is_seller: true,
      ...(existing.name ? {} : { name }),
      ...(existing.phone || !phone ? {} : { phone }),
    }).eq("id", existing.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ seller: { id: existing.id, name: existing.name ?? name, email }, existing: true });
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://dashboard.zentrabite.com";
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: link, error: linkErr } = await (db.auth as any).admin.generateLink({
    type: "invite", email, options: { redirectTo: `${appUrl}/login` },
  });
  const userId: string | null = link?.user?.id ?? null;
  const inviteLink: string | null = link?.properties?.action_link ?? null;
  if (linkErr || !userId) {
    console.error("[admin/sellers] invite failed:", linkErr?.message);
    return NextResponse.json({ error: "Couldn't make the login. Check the email and try again." }, { status: 500 });
  }

  // The new-login trigger made a users row with no business. Mark it a seller.
  const { error: upErr } = await db.from("users").upsert(
    { id: userId, email, name, phone: phone || null, role: "seller", is_seller: true, business_id: null },
    { onConflict: "id" },
  );
  if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 });

  await sendEmail({
    to: email,
    subject: "You're set up to sell ZentraBite",
    text: [
      `Hi ${name},`, "",
      "You can now add the shops you sell to ZentraBite.",
      "Set your password and log in here:", inviteLink ?? `${appUrl}/login`, "",
      `If the link has expired, go to ${appUrl}/login and use "Forgot password".`,
    ].join("\n"),
  });

  return NextResponse.json({ seller: { id: userId, name, email }, inviteLink, existing: false });
}
