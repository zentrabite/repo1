// Tests for the stop rules (lib/stop-rules.ts, lib/send-guard.ts, migration 028):
//   • a shop's marketing pauses at more than 2% didn't arrive, 0.1% spam
//     reports or 1% STOP replies, once there are a few cases
//   • after a resume only new sends count
//   • Twilio's and Resend's reports are believed only with a valid signature
//   • a STOP counts against the shop that last texted that number an offer
//   • a pause stops marketing only. Order texts still go

import crypto from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fakeDb, filterValue, type Query } from "./fake-db";

const h = vi.hoisted(() => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  db: null as any,
  sms: vi.fn(async () => ({ status: "sent" as const, sid: "SM1" })),
  unsubscribe: vi.fn(async () => ({ ok: true, businessName: "Nonna's Kitchen" })),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase-server", () => ({ createAdminClient: () => h.db, createServerClient: () => h.db }));
vi.mock("@/lib/request-business", () => ({
  MANAGER_ROLES: ["Owner", "Manager"],
  requireBusiness: vi.fn(async () => ({ ok: true, businessId: "biz-1", userId: "user-1" })),
}));
vi.mock("@/lib/sms", async (importOriginal) => ({ ...(await importOriginal<object>()), sendTwilioSms: h.sms }));
vi.mock("@/lib/unsubscribe", async (importOriginal) => ({ ...(await importOriginal<object>()), recordUnsubscribe: h.unsubscribe }));

import { countOutcomes, describePause, tripped } from "@/lib/stop-rules";
import { activePause, checkStopRules, recordOutcome, recordStop } from "@/lib/send-guard";
import { statusCallbackUrl, validTwilioSignature } from "@/lib/sms";
import { sendMarketingEmail, validResendSignature } from "@/lib/email";
import { POST as twilioStatus } from "@/app/api/sms/status/route";
import { POST as resendEvents } from "@/app/api/email/events/route";
import { POST as inbound } from "@/app/api/sms/inbound/route";
import { POST as sendText } from "@/app/api/sms/send/route";

const NOW = new Date("2026-11-23T03:00:00Z");
const sent = (n: number, outcome: string | null = null) => Array.from({ length: n }, () => ({ status: "sent", outcome, kind: "marketing", channel: "sms" }));
const calls = (table: string, op?: Query["op"]) => (h.db.calls as Query[]).filter(q => q.table === table && (!op || q.op === op));

beforeEach(() => { vi.clearAllMocks(); });

describe("the rules", () => {
  it("pause texts at more than 1% STOP replies, once there are 3", () => {
    expect(tripped("sms", countOutcomes([...sent(97), ...sent(3, "opted_out")]))).toMatchObject({ reason: "opt_outs", count: 3, sent: 100 });
    expect(tripped("sms", countOutcomes([...sent(297), ...sent(3, "opted_out")]))).toBeNull(); // exactly 1%
    expect(tripped("sms", countOutcomes([...sent(18), ...sent(2, "opted_out")]))).toBeNull(); // 10%, but only 2
  });

  it("pause emails at more than 0.1% spam reports, once there are 2", () => {
    expect(tripped("email", countOutcomes([...sent(998), ...sent(2, "complained")]))).toMatchObject({ reason: "complaints", rate: 0.002 });
    expect(tripped("email", countOutcomes([...sent(2998), ...sent(2, "complained")]))).toBeNull();
  });

  it("pause either at more than 2% that didn't arrive, once there are 3", () => {
    expect(tripped("sms", countOutcomes([...sent(97), ...sent(3, "undelivered")]))).toMatchObject({ reason: "bounces" });
    expect(tripped("email", countOutcomes([...sent(97), ...sent(3, "bounced")]))).toMatchObject({ reason: "bounces" });
    expect(tripped("email", countOutcomes([...sent(200), ...sent(4, "bounced")]))).toBeNull(); // 1.96%
  });

  it("count only what went out, check spam first, and keep each rule to its channel", () => {
    const rows = [...sent(90), ...sent(5, "complained"), ...sent(5, "bounced"), { status: "held_back", outcome: null }, { status: "failed", outcome: null }];
    expect(countOutcomes(rows)).toEqual({ sent: 100, bounces: 5, complaints: 5, optOuts: 0 });
    expect(tripped("email", countOutcomes(rows))?.reason).toBe("complaints");
    expect(tripped("sms", countOutcomes([...sent(90), ...sent(10, "complained")]))).toBeNull();
    expect(tripped("email", countOutcomes([...sent(90), ...sent(10, "opted_out")]))).toBeNull();
  });

  it("explain a pause in one plain sentence", () => {
    expect(describePause("sms", "opt_outs", { count: 4, sent: 120, rate: 4 / 120 })).toBe("4 of 120 people sent a marketing text in the last 30 days replied STOP (3%). The limit is 1%.");
    expect(describePause("email", "complaints", { count: 2, sent: 900 })).toBe("2 of 900 marketing emails in the last 30 days were marked as spam (0.2%). The limit is 0.1%.");
    expect(describePause("sms", "bounces", { count: 5, sent: 100 })).toContain("didn't arrive (5%). The limit is 2%.");
  });
});

describe("pausing a shop", () => {
  function store(opts: { logs?: object[]; open?: object[]; resumed?: string | null } = {}) {
    h.db = fakeDb({
      "send_pauses.select": q => filterValue(q, "cleared_at is") === null
        ? { data: opts.open ?? [], error: null }
        : { data: opts.resumed ? [{ cleared_at: opts.resumed }] : [], error: null },
      "send_pauses.insert": q => ({ data: { id: "p1", paused_at: NOW.toISOString(), ...(q.payload as object) }, error: null }),
      "sms_logs.select": () => ({ data: opts.logs ?? [], error: null }),
    });
  }

  it("pauses when a rule is broken, saying why", async () => {
    store({ logs: [...sent(97), ...sent(3, "opted_out")] });
    const pause = await checkStopRules(h.db, "biz-1", "sms", NOW);
    expect(pause).toMatchObject({ business_id: "biz-1", channel: "sms", reason: "opt_outs", paused_by: "a stop rule" });
    const read = calls("sms_logs", "select")[0]!;
    expect(read.filters).toEqual(expect.arrayContaining([["business_id", "biz-1"], ["channel", "sms"], ["kind", "marketing"], ["status", "sent"]]));
    expect(filterValue(read, "sent_at>=")).toBe("2026-10-24T03:00:00.000Z");
    expect(calls("send_pauses", "insert")[0]!.payload).toMatchObject({ detail: { count: 3, sent: 100, rate: 0.03 } });
  });

  it("doesn't pause a healthy shop, or pause twice", async () => {
    store({ logs: sent(100) });
    expect(await checkStopRules(h.db, "biz-1", "sms", NOW)).toBeNull();
    store({ logs: [...sent(97), ...sent(3, "opted_out")], open: [{ id: "p0", business_id: "biz-1", channel: "sms", reason: "opt_outs" }] });
    expect(await checkStopRules(h.db, "biz-1", "sms", NOW)).toMatchObject({ id: "p0" });
    expect(calls("send_pauses", "insert")).toHaveLength(0);
  });

  it("only counts sends after the last resume", async () => {
    store({ resumed: "2026-11-20T00:00:00.000Z", logs: sent(10) });
    await checkStopRules(h.db, "biz-1", "sms", NOW);
    expect(filterValue(calls("sms_logs", "select")[0]!, "sent_at>=")).toBe("2026-11-20T00:00:00.000Z");
  });

  it("a pause on every shop stops every shop, and a failed check counts as paused", async () => {
    store({ open: [{ id: "all", business_id: null, channel: "email", reason: "manual" }] });
    expect(await activePause(h.db, "biz-9", "email")).toMatchObject({ id: "all" });
    expect(await activePause(h.db, "biz-9", "sms")).toMatchObject({ id: "all" }); // the fake ignores the channel filter
    h.db = fakeDb({ "send_pauses.select": () => ({ data: null, error: { message: "down" } }) });
    expect(await activePause(h.db, "biz-1", "sms")).not.toBeNull();
  });

  it("stops a marketing email, and an owner's offer text, but not an order text", async () => {
    store({ open: [{ id: "p1", business_id: "biz-1", channel: "email", reason: "complaints", detail: { count: 2, sent: 900 } }] });
    const out = await sendMarketingEmail({ db: h.db, businessId: "biz-1", businessName: "Nonna's Kitchen", customerId: "c1", to: "sam@example.com", subject: "Hi", text: "20% off" });
    expect(out).toMatchObject({ ok: false, skipped: true });

    const customer = { id: "c1", phone: "0412345678", opted_out: false, marketing_opt_in: true, last_order_date: new Date().toISOString() };
    h.db = fakeDb({
      "send_pauses.select": () => ({ data: [{ id: "p2", business_id: "biz-1", channel: "sms", reason: "opt_outs", detail: { count: 4, sent: 120 } }], error: null }),
      "businesses.select": () => ({ data: { name: "Nonna's Kitchen", settings: {} }, error: null }),
      "customers.select": q => filterValue(q, "id") ? { data: customer, error: null } : { data: [], error: null },
      "sms_logs.select": () => ({ data: null, error: null, count: 0 }),
    });
    const post = (body: object) => sendText(new Request("http://x/api/sms/send", { method: "POST", body: JSON.stringify(body) }));
    const offer = await post({ customerId: "c1", kind: "marketing", message: "20% off tonight" });
    expect(offer.status).toBe(409);
    expect((await offer.json()).error).toContain("Marketing texts are paused for your shop. 4 of 120 people");
    expect((await post({ customerId: "c1", kind: "must_reach", message: "Your order is ready" })).status).toBe(200);
    expect(h.sms).toHaveBeenCalledTimes(1);
    expect(calls("sms_logs", "insert")[0]!.payload).toMatchObject({ kind: "must_reach", provider_id: "SM1" });
  });
});

describe("what happened to a send", () => {
  function logged(row: object | null) {
    h.db = fakeDb({
      "sms_logs.select": q => filterValue(q, "provider_id") ? { data: row, error: null } : { data: [], error: null },
      "send_pauses.select": () => ({ data: [], error: null }),
    });
  }

  it("keeps the weightier news when reports arrive out of order", async () => {
    logged({ id: "l1", business_id: "biz-1", channel: "sms", kind: "marketing", customer_id: "c1", outcome: null });
    await recordOutcome(h.db, "SM1", "undelivered");
    expect(calls("sms_logs", "update")[0]!.payload).toMatchObject({ outcome: "undelivered" });

    logged({ id: "l1", business_id: "biz-1", channel: "email", kind: "marketing", customer_id: "c1", outcome: "complained" });
    await recordOutcome(h.db, "em_1", "delivered");
    expect(calls("sms_logs", "update")).toHaveLength(0);

    logged(null);
    expect(await recordOutcome(h.db, "em_receipt", "bounced")).toBeNull();
  });

  it("puts a STOP on the last offer text to that number, and checks that shop", async () => {
    h.db = fakeDb({
      "sms_logs.select": q => filterValue(q, "recipient")
        ? { data: [{ id: "l7", business_id: "biz-7", channel: "sms", kind: "marketing", customer_id: "c1", outcome: "delivered" }], error: null }
        : { data: [...sent(97), ...sent(3, "opted_out")], error: null },
      "send_pauses.select": () => ({ data: [], error: null }),
      "send_pauses.insert": q => ({ data: { id: "p7", ...(q.payload as object) }, error: null }),
    });
    const pause = await recordStop(h.db, ["+61412345678", "0412345678"], NOW);
    const find = calls("sms_logs", "select")[0]!;
    expect(filterValue(find, "recipient")).toEqual(["+61412345678", "0412345678"]);
    expect(find.filters).toEqual(expect.arrayContaining([["kind", "marketing"], ["status", "sent"], ["sent_at>=", "2026-10-24T03:00:00.000Z"]]));
    expect(calls("sms_logs", "update")[0]!.payload).toMatchObject({ outcome: "opted_out" });
    expect(pause).toMatchObject({ business_id: "biz-7", reason: "opt_outs" });
  });
});

describe("Twilio's reports", () => {
  afterEach(() => { vi.unstubAllEnvs(); });

  function signed(params: Record<string, string>, token = "tw-token") {
    const sig = crypto.createHmac("sha1", token).update(Object.keys(params).sort().reduce((a, k) => a + k + params[k], statusCallbackUrl())).digest("base64");
    return new Request(statusCallbackUrl(), { method: "POST", headers: { "x-twilio-signature": sig }, body: new URLSearchParams(params) });
  }

  it("believes only a signed report, and a marketing text that didn't arrive checks the shop", async () => {
    vi.stubEnv("TWILIO_AUTH_TOKEN", "tw-token");
    h.db = fakeDb({
      "sms_logs.select": q => filterValue(q, "provider_id") ? { data: { id: "l1", business_id: "biz-1", channel: "sms", kind: "marketing", customer_id: "c1", outcome: null }, error: null } : { data: sent(10), error: null },
      "send_pauses.select": () => ({ data: [], error: null }),
    });
    expect((await twilioStatus(signed({ MessageSid: "SM1", MessageStatus: "undelivered" }, "wrong"))).status).toBe(403);
    expect(calls("sms_logs")).toHaveLength(0);

    expect((await twilioStatus(signed({ MessageSid: "SM1", MessageStatus: "undelivered", ErrorCode: "30003" }))).status).toBe(204);
    expect(calls("sms_logs", "update")[0]!.payload).toMatchObject({ outcome: "undelivered" });
    expect(calls("sms_logs", "select").some(q => filterValue(q, "kind") === "marketing" && filterValue(q, "status") === "sent")).toBe(true);
  });

  it("ignores the in-between statuses", async () => {
    vi.stubEnv("TWILIO_AUTH_TOKEN", "tw-token");
    h.db = fakeDb();
    expect((await twilioStatus(signed({ MessageSid: "SM1", MessageStatus: "sent" }))).status).toBe(204);
    expect(calls("sms_logs")).toHaveLength(0);
  });

  it("asks Twilio to report on every text", () => {
    expect(statusCallbackUrl()).toBe("https://dashboard.zentrabite.com/api/sms/status");
    expect(validTwilioSignature("t", "u", {}, "nope")).toBe(false);
  });

  it("a STOP reply counts against the shop that last sent an offer", async () => {
    vi.stubEnv("TWILIO_AUTH_TOKEN", "tw-token");
    vi.stubEnv("TWILIO_WEBHOOK_URL", "https://dashboard.zentrabite.com/api/sms/inbound");
    const params = { From: "+61412345678", Body: "STOP" };
    const sig = crypto.createHmac("sha1", "tw-token").update(Object.keys(params).sort().reduce((a, k) => a + k + params[k as keyof typeof params], "https://dashboard.zentrabite.com/api/sms/inbound")).digest("base64");
    h.db = fakeDb({
      "sms_logs.select": q => filterValue(q, "recipient") ? { data: [{ id: "l7", business_id: "biz-7", channel: "sms", kind: "marketing", customer_id: "c1", outcome: null }], error: null } : { data: [], error: null },
      "send_pauses.select": () => ({ data: [], error: null }),
    });
    const res = await inbound(new Request("https://dashboard.zentrabite.com/api/sms/inbound", { method: "POST", headers: { "x-twilio-signature": sig }, body: new URLSearchParams(params) }));
    expect(res.status).toBe(200);
    expect(calls("customers", "update")[0]!.payload).toMatchObject({ opted_out: true, marketing_opt_in: false });
    expect(calls("sms_logs", "update")[0]!.payload).toMatchObject({ outcome: "opted_out" });
  });
});

describe("Resend's reports", () => {
  const SECRET = `whsec_${Buffer.from("resend-test-secret").toString("base64")}`;
  const sign = (id: string, ts: string, body: string) =>
    `v1,${crypto.createHmac("sha256", Buffer.from("resend-test-secret")).update(`${id}.${ts}.${body}`).digest("base64")}`;
  const event = (type: string, emailId = "em_1", ts = String(Math.floor(Date.now() / 1000)), secretSig = true) => {
    const body = JSON.stringify({ type, created_at: new Date().toISOString(), data: { email_id: emailId } });
    return new Request("https://dashboard.zentrabite.com/api/email/events", {
      method: "POST", body,
      headers: { "svix-id": "msg_1", "svix-timestamp": ts, "svix-signature": secretSig ? sign("msg_1", ts, body) : "v1,bad" },
    });
  };

  beforeEach(() => {
    vi.stubEnv("RESEND_WEBHOOK_SECRET", SECRET);
    h.db = fakeDb({
      "sms_logs.select": q => filterValue(q, "provider_id") === "em_1"
        ? { data: { id: "l1", business_id: "biz-1", channel: "email", kind: "marketing", customer_id: "c1", outcome: "delivered" }, error: null }
        : { data: filterValue(q, "provider_id") ? null : sent(10), error: null },
      "send_pauses.select": () => ({ data: [], error: null }),
    });
  });
  afterEach(() => { vi.unstubAllEnvs(); });

  it("checks the signature and its age", () => {
    const body = "{}";
    const now = Date.now();
    const ts = String(Math.floor(now / 1000));
    expect(validResendSignature(SECRET, { id: "a", timestamp: ts, signature: sign("a", ts, body) }, body, now)).toBe(true);
    expect(validResendSignature(SECRET, { id: "a", timestamp: ts, signature: `v1,x v1,${sign("a", ts, body).slice(3)}` }, body, now)).toBe(true);
    expect(validResendSignature(SECRET, { id: "a", timestamp: ts, signature: sign("a", ts, "{ }") }, body, now)).toBe(false);
    expect(validResendSignature(SECRET, { id: "a", timestamp: String(Math.floor(now / 1000) - 600), signature: sign("a", String(Math.floor(now / 1000) - 600), body) }, body, now)).toBe(false);
  });

  it("refuses an unsigned report, and does nothing until the secret is set", async () => {
    expect((await resendEvents(event("email.complained", "em_1", undefined, false))).status).toBe(403);
    vi.stubEnv("RESEND_WEBHOOK_SECRET", "");
    expect((await resendEvents(event("email.complained"))).status).toBe(503);
    expect(calls("sms_logs")).toHaveLength(0);
  });

  it("a spam report unsubscribes the customer and checks the shop", async () => {
    expect((await resendEvents(event("email.complained"))).status).toBe(200);
    expect(calls("sms_logs", "update")[0]!.payload).toMatchObject({ outcome: "complained" });
    expect(h.unsubscribe).toHaveBeenCalledWith(h.db, "c1");
    expect(calls("sms_logs", "select").some(q => filterValue(q, "channel") === "email" && filterValue(q, "kind") === "marketing")).toBe(true);
  });

  it("ignores reports on emails that aren't in the log, like receipts", async () => {
    expect((await resendEvents(event("email.bounced", "em_receipt"))).status).toBe(200);
    expect(calls("sms_logs", "update")).toHaveLength(0);
    expect(h.unsubscribe).not.toHaveBeenCalled();
  });
});
