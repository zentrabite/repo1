// ─── POST /api/stripe/connect ─────────────────────────────────────────────────
// Creates a Stripe Connect Express onboarding link for a merchant.
//
// Flow:
//   1. Merchant clicks "Connect Stripe" in Settings
//   2. This endpoint creates (or retrieves) a Stripe Express account for them
//   3. Returns an account_link URL — merchant is redirected there
//   4. Merchant completes Stripe's onboarding (bank details, identity, etc.)
//   5. Stripe redirects back to /settings?stripe=success (or ?stripe=refresh)
//   6. Store the stripe_account_id on the business row in Supabase
//
// Prerequisites:
//   - Stripe Dashboard → Connect → Settings → Enable Express accounts
//   - STRIPE_SECRET_KEY in .env.local

import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    // business_id comes from your auth session in production.
    // TODO: replace with real session lookup via Supabase Auth.
    const { business_id, existing_stripe_account_id } = body as {
      business_id: string;
      existing_stripe_account_id?: string;
    };

    if (!business_id) {
      return NextResponse.json({ error: "business_id is required" }, { status: 400 });
    }

    // ── Step 1: Get or create the Express account ─────────────────────────
    let accountId = existing_stripe_account_id;

    if (!accountId) {
      const account = await stripe.accounts.create({
        type: "express",
        capabilities: {
          card_payments: { requested: true },
          transfers:     { requested: true },
        },
        business_profile: {
          // Stripe will collect the full business profile during onboarding
          mcc: "5812", // Eating places, restaurants
        },
        metadata: {
          zentrabite_business_id: business_id,
        },
      });
      accountId = account.id;

      // TODO: Save accountId to Supabase:
      // await supabase
      //   .from("businesses")
      //   .update({ stripe_account_id: accountId })
      //   .eq("id", business_id);
    }

    // ── Step 2: Create the onboarding link ────────────────────────────────
    const origin = req.headers.get("origin") ?? process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3002";

    const accountLink = await stripe.accountLinks.create({
      account:     accountId,
      refresh_url: `${origin}/settings?stripe=refresh`,  // user needs to start again
      return_url:  `${origin}/settings?stripe=success`,  // onboarding complete
      type:        "account_onboarding",
    });

    return NextResponse.json({
      url:        accountLink.url,
      account_id: accountId,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[stripe/connect]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
