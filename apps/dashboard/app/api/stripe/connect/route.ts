// ─── POST /api/stripe/connect ─────────────────────────────────────────────────
// Starts or continues Stripe setup for a shop, and returns a link to Stripe's
// own setup page.
//
// Flow:
//   1. The owner (or staff during onboarding) clicks "Connect Stripe"
//   2. This makes the shop's own Stripe account if it doesn't have a usable one
//      (see lib/stripe-connect.ts for how it's set up)
//   3. Returns a Stripe-hosted setup link. The owner adds their business,
//      identity and bank details there
//   4. Stripe sends them back to /settings?stripe=success (or ?stripe=refresh)
//   5. The account.updated webhook keeps the charges and payouts flags fresh
//
// An old v1 Express account (made before 20 Nov 2026) is replaced with a new
// one, because Stripe doesn't recommend taking payments directly on those.

import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-server";
import { requireBusiness } from "@/lib/request-business";
import { trustedOrigin } from "@/lib/tenant";
import { ensureShopAccount, onboardingLink } from "@/lib/stripe-connect";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { business_id: requestedBusinessId } = body as { business_id?: string };

    // Business comes from the login. Super admins can act for the business
    // they're onboarding; merchants only for their own.
    // Owners only. Finishing Stripe's setup picks the bank account the
    // shop's takings go to.
    const auth = await requireBusiness(requestedBusinessId, { roles: ["Owner"] });
    if (!auth.ok) return auth.response;
    const business_id = auth.businessId;

    const accountId = await ensureShopAccount(createAdminClient(), business_id);

    // Only our own hosts (or localhost in dev), so a forged Origin can't send people elsewhere.
    const origin = trustedOrigin(req.headers.get("origin"), process.env.NEXT_PUBLIC_APP_URL ?? "https://dashboard.zentrabite.com");
    const url = await onboardingLink(accountId, origin);

    return NextResponse.json({ url, account_id: accountId });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[stripe/connect]", message);
    // Only owners reach this route, and Stripe's message says what's missing
    // (for example a platform setting), so it's passed on as before.
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
