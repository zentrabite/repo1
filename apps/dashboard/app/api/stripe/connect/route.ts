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
import { MANAGER_ROLES, requireBusiness } from "@/lib/request-business";
import { trustedOrigin } from "@/lib/tenant";
import { createShopAccount, isShopAccount, onboardingLink } from "@/lib/stripe-connect";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { business_id: requestedBusinessId } = body as { business_id?: string };

    // Business comes from the login. Super admins can act for the business
    // they're onboarding; merchants only for their own.
    const auth = await requireBusiness(requestedBusinessId, { roles: MANAGER_ROLES });
    if (!auth.ok) return auth.response;
    const business_id = auth.businessId;

    const db = createAdminClient();

    const { data: biz } = await db
      .from("businesses")
      .select("name, stripe_account_id, settings")
      .eq("id", business_id)
      .single();

    let accountId: string | null = biz?.stripe_account_id ?? null;

    if (accountId && !(await isShopAccount(accountId))) {
      console.log(`[stripe/connect] ${business_id} has an old-style account, making a new one`);
      accountId = null;
    }

    if (!accountId) {
      const settings = (biz?.settings ?? {}) as Record<string, unknown>;
      const email = typeof settings.notify_email === "string" ? settings.notify_email : null;
      accountId = await createShopAccount({ businessId: business_id, name: biz?.name ?? null, email });

      // Save straight away so a second click reuses the same account. The
      // flags start false and the account.updated webhook turns them on.
      const { error: saveErr } = await db
        .from("businesses")
        .update({
          stripe_account_id:        accountId,
          stripe_charges_enabled:   false,
          stripe_payouts_enabled:   false,
          stripe_details_submitted: false,
        })
        .eq("id", business_id);
      if (saveErr) throw new Error(`saving the Stripe account failed: ${saveErr.message}`);
    }

    // Only our own hosts (or localhost in dev), so a forged Origin can't send people elsewhere.
    const origin = trustedOrigin(req.headers.get("origin"), process.env.NEXT_PUBLIC_APP_URL ?? "https://dashboard.zentrabite.com");
    const url = await onboardingLink(accountId, origin);

    return NextResponse.json({ url, account_id: accountId });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[stripe/connect]", message);
    // Only managers reach this route, and Stripe's message says what's missing
    // (for example a platform setting), so it's passed on as before.
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
