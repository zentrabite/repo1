// ─── POST /api/stripe/checkout ────────────────────────────────────────────────
// Creates a Stripe Checkout session for the $500/month merchant subscription.
//
// Flow:
//   1. New merchant clicks "Start Free Trial" or "Subscribe" in onboarding
//   2. This endpoint creates a Checkout session with the monthly price
//   3. Merchant is redirected to Stripe's hosted checkout page
//   4. On success, Stripe fires customer.subscription.created webhook
//   5. Webhook handler marks the business as active in Supabase
//
// Prerequisites:
//   - Create a Product in Stripe Dashboard: "ZentraBite Pro — $500/month"
//   - Copy the Price ID → STRIPE_PRICE_MERCHANT_MONTHLY in .env.local

import { NextResponse } from "next/server";
import { stripe, PRICES } from "@/lib/stripe";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    // TODO: In production, pull business_id + email from the auth session.
    const { business_id, email } = body as {
      business_id: string;
      email: string;
    };

    if (!business_id || !email) {
      return NextResponse.json(
        { error: "business_id and email are required" },
        { status: 400 }
      );
    }

    if (!PRICES.merchantMonthly) {
      return NextResponse.json(
        { error: "STRIPE_PRICE_MERCHANT_MONTHLY is not set in .env.local" },
        { status: 500 }
      );
    }

    const origin = req.headers.get("origin") ?? process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3002";

    const session = await stripe.checkout.sessions.create({
      mode:               "subscription",
      payment_method_types: ["card"],
      customer_email:     email,
      line_items: [
        {
          price:    PRICES.merchantMonthly,
          quantity: 1,
        },
      ],
      // 14-day free trial — remove if you don't want a trial
      subscription_data: {
        trial_period_days: 14,
        metadata: {
          zentrabite_business_id: business_id,
        },
      },
      metadata: {
        zentrabite_business_id: business_id,
      },
      success_url: `${origin}/settings?subscription=success`,
      cancel_url:  `${origin}/settings?subscription=cancelled`,
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[stripe/checkout]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
