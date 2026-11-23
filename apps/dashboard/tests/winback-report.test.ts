// Tests for the win-back holdout and the owner's monthly report. The
// database, Twilio and email are fakes.
//
// What they pin down:
//   • about 1 in 10 customers due a message is held back, logged and sent
//     nothing, and the same run gives the same answer
//   • the report compares customers messaged with customers held back,
//     counts each customer once a month, only counts orders within 14 days,
//     and won't claim a result from too few held back
//   • the report email goes out once, on the 15th, for the month before

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fakeDb, filterValue, type Query } from "./fake-db";

const h = vi.hoisted(() => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  db: null as any,
  sms: vi.fn(),
  sendEmail: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase-server", () => ({ createAdminClient: () => h.db, createServerClient: () => h.db }));
vi.mock("@/lib/email", () => ({ sendMarketingEmail: vi.fn(async () => ({ ok: true, id: "em" })), sendEmail: h.sendEmail }));
vi.mock("@/lib/sms", () => ({
  checkSmsAllowance: vi.fn(async () => ({ ok: true })),
  withSenderAndOptOut: (m: string) => m,
  smsBody: (_k: string, m: string) => m,
  canTextMarketing: vi.fn(async () => true),
  sendTwilioSms: h.sms,
}));
vi.mock("@/lib/request-business", () => ({
  MANAGER_ROLES: ["Owner", "Manager"],
  requireBusiness: vi.fn(async () => ({ ok: true, businessId: "biz-1", userId: "user-1" })),
}));

import { buildWinbackReport, heldBack, HOLDOUT_EVERY, reportEmailText, sendMonthlyReports, verdict } from "@/lib/winback-report";
import { GET as runAutomations } from "@/app/api/automations/run/route";
import { GET as reportApi } from "@/app/api/winback/report/route";

const calls = (table: string, op?: Query["op"]) => (h.db.calls as Query[]).filter(q => q.table === table && (!op || q.op === op));
const TZ = "Australia/Adelaide";

beforeEach(() => {
  vi.clearAllMocks();
  process.env.CRON_SECRET = "cron-test";
  h.sms.mockResolvedValue({ status: "sent", sid: "SM1" });
  h.sendEmail.mockResolvedValue({ ok: true, id: "em" });
});
afterEach(() => { vi.useRealTimers(); });

describe("holding customers back", () => {
  it("holds back about 1 in 10, the same way every time", () => {
    let held = 0;
    for (let i = 0; i < 10_000; i++) if (heldBack("rule-1", `c${i}`, "2026-11-21")) held++;
    expect(held / 10_000).toBeGreaterThan(0.08);
    expect(held / 10_000).toBeLessThan(0.12);
    expect(heldBack("rule-1", "c7", "2026-11-21")).toBe(heldBack("rule-1", "c7", "2026-11-21"));
    expect(HOLDOUT_EVERY).toBe(10);
  });

  it("logs a held-back customer without texting them or making a code", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-11-21T09:00:00Z"));
    const ids = Array.from({ length: 60 }, (_, i) => `cust-${i}`);
    const heldId = ids.find(id => heldBack("rule-1", id, "2026-11-21"))!;
    const sentId = ids.find(id => !heldBack("rule-1", id, "2026-11-21"))!;
    const lapsed = new Date("2026-10-01T00:00:00Z").toISOString();
    h.db = fakeDb({
      "winback_rules.select": () => ({ data: [{ id: "rule-1", business_id: "biz-1", name: "14 day", inactive_days: 14, offer_type: "percent", offer_value: 20, channel: "sms", cooldown_days: 30, template: "{offer} off: {link}" }], error: null }),
      "businesses.select": () => ({ data: { id: "biz-1", name: "Nonna's", subdomain: "nonna", settings: {}, stripe_account_id: "acct_1", stripe_charges_enabled: true }, error: null }),
      "customers.select": () => ({ data: [heldId, sentId].map(id => ({ id, name: "Sofia", phone: "+61412345678", last_order_date: lapsed })), error: null }),
    });
    const res = await runAutomations(new Request("https://dashboard.zentrabite.com/api/automations/run", { headers: { authorization: "Bearer cron-test" } }));
    expect(res.status).toBe(200);
    expect(h.sms).toHaveBeenCalledTimes(1);
    const logs = calls("sms_logs", "insert").map(q => q.payload as { customer_id: string; status: string; message: string });
    expect(logs).toEqual(expect.arrayContaining([
      expect.objectContaining({ customer_id: heldId, status: "held_back", message: "" }),
      expect.objectContaining({ customer_id: sentId, status: "sent" }),
    ]));
    expect(calls("offer_codes", "insert").map(q => (q.payload as { customer_id: string }).customer_id)).toEqual([sentId]);
  });
});

describe("the monthly report", () => {
  const log = (customer_id: string, status: string, sent_at: string, rule_id: string | null = "rule-1") => ({ customer_id, rule_id, campaign_id: null, status, sent_at });
  const order = (customer_id: string | null, total: number, created_at: string, extra: object = {}) =>
    ({ customer_id, total, refunded_amount: 0, created_at, came_from: null, offer_code: null, source: "direct", ...extra });

  it("compares customers messaged with customers held back, within 14 days", async () => {
    h.db = fakeDb({
      "sms_logs.select": () => ({ data: [
        log("c1", "sent", "2026-11-03T08:00:00Z"),
        log("c2", "sent", "2026-11-05T08:00:00Z"),
        log("c3", "held_back", "2026-11-03T08:00:00Z"),
        log("c4", "held_back", "2026-11-04T08:00:00Z"),
        log("c1", "sent", "2026-11-20T08:00:00Z"),           // a second message, counted once
        log("c5", "failed", "2026-11-06T08:00:00Z"),          // never went out
        log("c6", "sent", "2026-11-06T08:00:00Z", null),      // not a win-back
      ], error: null }),
      "orders.select": () => ({ data: [
        order("c1", 30, "2026-11-10T02:00:00Z", { came_from: "winback", offer_code: "K7MP4QXA" }),
        order("c3", 25, "2026-11-20T02:00:00Z"),               // 17 days after, too late
        order("c4", 20, "2026-11-06T02:00:00Z", { came_from: "counter" }),
        order("c9", 40, "2026-11-12T02:00:00Z", { came_from: "counter" }),
        order(null, 12, "2026-11-12T03:00:00Z", { source: "pos" }),
      ], error: null }),
    });
    const r = await buildWinbackReport(h.db, "biz-1", 2026, 11, TZ, new Date("2026-12-15T00:00:00Z"));
    expect(r).toMatchObject({
      month: "2026-11", label: "November 2026",
      sent: 2, sentBack: 1, sentRevenue: 30, held: 2, heldBackCount: 1, stillCounting: 0, extraBack: null,
      codesUsed: 1, codeRevenue: 30,
    });
    expect(r.sources).toEqual([
      { cameFrom: "counter", label: "Counter QR code", orders: 2, revenue: 60 },
      { cameFrom: "winback", label: "Win-back offer", orders: 1, revenue: 30 },
    ]);
    // The month in Adelaide time, and orders up to 14 days after it.
    const [logsRead] = calls("sms_logs", "select");
    expect(filterValue(logsRead!, "sent_at>=")).toBe("2026-10-31T13:30:00.000Z");
    expect(filterValue(logsRead!, "sent_at<")).toBe("2026-11-30T13:30:00.000Z");
    expect(filterValue(calls("orders", "select")[0]!, "created_at<")).toBe("2026-12-14T13:30:00.000Z");
    expect(verdict(r)).toMatch(/too few to compare/);
  });

  it("says how many more came back once enough were held back", async () => {
    const logs = [
      ...Array.from({ length: 100 }, (_, i) => log(`s${i}`, "sent", "2026-11-02T08:00:00Z")),
      ...Array.from({ length: 40 }, (_, i) => log(`h${i}`, "held_back", "2026-11-02T08:00:00Z")),
    ];
    const orders = [
      ...Array.from({ length: 30 }, (_, i) => order(`s${i}`, 20, "2026-11-05T02:00:00Z")),
      ...Array.from({ length: 4 }, (_, i) => order(`h${i}`, 20, "2026-11-05T02:00:00Z")),
    ];
    h.db = fakeDb({ "sms_logs.select": () => ({ data: logs, error: null }), "orders.select": () => ({ data: orders, error: null }) });
    const r = await buildWinbackReport(h.db, "biz-1", 2026, 11, TZ, new Date("2026-12-15T00:00:00Z"));
    expect(r.extraBack).toBe(20);
    expect(verdict(r)).toBe("30% of customers messaged came back, against 10% of those held back. That's about 20 more customers than would have come back anyway.");
  });

  it("knows who's still inside their 14 days", async () => {
    h.db = fakeDb({ "sms_logs.select": () => ({ data: [log("c1", "sent", "2026-11-25T08:00:00Z")], error: null }) });
    const r = await buildWinbackReport(h.db, "biz-1", 2026, 11, TZ, new Date("2026-11-28T00:00:00Z"));
    expect(r.stillCounting).toBe(1);
  });

  it("reads past Supabase's 1,000 row limit", async () => {
    const page = (n: number, offset: number) => Array.from({ length: n }, (_, i) => log(`c${offset + i}`, "sent", "2026-11-02T08:00:00Z"));
    h.db = fakeDb({
      "sms_logs.select": q => {
        const [from] = filterValue(q, "range") as [number, number];
        return { data: from === 0 ? page(1000, 0) : page(5, 1000), error: null };
      },
    });
    const r = await buildWinbackReport(h.db, "biz-1", 2026, 11, TZ, new Date("2026-12-15T00:00:00Z"));
    expect(r.sent).toBe(1005);
  });

  it("reads plainly in the email", () => {
    const text = reportEmailText({
      month: "2026-10", label: "October 2026", sent: 40, sentBack: 10, sentRevenue: 412.5, held: 4, heldBackCount: 0,
      stillCounting: 0, extraBack: null, codesUsed: 6, codeRevenue: 198, sources: [{ cameFrom: "counter", label: "Counter QR code", orders: 12, revenue: 340 }],
    }, "Nonna's Kitchen", "https://dashboard.zentrabite.com/zentra-rewards/report?month=2026-10");
    expect(text).toContain("Your October 2026 win-back report for Nonna's Kitchen.");
    expect(text).toContain("Came back within 14 days: 10 (25%), spending $412.50.");
    expect(text).toContain("Counter QR code: 12 orders, $340.00");
    expect(text).toContain("report?month=2026-10");
    expect(text).not.toMatch(/—/);
  });
});

describe("the monthly email", () => {
  const setup = (claim: { code: string; message: string } | null = null) => {
    h.db = fakeDb({
      "edge_function_runs.insert": () => ({ data: null, error: claim }),
      "winback_rules.select": () => ({ data: [{ business_id: "biz-1" }], error: null }),
      "campaigns.select": () => ({ data: [], error: null }),
      "businesses.select": () => ({ data: { id: "biz-1", name: "Nonna's Kitchen", settings: { notify_email: "owner@nonnas.example" } }, error: null }),
      "sms_logs.select": () => ({ data: [{ customer_id: "c1", rule_id: "rule-1", campaign_id: null, status: "sent", sent_at: "2026-10-10T08:00:00Z" }], error: null }),
    });
  };

  it("goes to the owner on the 15th, for the month before", async () => {
    setup();
    expect(await sendMonthlyReports(h.db, h.sendEmail, new Date("2026-11-15T09:00:00Z"))).toBe(1);
    expect(h.sendEmail.mock.calls[0]![0]).toMatchObject({ to: "owner@nonnas.example", subject: "Your October 2026 win-back report" });
    expect(calls("edge_function_runs", "insert")[0]!.payload).toEqual({ function_name: "winback-monthly-report", run_date: "2026-11-15" });
  });

  it("doesn't go on other days, or twice on the 15th", async () => {
    setup();
    expect(await sendMonthlyReports(h.db, h.sendEmail, new Date("2026-11-14T09:00:00Z"))).toBe(0);
    setup({ code: "23505", message: "already ran" });
    expect(await sendMonthlyReports(h.db, h.sendEmail, new Date("2026-11-15T09:00:00Z"))).toBe(0);
    expect(h.sendEmail).not.toHaveBeenCalled();
  });
});

describe("the report page's data", () => {
  it("refuses a month that isn't one", async () => {
    h.db = fakeDb();
    const res = await reportApi(new Request("https://dashboard.zentrabite.com/api/winback/report?month=nope"));
    expect(res.status).toBe(400);
  });

  it("gives the report and what it means", async () => {
    h.db = fakeDb({ "businesses.select": () => ({ data: { settings: {} }, error: null }) });
    const res = await reportApi(new Request("https://dashboard.zentrabite.com/api/winback/report?month=2026-10"));
    const body = await res.json();
    expect(body.report).toMatchObject({ month: "2026-10", sent: 0, held: 0 });
    expect(body.verdict).toBe("No win-back messages were due this month.");
  });
});
