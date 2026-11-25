// Tests for the first order offer: reading the shop's settings, who gets it,
// that checkout takes it off on the shop's own Stripe account, and that the
// order records it. Stripe and the database are fakes.

import { beforeEach, describe, expect, it, vi } from "vitest";
import { fakeDb, type Query } from "./fake-db";
import { signed } from "./signed-checkout";

const h = vi.hoisted(() => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  db: null as any,
  stripe: {
    checkout: { sessions: { create: vi.fn() } },
    coupons: { create: vi.fn() },
    accounts: { retrieve: vi.fn() },
    v2: { core: { accounts: { retrieve: vi.fn() } } },
    webhooks: { constructEvent: vi.fn() },
  },
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/stripe", () => ({ stripe: h.stripe }));
vi.mock("@/lib/supabase-server", () => ({ createAdminClient: () => h.db, createServerClient: () => h.db }));
vi.mock("@/lib/notify", () => ({ notifyOwnerOfOrder: vi.fn(async () => {}) }));
vi.mock("@/lib/email", () => ({ sendCustomerReceipt: vi.fn(async () => ({ ok: true })) }));
vi.mock("@/lib/sms", () => ({ normaliseAuPhone: (p: string) => p }));

import { firstOrderDiscount, offerProblem, offerText, readFirstOrderOffer } from "@/lib/first-order";
import { POST as checkout } from "@/app/api/store/checkout/route";
import { POST as webhook } from "@/app/api/stripe/webhook/route";
import { sendCustomerReceipt } from "@/lib/email";

const OFFER = { ordering: { first_order: { enabled: true, amount: 10, min_order: 30 } } };
const ON = readFirstOrderOffer(OFFER);
const SHOP = { id: "biz-1", name: "Nonna's Kitchen", subdomain: "nonna", stripe_account_id: "acct_shop", stripe_charges_enabled: true, settings: OFFER };
const MENU = [{ id: "m1", name: "Margherita", price: 18, available: true }];
const calls = (table: string, op?: Query["op"]) => (h.db.calls as Query[]).filter(q => q.table === table && (!op || q.op === op));

beforeEach(() => {
  vi.clearAllMocks();
  process.env.STRIPE_WEBHOOK_SECRET = "whsec_platform_test";
  process.env.STRIPE_CONNECT_WEBHOOK_SECRET = "whsec_connect_test";
  h.stripe.v2.core.accounts.retrieve.mockResolvedValue({ defaults: { responsibilities: { fees_collector: "stripe", losses_collector: "stripe" } } });
  h.stripe.checkout.sessions.create.mockResolvedValue({ url: "https://checkout.stripe.com/c/test" });
  h.stripe.coupons.create.mockResolvedValue({ id: "coupon_1" });
});

describe("the shop's offer", () => {
  it("is off unless it's switched on with a sensible amount and minimum", () => {
    expect(ON).toEqual({ enabled: true, amount: 10, minOrder: 30 });
    expect(readFirstOrderOffer({}).enabled).toBe(false);
    expect(readFirstOrderOffer({ ordering: { first_order: { ...OFFER.ordering.first_order, enabled: false } } }).enabled).toBe(false);
    expect(readFirstOrderOffer({ ordering: { first_order: { enabled: true, amount: 40, min_order: 80 } } }).enabled).toBe(false);
    expect(readFirstOrderOffer({ ordering: { first_order: { enabled: true, amount: 10, min_order: 10 } } }).enabled).toBe(false);
    expect(readFirstOrderOffer({ ordering: { first_order: { enabled: true, amount: "10", min_order: "30" } } }).enabled).toBe(true);
  });

  it("reads as plain words, and says what's wrong with a bad one", () => {
    expect(offerText(ON)).toBe("$10 off your first online order of $30 or more");
    expect(offerText({ enabled: true, amount: 7.5, minOrder: 25 })).toBe("$7.50 off your first online order of $25 or more");
    expect(offerText(readFirstOrderOffer({}))).toBeNull();
    expect(offerProblem(0, 30)).toMatch(/at least \$1/);
    expect(offerProblem(30, 60)).toMatch(/\$25 or less/);
    expect(offerProblem(10, 10)).toMatch(/more than the offer/);
    expect(offerProblem(10, 30)).toBeNull();
  });
});

describe("who gets it", () => {
  beforeEach(() => { h.db = fakeDb(); });

  it("gives it on a first online order over the minimum, with a mobile", async () => {
    expect(await firstOrderDiscount(h.db, "biz-1", ON, "0412 345 678", 3600)).toEqual({ cents: 1000, note: null });
    const [people] = calls("customers", "select");
    expect(people!.filters).toEqual([["business_id", "biz-1"], ["phone", ["+61412345678", "0412345678", "61412345678"]]]);
  });

  it("needs the minimum spend and a mobile number", async () => {
    expect(await firstOrderDiscount(h.db, "biz-1", ON, "0412 345 678", 2999)).toMatchObject({ cents: 0, note: expect.stringMatching(/Spend \$30/) });
    expect(await firstOrderDiscount(h.db, "biz-1", ON, "", 3600)).toMatchObject({ cents: 0, note: expect.stringMatching(/mobile/) });
    expect(await firstOrderDiscount(h.db, "biz-1", ON, "(08) 8123 4567", 3600)).toMatchObject({ cents: 0 });
  });

  it("isn't given again to a mobile that has ordered online before", async () => {
    h.db = fakeDb({
      "customers.select": () => ({ data: [{ id: "c1" }], error: null }),
      "orders.select": () => ({ data: null, error: null, count: 1 }),
    });
    expect(await firstOrderDiscount(h.db, "biz-1", ON, "0412345678", 3600)).toMatchObject({ cents: 0, note: expect.stringMatching(/first online order/) });
    expect(calls("orders", "select")[0]!.filters).toEqual([["business_id", "biz-1"], ["source", "direct"], ["customer_id", ["c1"]]]);
  });

  it("is given to someone the shop knows who hasn't ordered online yet", async () => {
    h.db = fakeDb({
      "customers.select": () => ({ data: [{ id: "c1" }], error: null }),
      "orders.select": () => ({ data: null, error: null, count: 0 }),
    });
    expect((await firstOrderDiscount(h.db, "biz-1", ON, "0412345678", 3600)).cents).toBe(1000);
  });

  it("does nothing when the shop doesn't run one", async () => {
    expect(await firstOrderDiscount(h.db, "biz-1", readFirstOrderOffer({}), "0412345678", 9000)).toEqual({ cents: 0, note: null });
    expect(calls("customers")).toHaveLength(0);
  });
});

describe("checkout", () => {
  const order = (phone: string, qty = 2) => checkout(new Request("https://dashboard.zentrabite.com/api/store/checkout", {
    method: "POST",
    headers: { "content-type": "application/json", origin: "https://dashboard.zentrabite.com" },
    body: JSON.stringify({ subdomain: "nonna", items: [{ id: "m1", qty }], customer: { name: "Sofia", phone } }),
  }));

  beforeEach(() => {
    h.db = fakeDb({
      "businesses.select": () => ({ data: SHOP, error: null }),
      "menu_items.select": () => ({ data: MENU, error: null }),
    });
  });

  it("takes it off with a one-use coupon on the shop's own account, and tells the webhook", async () => {
    expect((await order("0412 345 678")).status).toBe(200);
    const [coupon, couponOpts] = h.stripe.coupons.create.mock.calls[0]!;
    expect(coupon).toMatchObject({ amount_off: 1000, currency: "aud", duration: "once", max_redemptions: 1, name: "First order offer" });
    expect(couponOpts).toEqual({ stripeAccount: "acct_shop" });
    const [params, opts] = h.stripe.checkout.sessions.create.mock.calls[0]!;
    expect(opts).toEqual({ stripeAccount: "acct_shop" });
    expect(params.discounts).toEqual([{ coupon: "coupon_1" }]);
    expect(params.metadata.first_order_discount).toBe("10.00");
    expect(coupon.redeem_by).toBeGreaterThan(params.expires_at);
    // Prices still come from the menu. The discount is separate.
    expect(params.line_items[0].price_data.unit_amount).toBe(1800);
  });

  it("charges full price when it doesn't apply", async () => {
    await order("0412 345 678", 1);    // $18, under the $30 minimum
    await order("");                    // no mobile
    expect(h.stripe.coupons.create).not.toHaveBeenCalled();
    for (const [params] of h.stripe.checkout.sessions.create.mock.calls) {
      expect(params.discounts).toBeUndefined();
      expect(params.metadata.first_order_discount).toBeUndefined();
    }
  });
});

describe("the order", () => {
  it("records how much came off, and the receipt shows it", async () => {
    h.db = fakeDb({
      "businesses.select": () => ({ data: { stripe_account_id: "acct_shop", settings: {} }, error: null }),
      "menu_items.select": () => ({ data: MENU, error: null }),
      "orders.insert": () => ({ data: { id: "order-1" }, error: null }),
      "customers.insert": () => ({ data: { id: "c1" }, error: null }),
    });
    h.stripe.webhooks.constructEvent.mockReturnValue({
      type: "checkout.session.completed", account: "acct_shop",
      data: { object: signed({
        id: "cs_1", payment_status: "paid", amount_total: 2600, payment_intent: "pi_1",
        metadata: { business_id: "biz-1", source: "storefront", customer_name: "Sofia", customer_phone: "+61412345678", customer_email: "s@example.com",
          items_0: JSON.stringify([{ id: "m1", qty: 2, p: 1800 }]), first_order_discount: "10.00" },
      }) },
    });
    const res = await webhook(new Request("https://dashboard.zentrabite.com/api/stripe/webhook", { method: "POST", headers: { "stripe-signature": "t=1,v1=x" }, body: "{}" }));
    expect(res.status).toBe(200);
    expect(calls("orders", "insert")[0]!.payload).toMatchObject({ total: 26, discount: 10 });
    expect(vi.mocked(sendCustomerReceipt).mock.calls[0]![0]).toMatchObject({ total: 26, discount: 10 });
  });
});
