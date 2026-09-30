// ─── POST /api/stripe/checkout ────────────────────────────────────────────────
// Creates a Stripe Checkout session for the merchant subscription.
//
// Flow:
//   1. Merchant clicks "Start Free Trial" or "Subscribe" in Settings
//   2. This endpoint creates a Checkout session with the right monthly price
//   3. Merchant is redirected to Stripe's hosted checkout page
//   4. On success, Stripe fires customer.subscription.created webhook
//   5. Webhook handler marks the business as active in Supabase
//
// Security: the business and email come from the login, never the body.
//
// Pricing
//   STRIPE_PRICE_MERCHANT_MONTHLY — standard $500/month
//   STRIPE_PRICE_MERCHANT_PILOT   — $299/month for the first 3 pilot merchants.
//   A business gets the pilot price when a super admin sets
//   businesses.settings.billing_plan = "pilot".

import { NextResponse } from "next/server";
import { stripe, PRICES } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase-server";
import { requireBusiness } from "@/lib/request-business";

const TRIAL_DAYS = 30;

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { business_id: requestedBusinessId } = body as { business_id?: string };

    const auth = await requireBusiness(requestedBusinessId);
    if (!auth.ok) return auth.response;
    const { businessId, email } = auth;

    const db = createAdminClient();
    const { data: business } = await db
      .from("businesses")
      .select("id, name, settings, stripe_customer_id")
      .eq("id", businessId)
      .single();
    if (!business) return NextResponse.json({ error: "Business not found" }, { status: 404 });

    const settings = (business.settings ?? {}) as Record<string, unknown>;
    const isPilot = settings.billing_plan === "pilot";
    const price = isPilot ? PRICES.merchantPilot : PRICES.merchantMonthly;

    if (!price) {
      return NextResponse.json(
        { error: isPilot ? "STRIPE_PRICE_MERCHANT_PILOT is not set" : "STRIPE_PRICE_MERCHANT_MONTHLY is not set" },
        { status: 500 }
      );
    }

    const origin = req.headers.get("origin") ?? process.env.NEXT_PUBLIC_APP_URL ?? "https://dashboard.zentrabite.com";
    const customerId = (business as { stripe_customer_id?: string | null }).stripe_customer_id ?? null;

    const session = await stripe.checkout.sessions.create({
      mode:                 "subscription",
      payment_method_types: ["card"],
      // Reuse the Stripe customer if this business has one, so invoices and
      // the billing portal stay in one place.
      ...(customerId ? { customer: customerId } : { customer_email: email ?? undefined }),
      line_items: [{ price, quantity: 1 }],
      subscription_data: {
        trial_period_days: TRIAL_DAYS,
        metadata: {
          zentrabite_business_id: businessId,
          zentrabite_plan:        isPilot ? "pilot" : "standard",
        },
      },
      metadata: {
        zentrabite_business_id: businessId,
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
