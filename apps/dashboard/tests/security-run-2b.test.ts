// Smaller fixes from the second security run (25 Nov 2026): where Stripe may
// send a customer back to, and who can start a shop's win-back run with GET.

import { afterEach, describe, expect, it, vi } from "vitest";
import { fakeDb } from "./fake-db";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase-server", () => ({ createAdminClient: () => fakeDb(), createServerClient: () => fakeDb() }));
vi.mock("@/lib/request-business", () => ({
  MANAGER_ROLES: ["Owner", "Manager"],
  requireBusiness: async () => ({ ok: false, response: new Response("{}", { status: 401 }) }),
}));

import { trustedOrigin } from "@/lib/tenant";

const APP = "https://dashboard.zentrabite.com";

describe("trustedOrigin", () => {
  afterEach(() => { vi.unstubAllEnvs(); });

  it("takes our own addresses", () => {
    expect(trustedOrigin("https://dashboard.zentrabite.com", APP)).toBe("https://dashboard.zentrabite.com");
    expect(trustedOrigin("https://nonna.zentrabite.com", APP)).toBe("https://nonna.zentrabite.com");
  });

  it("takes this deployment's own preview address, and no other vercel.app address", () => {
    vi.stubEnv("VERCEL_URL", "repo1-dashboard-abc123xyz-zentrabite.vercel.app");
    vi.stubEnv("VERCEL_BRANCH_URL", "repo1-dashboard-git-fix-zentrabite.vercel.app");
    expect(trustedOrigin("https://repo1-dashboard-abc123xyz-zentrabite.vercel.app", APP)).toBe("https://repo1-dashboard-abc123xyz-zentrabite.vercel.app");
    expect(trustedOrigin("https://repo1-dashboard-git-fix-zentrabite.vercel.app", APP)).toBe("https://repo1-dashboard-git-fix-zentrabite.vercel.app");
    // Someone else's project that starts with the same name.
    expect(trustedOrigin("https://repo1-dashboard-evil.vercel.app", APP)).toBe(APP);
    expect(trustedOrigin("https://repo1-dashboard-abc-x-zentrabite.vercel.app", APP)).toBe(APP);
  });

  it("falls back for anything else", () => {
    expect(trustedOrigin("https://evil.example", APP)).toBe(APP);
    expect(trustedOrigin("http://dashboard.zentrabite.com", APP)).toBe(APP);
    expect(trustedOrigin("https://zentrabite.com.evil.example", APP)).toBe(APP);
    expect(trustedOrigin(null, APP)).toBe(APP);
  });
});

describe("GET /api/automations/run", () => {
  afterEach(() => { vi.unstubAllEnvs(); });

  it("is refused without the cron secret, so a link can't start a shop's run", async () => {
    vi.stubEnv("CRON_SECRET", "cron-test-secret");
    const { GET } = await import("@/app/api/automations/run/route");
    expect((await GET(new Request("https://x/api/automations/run"))).status).toBe(405);
    expect((await GET(new Request("https://x/api/automations/run", { headers: { authorization: "Bearer wrong" } }))).status).toBe(405);
  });

  it("is refused when no cron secret is set at all", async () => {
    vi.stubEnv("CRON_SECRET", "");
    const { GET } = await import("@/app/api/automations/run/route");
    expect((await GET(new Request("https://x/api/automations/run", { headers: { authorization: "Bearer " } }))).status).toBe(405);
  });

  it("goes through with the cron secret", async () => {
    vi.stubEnv("CRON_SECRET", "cron-test-secret");
    const { GET } = await import("@/app/api/automations/run/route");
    const res = await GET(new Request("https://x/api/automations/run", { headers: { authorization: "Bearer cron-test-secret" } }));
    expect(res.status).not.toBe(405);
    expect(res.status).not.toBe(401);
  });
});
