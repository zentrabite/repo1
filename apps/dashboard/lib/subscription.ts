// ─── A shop's ZentraBite subscription, as Settings shows it ─────────────────
// The Stripe webhook saves the subscription's status in
// businesses.settings.subscription_status: Stripe's own words (trialing,
// active, past_due, unpaid, incomplete, incomplete_expired, canceled, paused)
// or our "cancelled" when the subscription is deleted. Settings used to show
// anything that wasn't "inactive" as "Subscription active", so a cancelled
// or unpaid shop was told it was active. subscriptionView() turns the saved
// status into what the page says and which button it offers, and
// /api/stripe/checkout uses it to refuse a second subscription and to give
// the free trial only to a shop that has never had one.
//
// Pure, so the page and the server agree.

export type SubscriptionState = "none" | "trialing" | "active" | "payment_due" | "paused" | "cancelled";

export type SubscriptionView = {
  state: SubscriptionState;
  /** The pill's word. */
  pill: string;
  /** Green pill or not. */
  good: boolean;
  /** One plain sentence for the card. */
  line: string;
  /** "start" for Stripe checkout, "manage" for the billing portal. */
  action: "start" | "manage";
  /** Only a shop that has never had a subscription gets the free trial. */
  trial: boolean;
};

export function subscriptionState(raw: unknown): SubscriptionState {
  switch (typeof raw === "string" ? raw.toLowerCase() : "") {
    case "trialing": return "trialing";
    case "active": return "active";
    case "past_due":
    case "unpaid":
    case "incomplete": return "payment_due";
    case "paused": return "paused";
    case "canceled":
    case "cancelled":
    case "incomplete_expired": return "cancelled";
    default: return "none";
  }
}

export function subscriptionView(raw: unknown, trialEnds?: string | null): SubscriptionView {
  const state = subscriptionState(raw);
  switch (state) {
    case "trialing":
      return { state, pill: "Free trial", good: true, action: "manage", trial: false,
        line: trialEnds ? `Free trial active. It ends on ${trialEnds}, and your first payment is taken then.` : "Free trial active." };
    case "active":
      return { state, pill: "Active", good: true, action: "manage", trial: false, line: "Subscription active." };
    case "payment_due":
      return { state, pill: "Payment due", good: false, action: "manage", trial: false,
        line: "Your last payment didn't go through. Update your card in billing to keep your account running." };
    case "paused":
      return { state, pill: "Paused", good: false, action: "manage", trial: false, line: "Your subscription is paused. Open billing to start it again." };
    case "cancelled":
      return { state, pill: "Cancelled", good: false, action: "start", trial: false,
        line: "Your subscription is cancelled. You can start it again any time. There's no second free trial." };
    default:
      return { state, pill: "Inactive", good: false, action: "start", trial: true,
        line: "Start your 30-day free trial. You add a card at checkout. The first payment is taken when the trial ends." };
  }
}

/** A shop with one of these already has a subscription, so checkout won't start another. */
export function hasSubscription(raw: unknown): boolean {
  const s = subscriptionState(raw);
  return s === "trialing" || s === "active" || s === "payment_due" || s === "paused";
}
