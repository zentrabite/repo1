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
//   • options (sizes, extras) are priced from the menu, a required one can't
//     be skipped, and the order keeps them with the price charged
//   • a closed or paused shop takes no orders, the pick-up time is checked,
//     and the order keeps it
//   • delivery by the shop's own drivers only goes where the shop delivers,
//     over its minimum, with its fee, and the order keeps the address and note

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
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
// A pizza with a required size and up to two extras (migration 018).
const PIZZA_OPTIONS = [
  { id: "g-size", name: "Size", min: 1, max: 1, choices: [
    { id: "small", name: "Small", price: 0, available: true },
    { id: "large", name: "Large", price: 4.5, available: true },
    { id: "family", name: "Family", price: 9, available: false },
  ] },
  { id: "g-extras", name: "Extras", min: 0, max: 2, choices: [
    { id: "cheese", name: "Extra cheese", price: 2, available: true },
    { id: "olives", name: "Olives", price: 1.5, available: true },
  ] },
];
const MENU_WITH_OPTIONS = [{ ...MENU[0], options: PIZZA_OPTIONS }];

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

  describe("opening hours and pick-up time", () => {
    // Every day 5pm to 9pm in Adelaide, 20 minutes prep.
    const day = { open: "17:00", close: "21:00", closed: false };
    const hours = { mon: day, tue: day, wed: day, thu: day, fri: day, sat: day, sun: day };
    const shopWith = (ordering: object) => {
      h.db = fakeDb({
        "businesses.select": () => ({ data: { ...shop, settings: { hours, timezone: "Australia/Adelaide", ordering } }, error: null }),
        "menu_items.select": () => ({ data: MENU, error: null }),
      });
    };
    const orderAt = (pickup: unknown) => new Request("https://dashboard.zentrabite.com/api/store/checkout", {
      method: "POST",
      headers: { "content-type": "application/json", origin: "https://dashboard.zentrabite.com" },
      body: JSON.stringify({ subdomain: "nonna", items: [{ id: "m1", qty: 1 }], customer: { name: "Sofia" }, pickup }),
    });
    // Friday 20 Nov 2026 in Adelaide, 10:30 ahead of UTC.
    const adl = (hm: string) => {
      const [hh, mm] = hm.split(":").map(Number) as [number, number];
      return new Date(Date.UTC(2026, 10, 20, hh, mm) - 10.5 * 3600_000);
    };

    beforeEach(() => { vi.useFakeTimers({ toFake: ["Date"] }); });
    afterEach(() => { vi.useRealTimers(); });

    it("takes an order for as soon as possible while open, and saves when for", async () => {
      vi.setSystemTime(adl("18:02"));
      shopWith({ prep_minutes: 20 });
      const res = await checkout(orderAt("asap"));
      expect(res.status).toBe(200);
      const [params] = h.stripe.checkout.sessions.create.mock.calls[0];
      expect(params.metadata.pickup_at).toBe(adl("18:25").toISOString());
      expect(params.metadata.pickup_asap).toBe("1");
      // The Stripe page can't be paid more than about half an hour later.
      expect(params.expires_at).toBe(Math.floor(adl("18:02").getTime() / 1000) + 31 * 60);
    });

    it("takes a later time today", async () => {
      vi.setSystemTime(adl("18:02"));
      shopWith({});
      const res = await checkout(orderAt(adl("19:30").toISOString()));
      expect(res.status).toBe(200);
      const [params] = h.stripe.checkout.sessions.create.mock.calls[0];
      expect(params.metadata).toMatchObject({ pickup_at: adl("19:30").toISOString(), pickup_asap: "0" });
    });

    it("refuses an order when the shop is closed", async () => {
      vi.setSystemTime(adl("22:00"));
      shopWith({});
      const res = await checkout(orderAt("asap"));
      expect(res.status).toBe(409);
      expect((await res.json()).error).toBe("We're closed for online orders right now. Opens tomorrow 5pm.");
      expect(h.stripe.checkout.sessions.create).not.toHaveBeenCalled();
    });

    it("refuses an order while online orders are paused", async () => {
      vi.setSystemTime(adl("18:00"));
      shopWith({ paused: true });
      const res = await checkout(orderAt("asap"));
      expect(res.status).toBe(409);
      expect(h.stripe.checkout.sessions.create).not.toHaveBeenCalled();
    });

    it("refuses a pick-up time that has gone or is after closing", async () => {
      vi.setSystemTime(adl("18:02"));
      shopWith({});
      for (const pickup of [adl("18:15").toISOString(), adl("21:30").toISOString(), "tomorrow"]) {
        const res = await checkout(orderAt(pickup));
        expect(res.status).toBe(409);
      }
      expect(h.stripe.checkout.sessions.create).not.toHaveBeenCalled();
    });
  });

  describe("delivery by the shop's own drivers, and the note", () => {
    const day = { open: "17:00", close: "21:00", closed: false };
    const hours = { mon: day, tue: day, wed: day, thu: day, fri: day, sat: day, sun: day };
    const delivery = { enabled: true, fee: 6, min_order: 30, extra_minutes: 15, areas: ["norwood", "5067"] };
    const shopWith = (d: object = delivery) => {
      h.db = fakeDb({
        "businesses.select": () => ({ data: { ...shop, settings: { hours, timezone: "Australia/Adelaide", ordering: { prep_minutes: 20, delivery: d } } }, error: null }),
        "menu_items.select": () => ({ data: MENU, error: null }),
      });
    };
    const deliver = (over: Record<string, unknown> = {}) => new Request("https://dashboard.zentrabite.com/api/store/checkout", {
      method: "POST",
      headers: { "content-type": "application/json", origin: "https://dashboard.zentrabite.com" },
      body: JSON.stringify({
        subdomain: "nonna", items: [{ id: "m1", qty: 2 }], customer: { name: "Sofia", phone: "0412 345 678" },
        pickup: "asap", fulfilment: "delivery", address: { line1: "12 Basil Lane", suburb: "Norwood", postcode: "5067" },
        note: "Ring the bell", ...over,
      }),
    });
    const adl = (hm: string) => {
      const [hh, mm] = hm.split(":").map(Number) as [number, number];
      return new Date(Date.UTC(2026, 10, 20, hh, mm) - 10.5 * 3600_000);
    };

    beforeEach(() => { vi.useFakeTimers({ toFake: ["Date"] }); vi.setSystemTime(adl("18:00")); });
    afterEach(() => { vi.useRealTimers(); });

    it("charges the delivery fee and keeps the address, the note and the later time", async () => {
      shopWith();
      const res = await checkout(deliver());
      expect(res.status).toBe(200);
      const [params] = h.stripe.checkout.sessions.create.mock.calls[0];
      expect(params.line_items.at(-1)).toEqual({ price_data: { currency: "aud", product_data: { name: "Delivery" }, unit_amount: 600 }, quantity: 1 });
      expect(params.metadata).toMatchObject({
        fulfillment_type: "delivery", delivery_address: "12 Basil Lane, Norwood 5067", delivery_fee: "6.00", note: "Ring the bell",
        // 6pm plus 20 minutes prep plus 15 minutes drive
        pickup_at: adl("18:35").toISOString(),
      });
    });

    it("refuses an address the shop doesn't deliver to", async () => {
      shopWith();
      const res = await checkout(deliver({ address: { line1: "1 Beach Rd", suburb: "Glenelg", postcode: "5045" } }));
      expect(res.status).toBe(409);
      expect(h.stripe.checkout.sessions.create).not.toHaveBeenCalled();
    });

    it("refuses an order under the minimum, without a phone, or when delivery is off", async () => {
      shopWith({ ...delivery, min_order: 50 });
      expect((await checkout(deliver())).status).toBe(409);
      shopWith();
      expect((await checkout(deliver({ customer: { name: "Sofia" } }))).status).toBe(400);
      shopWith({ ...delivery, enabled: false });
      expect((await checkout(deliver())).status).toBe(409);
      expect(h.stripe.checkout.sessions.create).not.toHaveBeenCalled();
    });

    it("keeps a note on a pick-up order, with no delivery fee", async () => {
      shopWith();
      const res = await checkout(deliver({ fulfilment: "pickup", address: undefined, note: "No onions" }));
      expect(res.status).toBe(200);
      const [params] = h.stripe.checkout.sessions.create.mock.calls[0];
      expect(params.line_items).toHaveLength(1);
      expect(params.metadata).toMatchObject({ fulfillment_type: "pickup", note: "No onions" });
      expect(params.metadata.delivery_address).toBeUndefined();
    });
  });

  describe("with sizes and extras", () => {
    beforeEach(() => {
      h.db = fakeDb({
        "businesses.select": () => ({ data: shop, error: null }),
        "menu_items.select": () => ({ data: MENU_WITH_OPTIONS, error: null }),
      });
    });

    it("prices the options from the menu and names them on the line", async () => {
      const res = await checkout(order([{ id: "m1", qty: 1, price: 0.01, options: ["olives", "large"] }]));
      expect(res.status).toBe(200);
      const [params] = h.stripe.checkout.sessions.create.mock.calls[0];
      expect(params.line_items).toEqual([
        { price_data: { currency: "aud", product_data: { name: "Margherita (Large, Olives)" }, unit_amount: 2450 }, quantity: 1 },
      ]);
      // The webhook gets the options and the price charged.
      expect(JSON.parse(params.metadata.items_0)).toEqual([{ id: "m1", qty: 1, p: 2450, o: ["large", "olives"] }]);
    });

    it("merges the same picks into one line and keeps different picks apart", async () => {
      await checkout(order([
        { id: "m1", qty: 1, options: ["large", "cheese"] },
        { id: "m1", qty: 2, options: ["cheese", "large"] },
        { id: "m1", qty: 1, options: ["small"] },
      ]));
      const [params] = h.stripe.checkout.sessions.create.mock.calls[0];
      expect(params.line_items.map((l: { quantity: number; price_data: { unit_amount: number } }) => [l.quantity, l.price_data.unit_amount]))
        .toEqual([[3, 2500], [1, 1850]]);
    });

    it("refuses an order that skips a required choice", async () => {
      const res = await checkout(order([{ id: "m1", qty: 1, options: ["cheese"] }]));
      expect(res.status).toBe(409);
      expect((await res.json()).error).toBe("Margherita: Please choose size.");
      expect(h.stripe.checkout.sessions.create).not.toHaveBeenCalled();
    });

    it("refuses a sold-out choice, a made-up one and too many extras", async () => {
      for (const options of [["family"], ["small", "gold-leaf"], ["small", "cheese", "olives", "cheese"], ["small", "large"]]) {
        const res = await checkout(order([{ id: "m1", qty: 1, options }]));
        expect(res.status).toBe(409);
      }
      expect(h.stripe.checkout.sessions.create).not.toHaveBeenCalled();
    });
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

  it("keeps the options and the price charged, even if the menu changed since", async () => {
    h.db = fakeDb({
      "businesses.select": q => q.columns?.includes("stripe_account_id")
        ? { data: { stripe_account_id: "acct_shop" }, error: null }
        : { data: { name: "Nonna's Kitchen", subdomain: "nonna", settings: {} }, error: null },
      // The pizza went up to $20 after the customer paid $24.50 for a large with olives.
      "menu_items.select": () => ({ data: [{ ...MENU_WITH_OPTIONS[0], price: 20 }], error: null }),
      "customers.select":  () => ({ data: null, error: null }),
      "customers.insert":  () => ({ data: { id: "cust-1" }, error: null }),
      "orders.insert":     q => orderInsert(q),
    });
    const session = { ...paidSession, amount_total: 2450, metadata: { ...paidSession.metadata, items_0: JSON.stringify([{ id: "m1", qty: 1, p: 2450, o: ["large", "olives"] }]) } };
    const res = await send(completed("acct_shop", session));
    expect(res.status).toBe(200);

    const [ins] = writes("insert", "orders");
    expect((ins.payload as { items: unknown }).items).toEqual([{
      id: "m1", name: "Margherita", price: 24.5, qty: 1,
      options: [{ group: "Size", name: "Large", price: 4.5 }, { group: "Extras", name: "Olives", price: 1.5 }],
    }]);
    const { sendCustomerReceipt } = await import("@/lib/email");
    expect(vi.mocked(sendCustomerReceipt).mock.calls[0][0].items).toEqual([{ name: "Margherita (Large, Olives)", qty: 1, price: 24.5 }]);
  });

  it("saves the pick-up time on the order and tells the shop and the customer", async () => {
    const session = { ...paidSession, metadata: { ...paidSession.metadata, pickup_at: "2026-11-20T08:00:00.000Z", pickup_asap: "0" } };
    await send(completed("acct_shop", session));
    const [ins] = writes("insert", "orders");
    expect(ins.payload).toMatchObject({ pickup_at: "2026-11-20T08:00:00.000Z", pickup_asap: false, fulfillment_type: "pickup" });
    // 8am UTC is 6:30pm in Adelaide, the time zone used when none is saved.
    const { sendCustomerReceipt } = await import("@/lib/email");
    expect(vi.mocked(sendCustomerReceipt).mock.calls[0][0].pickupLabel).toBe("6:30pm");
    const { notifyOwnerOfOrder } = await import("@/lib/notify");
    expect(vi.mocked(notifyOwnerOfOrder).mock.calls[0][0].pickupLabel).toBe("6:30pm");
  });

  it("saves a delivery order's address, fee and note", async () => {
    const session = { ...paidSession, metadata: { ...paidSession.metadata,
      fulfillment_type: "delivery", delivery_address: "12 Basil Lane, Norwood 5067", delivery_fee: "6.00", note: "Ring the bell",
      pickup_at: "2026-11-20T08:00:00.000Z", pickup_asap: "1" } };
    await send(completed("acct_shop", session));
    const [ins] = writes("insert", "orders");
    expect(ins.payload).toMatchObject({
      fulfillment_type: "delivery", ship_to: { address: "12 Basil Lane, Norwood 5067" }, delivery_fee: 6, notes: "Ring the bell",
    });
    const { notifyOwnerOfOrder } = await import("@/lib/notify");
    expect(vi.mocked(notifyOwnerOfOrder).mock.calls[0][0]).toMatchObject({
      delivery: true, deliveryAddress: "12 Basil Lane, Norwood 5067", note: "Ring the bell", pickupLabel: "As soon as possible, about 6:30pm",
    });
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
    expect(await res.json()).toEqual({ items: [{ name: "Margherita", qty: 2, price: 18.5 }], total: 37, customer_email: "sofia@example.com", customer_name: "Sofia", pickup: null, delivery: false, delivery_address: null, note: null });
    expect(h.stripe.checkout.sessions.retrieve).toHaveBeenCalledWith("cs_test_1", {}, { stripeAccount: "acct_shop" });
  });

  it("shows when to pick it up, in the shop's time", async () => {
    h.db = fakeDb({ "businesses.select": () => ({ data: { stripe_account_id: "acct_shop", settings: { timezone: "Australia/Perth" } }, error: null }) });
    h.stripe.checkout.sessions.retrieve.mockResolvedValue({ amount_total: 3700, customer_details: {}, metadata: { pickup_at: "2026-11-20T10:15:00.000Z", pickup_asap: "1" } });
    const res = await successLookup(new Request("https://dashboard.zentrabite.com/api/store/session?session_id=cs_test_1&subdomain=nonna"));
    expect((await res.json()).pickup).toBe("As soon as possible, about 6:15pm");
  });

  it("needs the shop's address as well as the session", async () => {
    const res = await successLookup(new Request("https://dashboard.zentrabite.com/api/store/session?session_id=cs_test_1"));
    expect(res.status).toBe(400);
  });
});
