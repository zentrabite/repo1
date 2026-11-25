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
  return (await shopAccountKind(accountId)) === "shop";
}

/**
 * "shop" for an account set up the way ZentraBite expects, "other" when
 * Stripe says it isn't (an old v1 Express account, say), and "unknown" when
 * Stripe couldn't be asked. Only "other" is a reason to replace an account:
 * replacing a working one because Stripe had a bad minute would strand the
 * shop's orders on the old account.
 */
export async function shopAccountKind(accountId: string): Promise<"shop" | "other" | "unknown"> {
  try {
    const account = await stripe.v2.core.accounts.retrieve(accountId, { include: ["defaults"] });
    const r = account.defaults?.responsibilities;
    return r?.fees_collector === "stripe" && r?.losses_collector === "stripe" ? "shop" : "other";
  } catch (err) {
    // A clear "this isn't a v2 account" answer from Stripe counts as other.
    const e = err as { type?: string; statusCode?: number; code?: string };
    if (e?.type === "StripeInvalidRequestError" && (e.statusCode === 404 || e.statusCode === 400)) return "other";
    return "unknown";
  }
}

/**
 * A Stripe-hosted page where the shop owner finishes setting up payments.
 * Stripe's links only last a few minutes. refresh_url is where Stripe sends
 * someone whose link has run out, and return_url where it sends them after.
 * Both default to Settings, for an owner who's logged in.
 */
export async function onboardingLink(
  accountId: string,
  origin: string,
  back: { refresh: string; return: string } = { refresh: "/settings?stripe=refresh", return: "/settings?stripe=success" },
): Promise<string> {
  const link = await stripe.v2.core.accountLinks.create({
    account: accountId,
    use_case: {
      type: "account_onboarding",
      account_onboarding: {
        configurations: ["merchant"],
        refresh_url: `${origin}${back.refresh}`,
        return_url:  `${origin}${back.return}`,
      },
    },
  });
  return link.url;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Db = { from: (table: string) => any };

/**
 * The shop's Stripe account, made now if it has no usable one. An old v1
 * Express account is replaced. A new account is saved straight away, so a
 * second click reuses it, with the flags off until the account.updated
 * webhook turns them on.
 */
export async function ensureShopAccount(db: Db, businessId: string): Promise<string> {
  const { data: biz } = await db.from("businesses")
    .select("name, stripe_account_id, contact_email, settings")
    .eq("id", businessId)
    .single();

  let accountId: string | null = biz?.stripe_account_id ?? null;
  if (accountId) {
    const kind = await shopAccountKind(accountId);
    if (kind === "unknown") throw new Error("Couldn't reach Stripe to check the shop's account. Try again in a minute.");
    if (kind === "other") {
      console.log(`[stripe-connect] ${businessId} has an old-style account, making a new one`);
      accountId = null;
    }
  }
  if (accountId) return accountId;

  const settings = (biz?.settings ?? {}) as { notify_email?: unknown; onboarding?: { owner_email?: unknown } };
  const pick = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : null);
  const email = pick(settings.notify_email) ?? pick(biz?.contact_email) ?? pick(settings.onboarding?.owner_email);
  accountId = await createShopAccount({ businessId, name: biz?.name ?? null, email });

  const { error } = await db.from("businesses").update({
    stripe_account_id:        accountId,
    stripe_charges_enabled:   false,
    stripe_payouts_enabled:   false,
    stripe_details_submitted: false,
  }).eq("id", businessId);
  if (error) throw new Error(`saving the Stripe account failed: ${error.message}`);
  return accountId;
}
