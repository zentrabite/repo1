// Tests for win-back offer codes and where orders come from. Stripe, Twilio,
// email and the database are fakes.
//
// What they pin down:
//   • every win-back message carries its own saved code, says it's for online
//     orders and when it ends, and isn't sent when the code can't be saved or
//     the offer can't be used (no online payments, free item, free delivery
//     from a shop that doesn't deliver)
//   • checkout takes the code off on the shop's account, instead of the first
//     order offer, refuses a used or ended one, and only lets one checkout
//     hold a code at a time
//   • the webhook marks the code used and counts the order towards its rule
//   • every order records where it came from

import { beforeEach, describe, expect, it, vi } from "vitest";
import { fakeDb, filterValue, type Query } from "./fake-db";

const h = vi.hoisted(() => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  db: null as any,
  stripe: {
    checkout: { sessions: { create: vi.fn(), expire: vi.fn(), retrieve: vi.fn() } },
    coupons: { create: vi.fn() },
    accounts: { retrieve: vi.fn() },
    v2: { core: { accounts: { retrieve: vi.fn() } } },
    webhooks: { constructEvent: vi.fn() },
  },
  sms: vi.fn(),
  email: vi.fn(),
  capture: vi.fn(async () => {}),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/stripe", () => ({ stripe: h.stripe }));
vi.mock("@/lib/supabase-server", () => ({ createAdminClient: () => h.db, createServerClient: () => h.db }));
vi.mock("@/lib/notify", () => ({ notifyOwnerOfOrder: vi.fn(async () => {}) }));
vi.mock("@/lib/email", () => ({ sendCustomerReceipt: vi.fn(async () => ({ ok: true })), sendMarketingEmail: h.email, sendEmail: vi.fn(async () => ({ ok: true, id: "em" })) }));
// Nobody is held back in these tests (tests/winback-report.test.ts covers that).
vi.mock("@/lib/winback-report", async (importOriginal) => ({ ...(await importOriginal<object>()), heldBack: () => false }));
vi.mock("@/lib/sms", () => ({
  normaliseAuPhone: (p: string) => p,
  checkSmsAllowance: vi.fn(async () => ({ ok: true })),
  withSenderAndOptOut: (m: string, b: string) => `${b}: ${m} Reply STOP to opt out`,
  smsBody: (_k: string, m: string, b: string) => `${b}: ${m} Reply STOP to opt out`,
  canTextMarketing: vi.fn(async () => true),
  sendTwilioSms: h.sms,
}));
vi.mock("@/lib/analytics-server", () => ({ captureServer: h.capture }));
// The consent check right before each send has its own tests (tests/message-kinds.test.ts).
vi.mock("@/lib/unsubscribe", async (importOriginal) => ({ ...(await importOriginal<object>()), canSendMarketing: vi.fn(async () => true) }));
vi.mock("@/lib/request-business", () => ({
  MANAGER_ROLES: ["Owner", "Manager"],
  requireBusiness: vi.fn(async () => ({ ok: true, businessId: "biz-1", userId: "user-1" })),
}));

import {
  cameFrom, cameFromLabel, checkCode, cleanCode, codeDiscount, issueCode, makeCode, offerLabel, readOffer, winbackMessage,
} from "@/lib/offer-codes";
import { GET as runAutomations } from "@/app/api/automations/run/route";
import { canTextMarketing } from "@/lib/sms";
import { POST as checkout } from "@/app/api/store/checkout/route";
import { POST as webhook } from "@/app/api/stripe/webhook/route";
import { GET as storeApi } from "@/app/api/store/[subdomain]/route";
import { sendCustomerReceipt } from "@/lib/email";

const calls = (table: string, op?: Query["op"]) => (h.db.calls as Query[]).filter(q => q.table === table && (!op || q.op === op));
const DAY = 86_400_000;

beforeEach(() => {
  vi.clearAllMocks();
  process.env.CRON_SECRET = "cron-test";
  process.env.STRIPE_WEBHOOK_SECRET = "whsec_platform_test";
  process.env.STRIPE_CONNECT_WEBHOOK_SECRET = "whsec_connect_test";
  h.sms.mockResolvedValue({ status: "sent", sid: "SM1" });
  h.email.mockResolvedValue({ ok: true, id: "em_1" });
  h.stripe.v2.core.accounts.retrieve.mockResolvedValue({ defaults: { responsibilities: { fees_collector: "stripe", losses_collector: "stripe" } } });
  h.stripe.checkout.sessions.create.mockResolvedValue({ id: "cs_new", url: "https://checkout.stripe.com/c/test" });
  h.stripe.coupons.create.mockResolvedValue({ id: "coupon_1" });
});

describe("the offer and the code", () => {
  it("reads only offers a code can give", () => {
    expect(readOffer("percent", "20")).toEqual({ type: "percent", value: 20 });
    expect(readOffer("dollar", 7.5)).toEqual({ type: "dollar", value: 7.5 });
    expect(readOffer("free_delivery", null)).toEqual({ type: "free_delivery", value: 0 });
    expect(readOffer("free_item", 1)).toBeNull();
    expect(readOffer("percent", 0)).toBeNull();
    expect(readOffer("percent", 150)).toBeNull();
    expect(offerLabel({ type: "percent", value: 20 })).toBe("20% off");
    expect(offerLabel({ type: "dollar", value: 7.5 })).toBe("$7.50 off");
    expect(offerLabel({ type: "free_delivery", value: 0 })).toBe("free delivery");
  });

  it("makes codes that are easy to read out and can't be mistyped into another", () => {
    const codes = new Set(Array.from({ length: 500 }, () => makeCode()));
    expect(codes.size).toBe(500);
    for (const c of codes) expect(c).toMatch(/^[A-HJKMNP-Z2-9]{8}$/);
    expect(cleanCode(" k7mp-4qxa ")).toBe("K7MP4QXA");
    expect(cleanCode("K7MP4QX0")).toBeNull();
    expect(cleanCode("SHORT")).toBeNull();
    expect(cleanCode(42)).toBeNull();
  });

  it("takes percent and dollars off the items, and free delivery off the fee, leaving at least 50c", () => {
    expect(codeDiscount({ type: "percent", value: 20 }, 3600, 500)).toEqual({ cents: 720, note: null });
    expect(codeDiscount({ type: "dollar", value: 10 }, 3600, 0)).toEqual({ cents: 1000, note: null });
    expect(codeDiscount({ type: "dollar", value: 10 }, 800, 0)).toEqual({ cents: 750, note: null });
    expect(codeDiscount({ type: "free_delivery", value: 0 }, 3600, 500)).toEqual({ cents: 500, note: null });
    expect(codeDiscount({ type: "free_delivery", value: 0 }, 3600, 0)).toMatchObject({ cents: 0, note: expect.stringMatching(/choose delivery/) });
  });

  it("knows where an order came from", () => {
    expect(cameFrom("counter", false)).toBe("counter");
    expect(cameFrom("google", false)).toBe("google");
    expect(cameFrom("evil<script>", false)).toBe("direct");
    expect(cameFrom(undefined, false)).toBe("direct");
    expect(cameFrom("counter", true)).toBe("winback");
    expect(cameFromLabel("counter")).toBe("Counter QR code");
    expect(cameFromLabel(null)).toBeNull();
  });
});

describe("the message", () => {
  const offer = { type: "percent" as const, value: 20 };
  const link = "https://nonna.zentrabite.com/order?code=K7MP4QXA&src=winback";

  it("fixes the old template's double 'off' and adds the terms", () => {
    const text = winbackMessage(
      "Hey {name}, we miss you — here's {offer} off your next order at {business}. Tap the link to redeem: {link}",
      { name: "Sofia", business: "Nonna's Kitchen" }, { offer, link, code: "K7MP4QXA", ends: "Sat 5 Dec" },
    );
    expect(text).toBe(`Hey Sofia, we miss you — here's 20% off your next order at Nonna's Kitchen. Tap the link to redeem: ${link} Online orders only, ends Sat 5 Dec.`);
  });

  it("reads right for free delivery, and always carries the link", () => {
    const text = winbackMessage("{offer} off your next order at {business}!", { business: "Nonna's" },
      { offer: { type: "free_delivery", value: 0 }, link, ends: "Sat 5 Dec" });
    expect(text).toBe(`Free delivery on your next order at Nonna's! Online orders only, ends Sat 5 Dec. ${link}`);
  });

  it("leaves {ends} and {code} where the owner put them", () => {
    const text = winbackMessage("Use {code} by {ends}: {link}", {}, { offer, link, code: "K7MP4QXA", ends: "Sat 5 Dec" });
    expect(text).toBe(`Use K7MP4QXA by Sat 5 Dec: ${link}`);
  });
});

describe("saving a code", () => {
  it("saves it for the customer and ends it at the end of the 14th day in the shop's time", async () => {
    h.db = fakeDb();
    const now = new Date("2026-11-21T09:00:00Z"); // 7:30pm in Adelaide
    const issued = await issueCode(h.db, { businessId: "biz-1", customerId: "c1", ruleId: "rule-1", offer: { type: "percent", value: 20 }, timezone: "Australia/Adelaide", now });
    expect(issued).not.toBeNull();
    expect(issued!.ends).toBe("Sat 5 Dec");
    expect(issued!.expiresAt.toISOString()).toBe("2026-12-05T13:29:59.000Z"); // 11:59:59pm ACDT
    expect(calls("offer_codes", "insert")[0]!.payload).toMatchObject({
      business_id: "biz-1", code: issued!.code, customer_id: "c1", rule_id: "rule-1", campaign_id: null,
      source: "winback", offer_type: "percent", offer_value: 20, expires_at: "2026-12-05T13:29:59.000Z",
    });
  });

  it("tries another code if one is taken, and gives up on any other error", async () => {
    let n = 0;
    h.db = fakeDb({ "offer_codes.insert": () => (n++ === 0 ? { data: null, error: { code: "23505", message: "dup" } } : { data: null, error: null }) });
    expect(await issueCode(h.db, { businessId: "biz-1", customerId: "c1", offer: { type: "dollar", value: 5 }, timezone: "Australia/Adelaide" })).not.toBeNull();
    expect(calls("offer_codes", "insert")).toHaveLength(2);

    h.db = fakeDb({ "offer_codes.insert": () => ({ data: null, error: { code: "42P01", message: "no table" } }) });
    expect(await issueCode(h.db, { businessId: "biz-1", customerId: "c1", offer: { type: "dollar", value: 5 }, timezone: "Australia/Adelaide" })).toBeNull();
  });

  it("checks a code is live", async () => {
    const row = { id: "oc1", code: "K7MP4QXA", offer_type: "percent", offer_value: "20.00", expires_at: new Date(Date.now() + DAY).toISOString(), redeemed_at: null };
    const at = (r: unknown) => fakeDb({ "offer_codes.select": () => ({ data: r, error: null }) });
    expect(await checkCode(at(row), "biz-1", "K7MP4QXA")).toMatchObject({ ok: true, offer: { type: "percent", value: 20 } });
    expect(await checkCode(at(null), "biz-1", "K7MP4QXA")).toMatchObject({ ok: false, error: expect.stringMatching(/isn't one of ours/) });
    expect(await checkCode(at({ ...row, redeemed_at: "2026-11-20T00:00:00Z" }), "biz-1", "K7MP4QXA")).toMatchObject({ ok: false, error: expect.stringMatching(/already been used/) });
    expect(await checkCode(at({ ...row, expires_at: new Date(Date.now() - 1000).toISOString() }), "biz-1", "K7MP4QXA")).toMatchObject({ ok: false, error: expect.stringMatching(/ended/) });
  });
});

describe("sending win-back", () => {
  const SHOP = { id: "biz-1", name: "Nonna's Kitchen", subdomain: "nonna", settings: {}, stripe_account_id: "acct_shop", stripe_charges_enabled: true };
  const RULE = { id: "rule-1", business_id: "biz-1", name: "14 day", inactive_days: 14, offer_type: "percent", offer_value: 20, channel: "sms", cooldown_days: 30, is_active: true,
    template: "Hey {name}, we miss you — here's {offer} off your next order at {business}. Tap the link to redeem: {link}" };
  const SOFIA = { id: "c1", name: "Sofia Rossi", phone: "+61412345678", email: "s@example.com", last_order_date: new Date(Date.now() - 20 * DAY).toISOString() };
  const run = () => runAutomations(new Request("https://dashboard.zentrabite.com/api/automations/run", { headers: { authorization: "Bearer cron-test" } }));
  const setup = (shop: object, rule: object, extra: Record<string, (q: Query) => { data: unknown; error: null } | undefined> = {}) => {
    h.db = fakeDb({
      "winback_rules.select": () => ({ data: [rule], error: null }),
      "businesses.select": () => ({ data: shop, error: null }),
      "customers.select": () => ({ data: [SOFIA], error: null }),
      ...extra,
    });
  };

  it("texts a real code that works online, and says when it ends", async () => {
    setup(SHOP, RULE);
    expect((await run()).status).toBe(200);
    const saved = calls("offer_codes", "insert")[0]!.payload as { code: string; customer_id: string; rule_id: string };
    expect(saved).toMatchObject({ customer_id: "c1", rule_id: "rule-1", offer_type: "percent", offer_value: 20 });
    const [to, text] = h.sms.mock.calls[0]!;
    expect(to).toBe("+61412345678");
    expect(text).toContain(`here's 20% off your next order`);
    expect(text).toContain(`https://nonna.zentrabite.com/order?code=${saved.code}&src=winback`);
    expect(text).toMatch(/Online orders only, ends \w{3} \d{1,2} \w{3}\./);
    expect(text).toMatch(/Reply STOP/);
    expect(calls("sms_logs", "insert")[0]!.payload).toMatchObject({ customer_id: "c1", rule_id: "rule-1", status: "sent" });
  });

  it("sends nothing, and makes no code, when the customer replied STOP since the run started", async () => {
    setup(SHOP, RULE);
    vi.mocked(canTextMarketing).mockResolvedValueOnce(false);
    await run();
    expect(canTextMarketing).toHaveBeenCalledWith(h.db, "biz-1", "c1", "+61412345678");
    expect(h.sms).not.toHaveBeenCalled();
    expect(calls("offer_codes", "insert")).toHaveLength(0);
    expect(calls("sms_logs", "insert")).toHaveLength(0);
  });

  it("sends nothing, and makes no code, while the shop's marketing texts are paused by a stop rule", async () => {
    setup(SHOP, RULE, { "send_pauses.select": () => ({ data: [{ id: "p1", business_id: "biz-1", channel: "sms", reason: "opt_outs", detail: {} }], error: null }) });
    const res = await run();
    expect(h.sms).not.toHaveBeenCalled();
    expect(calls("offer_codes", "insert")).toHaveLength(0);
    expect(calls("sms_logs", "insert")).toHaveLength(0);
    expect((await res.json()).results).toEqual([expect.objectContaining({ customer_id: "c1", status: "paused" })]);
  });

  it("checks each shop's rates before its run, and saves Twilio's id for its reports", async () => {
    setup(SHOP, RULE);
    await run();
    expect(calls("sms_logs", "select").some(q => filterValue(q, "kind") === "marketing" && filterValue(q, "status") === "sent")).toBe(true);
    expect(calls("sms_logs", "insert")[0]!.payload).toMatchObject({ provider_id: expect.any(String) });
  });

  it("logs every win-back text as marketing", async () => {
    setup(SHOP, RULE);
    await run();
    expect(calls("sms_logs", "insert")[0]!.payload).toMatchObject({ kind: "marketing" });
  });

  it("puts the code in emails too", async () => {
    setup(SHOP, { ...RULE, channel: "email", offer_type: "dollar", offer_value: 10 });
    await run();
    const sent = h.email.mock.calls[0]![0];
    expect(sent.subject).toBe("$10 off at Nonna's Kitchen");
    expect(sent.text).toContain("?code=");
  });

  it("sends nothing when the customer couldn't use the offer", async () => {
    setup({ ...SHOP, stripe_charges_enabled: false }, RULE);
    await run();
    setup(SHOP, { ...RULE, offer_type: "free_item" });
    await run();
    setup(SHOP, { ...RULE, offer_type: "free_delivery" }); // the shop doesn't deliver
    await run();
    expect(h.sms).not.toHaveBeenCalled();
  });

  it("sends free delivery when the shop delivers", async () => {
    setup({ ...SHOP, settings: { ordering: { delivery: { enabled: true, fee: 5, areas: ["5000"] } } } }, { ...RULE, offer_type: "free_delivery", template: "{offer} off your next order: {link}" });
    await run();
    expect(h.sms.mock.calls[0]?.[1]).toMatch(/Free delivery on your next order/);
  });

  it("sends nothing when the code can't be saved", async () => {
    setup(SHOP, RULE, { "offer_codes.insert": () => ({ data: null, error: { code: "42501", message: "denied" } } as never) });
    await run();
    expect(h.sms).not.toHaveBeenCalled();
    expect(calls("sms_logs", "insert")).toHaveLength(0);
  });
});

describe("checkout with a code", () => {
  const SHOP = { id: "biz-1", name: "Nonna's Kitchen", subdomain: "nonna", stripe_account_id: "acct_shop", stripe_charges_enabled: true,
    settings: { ordering: { first_order: { enabled: true, amount: 10, min_order: 30 } } } };
  const MENU = [{ id: "m1", name: "Margherita", price: 18, available: true }];
  const CODE = { id: "oc1", code: "K7MP4QXA", customer_id: "c1", rule_id: "rule-1", campaign_id: null, offer_type: "percent", offer_value: "20.00",
    expires_at: new Date(Date.now() + 3 * DAY).toISOString(), redeemed_at: null, held_session: null, held_until: null };
  const order = (extra: object = {}) => checkout(new Request("https://dashboard.zentrabite.com/api/store/checkout", {
    method: "POST",
    headers: { "content-type": "application/json", origin: "https://nonna.zentrabite.com" },
    body: JSON.stringify({ subdomain: "nonna", items: [{ id: "m1", qty: 2 }], customer: { name: "Sofia", phone: "0412 345 678" }, ...extra }),
  }));
  const setup = (code: object | null, claim: unknown = [{ id: "oc1" }]) => {
    h.db = fakeDb({
      "businesses.select": () => ({ data: SHOP, error: null }),
      "menu_items.select": () => ({ data: MENU, error: null }),
      "offer_codes.select": () => ({ data: code, error: null }),
      "offer_codes.update": () => ({ data: claim, error: null }),
    });
  };

  it("takes the code off instead of the first order offer, holds it, and tells the webhook", async () => {
    setup(CODE);
    expect((await order({ code: "k7mp4qxa", src: "winback" })).status).toBe(200);
    const [coupon, couponOpts] = h.stripe.coupons.create.mock.calls[0]!;
    expect(coupon).toMatchObject({ amount_off: 720, max_redemptions: 1, name: "Offer code K7MP4QXA" });
    expect(couponOpts).toEqual({ stripeAccount: "acct_shop" });
    const [params] = h.stripe.checkout.sessions.create.mock.calls[0]!;
    expect(params.metadata).toMatchObject({ offer_code: "K7MP4QXA", offer_discount: "7.20", came_from: "winback" });
    expect(params.metadata.first_order_discount).toBeUndefined();
    expect(params.cancel_url).toBe("https://nonna.zentrabite.com/store/nonna?code=K7MP4QXA&src=winback");
    const claim = calls("offer_codes", "update")[0]!;
    expect(claim.payload).toMatchObject({ held_session: "cs_new" });
    expect(claim.filters).toEqual(expect.arrayContaining([["id", "oc1"], ["redeemed_at is", null], ["held_session is", null]]));
  });

  it("refuses a used or ended code with the reason", async () => {
    setup({ ...CODE, redeemed_at: "2026-11-20T00:00:00Z" });
    const used = await order({ code: "K7MP4QXA" });
    expect(used.status).toBe(409);
    expect((await used.json()).error).toMatch(/already been used/);
    setup(null);
    expect((await order({ code: "NOTREAL1" })).status).toBe(409);
    expect(h.stripe.checkout.sessions.create).not.toHaveBeenCalled();
  });

  it("ends an older open checkout holding the code before starting a new one", async () => {
    const held = { ...CODE, held_session: "cs_old", held_until: new Date(Date.now() + 10 * 60_000).toISOString() };
    setup(held);
    h.stripe.checkout.sessions.expire.mockResolvedValueOnce({ id: "cs_old", status: "expired" });
    expect((await order({ code: "K7MP4QXA" })).status).toBe(200);
    expect(h.stripe.checkout.sessions.expire).toHaveBeenCalledWith("cs_old", {}, { stripeAccount: "acct_shop" });
    expect(filterValue(calls("offer_codes", "update")[0]!, "held_session")).toBe("cs_old");
  });

  it("won't take a code whose other checkout was just paid", async () => {
    setup({ ...CODE, held_session: "cs_old", held_until: new Date(Date.now() + 10 * 60_000).toISOString() });
    h.stripe.checkout.sessions.expire.mockRejectedValueOnce(new Error("not open"));
    h.stripe.checkout.sessions.retrieve.mockResolvedValueOnce({ id: "cs_old", status: "complete" });
    const res = await order({ code: "K7MP4QXA" });
    expect(res.status).toBe(409);
    expect(h.stripe.checkout.sessions.create).not.toHaveBeenCalled();
  });

  it("ends its own checkout if another one took the code first", async () => {
    setup(CODE, []);
    const res = await order({ code: "K7MP4QXA" });
    expect(res.status).toBe(409);
    expect(h.stripe.checkout.sessions.expire).toHaveBeenCalledWith("cs_new", {}, { stripeAccount: "acct_shop" });
  });

  it("falls back to the first order offer when a free delivery code doesn't apply", async () => {
    setup({ ...CODE, offer_type: "free_delivery", offer_value: "0" });
    expect((await order({ code: "K7MP4QXA" })).status).toBe(200);
    const [params] = h.stripe.checkout.sessions.create.mock.calls[0]!;
    expect(params.metadata).toMatchObject({ first_order_discount: "10.00", came_from: "winback" });
    expect(params.metadata.offer_code).toBeUndefined();
    expect(calls("offer_codes", "update")).toHaveLength(0);
  });

  it("records where an order without a code came from", async () => {
    setup(null);
    await order({ src: "counter" });
    await order({ src: "something-else" });
    await order();
    const from = h.stripe.checkout.sessions.create.mock.calls.map(([p]) => p.metadata.came_from);
    expect(from).toEqual(["counter", "direct", "direct"]);
    expect(h.stripe.checkout.sessions.create.mock.calls[0]![0].cancel_url).toBe("https://nonna.zentrabite.com/store/nonna?src=counter");
  });

  it("passes the visit's random analytics id on, and nothing that isn't one", async () => {
    setup(null);
    const id = "anon-0193f1a2-7b3c-7d4e-8f50-123456789abc";
    await order({ ph: id });
    await order({ ph: "s@example.com" });
    const [a, b] = h.stripe.checkout.sessions.create.mock.calls.map(([p]) => p.metadata);
    expect(a.ph).toBe(id);
    expect(b.ph).toBeUndefined();
  });
});

describe("the ordering page", () => {
  it("shows what a code gives, or why it can't be used", async () => {
    const CODE = { id: "oc1", code: "K7MP4QXA", offer_type: "dollar", offer_value: "10", expires_at: "2026-12-05T13:29:59.000Z", redeemed_at: null };
    let row: object | null = CODE;
    h.db = fakeDb({
      "businesses.select": () => ({ data: { id: "biz-1", name: "Nonna's", subdomain: "nonna", settings: {} }, error: null }),
      "offer_codes.select": () => ({ data: row, error: null }),
    });
    const get = async (q: string) => (await storeApi(new Request(`https://nonna.zentrabite.com/api/store/nonna${q}`), { params: Promise.resolve({ subdomain: "nonna" }) })).json();
    expect((await get("?code=k7mp4qxa")).offer).toEqual({ code: "K7MP4QXA", type: "dollar", value: 10, label: "$10 off", ends: "Sat 5 Dec" });
    row = { ...CODE, redeemed_at: "2026-11-30T00:00:00Z" };
    expect((await get("?code=K7MP4QXA")).offer_problem).toMatch(/already been used/);
    expect((await get("")).offer).toBeNull();
  });
});

describe("the order", () => {
  it("records the code and where it came from, marks the code used and counts it for the rule", async () => {
    h.db = fakeDb({
      "businesses.select": () => ({ data: { stripe_account_id: "acct_shop", settings: {} }, error: null }),
      "menu_items.select": () => ({ data: [{ id: "m1", name: "Margherita", price: 18 }], error: null }),
      "orders.insert": () => ({ data: { id: "order-1" }, error: null }),
      "customers.select": () => ({ data: { id: "c1" }, error: null }),
      "offer_codes.update": () => ({ data: [{ id: "oc1", rule_id: "rule-1", campaign_id: null }], error: null }),
      "winback_rules.select": () => ({ data: { redemptions: 2, revenue: "50.00" }, error: null }),
    });
    h.stripe.webhooks.constructEvent.mockReturnValue({
      type: "checkout.session.completed", account: "acct_shop",
      data: { object: {
        id: "cs_1", payment_status: "paid", amount_total: 2880, payment_intent: "pi_1",
        metadata: { business_id: "biz-1", source: "storefront", customer_name: "Sofia", customer_phone: "+61412345678", customer_email: "s@example.com",
          items_0: JSON.stringify([{ id: "m1", qty: 2, p: 1800 }]), offer_code: "K7MP4QXA", offer_discount: "7.20", came_from: "winback" },
      } },
    });
    const res = await webhook(new Request("https://dashboard.zentrabite.com/api/stripe/webhook", { method: "POST", headers: { "stripe-signature": "t=1,v1=x" }, body: "{}" }));
    expect(res.status).toBe(200);
    expect(calls("orders", "insert")[0]!.payload).toMatchObject({ total: 28.8, discount: 7.2, offer_code: "K7MP4QXA", came_from: "winback" });
    const used = calls("offer_codes", "update")[0]!;
    expect(used.payload).toMatchObject({ order_id: "order-1" });
    expect(used.filters).toEqual([["business_id", "biz-1"], ["code", "K7MP4QXA"], ["redeemed_at is", null]]);
    expect(calls("winback_rules", "update")[0]!.payload).toEqual({ redemptions: 3, revenue: 78.8 });
    expect(calls("campaign_events", "insert")[0]!.payload).toMatchObject({
      winback_rule_id: "rule-1", customer_id: "c1", order_id: "order-1", event_type: "redeemed", revenue_attributed: 28.8, coupon_code: "K7MP4QXA",
    });
    expect(vi.mocked(sendCustomerReceipt).mock.calls[0]![0]).toMatchObject({ discount: 7.2, discountLabel: "Your code" });
    // Counted for the funnel with nothing about the customer.
    const [part, event, distinctId, props] = h.capture.mock.calls[0]! as unknown as [string, string, string, Record<string, unknown>];
    expect([part, event, distinctId]).toEqual(["ordering", "order_paid", "shop-biz-1"]);
    expect(props).toEqual({ shop: "biz-1", total: 28.8, fulfilment: "pickup", came_from: "winback", offer: "code" });
  });

  it("doesn't count a code twice", async () => {
    h.db = fakeDb({
      "businesses.select": () => ({ data: { stripe_account_id: "acct_shop", settings: {} }, error: null }),
      "orders.insert": () => ({ data: { id: "order-2" }, error: null }),
      "offer_codes.update": () => ({ data: [], error: null }),
    });
    h.stripe.webhooks.constructEvent.mockReturnValue({
      type: "checkout.session.completed", account: "acct_shop",
      data: { object: { id: "cs_2", payment_status: "paid", amount_total: 1000, payment_intent: "pi_2",
        metadata: { business_id: "biz-1", source: "storefront", customer_name: "Sofia", items_0: "[]", offer_code: "K7MP4QXA", offer_discount: "5.00", came_from: "winback" } } },
    });
    await webhook(new Request("https://dashboard.zentrabite.com/api/stripe/webhook", { method: "POST", headers: { "stripe-signature": "t=1,v1=x" }, body: "{}" }));
    expect(calls("winback_rules", "update")).toHaveLength(0);
    expect(calls("campaign_events", "insert")).toHaveLength(0);
  });
});
