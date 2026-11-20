// Tests for the owner's Stripe setup link (lib/stripe-setup-link.ts,
// migration 023): only a hash is kept, it runs out, it stops once payments
// are on, the Start button sends the owner to Stripe for the right shop, and
// only staff ever see the link.

import { createHash } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fakeDb, filterValue, type Query } from "./fake-db";

const h = vi.hoisted(() => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  db: null as any,
  superAdmin: null as null | { id: string },
  sendEmail: vi.fn(async () => ({ ok: false, skipped: true })),
  stripe: {
    v2: { core: { accounts: { create: vi.fn(), retrieve: vi.fn() }, accountLinks: { create: vi.fn() } } },
  },
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/stripe", () => ({ stripe: h.stripe }));
vi.mock("@/lib/supabase-server", () => ({
  createAdminClient: () => h.db,
  createServerClient: () => h.db,
  createSessionClient: async () => h.db,
}));
vi.mock("@/lib/admin-auth", () => ({ assertSuperAdmin: vi.fn(async () => h.superAdmin) }));
vi.mock("@/lib/email", () => ({ sendEmail: h.sendEmail }));

import { findSetupLink, looksLikeCode, newSetupLink, SETUP_LINK_DAYS } from "@/lib/stripe-setup-link";
import { POST as start } from "@/app/api/stripe-setup/[code]/route";
import { GET as linkInfo, POST as makeLink } from "@/app/api/admin/onboarding/[id]/stripe-link/route";

const sha = (s: string) => createHash("sha256").update(s).digest("hex");
const CODE = "A".repeat(43);
const BIZ = "6f1c2a9e-0b3d-4e5f-8a7b-1c2d3e4f5a6b";
const calls = (table: string, op?: Query["op"]) => (h.db.calls as Query[]).filter(q => q.table === table && (!op || q.op === op));
const later = (days: number) => new Date(Date.now() + days * 86_400_000).toISOString();

function shop({ expires = later(3), charges = false, account = null as string | null } = {}) {
  h.db = fakeDb({
    "stripe_setup_links.select": () => ({ data: { business_id: BIZ, expires_at: expires }, error: null }),
    "businesses.select": q => (q.columns ?? "").includes("stripe_account_id")
      ? { data: { name: "Joe's Pizza", stripe_account_id: account, contact_email: "joe@example.com", settings: {} }, error: null }
      : { data: { id: BIZ, name: "Joe's Pizza", stripe_charges_enabled: charges }, error: null },
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  h.superAdmin = null;
  h.db = fakeDb();
  h.stripe.v2.core.accounts.create.mockResolvedValue({ id: "acct_new" });
  h.stripe.v2.core.accountLinks.create.mockResolvedValue({ url: "https://connect.stripe.com/setup/abc" });
});

describe("making a link", () => {
  it("keeps only a hash, and the link runs out", async () => {
    const before = Date.now();
    const { url, expiresAt } = await newSetupLink(h.db, BIZ, "staff-1");
    const code = url.split("/stripe-setup/")[1]!;
    expect(looksLikeCode(code)).toBe(true);
    const [row] = calls("stripe_setup_links", "upsert");
    const saved = row!.payload as Record<string, unknown>;
    expect(saved).toMatchObject({ business_id: BIZ, token_hash: sha(code), created_by: "staff-1", opened_at: null });
    expect(JSON.stringify(saved)).not.toContain(code);
    const days = (Date.parse(expiresAt) - before) / 86_400_000;
    expect(days).toBeGreaterThan(SETUP_LINK_DAYS - 0.01);
    expect(days).toBeLessThan(SETUP_LINK_DAYS + 0.01);
  });

  it("turns away a code that isn't one, without asking the database", async () => {
    expect(await findSetupLink(h.db, "../../etc")).toEqual({ ok: false, reason: "unknown" });
    expect(h.db.calls).toHaveLength(0);
  });

  it("looks a code up by its hash, and says when it has run out", async () => {
    shop({ expires: later(-1) });
    expect(await findSetupLink(h.db, CODE)).toEqual({ ok: false, reason: "expired" });
    expect(filterValue(calls("stripe_setup_links", "select")[0]!, "token_hash")).toBe(sha(CODE));
  });
});

describe("the owner's Start button", () => {
  const press = (code = CODE) => start(
    new Request(`https://dashboard.zentrabite.com/api/stripe-setup/${code}`, { method: "POST", headers: { origin: "https://dashboard.zentrabite.com" } }),
    { params: Promise.resolve({ code }) },
  );

  it("makes the shop's Stripe account and sends the owner to Stripe, then back to the same page", async () => {
    shop();
    const res = await press();
    expect(res.status).toBe(303);
    expect(res.headers.get("location")).toBe("https://connect.stripe.com/setup/abc");
    expect(h.stripe.v2.core.accounts.create.mock.calls[0]![0]).toMatchObject({ contact_email: "joe@example.com", metadata: { zentrabite_business_id: BIZ } });
    expect(calls("businesses", "update")[0]!.payload).toMatchObject({ stripe_account_id: "acct_new" });
    const link = h.stripe.v2.core.accountLinks.create.mock.calls[0]![0];
    expect(link.use_case.account_onboarding).toMatchObject({
      refresh_url: `https://dashboard.zentrabite.com/stripe-setup/${CODE}?again=1`,
      return_url:  `https://dashboard.zentrabite.com/stripe-setup/${CODE}?done=1`,
    });
    expect(calls("stripe_setup_links", "update")[0]!.payload).toHaveProperty("opened_at");
  });

  it("does nothing with Stripe for a link that has run out or a shop already taking payments", async () => {
    shop({ expires: later(-1) });
    expect((await press()).headers.get("location")).toBe(`https://dashboard.zentrabite.com/stripe-setup/${CODE}`);
    shop({ charges: true });
    await press();
    expect(h.stripe.v2.core.accounts.create).not.toHaveBeenCalled();
    expect(h.stripe.v2.core.accountLinks.create).not.toHaveBeenCalled();
  });

  it("goes back to the page with a note when Stripe fails", async () => {
    shop();
    h.stripe.v2.core.accountLinks.create.mockRejectedValue(new Error("Stripe is down"));
    expect((await press()).headers.get("location")).toBe(`https://dashboard.zentrabite.com/stripe-setup/${CODE}?error=1`);
  });
});

describe("staff making a new link", () => {
  const ctx = { params: Promise.resolve({ id: BIZ }) };
  const req = (method: string) => new Request(`https://dashboard.zentrabite.com/api/admin/onboarding/${BIZ}/stripe-link`, { method });

  it("is for super admins only", async () => {
    expect((await makeLink(req("POST"), ctx)).status).toBe(403);
    expect((await linkInfo(req("GET"), ctx)).status).toBe(403);
  });

  it("makes a new link, emails the owner, and hands staff the link while emails don't send", async () => {
    h.superAdmin = { id: "staff-1" };
    h.db = fakeDb({ "businesses.select": () => ({ data: { id: BIZ, name: "Joe's Pizza", contact_email: null, settings: { onboarding: { owner_email: "joe@example.com", owner_name: "Joe Bloggs" } } }, error: null }) });
    const res = await makeLink(req("POST"), ctx);
    const body = await res.json();
    expect(body).toMatchObject({ emailed: false, to: "joe@example.com" });
    expect(body.url).toMatch(/\/stripe-setup\/[A-Za-z0-9_-]{43}$/);
    const mail = (h.sendEmail.mock.calls[0] as unknown[])[0] as { to: string; subject: string; text: string };
    expect(mail).toMatchObject({ to: "joe@example.com", subject: "Set up payments for Joe's Pizza" });
    expect(mail.text).toContain(body.url);
    expect(mail.text).toContain("Hi Joe,");
  });

  it("says when the link was made and opened, but never gives the link back", async () => {
    h.superAdmin = { id: "staff-1" };
    h.db = fakeDb({ "stripe_setup_links.select": () => ({ data: { created_at: "2026-11-20T01:00:00Z", expires_at: "2026-12-04T01:00:00Z", opened_at: null }, error: null }) });
    const res = await linkInfo(req("GET"), ctx);
    expect(calls("stripe_setup_links", "select")[0]!.columns).toBe("created_at, expires_at, opened_at");
    expect((await res.json()).link).toEqual({ created_at: "2026-11-20T01:00:00Z", expires_at: "2026-12-04T01:00:00Z", opened_at: null });
  });
});
