// Tests for what Settings says about a shop's ZentraBite subscription, and
// what /api/stripe/checkout lets it start (lib/subscription.ts). Before this,
// a cancelled or unpaid shop was told "Subscription active", and cancelling
// then subscribing again gave another free trial.

import { beforeEach, describe, expect, it, vi } from "vitest";
import { fakeDb } from "./fake-db";

const h = vi.hoisted(() => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  db: null as any,
  create: vi.fn(async () => ({ url: "https://checkout.stripe.com/c/sub" })),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase-server", () => ({ createAdminClient: () => h.db }));
vi.mock("@/lib/stripe", () => ({ stripe: { checkout: { sessions: { create: h.create } } }, PRICES: { merchantMonthly: "price_month", merchantPilot: "price_pilot" } }));
vi.mock("@/lib/request-business", () => ({
  MANAGER_ROLES: ["Owner", "Manager"],
  requireBusiness: vi.fn(async () => ({ ok: true, businessId: "biz-1", userId: "user-1", email: "owner@example.com" })),
}));

import { hasSubscription, subscriptionState, subscriptionView } from "@/lib/subscription";
import { POST as checkout } from "@/app/api/stripe/checkout/route";

beforeEach(() => { vi.clearAllMocks(); });

describe("what Settings says", () => {
  it("reads every status Stripe or the webhook saves", () => {
    expect(subscriptionState(undefined)).toBe("none");
    expect(subscriptionState("inactive")).toBe("none");
    expect(subscriptionState("trialing")).toBe("trialing");
    expect(subscriptionState("active")).toBe("active");
    for (const s of ["past_due", "unpaid", "incomplete"]) expect(subscriptionState(s)).toBe("payment_due");
    for (const s of ["canceled", "cancelled", "incomplete_expired"]) expect(subscriptionState(s)).toBe("cancelled");
    expect(subscriptionState("paused")).toBe("paused");
  });

  it("never calls a cancelled or unpaid subscription active", () => {
    expect(subscriptionView("cancelled")).toMatchObject({ pill: "Cancelled", good: false, action: "start", trial: false });
    expect(subscriptionView("past_due")).toMatchObject({ pill: "Payment due", good: false, action: "manage" });
    expect(subscriptionView("past_due").line).toContain("didn't go through");
    expect(subscriptionView("active")).toMatchObject({ pill: "Active", good: true, action: "manage" });
    expect(subscriptionView("trialing", "Monday 21 December 2026").line).toBe("Free trial active. It ends on Monday 21 December 2026, and your first payment is taken then.");
    expect(subscriptionView(undefined)).toMatchObject({ pill: "Inactive", action: "start", trial: true });
  });
});

describe("starting a subscription", () => {
  const shop = (status?: string) => { h.db = fakeDb({ "businesses.select": () => ({ data: { id: "biz-1", name: "Nonna's Kitchen", settings: status ? { subscription_status: status } : {}, stripe_customer_id: status ? "cus_1" : null }, error: null }) }); };
  const post = () => checkout(new Request("https://dashboard.zentrabite.com/api/stripe/checkout", { method: "POST", body: "{}", headers: { origin: "https://dashboard.zentrabite.com" } }));
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sent = () => (h.create.mock.calls[0] as any[])[0];

  it("gives the free trial to a shop that never had one", async () => {
    shop();
    expect((await post()).status).toBe(200);
    expect(sent().subscription_data).toMatchObject({ trial_period_days: 30 });
  });

  it("gives no second trial after a cancel, and keeps the same Stripe customer", async () => {
    shop("cancelled");
    expect((await post()).status).toBe(200);
    expect(sent().subscription_data.trial_period_days).toBeUndefined();
    expect(sent().customer).toBe("cus_1");
  });

  it("won't start a second subscription for a shop that has one", async () => {
    for (const s of ["trialing", "active", "past_due", "paused"]) {
      expect(hasSubscription(s)).toBe(true);
      shop(s);
      expect((await post()).status, s).toBe(409);
    }
    expect(h.create).not.toHaveBeenCalled();
  });
});
