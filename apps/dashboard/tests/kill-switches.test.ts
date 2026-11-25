// Tests for the kill switches, the connection lights and telling the team
// (lib/send-guard.ts, lib/health.ts, lib/alerts.ts, migration 029):
//   • a super admin can stop marketing texts, every text, or marketing
//     emails for every shop, and turn it off again
//   • only the "every text" switch stops order texts
//   • each light says what state a service is in, never its key
//   • the team is emailed when a stop rule pauses a shop, a switch changes,
//     or the daily run finds a connection down, and only if ALERT_EMAIL is set

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fakeDb, filterValue, type Query } from "./fake-db";

const h = vi.hoisted(() => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  db: null as any,
  superAdmin: { id: "admin-1", email: "deon@example.com" } as null | { id: string; email: string },
  sendEmail: vi.fn(async () => ({ ok: true, id: "em_1" })),
  balance: vi.fn(async () => ({ available: [] })),
}));

vi.mock("server-only", () => ({}));
vi.useFakeTimers({ toFake: ["Date"] });
vi.setSystemTime(new Date("2026-11-23T03:00:00Z")); // 1:30pm in Adelaide

vi.mock("@/lib/supabase-server", () => ({ createAdminClient: () => h.db, createServerClient: () => h.db }));
vi.mock("@/lib/admin-auth", () => ({ assertSuperAdmin: vi.fn(async () => h.superAdmin) }));
vi.mock("@/lib/request-business", () => ({
  MANAGER_ROLES: ["Owner", "Manager"],
  requireBusiness: vi.fn(async () => ({ ok: true, businessId: "biz-1", userId: "user-1" })),
}));
vi.mock("@/lib/stripe", () => ({ stripe: { balance: { retrieve: h.balance } } }));
vi.mock("@/lib/email", async (importOriginal) => ({ ...(await importOriginal<object>()), sendEmail: h.sendEmail }));

import { activePause, checkStopRules, everyTextStopped, setKillSwitch } from "@/lib/send-guard";
import { sendTwilioSms } from "@/lib/sms";
import { alertAddress, alertTeam } from "@/lib/alerts";
import { checkConnections, type Light } from "@/lib/health";
import { GET as adminGet, POST as adminPost } from "@/app/api/admin/sending/route";
import { POST as sendText } from "@/app/api/sms/send/route";
import { GET as runAutomations } from "@/app/api/automations/run/route";

const calls = (table: string, op?: Query["op"]) => (h.db.calls as Query[]).filter(q => q.table === table && (!op || q.op === op));
const ENV = ["ALERT_EMAIL", "STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET", "STRIPE_CONNECT_WEBHOOK_SECRET", "TWILIO_ACCOUNT_SID", "TWILIO_AUTH_TOKEN",
  "TWILIO_PHONE_NUMBER", "TWILIO_MESSAGING_SERVICE_SID", "RESEND_API_KEY", "RESEND_WEBHOOK_SECRET", "ANTHROPIC_API_KEY", "NEXT_PUBLIC_POSTHOG_KEY", "NEXT_PUBLIC_POSTHOG_ON", "CRON_SECRET"];

function pauses(rows: object[]) {
  h.db = fakeDb({
    "send_pauses.select": () => ({ data: rows, error: null }),
    "send_pauses.insert": q => ({ data: { id: "new", ...(q.payload as object) }, error: null }),
    "send_pauses.update": () => ({ data: { id: "p1", business_id: null, channel: "sms", scope: "all" }, error: null }),
    "businesses.select": () => ({ data: { name: "Nonna's Kitchen", settings: {} }, error: null }),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  for (const k of ENV) vi.stubEnv(k, "");
  h.superAdmin = { id: "admin-1", email: "deon@example.com" };
  h.balance.mockResolvedValue({ available: [] });
  vi.stubGlobal("fetch", vi.fn(async () => new Response("{}", { status: 200 })));
});
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

describe("kill switches", () => {
  it("stop marketing texts for every shop, or every text, and only texts can stop completely", async () => {
    pauses([]);
    expect(await setKillSwitch(h.db, "sms", "marketing", "deon@example.com")).toEqual({ ok: true });
    expect(calls("send_pauses", "insert")[0]!.payload).toMatchObject({ business_id: null, channel: "sms", scope: "marketing", reason: "manual", paused_by: "deon@example.com" });

    pauses([{ id: "p1", business_id: null, channel: "sms", scope: "marketing" }]);
    await setKillSwitch(h.db, "sms", "all", "deon@example.com");
    expect(calls("send_pauses", "insert")).toHaveLength(0);
    expect(calls("send_pauses", "update")[0]!.payload).toMatchObject({ scope: "all" });

    expect(await setKillSwitch(h.db, "email", "all", "deon@example.com")).toMatchObject({ ok: false });
  });

  it("a switch for every shop stops each shop's marketing, but only 'every text' stops order texts", async () => {
    pauses([{ id: "p1", business_id: null, channel: "sms", scope: "marketing" }]);
    expect(await activePause(h.db, "biz-1", "sms")).toMatchObject({ id: "p1" });
    expect(await everyTextStopped(h.db)).toBe(false);
    pauses([{ id: "p1", business_id: null, channel: "sms", scope: "all" }]);
    expect(await everyTextStopped(h.db)).toBe(true);
    pauses([{ id: "p2", business_id: "biz-1", channel: "sms", scope: "all" }]);
    expect(await everyTextStopped(h.db)).toBe(false); // a shop's own pause is never "all"
  });

  it("with every text stopped, Twilio is never called and the owner's order text is refused", async () => {
    vi.stubEnv("TWILIO_ACCOUNT_SID", "AC1");
    vi.stubEnv("TWILIO_AUTH_TOKEN", "tok");
    vi.stubEnv("TWILIO_PHONE_NUMBER", "+61400000000");
    pauses([{ id: "p1", business_id: null, channel: "sms", scope: "all" }]);
    expect(await sendTwilioSms("0412345678", "Your order is ready")).toMatchObject({ status: "skipped" });
    expect(fetch).not.toHaveBeenCalled();

    h.db = fakeDb({
      "send_pauses.select": () => ({ data: [{ id: "p1", business_id: null, channel: "sms", scope: "all" }], error: null }),
      "businesses.select": () => ({ data: { name: "Nonna's Kitchen", settings: {} }, error: null }),
      "customers.select": q => filterValue(q, "id") ? { data: { id: "c1", phone: "0412345678", opted_out: false, marketing_opt_in: true, last_order_date: null }, error: null } : { data: [], error: null },
    });
    const res = await sendText(new Request("http://x/api/sms/send", { method: "POST", body: JSON.stringify({ customerId: "c1", kind: "must_reach", message: "Your order is ready" }) }));
    expect(res.status).toBe(409);
    expect((await res.json()).error).toContain("Every text is stopped");
  });

  it("only texts Australian mobiles, and stops at the daily cap across every shop", async () => {
    vi.stubEnv("TWILIO_ACCOUNT_SID", "AC1");
    vi.stubEnv("TWILIO_AUTH_TOKEN", "tok");
    vi.stubEnv("TWILIO_PHONE_NUMBER", "+61400000000");
    pauses([]);
    for (const to of ["+447700900123", "0882001234", "+618 8200 1234", "12345"]) {
      expect(await sendTwilioSms(to, "Your order is ready"), to).toMatchObject({ status: "skipped", error: expect.stringMatching(/Australian mobile/) });
    }
    expect(fetch).not.toHaveBeenCalled();

    h.db = fakeDb({
      "send_pauses.select": () => ({ data: [], error: null }),
      "sms_logs.select": () => ({ data: null, error: null, count: 2000 }),
    });
    expect(await sendTwilioSms("0412345678", "Your order is ready")).toMatchObject({ status: "skipped", error: expect.stringMatching(/daily text limit/) });
    expect(fetch).not.toHaveBeenCalled();

    vi.stubEnv("ZB_DAILY_TEXT_CAP", "5000");
    vi.mocked(fetch).mockResolvedValueOnce(new Response(JSON.stringify({ sid: "SM1" }), { status: 201 }));
    expect(await sendTwilioSms("0412 345 678", "Your order is ready")).toMatchObject({ status: "sent", sid: "SM1" });
    expect(String(vi.mocked(fetch).mock.calls[0]![1]!.body)).toContain("To=%2B61412345678");
  });

  it("a super admin turns one on and off, and the team is told both times", async () => {
    vi.stubEnv("ALERT_EMAIL", "team@example.com");
    pauses([]);
    const post = (body: object) => adminPost(new Request("http://x/api/admin/sending", { method: "POST", body: JSON.stringify(body) }));
    expect((await post({ action: "stop", channel: "sms", scope: "all" })).status).toBe(200);
    expect(h.sendEmail).toHaveBeenLastCalledWith(expect.objectContaining({ kind: "account", to: "team@example.com", subject: "ZentraBite: Kill switch on: Every text stopped for every shop" }));

    expect((await post({ action: "resume", id: "p1" })).status).toBe(200);
    expect(calls("send_pauses", "update").at(-1)!.payload).toMatchObject({ cleared_by: "admin-1" });
    expect(h.sendEmail).toHaveBeenLastCalledWith(expect.objectContaining({ subject: "ZentraBite: Kill switch off: Every text can go again" }));

    h.superAdmin = null;
    expect((await post({ action: "stop", channel: "sms" })).status).toBe(403);
    expect((await adminGet()).status).toBe(403);
  });
});

describe("telling the team", () => {
  it("only when ALERT_EMAIL is a real address, as an account email", async () => {
    expect(alertAddress()).toBeNull();
    expect(await alertTeam("Test", ["line"])).toBe(false);
    vi.stubEnv("ALERT_EMAIL", "not an email");
    expect(alertAddress()).toBeNull();
    vi.stubEnv("ALERT_EMAIL", "team@example.com");
    expect(await alertTeam("Test", ["line"])).toBe(true);
    expect(h.sendEmail).toHaveBeenCalledWith(expect.objectContaining({ kind: "account", subject: "ZentraBite: Test", text: expect.stringContaining("/admin/sending") }));
  });

  it("when a stop rule pauses a shop, naming the shop and why", async () => {
    vi.stubEnv("ALERT_EMAIL", "team@example.com");
    const sent = (n: number, outcome: string | null = null) => Array.from({ length: n }, () => ({ status: "sent", outcome, kind: "marketing", channel: "sms" }));
    h.db = fakeDb({
      "send_pauses.select": () => ({ data: [], error: null }),
      "send_pauses.insert": q => ({ data: { id: "p9", paused_at: new Date().toISOString(), ...(q.payload as object) }, error: null }),
      "sms_logs.select": () => ({ data: [...sent(97), ...sent(3, "opted_out")], error: null }),
      "businesses.select": () => ({ data: { name: "Nonna's Kitchen" }, error: null }),
    });
    await checkStopRules(h.db, "biz-1", "sms");
    expect(h.sendEmail).toHaveBeenCalledWith(expect.objectContaining({
      subject: "ZentraBite: Marketing texts paused for Nonna's Kitchen",
      text: expect.stringContaining("3 of 100 people sent a marketing text in the last 30 days replied STOP"),
    }));
  });
});

describe("connection lights", () => {
  const byKey = (lights: Light[]) => Object.fromEntries(lights.map(l => [l.key, l]));
  function store(runs: { function_name: string; run_date: string }[] = [], pauseRows: object[] = []) {
    h.db = fakeDb({
      "businesses.select": () => ({ data: null, error: null, count: 1 }),
      "edge_function_runs.select": () => ({ data: runs, error: null }),
      "send_pauses.select": () => ({ data: pauseRows, error: null }),
    });
  }
  const reply = (routes: Record<string, [number, object]>) =>
    vi.stubGlobal("fetch", vi.fn(async (url: string) => {
      const hit = Object.entries(routes).find(([k]) => String(url).includes(k));
      return new Response(JSON.stringify(hit?.[1][1] ?? {}), { status: hit?.[1][0] ?? 200 });
    }));

  it("say 'not set up' for every service with no key, and never call it", async () => {
    store();
    const l = byKey(await checkConnections(h.db));
    expect(l.database!.status).toBe("ok");
    for (const k of ["stripe", "twilio", "resend", "anthropic", "posthog"]) expect(l[k]!.status, k).toBe("off");
    expect(l.jobs).toMatchObject({ status: "warn", detail: expect.stringContaining("Win-back run hasn't run yet") });
    expect(l.sending!.status).toBe("ok");
    expect(fetch).not.toHaveBeenCalled();
    expect(h.balance).not.toHaveBeenCalled();
  });

  it("tell a trial, a rejected key and a missing domain apart, without showing any key", async () => {
    vi.stubEnv("STRIPE_SECRET_KEY", "sk_test_SECRET1");
    vi.stubEnv("STRIPE_WEBHOOK_SECRET", "whsec_SECRET2");
    vi.stubEnv("TWILIO_ACCOUNT_SID", "ACSECRET3");
    vi.stubEnv("TWILIO_AUTH_TOKEN", "SECRET4");
    vi.stubEnv("TWILIO_PHONE_NUMBER", "+61400000000");
    vi.stubEnv("RESEND_API_KEY", "re_SECRET5");
    vi.stubEnv("ANTHROPIC_API_KEY", "sk-ant-SECRET6");
    store([{ function_name: "automations-run", run_date: "2026-11-22" }, { function_name: "birthday-loyalty", run_date: "2026-11-23" }, { function_name: "nightly-analytics-done", run_date: "2026-11-23" }]);
    reply({ "api.twilio.com": [200, { status: "active", type: "Trial" }], "api.resend.com": [200, { data: [{ name: "zentrabite.com", status: "pending" }] }], "api.anthropic.com": [401, {}] });
    const lights = await checkConnections(h.db);
    const l = byKey(lights);
    expect(l.stripe).toMatchObject({ status: "warn", detail: expect.stringMatching(/^Test mode\. The key works, but 1 of the 2 webhook secrets/) });
    expect(l.twilio).toMatchObject({ status: "warn", detail: expect.stringContaining("Trial account") });
    expect(l.resend).toMatchObject({ status: "warn", detail: expect.stringContaining("No verified domain") });
    expect(l.anthropic).toMatchObject({ status: "down", detail: "Anthropic rejected the key." });
    expect(l.jobs).toMatchObject({ status: "ok", detail: "Win-back run ran yesterday. Birthday points ran today. Analytics ran today." });
    expect(JSON.stringify(lights)).not.toMatch(/SECRET\d/); // none of the key values above
  });

  it("call working services ok, and a suspended or unreachable one down", async () => {
    vi.stubEnv("STRIPE_SECRET_KEY", "sk_live_x");
    vi.stubEnv("STRIPE_WEBHOOK_SECRET", "a");
    vi.stubEnv("STRIPE_CONNECT_WEBHOOK_SECRET", "b");
    vi.stubEnv("TWILIO_ACCOUNT_SID", "AC1");
    vi.stubEnv("TWILIO_AUTH_TOKEN", "t");
    vi.stubEnv("TWILIO_MESSAGING_SERVICE_SID", "MG1");
    vi.stubEnv("RESEND_API_KEY", "re_x");
    vi.stubEnv("RESEND_WEBHOOK_SECRET", "whsec_x");
    vi.stubEnv("NEXT_PUBLIC_POSTHOG_KEY", "phc_x");
    vi.stubEnv("NEXT_PUBLIC_POSTHOG_ON", "setup");
    store([], [{ id: "p1", business_id: "biz-1", channel: "sms" }]);
    reply({ "api.twilio.com": [200, { status: "suspended", type: "Full" }], "api.resend.com": [200, { data: [{ name: "zentrabite.com", status: "verified" }] }] });
    h.balance.mockRejectedValueOnce(Object.assign(new Error("bad key"), { type: "StripeAuthenticationError" }));
    const l = byKey(await checkConnections(h.db));
    expect(l.stripe).toMatchObject({ status: "down", detail: "Live mode. Stripe rejected the key." });
    expect(l.twilio).toMatchObject({ status: "down", detail: "The account is suspended." });
    expect(l.resend).toMatchObject({ status: "ok", detail: "zentrabite.com verified." });
    expect(l.posthog).toMatchObject({ status: "ok", detail: "Counting setup." });
    expect(l.sending).toMatchObject({ status: "warn" });
  });

  it("the daily run notes it ran and tells the team what's down", async () => {
    vi.stubEnv("CRON_SECRET", "cron-test");
    vi.stubEnv("ALERT_EMAIL", "team@example.com");
    vi.stubEnv("ANTHROPIC_API_KEY", "sk-ant-x");
    reply({ "api.anthropic.com": [401, {}] });
    h.db = fakeDb({
      "businesses.select": () => ({ data: null, error: null, count: 1 }),
      "edge_function_runs.select": () => ({ data: [], error: null }),
      "send_pauses.select": () => ({ data: [], error: null }),
      "winback_rules.select": () => ({ data: [], error: null }),
      "campaigns.select": () => ({ data: [], error: null }),
    });
    await runAutomations(new Request("https://dashboard.zentrabite.com/api/automations/run", { headers: { authorization: "Bearer cron-test" } }));
    expect(calls("edge_function_runs", "insert")[0]!.payload).toEqual({ function_name: "automations-run", run_date: "2026-11-23" });
    expect(h.sendEmail).toHaveBeenCalledWith(expect.objectContaining({ subject: "ZentraBite: AI (Anthropic) is down", text: expect.stringContaining("Anthropic rejected the key.") }));
  });

  it("the Sending page gets the lights, the switches and who's told", async () => {
    vi.stubEnv("ALERT_EMAIL", "team@example.com");
    h.db = fakeDb({
      "send_pauses.select": q => filterValue(q, "cleared_at is") === null
        ? { data: [{ id: "k1", business_id: null, channel: "sms", scope: "all", reason: "manual", detail: {}, paused_at: "2026-11-23T01:00:00Z", paused_by: "deon@example.com", cleared_at: null }], error: null }
        : { data: [], error: null },
      "businesses.select": () => ({ data: [], error: null, count: 1 }),
      "edge_function_runs.select": () => ({ data: [], error: null }),
    });
    const body = await (await adminGet()).json();
    expect(body.switches).toEqual({ marketingTexts: "k1", everyText: "k1", marketingEmails: null });
    expect(body.open[0]).toMatchObject({ shop: "Every shop", label: "Every text", why: "Every text stopped for every shop, order texts and order alerts too." });
    expect(body.alertsTo).toBe("team@example.com");
    expect(body.lights.map((l: Light) => l.key)).toEqual(["database", "stripe", "twilio", "resend", "anthropic", "posthog", "jobs", "sending"]);
  });
});
