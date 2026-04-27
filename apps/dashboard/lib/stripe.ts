// ─── Stripe client singleton ─────────────────────────────────────────────────
// Import this wherever you need to call the Stripe API.
// Always uses the SECRET key — never expose this to the browser.
//
// Setup:
//   1. Run: npm install stripe
//   2. Add STRIPE_SECRET_KEY to your .env.local
//   3. Import: import { stripe } from "@/lib/stripe"
//
// The client is lazily instantiated via a Proxy so that importing this module
// during a production build (where env vars may not be set yet) doesn't crash
// the build. Missing credentials only error at real call-time.

import Stripe from "stripe";

let _stripe: Stripe | null = null;

function getStripe(): Stripe {
  if (_stripe) return _stripe;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error(
      "STRIPE_SECRET_KEY is not set.\n" +
      "Add it to apps/dashboard/.env.local (sk_test_… for dev, sk_live_… for prod).",
    );
  }
  _stripe = new Stripe(key, {
    apiVersion: "2024-06-20",
    typescript: true,
  });
  return _stripe;
}

// Proxy so call sites can keep using `stripe.accounts.create(...)` verbatim —
// the Stripe client is only constructed the first time any property is read.
export const stripe: Stripe = new Proxy({} as Stripe, {
  get(_t, prop) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (getStripe() as any)[prop];
  },
});

// ─── Stripe price IDs ────────────────────────────────────────────────────────
// Create these in your Stripe Dashboard → Products → Add product
// Then paste the Price ID (price_xxx) here.
export const PRICES = {
  // $500/month merchant subscription
  merchantMonthly: process.env.STRIPE_PRICE_MERCHANT_MONTHLY ?? "",
} as const;

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Formats a Stripe amount (in cents) to a dollar string: 5000 → "$50.00" */
export function formatAmount(amount: number, currency = "aud"): string {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(amount / 100);
}

/** Returns true if a Stripe subscription is active or trialing */
export function isActiveSubscription(status: Stripe.Subscription.Status): boolean {
  return status === "active" || status === "trialing";
}
