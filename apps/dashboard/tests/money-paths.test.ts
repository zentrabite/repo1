// Tests for the money paths. Stripe and the database are fakes (see
// fake-db.ts), so these never touch a real account.
//
// What they pin down:
//   • checkout charges on the shop's own Stripe account, at menu prices
//   • checkout refuses a shop that can't take payments, or has an old account
//   • the webhook only makes an order when it came from that shop's account
//     and was paid, and a repeated event doesn't make a second order
//   • a shop's Stripe flags can only be changed by its saved account
//   • subscriptions read the billing period from the subscription item
//   • Stripe setup makes the new kind of account, and replaces an old one
//   • the success page reads the order from the shop's account

import { beforeEach, describe, expect, it, vi } from "vitest";
import { fakeDb, filterValue, type Query } from "./fake-db";

const h = vi.hoisted(() => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  db: null as any,
  stripe: {
    checkout: { sessions: { create: vi.fn(), retrieve: vi.fn(), listLineItems: vi.fn() } },
    accounts: { retrieve: vi.fn() },
    v2: { core: { accounts: { create: vi.fn(), retrieve: vi.fn() }, accountLinks: { create: vi.fn() } } },
    webhooks: { constructEvent: vi.fn() },
  },
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/stripe", () => ({ stripe: h.stripe }));
vi.mock("@/lib/supabase-server", () => ({
  createAdminClient:   () => h.db,
  createServerClient:  () => h.db,
  createSessionClient: async () => h.db,
}));
vi.mock("@/lib/request-business", () => ({
  MANAGER_ROLES: ["Owner", "Manager"],
  requireBusiness: vi.fn(async (id?: string) => ({ ok: true, businessId: id ?? "biz-1" })),
}));
vi.mock("@/lib/notify", () => ({ notifyOwnerOfOrder: vi.fn(async () => {}) }));
vi.mock("@/lib/email", () => ({ sendCustomerReceipt: vi.fn(async () => ({ ok: true })) }));
vi.mock("@/lib/sms", () => ({ normaliseAuPhone: (p: string) => p }));

import { POST as checkout } from "@/app/api/store/checkout/route";
import { POST as webhook } from "@/app/api/stripe/webhook/route";
import { POST as connect } from "@/app/api/stripe/connect/route";
import { GET as successLookup } from "@/app/api/store/session/route";

const SHOP_ACCOUNT = { defaults: { responsibilities: { fees_collector: "stripe", losses_collector: "stripe" } } };
const OLD_EXPRESS  = { defaults: { responsibilities: { fees_collector: "application_express", losses_collector: "application" } } };
const MENU = [{ id: "m1", name: "Margherita", price: 18.5, available: true }];

const writes = (op: Query["op"], table: string) =>
  (h.db.calls as Query[]).filter(q => q.op === op && q.table === table);

beforeEach(() => {
  vi.clearAllMocks();
  process.env.STRIPE_WEBHOOK_SECRET = "whsec_platform_test";
  process.env.STRIPE_CONNECT_WEBHOOK_SECRET = "whsec_connect_test";
  h.stripe.v2.core.accounts.retrieve.mockResolvedValue(SHOP_ACCOUNT);
});

// ─── Checkout ────────────────────────────────────────────────────────────────

describe("customer checkout", () => {
  const shop = { id: "biz-1", name: "Nonna's Kitchen", subdomain: "nonna", stripe_account_id: "acct_shop", stripe_charges_enabled: true };

  function order(items: unknown = [{ id: "m1", qty: 2, price: 0.01 }]) {
    return new Request("https://dashboard.zentrabite.com/api/store/checkout", {
      method: "POST",
      headers: { "content-type": "application/json", origin: "https://dashboard.zentrabite.com" },
      body: JSON.stringify({ subdomain: "nonna", items, customer: { name: "Sofia", email: "sofia@example.com", marketingOptIn: true } }),
    });
  }

  beforeEach(() => {
    h.db = fakeDb({
      "businesses.select": () => ({ data: shop, error: null }),
      "menu_items.select": () => ({ data: MENU, error: null }),
    });
    h.stripe.checkout.sessions.create.mockResolvedValue({ url: "https://checkout.stripe.com/c/test" });
  });

  it("charges on the shop's own Stripe account, at the menu price", async () => {
    const res = await checkout(order());
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ url: "https://checkout.stripe.com/c/test" });

    const [params, options] = h.stripe.checkout.sessions.create.mock.calls[0];
    expect(options).toEqual({ stripeAccount: "acct_shop" });
    // The 1c the browser sent is ignored. The price comes from the menu.
    expect(params.line_items).toEqual([
      { price_data: { currency: "aud", product_data: { name: "Margherita" }, unit_amount: 1850 }, quantity: 2 },
    ]);
    // Nothing is routed through ZentraBite's account any more.
    expect(params.payment_intent_data).toBeUndefined();
    expect(params.metadata.business_id).toBe("biz-1");
    expect(params.metadata.marketing_opt_in).toBe("1");
    expect(params.success_url).toContain("/store/nonna/success?session_id={CHECKOUT_SESSION_ID}");
  });

  it("refuses a shop that can't take payments yet", async () => {
    h.db = fakeDb({
      "businesses.select": () => ({ data: { ...shop, stripe_charges_enabled: false }, error: null }),
      "menu_items.select": () => ({ data: MENU, error: null }),
    });
    h.stripe.accounts.retrieve.mockResolvedValue({ charges_enabled: false, payouts_enabled: false, details_submitted: false });

    const res = await checkout(order());
    expect(res.status).toBe(409);
    expect(h.stripe.checkout.sessions.create).not.toHaveBeenCalled();
  });

  it("refuses a shop that still has an old Express account", async () => {
    h.stripe.v2.core.accounts.retrieve.mockResolvedValue(OLD_EXPRESS);
    const res = await checkout(order());
    expect(res.status).toBe(409);
    expect(h.stripe.checkout.sessions.create).not.toHaveBeenCalled();
  });

  it("refuses items that aren't on the shop's menu", async () => {
    const res = await checkout(order([{ id: "not-on-menu", qty: 1 }]));
    expect(res.status).toBe(409);
    expect(h.stripe.checkout.sessions.create).not.toHaveBeenCalled();
  });
});

// ─── Webhook ─────────────────────────────────────────────────────────────────

describe("Stripe webhook", () => {
  function send(event: unknown) {
    h.stripe.webhooks.constructEvent.mockReturnValue(event);
    return webhook(new Request("https://dashboard.zentrabite.com/api/stripe/webhook", {
      method: "POST",
      headers: { "stripe-signature": "t=1,v1=test" },
      body: "{}",
    }));
  }

  const paidSession = {
    id: "cs_test_1",
    payment_status: "paid",
    amount_total: 3700,
    payment_intent: "pi_test_1",
    metadata: {
      business_id: "biz-1", source: "storefront", subdomain: "nonna",
      customer_name: "Sofia", customer_phone: "+61412345678", customer_email: "sofia@example.com",
      marketing_opt_in: "1", items_0: JSON.stringify([{ id: "m1", qty: 2 }]),
    },
  };
  const completed = (account: string | undefined, session: object = paidSession) =>
    ({ type: "checkout.session.completed", account, data: { object: session } });

  let orderInsert: (q: Query) => { data: unknown; error: { code?: string; message: string } | null };

  beforeEach(() => {
    orderInsert = () => ({ data: { id: "order-1" }, error: null });
    h.db = fakeDb({
      "businesses.select": q => q.columns?.includes("stripe_account_id")
        ? { data: { stripe_account_id: "acct_shop" }, error: null }
        : { data: { name: "Nonna's Kitchen", subdomain: "nonna", settings: {} }, error: null },
      "menu_items.select": () => ({ data: MENU, error: null }),
      "customers.select":  () => ({ data: null, error: null }),
      "customers.insert":  () => ({ data: { id: "cust-1" }, error: null }),
      "orders.insert":     q => orderInsert(q),
    });
  });

  it("makes the order when the payment came from the shop's own account", async () => {
    const res = await send(completed("acct_shop"));
    expect(res.status).toBe(200);

    const [ins] = writes("insert", "orders");
    expect(ins.payload).toMatchObject({
      business_id: "biz-1", customer_id: "cust-1", total: 37, stripe_payment_id: "pi_test_1", source: "direct",
      items: [{ id: "m1", name: "Margherita", price: 18.5, qty: 2 }],
    });
    const [cust] = writes("insert", "customers");
    expect(cust.payload).toMatchObject({ business_id: "biz-1", marketing_opt_in: true, marketing_opt_in_source: "checkout" });
  });

  it("refuses an order from another Stripe account", async () => {
    const res = await send(completed("acct_someone_else"));
    expect(res.status).toBe(200);
    expect(writes("insert", "orders")).toHaveLength(0);
    expect(writes("insert", "customers")).toHaveLength(0);
  });

  it("refuses a shop order that comes from ZentraBite's own account", async () => {
    await send(completed(undefined));
    expect(writes("insert", "orders")).toHaveLength(0);
  });

  it("waits when the payment isn't paid yet", async () => {
    await send(completed("acct_shop", { ...paidSession, payment_status: "unpaid" }));
    expect(writes("insert", "orders")).toHaveLength(0);
  });

  it("doesn't make a second order when Stripe sends the event twice", async () => {
    orderInsert = () => ({ data: null, error: { code: "23505", message: "duplicate key" } });
    const res = await send(completed("acct_shop"));
    expect(res.status).toBe(200);
  });

  it("asks Stripe to retry when saving the order fails", async () => {
    orderInsert = () => ({ data: null, error: { message: "database down" } });
    const res = await send(completed("acct_shop"));
    expect(res.status).toBe(500);
  });

  it("only lets the saved account change a shop's Stripe flags", async () => {
    await send({
      type: "account.updated",
      account: "acct_shop",
      data: { object: { id: "acct_shop", metadata: { zentrabite_business_id: "biz-1" }, charges_enabled: true, payouts_enabled: true, details_submitted: true } },
    });
    const [upd] = writes("update", "businesses");
    expect(filterValue(upd, "id")).toBe("biz-1");
    expect(filterValue(upd, "stripe_account_id")).toBe("acct_shop");
    expect(upd.payload).toEqual({ stripe_charges_enabled: true, stripe_payouts_enabled: true, stripe_details_submitted: true });
  });

  it("reads a subscription's period end from its item", async () => {
    await send({
      type: "customer.subscription.updated",
      data: { object: { metadata: { zentrabite_business_id: "biz-1" }, customer: "cus_1", status: "trialing", items: { data: [{ current_period_end: 1795000000 }] } } },
    });
    const [upd] = writes("update", "businesses");
    expect(upd.payload).toMatchObject({
      stripe_customer_id: "cus_1",
      settings: { subscription_status: "trialing", subscription_period_end: new Date(1795000000 * 1000).toISOString() },
    });
  });

  it("doesn't fail when a subscription has no period", async () => {
    const res = await send({
      type: "customer.subscription.updated",
      data: { object: { metadata: { zentrabite_business_id: "biz-1" }, customer: "cus_1", status: "active", items: { data: [] } } },
    });
    expect(res.status).toBe(200);
    const [upd] = writes("update", "businesses");
    expect((upd.payload as { settings: Record<string, unknown> }).settings).not.toHaveProperty("subscription_period_end");
  });

  it("rejects an event whose signature doesn't check out", async () => {
    h.stripe.webhooks.constructEvent.mockImplementation(() => { throw new Error("No signatures found"); });
    const res = await webhook(new Request("https://dashboard.zentrabite.com/api/stripe/webhook", {
      method: "POST", headers: { "stripe-signature": "t=1,v1=bad" }, body: "{}",
    }));
    expect(res.status).toBe(400);
    expect(h.db.calls).toHaveLength(0);
  });
});

// ─── Stripe setup ────────────────────────────────────────────────────────────

describe("Stripe setup for a shop", () => {
  const start = () => connect(new Request("https://dashboard.zentrabite.com/api/stripe/connect", {
    method: "POST",
    headers: { "content-type": "application/json", origin: "https://dashboard.zentrabite.com" },
    body: JSON.stringify({ business_id: "biz-1" }),
  }));

  function shopWith(stripe_account_id: string | null) {
    h.db = fakeDb({
      "businesses.select": () => ({ data: { name: "Nonna's Kitchen", stripe_account_id, settings: { notify_email: "owner@example.com" } }, error: null }),
    });
  }

  beforeEach(() => {
    h.stripe.v2.core.accounts.create.mockResolvedValue({ id: "acct_new" });
    h.stripe.v2.core.accountLinks.create.mockResolvedValue({ url: "https://connect.stripe.com/setup/test" });
  });

  it("makes the shop its own full Stripe account, with Stripe taking fees and covering losses", async () => {
    shopWith(null);
    const res = await start();
    expect(await res.json()).toEqual({ url: "https://connect.stripe.com/setup/test", account_id: "acct_new" });

    const [params] = h.stripe.v2.core.accounts.create.mock.calls[0];
    expect(params).toMatchObject({
      dashboard: "full",
      display_name: "Nonna's Kitchen",
      contact_email: "owner@example.com",
      identity: { country: "au" },
      configuration: { merchant: { capabilities: { card_payments: { requested: true } } } },
      defaults: { currency: "aud", responsibilities: { fees_collector: "stripe", losses_collector: "stripe" } },
      metadata: { zentrabite_business_id: "biz-1" },
    });

    const [upd] = writes("update", "businesses");
    expect(upd.payload).toMatchObject({ stripe_account_id: "acct_new", stripe_charges_enabled: false });

    const [link] = h.stripe.v2.core.accountLinks.create.mock.calls[0];
    expect(link).toMatchObject({ account: "acct_new", use_case: { type: "account_onboarding", account_onboarding: { configurations: ["merchant"] } } });
  });

  it("replaces an old Express account with a new one", async () => {
    shopWith("acct_old_express");
    h.stripe.v2.core.accounts.retrieve.mockResolvedValue(OLD_EXPRESS);
    await start();
    expect(h.stripe.v2.core.accounts.create).toHaveBeenCalledTimes(1);
    expect(writes("update", "businesses")[0].payload).toMatchObject({ stripe_account_id: "acct_new" });
  });

  it("reuses an account that's already the right kind", async () => {
    shopWith("acct_shop");
    const res = await start();
    expect(h.stripe.v2.core.accounts.create).not.toHaveBeenCalled();
    expect(writes("update", "businesses")).toHaveLength(0);
    expect((await res.json()).account_id).toBe("acct_shop");
  });
});

// ─── Success page ────────────────────────────────────────────────────────────

describe("order success page", () => {
  beforeEach(() => {
    h.db = fakeDb({ "businesses.select": () => ({ data: { stripe_account_id: "acct_shop" }, error: null }) });
    h.stripe.checkout.sessions.retrieve.mockResolvedValue({ amount_total: 3700, customer_details: { email: "sofia@example.com", name: "Sofia" }, metadata: {} });
    h.stripe.checkout.sessions.listLineItems.mockResolvedValue({ data: [{ description: "Margherita", quantity: 2, amount_total: 3700 }] });
  });

  it("reads the order from the shop's own account", async () => {
    const res = await successLookup(new Request("https://dashboard.zentrabite.com/api/store/session?session_id=cs_test_1&subdomain=nonna"));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ items: [{ name: "Margherita", qty: 2, price: 18.5 }], total: 37, customer_email: "sofia@example.com", customer_name: "Sofia" });
    expect(h.stripe.checkout.sessions.retrieve).toHaveBeenCalledWith("cs_test_1", {}, { stripeAccount: "acct_shop" });
  });

  it("needs the shop's address as well as the session", async () => {
    const res = await successLookup(new Request("https://dashboard.zentrabite.com/api/store/session?session_id=cs_test_1"));
    expect(res.status).toBe(400);
  });
});
