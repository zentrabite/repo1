// Tests for the three kinds of message (lib/message-kinds.ts):
//   • the selling-phrase check catches offers and lets plain order news by
//   • an owner's text is checked the same way on the page and the server
//   • must_reach texts don't say "Reply STOP", marketing texts always do
//   • a STOP that came in mid-run stops the next marketing text
//   • our own must_reach and account messages carry nothing that sells
//   • marketing email goes from the marketing address, under the shop's name

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fakeDb, filterValue, type Query } from "./fake-db";

const h = vi.hoisted(() => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  db: null as any,
  sms: vi.fn(async () => ({ status: "sent" as const, sid: "SM1" })),
}));

vi.mock("server-only", () => ({}));

// Marketing texts don't go between 8pm and 9am in the shop's time zone, so the
// clock is set to the middle of an Adelaide day (1:30pm, 23 Nov 2026).
vi.useFakeTimers({ toFake: ["Date"] });
vi.setSystemTime(new Date("2026-11-23T03:00:00Z"));
vi.mock("@/lib/supabase-server", () => ({ createAdminClient: () => h.db, createServerClient: () => h.db }));
vi.mock("@/lib/request-business", () => ({
  MANAGER_ROLES: ["Owner", "Manager"],
  requireBusiness: vi.fn(async () => ({ ok: true, businessId: "biz-1", userId: "user-1" })),
}));
vi.mock("@/lib/sms", async (importOriginal) => ({ ...(await importOriginal<object>()), sendTwilioSms: h.sms }));

import { checkCustomerText, looksLikePromo, orderedRecently } from "@/lib/message-kinds";
import { canTextMarketing, smsBody } from "@/lib/sms";
import { fromAddress, fromShop, sendCustomerReceipt, sendEmail, sendMarketingEmail } from "@/lib/email";
import { ownerAlertText } from "@/lib/notify";
import { reportEmailText } from "@/lib/winback-report";
import { POST as sendText } from "@/app/api/sms/send/route";

const NOW = new Date("2026-11-23T03:00:00Z");
const CUST = "5b1e7c2a-3d4f-4a6b-8c9d-0e1f2a3b4c5d";
const daysAgo = (d: number) => new Date(NOW.getTime() - d * 86_400_000).toISOString();

describe("what reads like an offer", () => {
  it.each([
    "20% off tonight", "Take $5 off your next order", "Half price pizza Tuesdays", "Free delivery this weekend",
    "Use code SAVE10", "We miss you!", "Happy hour 4 to 6", "Try our new menu", "Double points this week",
    "Come back soon", "Limited time only", "2 for 1 on mains", "Tonight's specials", "Great deals all week",
    "Spend $30 and save", "A special offer for you", "Win a pizza party", "Get a free coffee",
  ])("catches %j", text => {
    expect(looksLikePromo(text)).not.toBeNull();
  });

  it.each([
    "Your order is ready for pick-up", "Sorry, we're out of garlic bread. Is chips ok instead?",
    "Your pick-up time moved to 6:30pm", "Sorry we missed you at pick-up, your order is at the counter",
    "We left the drink off your order, sorry. We've refunded it.", "No hurry, it'll be ready at 6",
    "Your payment didn't go through, please order again", "We'll deal with it now",
    "Your refund is on its way", "Your driver is 5 minutes away", "The lasagne is off the menu tonight, we've refunded it",
    "We ran out of the gluten free base, call us if that's a problem", "Your win-back report is ready",
  ])("lets %j by", text => {
    expect(looksLikePromo(text)).toBeNull();
  });
});

describe("an owner's text to one customer", () => {
  const agreed = { marketing_opt_in: true, opted_out: false, last_order_date: daysAgo(40) };
  const notAgreed = { marketing_opt_in: false, opted_out: false, last_order_date: daysAgo(40) };
  const stopped = (days: number) => ({ marketing_opt_in: true, opted_out: true, last_order_date: daysAgo(days) });

  it("about their order goes to anyone, unless it sells", () => {
    expect(checkCustomerText("must_reach", "Your order is ready", notAgreed, NOW)).toEqual({ ok: true, kind: "must_reach" });
    const promo = checkCustomerText("must_reach", "Your order is ready, and 20% off next time!", notAgreed, NOW);
    expect(promo).toMatchObject({ ok: false });
    expect(!promo.ok && promo.reason).toContain("20% off");
  });

  it("reaches someone who opted out only about a recent order", () => {
    expect(orderedRecently(daysAgo(6), NOW)).toBe(true);
    expect(orderedRecently(daysAgo(8), NOW)).toBe(false);
    expect(checkCustomerText("must_reach", "Your order is running 10 minutes late", stopped(1), NOW).ok).toBe(true);
    expect(checkCustomerText("must_reach", "Your order is running 10 minutes late", stopped(30), NOW).ok).toBe(false);
  });

  it("an offer or news only to someone who agreed and didn't opt out", () => {
    expect(checkCustomerText("marketing", "20% off tonight", agreed, NOW)).toEqual({ ok: true, kind: "marketing" });
    expect(checkCustomerText("marketing", "20% off tonight", notAgreed, NOW).ok).toBe(false);
    expect(checkCustomerText("marketing", "20% off tonight", stopped(1), NOW).ok).toBe(false);
  });
});

describe("how a text is written", () => {
  it("names the shop, and only marketing says Reply STOP", () => {
    expect(smsBody("must_reach", "Your order is ready", "Nonna's Kitchen")).toBe("Nonna's Kitchen: Your order is ready");
    expect(smsBody("marketing", "20% off tonight", "Nonna's Kitchen")).toBe("Nonna's Kitchen: 20% off tonight Reply STOP to opt out");
    expect(smsBody("marketing", "Nonna's Kitchen has 20% off. Reply STOP to opt out", "Nonna's Kitchen")).toBe("Nonna's Kitchen has 20% off. Reply STOP to opt out");
  });

  it("the owner's order alert is plain, cheap to send and sells nothing", () => {
    const text = ownerAlertText("Nonna's Kitchen", 26, "3f2a9c1b", "Pick-up 6:30pm");
    expect(text).toBe("New order $26.00 at Nonna's Kitchen (3f2a9c1b). Pick-up 6:30pm");
    expect(text).toMatch(/^[\x20-\x7E]*$/); // no emoji or long dashes, so one standard text
    expect(looksLikePromo(text)).toBeNull();
  });
});

describe("the consent check right before a marketing text", () => {
  function customers(row: object | null, sameNumberOut: boolean) {
    h.db = fakeDb({
      "customers.select": q => filterValue(q, "id")
        ? { data: row, error: null }
        : { data: sameNumberOut ? [{ id: "c-old" }] : [], error: null },
    });
  }

  it("needs agreement, no opt-out, and nobody else at the shop with that number opted out", async () => {
    customers({ id: "c1", opted_out: false, marketing_opt_in: true }, false);
    expect(await canTextMarketing(h.db, "biz-1", "c1", "0412 345 678")).toBe(true);
    const sameNumber = (h.db.calls as Query[]).find(q => q.table === "customers" && filterValue(q, "opted_out") === true)!;
    expect(filterValue(sameNumber, "phone")).toEqual(expect.arrayContaining(["+61412345678", "0412345678"]));
    expect(filterValue(sameNumber, "business_id")).toBe("biz-1");

    customers({ id: "c1", opted_out: true, marketing_opt_in: true }, false);
    expect(await canTextMarketing(h.db, "biz-1", "c1", "0412345678")).toBe(false);
    customers({ id: "c1", opted_out: false, marketing_opt_in: false }, false);
    expect(await canTextMarketing(h.db, "biz-1", "c1", "0412345678")).toBe(false);
    customers({ id: "c1", opted_out: false, marketing_opt_in: true }, true);
    expect(await canTextMarketing(h.db, "biz-1", "c1", "0412345678")).toBe(false);
    customers(null, false);
    expect(await canTextMarketing(h.db, "biz-1", "c1", "0412345678")).toBe(false);
  });
});

describe("POST /api/sms/send", () => {
  function shop(customer: object | null, sameNumberOut = false) {
    h.db = fakeDb({
      "businesses.select": () => ({ data: { name: "Nonna's Kitchen", settings: {} }, error: null }),
      "customers.select": q => filterValue(q, "id")
        ? { data: customer, error: null }
        : { data: sameNumberOut ? [{ id: "c-old" }] : [], error: null },
      "sms_logs.select": () => ({ data: null, error: null, count: 0 }),
    });
  }
  const post = (body: object) => sendText(new Request("http://x/api/sms/send", { method: "POST", body: JSON.stringify(body) }));
  const logged = () => (h.db.calls as Query[]).find(q => q.table === "sms_logs" && q.op === "insert")?.payload as Record<string, unknown> | undefined;
  const recent = { id: "c1", phone: "0412345678", opted_out: true, marketing_opt_in: false, last_order_date: new Date(Date.now() - 86_400_000).toISOString() };

  beforeEach(() => { vi.clearAllMocks(); });

  it("sends order news to someone who opted out after a recent order, without Reply STOP", async () => {
    shop(recent);
    const res = await post({ customerId: "c1", kind: "must_reach", message: "Your order is running 10 minutes late" });
    expect(res.status).toBe(200);
    expect(h.sms).toHaveBeenCalledWith("0412345678", "Nonna's Kitchen: Your order is running 10 minutes late");
    expect(logged()).toMatchObject({ kind: "must_reach", customer_id: "c1", business_id: "biz-1", status: "sent" });
  });

  it("refuses order news that sells, and an offer to someone who didn't agree", async () => {
    shop(recent);
    let res = await post({ customerId: "c1", kind: "must_reach", message: "Ready soon! 20% off your next one" });
    expect(res.status).toBe(409);
    shop({ ...recent, opted_out: false });
    res = await post({ customerId: "c1", kind: "marketing", message: "20% off tonight" });
    expect(res.status).toBe(409);
    expect((await res.json()).error).toContain("haven't agreed");
    expect(h.sms).not.toHaveBeenCalled();
    expect(logged()).toBeUndefined();
  });

  it("sends an offer to someone who agreed, with Reply STOP, logged as marketing", async () => {
    shop({ ...recent, opted_out: false, marketing_opt_in: true });
    const res = await post({ customerId: "c1", kind: "marketing", message: "20% off tonight" });
    expect(res.status).toBe(200);
    expect(h.sms).toHaveBeenCalledWith("0412345678", "Nonna's Kitchen: 20% off tonight Reply STOP to opt out");
    expect(logged()).toMatchObject({ kind: "marketing" });
  });

  it("refuses an offer between 8pm and 9am at the shop, but an order text goes", async () => {
    vi.setSystemTime(new Date("2026-11-23T10:00:00Z")); // 8:30pm in Adelaide
    try {
      shop({ ...recent, opted_out: false, marketing_opt_in: true, last_order_date: new Date(Date.now() - 86_400_000).toISOString() });
      const offer = await post({ customerId: "c1", kind: "marketing", message: "20% off tonight" });
      expect(offer.status).toBe(409);
      expect((await offer.json()).error).toContain("between 8pm and 9am");
      expect((await post({ customerId: "c1", kind: "must_reach", message: "Your order is ready" })).status).toBe(200);
      expect(h.sms).toHaveBeenCalledTimes(1);
    } finally {
      vi.setSystemTime(new Date("2026-11-23T03:00:00Z"));
    }
  });

  it("treats a missing kind as an offer, and a STOP on another record with the same number counts", async () => {
    shop({ ...recent, opted_out: false, marketing_opt_in: true }, true);
    expect((await post({ customerId: "c1", message: "20% off tonight" })).status).toBe(409);
    shop({ ...recent, opted_out: false, marketing_opt_in: false });
    expect((await post({ customerId: "c1", message: "Your order is ready" })).status).toBe(409);
    expect(h.sms).not.toHaveBeenCalled();
  });

  it("only texts a customer of this shop, never a typed number", async () => {
    shop(null);
    expect((await post({ customerId: "c-other", kind: "must_reach", message: "Your order is ready" })).status).toBe(404);
    expect((await post({ to: "0412345678", kind: "must_reach", message: "Your order is ready" })).status).toBe(400);
    expect(h.sms).not.toHaveBeenCalled();
  });
});

describe("our own must_reach and account emails", () => {
  const sent = () => (fetch as unknown as ReturnType<typeof vi.fn>).mock.calls.map(([, init]) => JSON.parse(String((init as RequestInit).body)));
  const words = (html: string) => html.replace(/<[^>]+>/g, " ");

  beforeEach(() => {
    vi.stubEnv("RESEND_API_KEY", "re_test");
    vi.stubEnv("RESEND_FROM_EMAIL", "ZentraBite <orders@send.zentrabite.com>");
    vi.stubEnv("RESEND_MARKETING_FROM_EMAIL", "ZentraBite <offers@news.zentrabite.com>");
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ id: "em_1" }))));
  });
  afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

  it("a receipt sells nothing, comes from the shop and replies reach it", async () => {
    await sendCustomerReceipt({
      to: "sam@example.com", customerName: "Sam", businessName: "Nonna's Kitchen", orderNumber: "3f2a9c1b",
      total: 26, items: [{ name: "Margherita", qty: 1, price: 26 }], pickupLabel: "6:30pm",
      discount: 5, discountLabel: "Your code", replyTo: "orders@nonnas.com.au",
    });
    const [mail] = sent();
    expect(mail.from).toBe("\"Nonna's Kitchen via ZentraBite\" <orders@send.zentrabite.com>");
    expect(mail.reply_to).toBe("orders@nonnas.com.au");
    expect(mail.text).toContain("Reply to this email and it goes to Nonna's Kitchen");
    for (const part of [mail.text, words(mail.html)]) {
      expect(looksLikePromo(part)).toBeNull();
      expect(part.toLowerCase()).not.toContain("reorder");
    }
  });

  it("a receipt with no reply address doesn't promise one", async () => {
    await sendCustomerReceipt({ to: "sam@example.com", customerName: "Sam", businessName: "Nonna's Kitchen", orderNumber: "1", total: 10, items: [] });
    const [mail] = sent();
    expect(mail.reply_to).toBeUndefined();
    expect(mail.text).toContain("Contact Nonna's Kitchen directly");
    expect(mail.text).not.toContain("Reply to this email");
  });

  it("the monthly report sells nothing", () => {
    const text = reportEmailText({
      month: "2026-10", label: "October 2026", sent: 40, sentBack: 12, sentRevenue: 480, held: 35, heldBackCount: 6,
      stillCounting: 0, extraBack: 5, codesUsed: 9, codeRevenue: 310, sources: [{ cameFrom: "winback", label: "Win-back", orders: 9, revenue: 310 }],
    } as Parameters<typeof reportEmailText>[0], "Nonna's Kitchen", "https://dashboard.zentrabite.com/zentra-rewards/report");
    expect(looksLikePromo(text)).toBeNull();
  });

  it("account mail and marketing mail go from their own addresses", async () => {
    expect(fromAddress("must_reach")).toBe("ZentraBite <orders@send.zentrabite.com>");
    expect(fromAddress("account")).toBe("ZentraBite <orders@send.zentrabite.com>");
    expect(fromAddress("marketing")).toBe("ZentraBite <offers@news.zentrabite.com>");
    vi.stubEnv("RESEND_MARKETING_FROM_EMAIL", "");
    expect(fromAddress("marketing")).toBe("ZentraBite <orders@send.zentrabite.com>");
    expect(fromShop("hello@zentrabite.com", "Joe's <Pizza>, \"Best\"")).toBe("\"Joe's Pizza Best via ZentraBite\" <hello@zentrabite.com>");
  });

  it("a marketing email goes from the marketing address under the shop's name, and never through sendEmail", async () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://dashboard.zentrabite.com");
    h.db = fakeDb({
      "customers.select": q => filterValue(q, "id") ? { data: { id: CUST, opted_out: false, marketing_opt_in: true }, error: null } : { data: [], error: null },
    });
    const out = await sendMarketingEmail({ db: h.db, businessId: "biz-1", businessName: "Nonna's Kitchen", customerId: CUST, to: "sam@example.com", subject: "20% off", text: "20% off tonight" });
    expect(out.ok).toBe(true);
    expect(sent()[0].from).toBe("\"Nonna's Kitchen via ZentraBite\" <offers@news.zentrabite.com>");
    expect(sent()[0].headers["List-Unsubscribe"]).toMatch(/^<https:\/\//);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const refused = await sendEmail({ kind: "marketing" as any, to: "sam@example.com", subject: "20% off", text: "20% off" });
    expect(refused.ok).toBe(false);
    expect(sent()).toHaveLength(1);
  });
});
