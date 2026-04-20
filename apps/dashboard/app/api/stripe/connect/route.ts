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
import { createServerClient } from "@/lib/supabase-server";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const { business_id } = body as { business_id: string };

    if (!business_id) {
      return NextResponse.json({ error: "business_id is required" }, { status: 400 });
    }

    const db = createServerClient();

    // ── Step 1: Check for an existing Stripe account on this business ─────
    const { data: biz } = await db
      .from("businesses")
      .select("stripe_account_id")
      .eq("id", business_id)
      .single();

    let accountId: string | undefined = biz?.stripe_account_id ?? undefined;

    // ── Step 2: Create Express account if not yet connected ───────────────
    if (!accountId) {
      const account = await stripe.accounts.create({
        type: "express",
        capabilities: {
          card_payments: { requested: true },
          transfers:     { requested: true },
        },
        business_profile: {
          mcc: "5812", // Eating places, restaurants
        },
        metadata: {
          zentrabite_business_id: business_id,
        },
      });
      accountId = account.id;

      // Persist immediately so reconnect always reuses the same account
      await db
        .from("businesses")
        .update({ stripe_account_id: accountId })
        .eq("id", business_id);
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
