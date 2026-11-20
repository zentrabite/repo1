// Tests for the go-live check: what each check needs, that publishing is
// refused with a gap, and sending the owner their login. The database, the
// login check and email are fakes.

import { beforeEach, describe, expect, it, vi } from "vitest";
import { fakeDb, type Query } from "./fake-db";

const h = vi.hoisted(() => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  db: null as any,
  superAdmin: null as null | { id: string },
  generateLink: vi.fn(),
  sendEmail: vi.fn(async () => ({ ok: false, skipped: true })),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase-server", () => ({ createAdminClient: () => h.db }));
vi.mock("@/lib/admin-auth", () => ({ assertSuperAdmin: vi.fn(async () => h.superAdmin) }));
vi.mock("@/lib/email", () => ({ sendEmail: h.sendEmail }));

import { goLiveChecks, isReady, type GoLiveFacts } from "@/lib/go-live";
import { PATCH as saveShop } from "@/app/api/admin/onboarding/[id]/route";
import { GET as goLive } from "@/app/api/admin/onboarding/[id]/go-live/route";
import { POST as ownerInvite } from "@/app/api/admin/onboarding/[id]/owner-invite/route";

const ID = "biz-1";
const ctx = { params: Promise.resolve({ id: ID }) };
const OPEN = { open: "11:00", close: "21:00", closed: false };
const READY_BIZ = {
  name: "Joe's Pizza", subdomain: "joes-pizza", address: "1 King William St, Adelaide", abn: "51824753556",
  contact_phone: null, stripe_charges_enabled: true, stripe_payouts_enabled: true,
  settings: { phone: "(08) 8123 4567", hours: { mon: OPEN, tue: { ...OPEN, closed: true } }, notify_email: "joe@example.com", onboarding: { owner_email: "joe@example.com", owner_name: "Joe Bloggs" } },
};
const facts = (over: Partial<GoLiveFacts> = {}, biz: Partial<GoLiveFacts["biz"]> = {}): GoLiveFacts =>
  ({ biz: { ...READY_BIZ, ...biz }, pricedItems: 12, paidOrders: 1, ownerLogin: true, ...over });
const byKey = (f: GoLiveFacts) => Object.fromEntries(goLiveChecks(f).map(c => [c.key, c]));

const withAuth = <T extends object>(db: T) => Object.assign(db, { auth: { admin: { generateLink: h.generateLink } } });
const readyDb = (over: Record<string, (q: Query) => unknown> = {}) => withAuth(fakeDb({
  "businesses.select": () => ({ data: { id: ID, ...READY_BIZ }, error: null }),
  "menu_items.select": () => ({ data: [{ price: 18, available: true }, { price: 0, available: true }, { price: 9, available: false }], error: null }),
  "orders.select": () => ({ data: null, error: null, count: 2 }),
  "users.select": () => ({ data: [{ id: "owner-1" }], error: null }),
  "businesses.update": q => ({ data: { id: ID, ...(q.payload as object) }, error: null }),
  ...over,
} as never));
const calls = (table: string, op?: Query["op"]) => (h.db.calls as Query[]).filter(q => q.table === table && (!op || q.op === op));
const patch = (body: object) => saveShop(new Request(`https://dashboard.zentrabite.com/api/admin/onboarding/${ID}`, {
  method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(body),
}), ctx);

beforeEach(() => {
  vi.clearAllMocks();
  h.superAdmin = { id: "staff-1" };
  h.db = readyDb();
});

describe("the checks", () => {
  it("pass for a shop with everything in", () => {
    const checks = goLiveChecks(facts());
    expect(checks.map(c => c.key)).toEqual(["details", "address", "hours", "menu", "payments", "alerts", "owner", "test_order"]);
    expect(isReady(checks)).toBe(true);
    expect(byKey(facts()).hours!.detail).toMatch(/Open 1 day a week/);
  });

  it("name what's missing from the shop's details", () => {
    const c = byKey(facts({}, { address: " ", abn: null, settings: { ...READY_BIZ.settings, phone: "" } }));
    expect(c.details).toMatchObject({ ok: false, step: 1, detail: "Missing the street address, phone and ABN." });
  });

  it("take the phone and ABN from either place they're kept", () => {
    expect(byKey(facts({}, { contact_phone: "0412 345 678", abn: null, settings: { ...READY_BIZ.settings, phone: "", abn: "51824753556" } })).details!.ok).toBe(true);
  });

  it("need an open day, a priced item, both Stripe switches, an alert, the owner's login and a paid order", () => {
    expect(byKey(facts({}, { settings: { ...READY_BIZ.settings, hours: { mon: { ...OPEN, closed: true } } } })).hours!.ok).toBe(false);
    expect(byKey(facts({ pricedItems: 0 })).menu!.ok).toBe(false);
    expect(byKey(facts({}, { stripe_payouts_enabled: false })).payments).toMatchObject({ ok: false, detail: expect.stringMatching(/bank step/) });
    expect(byKey(facts({}, { stripe_charges_enabled: false, stripe_payouts_enabled: false })).payments!.detail).toMatch(/isn't taking payments/);
    expect(byKey(facts({}, { settings: { ...READY_BIZ.settings, notify_email: "" } })).alerts!.ok).toBe(false);
    expect(byKey(facts({ ownerLogin: false })).owner!.ok).toBe(false);
    expect(byKey(facts({ paidOrders: 0 })).test_order!.ok).toBe(false);
    expect(byKey(facts({}, { subdomain: null })).address!.ok).toBe(false);
  });
});

describe("the go-live route", () => {
  it("is for super admins only", async () => {
    h.superAdmin = null;
    expect((await goLive(new Request("https://x"), ctx)).status).toBe(403);
  });

  it("counts only priced items that are on, and paid online orders", async () => {
    const body = await (await goLive(new Request("https://x"), ctx)).json();
    expect(body.ready).toBe(true);
    expect(body.checks.find((c: { key: string }) => c.key === "menu").detail).toBe("1 item on sale with a price.");
    const [orders] = calls("orders", "select");
    expect(orders!.filters).toEqual([["business_id", ID], ["source", "direct"]]);
  });
});

describe("publishing", () => {
  it("is refused while anything is left, with what's left", async () => {
    h.db = readyDb({ "orders.select": () => ({ data: null, error: null, count: 0 }), "menu_items.select": () => ({ data: [], error: null }) });
    const res = await patch({ settings: { site: { published: true } } });
    expect(res.status).toBe(409);
    expect((await res.json()).error).toBe("Not ready to go live. Still to do: Menu, A paid test order.");
    expect(calls("businesses", "update")).toHaveLength(0);
  });

  it("goes ahead when the check passes", async () => {
    const res = await patch({ settings: { site: { published: true } } });
    expect(res.status).toBe(200);
    expect(calls("businesses", "update")).toHaveLength(1);
  });

  it("doesn't get in the way of other saves, or of unpublishing", async () => {
    h.db = readyDb({ "menu_items.select": () => ({ data: [], error: null }) });
    expect((await patch({ settings: { hours: {} } })).status).toBe(200);
    expect((await patch({ settings: { site: { published: false } } })).status).toBe(200);
    expect(calls("menu_items")).toHaveLength(0);
  });
});

describe("sending the owner their login", () => {
  const send = () => ownerInvite(new Request("https://x", { method: "POST" }), ctx);

  it("is for super admins only", async () => {
    h.superAdmin = null;
    expect((await send()).status).toBe(403);
    expect(h.generateLink).not.toHaveBeenCalled();
  });

  it("makes the link, links the login to the shop and gives the link back to send by hand", async () => {
    h.db = readyDb({ "users.select": () => ({ data: { business_id: null }, error: null }) });
    h.generateLink.mockResolvedValue({ data: { properties: { action_link: "https://login-link" }, user: { id: "owner-1" } }, error: null });
    const res = await send();
    expect(await res.json()).toEqual({ link: "https://login-link", emailed: false, to: "joe@example.com" });
    expect(h.generateLink.mock.calls[0]![0]).toMatchObject({ type: "invite", email: "joe@example.com" });
    expect(calls("users", "update")[0]!.payload).toMatchObject({ business_id: ID, role: "owner", name: "Joe Bloggs" });
    expect(h.sendEmail).toHaveBeenCalledWith(expect.objectContaining({ to: "joe@example.com", subject: "Your ZentraBite dashboard is ready for Joe's Pizza" }));
  });

  it("sends a new link to an owner who already has a login", async () => {
    h.db = readyDb({ "users.select": () => ({ data: { business_id: ID }, error: null }) });
    h.generateLink
      .mockResolvedValueOnce({ data: null, error: { message: "A user with this email address has already been registered" } })
      .mockResolvedValueOnce({ data: { properties: { action_link: "https://magic" }, user: { id: "owner-1" } }, error: null });
    expect((await (await send()).json()).link).toBe("https://magic");
    expect(h.generateLink.mock.calls[1]![0]).toMatchObject({ type: "magiclink" });
  });

  it("never moves a login that belongs to another shop", async () => {
    h.db = readyDb({ "users.select": () => ({ data: { business_id: "other-shop" }, error: null }) });
    h.generateLink.mockResolvedValue({ data: { properties: { action_link: "https://link" }, user: { id: "u-9" } }, error: null });
    const res = await send();
    expect(res.status).toBe(409);
    expect((await res.json()).error).toMatch(/different shop/);
    expect(calls("users", "update")).toHaveLength(0);
  });
});
