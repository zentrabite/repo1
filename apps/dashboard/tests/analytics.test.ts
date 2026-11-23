// Tests for counting with PostHog (lib/analytics.ts and
// lib/analytics-server.ts). The network is a fake.
//
// What they pin down:
//   • nothing is sent unless the key is set and the part is switched on
//   • Do Not Track and Global Privacy Control are respected
//   • the address goes without its query string (codes, emails), keeping
//     only utm_* tags
//   • a paid order is counted from the server with no customer details, and
//     joins the visit only through a random id

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const sent = () => (fetch as unknown as ReturnType<typeof vi.fn>).mock.calls.map(([url, init]) => ({ url: String(url), body: JSON.parse(String((init as RequestInit).body)) }));

function browser(href: string, opts: { dnt?: boolean; gpc?: boolean; referrer?: string } = {}) {
  const store = () => { const m = new Map<string, string>(); return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v) }; };
  vi.stubGlobal("window", { innerWidth: 390 });
  vi.stubGlobal("navigator", { doNotTrack: opts.dnt ? "1" : null, globalPrivacyControl: opts.gpc ?? false });
  vi.stubGlobal("location", new URL(href));
  vi.stubGlobal("document", { referrer: opts.referrer ?? "" });
  vi.stubGlobal("localStorage", store());
  vi.stubGlobal("sessionStorage", store());
}

beforeEach(() => {
  vi.resetModules();
  vi.stubGlobal("fetch", vi.fn(async () => new Response("{}")));
});
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

describe("in the browser", () => {
  it("sends nothing unless the key is set and the part is on", async () => {
    browser("https://nonna.zentrabite.com/order");
    vi.stubEnv("NEXT_PUBLIC_POSTHOG_KEY", "phc_test");
    vi.stubEnv("NEXT_PUBLIC_POSTHOG_ON", "setup");
    const { track, analyticsId } = await import("@/lib/analytics");
    track("ordering", "ordering_viewed");
    expect(fetch).not.toHaveBeenCalled();
    expect(analyticsId("ordering")).toBeNull();
  });

  it("respects Do Not Track and Global Privacy Control", async () => {
    vi.stubEnv("NEXT_PUBLIC_POSTHOG_KEY", "phc_test");
    vi.stubEnv("NEXT_PUBLIC_POSTHOG_ON", "ordering,setup");
    browser("https://nonna.zentrabite.com/order", { dnt: true });
    let mod = await import("@/lib/analytics");
    mod.track("ordering", "ordering_viewed");
    vi.resetModules();
    browser("https://nonna.zentrabite.com/order", { gpc: true });
    mod = await import("@/lib/analytics");
    mod.track("ordering", "ordering_viewed");
    expect(fetch).not.toHaveBeenCalled();
  });

  it("sends the page without its query string, anonymously", async () => {
    vi.stubEnv("NEXT_PUBLIC_POSTHOG_KEY", "phc_test");
    vi.stubEnv("NEXT_PUBLIC_POSTHOG_ON", "ordering");
    browser("https://nonna.zentrabite.com/order?code=K7MP4QXA&src=winback&email=s@example.com&utm_source=google", { referrer: "https://www.google.com/search?q=pizza" });
    const { track, analyticsId } = await import("@/lib/analytics");
    track("ordering", "ordering_viewed", { shop: "biz-1" });
    track("ordering", "item_added", { shop: "biz-1" });
    const [first, second] = sent();
    expect(first!.url).toBe("https://us.i.posthog.com/i/v0/e/");
    expect(first!.body).toMatchObject({
      api_key: "phc_test", event: "ordering_viewed",
      properties: {
        shop: "biz-1", part: "ordering", $process_person_profile: false,
        $current_url: "https://nonna.zentrabite.com/order", $pathname: "/order", utm_source: "google",
        $referrer: "https://www.google.com", $referring_domain: "www.google.com",
      },
    });
    const raw = JSON.stringify(first!.body);
    for (const leak of ["K7MP4QXA", "s@example.com", "pizza"]) expect(raw).not.toContain(leak);
    // The same random id and session across events, and the id checkout sends.
    expect(first!.body.distinct_id).toMatch(/^anon-[0-9a-f-]{36}$/);
    expect(second!.body.distinct_id).toBe(first!.body.distinct_id);
    expect(second!.body.properties.$session_id).toBe(first!.body.properties.$session_id);
    expect(analyticsId("ordering")).toBe(first!.body.distinct_id);
  });

  it("never breaks the page when the network fails", async () => {
    vi.stubEnv("NEXT_PUBLIC_POSTHOG_KEY", "phc_test");
    vi.stubEnv("NEXT_PUBLIC_POSTHOG_ON", "setup");
    browser("https://dashboard.zentrabite.com/admin/onboarding/x");
    vi.stubGlobal("fetch", vi.fn(async () => { throw new Error("offline"); }));
    const { track } = await import("@/lib/analytics");
    expect(() => track("setup", "setup_step_viewed", { step: 2 })).not.toThrow();
  });
});

describe("on the server", () => {
  it("sends nothing unless switched on", async () => {
    const { captureServer } = await import("@/lib/analytics-server");
    await captureServer("ordering", "order_paid", "shop-1", { total: 26 });
    expect(fetch).not.toHaveBeenCalled();
  });

  it("counts an event, and shrugs off a failure", async () => {
    vi.stubEnv("NEXT_PUBLIC_POSTHOG_KEY", "phc_test");
    vi.stubEnv("NEXT_PUBLIC_POSTHOG_ON", "ordering");
    vi.stubEnv("NEXT_PUBLIC_POSTHOG_HOST", "https://eu.i.posthog.com/");
    const { captureServer } = await import("@/lib/analytics-server");
    await captureServer("ordering", "order_paid", "anon-x", { shop: "biz-1", total: 26 });
    expect(sent()[0]).toMatchObject({ url: "https://eu.i.posthog.com/i/v0/e/", body: { event: "order_paid", distinct_id: "anon-x", properties: { shop: "biz-1", total: 26, part: "ordering", $process_person_profile: false } } });
    vi.stubGlobal("fetch", vi.fn(async () => { throw new Error("down"); }));
    await expect(captureServer("ordering", "order_paid", "anon-x")).resolves.toBeUndefined();
  });
});
