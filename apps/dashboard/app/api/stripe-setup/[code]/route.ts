// ─── POST /api/stripe-setup/[code] ──────────────────────────────────────────
// The Start button on the owner's Stripe setup page (/stripe-setup/[code]).
// Public, because the owner has no ZentraBite login yet. The code is the key
// (lib/stripe-setup-link.ts). Makes or reuses the shop's own Stripe account,
// then sends the owner to Stripe's setup page. Stripe sends them back to the
// same ZentraBite page, so they can carry on later with the same link.
//
// Always answers with a redirect. The page explains anything that went wrong.

import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-server";
import { ensureShopAccount, onboardingLink } from "@/lib/stripe-connect";
import { findSetupLink } from "@/lib/stripe-setup-link";
import { trustedOrigin } from "@/lib/tenant";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const page = (query = "") => NextResponse.redirect(new URL(`/stripe-setup/${encodeURIComponent(code)}${query}`, req.url), 303);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = createAdminClient() as any;
  const found = await findSetupLink(db, code);
  if (!found.ok || found.shop.stripe_charges_enabled) return page();

  try {
    const accountId = await ensureShopAccount(db, found.shop.id);
    await db.from("stripe_setup_links").update({ opened_at: new Date().toISOString() }).eq("business_id", found.shop.id);
    const origin = trustedOrigin(req.headers.get("origin"), process.env.NEXT_PUBLIC_APP_URL ?? "https://dashboard.zentrabite.com");
    const url = await onboardingLink(accountId, origin, {
      refresh: `/stripe-setup/${code}?again=1`,
      return:  `/stripe-setup/${code}?done=1`,
    });
    return NextResponse.redirect(url, 303);
  } catch (err) {
    console.error("[stripe-setup]", err instanceof Error ? err.message : err);
    return page("?error=1");
  }
}
