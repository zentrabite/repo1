// ─── Stripe client singleton ─────────────────────────────────────────────────
// Import this wherever you need to call the Stripe API.
// Always uses the SECRET key — never expose this to the browser.
//
// Setup:
//   1. Run: npm install stripe
//   2. Add STRIPE_SECRET_KEY to your .env.local
//   3. Import: import { stripe } from "@/lib/stripe"

import Stripe from "stripe";

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error(
    "STRIPE_SECRET_KEY is not set.\n" +
    "Add it to apps/dashboard/.env.local\n" +
    "Use your TEST key (sk_test_...) until you go live."
  );
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2024-06-20",
  typescript: true,
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
