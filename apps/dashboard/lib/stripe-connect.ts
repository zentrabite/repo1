// ─── Each shop's own Stripe account ──────────────────────────────────────────
// Since 20 Nov 2026 every shop's payments are taken on the shop's own Stripe
// account ("direct charges"), not on ZentraBite's and passed on.
//
// Each shop gets a Stripe account made with the Accounts v2 API, set up so:
//   • the shop has the full Stripe Dashboard, with its own login
//   • Stripe takes its card fee from the shop directly (fees_collector: stripe)
//   • Stripe, not ZentraBite, covers a shop's negative balance
//     (losses_collector: stripe), and Stripe checks the shop's identity
//
// This matches the sandbox's Connect platform profile ("sellers collect
// payments directly", negative balance liability with Stripe, Stripe
// Dashboard). Stripe doesn't recommend direct charges on the old v1 Express
// accounts the CRM used to create, so those are replaced, not reused.
//
// Responsibilities can't be changed after an account is created.

import "server-only";
import { stripe } from "@/lib/stripe";

const MCC_RESTAURANTS = "5812"; // Eating places and restaurants

export type ShopAccountInput = {
  businessId: string;
  name?: string | null;
  email?: string | null;
};

/** Creates the shop's own Stripe account. Returns its id (acct_…). */
export async function createShopAccount(input: ShopAccountInput): Promise<string> {
  const account = await stripe.v2.core.accounts.create({
    display_name:  input.name?.trim() || undefined,
    contact_email: input.email?.trim() || undefined,
    dashboard:     "full",
    identity:      { country: "au" },
    configuration: {
      merchant: {
        mcc: MCC_RESTAURANTS,
        capabilities: { card_payments: { requested: true } },
      },
    },
    defaults: {
      currency: "aud",
      locales:  ["en-AU"],
      responsibilities: {
        fees_collector:   "stripe",
        losses_collector: "stripe",
      },
    },
    metadata: { zentrabite_business_id: input.businessId },
  });
  return account.id;
}

/**
 * True when the account can take direct charges the way ZentraBite expects:
 * Stripe collects its fee from the shop and covers negative balances. False
 * for the old v1 Express accounts and for anything unexpected.
 */
export async function isShopAccount(accountId: string): Promise<boolean> {
  try {
    const account = await stripe.v2.core.accounts.retrieve(accountId, { include: ["defaults"] });
    const r = account.defaults?.responsibilities;
    return r?.fees_collector === "stripe" && r?.losses_collector === "stripe";
  } catch {
    return false;
  }
}

/** A Stripe-hosted page where the shop owner finishes setting up payments. */
export async function onboardingLink(accountId: string, origin: string): Promise<string> {
  const link = await stripe.v2.core.accountLinks.create({
    account: accountId,
    use_case: {
      type: "account_onboarding",
      account_onboarding: {
        configurations: ["merchant"],
        refresh_url: `${origin}/settings?stripe=refresh`,
        return_url:  `${origin}/settings?stripe=success`,
      },
    },
  });
  return link.url;
}
