// Tests for sellers (migration 022): who can run an import and create a
// shop, what a seller can and can't get, and the super admin's controls.
// The database, the login checks and the website import are fakes.

import { beforeEach, describe, expect, it, vi } from "vitest";
import { fakeDb, filterValue, type Query } from "./fake-db";

const h = vi.hoisted(() => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  db: null as any,
  who: null as null | { userId: string; email: string | null; isSuperAdmin: boolean; isSeller: boolean },
  superAdmin: null as null | { id: string },
  generateLink: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase-server", () => ({
  createAdminClient: () => h.db,
  createServerClient: () => h.db,
  createSessionClient: async () => h.db,
}));
vi.mock("@/lib/seller-auth", async () => ({
  ...(await vi.importActual<typeof import("@/lib/seller-auth")>("@/lib/seller-auth")),
  assertSellerOrAdmin: vi.fn(async () => h.who),
}));
vi.mock("@/lib/admin-auth", () => ({ assertSuperAdmin: vi.fn(async () => h.superAdmin) }));
vi.mock("@/lib/email", () => ({ sendEmail: vi.fn(async () => ({ ok: false, skipped: true })) }));
vi.mock("@/lib/import/run", () => ({ runImport: vi.fn(async () => ({ name: { value: "Joe's" } })) }));

import { POST as importRoute } from "@/app/api/admin/onboarding/import/route";
import { POST as createShop } from "@/app/api/admin/onboarding/route";
import { GET as myShops } from "@/app/api/sell/shops/route";
import { GET as listSellers, POST as addSeller } from "@/app/api/admin/sellers/route";
import { DELETE as removeSeller } from "@/app/api/admin/sellers/[id]/route";
import { runImport } from "@/lib/import/run";
import { checkAbn } from "@/lib/abn";
import { SELLER_IMPORTS_PER_DAY, SELLER_SHOPS_PER_DAY } from "@/lib/seller-auth";

const SELLER = { userId: "seller-1", email: "sam@example.com", isSuperAdmin: false, isSeller: true };
const STAFF  = { userId: "staff-1", email: "deon@example.com", isSuperAdmin: true, isSeller: false };

const post = (url: string, body: object) => new Request(`https://dashboard.zentrabite.com${url}`, {
  method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body),
});
const calls = (table: string, op?: Query["op"]) => (h.db.calls as Query[]).filter(q => q.table === table && (!op || q.op === op));
const withAuth = <T extends object>(db: T) => Object.assign(db, { auth: { admin: { generateLink: h.generateLink } } });

beforeEach(() => {
  vi.clearAllMocks();
  h.who = null;
  h.superAdmin = null;
  h.db = withAuth(fakeDb());
});

describe("website import", () => {
  const run = () => importRoute(post("/api/admin/onboarding/import", { url: "joespizza.com.au", permission: true }));

  it("is for sellers and staff only", async () => {
    expect((await run()).status).toBe(403);
    expect(runImport).not.toHaveBeenCalled();
  });

  it("lets a seller run one and records it", async () => {
    h.who = SELLER;
    h.db = withAuth(fakeDb({ "import_runs.select": () => ({ data: null, error: null, count: 3 }) }));
    expect((await run()).status).toBe(200);
    const [count] = calls("import_runs", "select");
    expect(filterValue(count!, "user_id")).toBe("seller-1");
    expect(calls("import_runs", "insert")[0]!.payload).toEqual({ user_id: "seller-1", url: "joespizza.com.au" });
  });

  it("stops a seller at the daily limit, before any AI time is spent", async () => {
    h.who = SELLER;
    h.db = withAuth(fakeDb({ "import_runs.select": () => ({ data: null, error: null, count: SELLER_IMPORTS_PER_DAY }) }));
    expect((await run()).status).toBe(429);
    expect(runImport).not.toHaveBeenCalled();
  });

  it("doesn't limit staff", async () => {
    h.who = STAFF;
    expect((await run()).status).toBe(200);
    expect(calls("import_runs", "select")).toHaveLength(0);
  });
});

describe("creating a shop", () => {
  const sale = (over: object = {}) => post("/api/admin/onboarding", {
    name: "Joe's Pizza", ownerName: "Joe", ownerEmail: "joe@example.com", ownerPhone: "0412 345 678",
    abn: "51824753556", sendInvite: true, ...over,
  });
  const shopDb = (over: Record<string, (q: Query) => { data: unknown; error: null; count?: number }> = {}) =>
    withAuth(fakeDb({
      "businesses.select": q => q.columns === "id" && filterValue(q, "subdomain") !== undefined
        ? { data: null, error: null }
        : { data: null, error: null, count: 0 },
      "businesses.insert": q => ({ data: { id: "biz-9", name: "Joe's Pizza", subdomain: (q.payload as { subdomain: string }).subdomain }, error: null }),
      ...over,
    }));

  it("records the seller and never makes the owner's invite link", async () => {
    h.who = SELLER;
    h.db = shopDb();
    const res = await createShop(sale());
    expect(res.status).toBe(200);
    expect((await res.json()).inviteLink).toBeNull();
    const [ins] = calls("businesses", "insert");
    expect(ins!.payload).toMatchObject({ sold_by: "seller-1", abn: "51 824 753 556", subdomain: "joes-pizza" });
    expect(typeof (ins!.payload as { sold_at: unknown }).sold_at).toBe("string");
    // The invite link logs in as the owner, so a seller never gets one.
    expect(h.generateLink).not.toHaveBeenCalled();
  });

  it("still invites the owner when staff ask for it", async () => {
    h.who = STAFF;
    h.db = shopDb();
    h.generateLink.mockResolvedValue({ data: { properties: { action_link: "https://link" }, user: { id: "owner-1" } } });
    const res = await createShop(sale());
    expect((await res.json()).inviteLink).toBe("https://link");
    expect(calls("businesses", "insert")[0]!.payload).toMatchObject({ sold_by: "staff-1" });
  });

  it("needs the owner's mobile from a seller, and a good ABN from anyone", async () => {
    h.who = SELLER;
    h.db = shopDb();
    expect((await createShop(sale({ ownerPhone: "" }))).status).toBe(400);
    expect((await createShop(sale({ abn: "51824753557" }))).status).toBe(400);
    expect(calls("businesses", "insert")).toHaveLength(0);
  });

  it("stops a seller at the daily limit", async () => {
    h.who = SELLER;
    h.db = shopDb({ "businesses.select": () => ({ data: null, error: null, count: SELLER_SHOPS_PER_DAY }) });
    expect((await createShop(sale())).status).toBe(429);
    expect(calls("businesses", "insert")).toHaveLength(0);
  });

  it("won't give a shop one of our own addresses", async () => {
    h.who = SELLER;
    h.db = shopDb();
    await createShop(sale({ name: "Admin", subdomain: "admin" }));
    expect(calls("businesses", "insert")[0]!.payload).toMatchObject({ subdomain: "admin-2" });
  });

  it("is for sellers and staff only", async () => {
    expect((await createShop(sale())).status).toBe(403);
  });
});

describe("a seller's list of shops", () => {
  it("shows only the shops they sold, with how far setup has got", async () => {
    h.who = SELLER;
    h.db = withAuth(fakeDb({
      "businesses.select": () => ({ data: [
        { id: "b1", name: "Joe's Pizza", subdomain: "joes-pizza", sold_at: "2026-11-20T01:00:00Z", created_at: "2026-11-20T01:00:00Z", stripe_charges_enabled: false, settings: { onboarding: { step: 3 } } },
        { id: "b2", name: "Nonna's", subdomain: "nonna", sold_at: "2026-11-10T01:00:00Z", created_at: "2026-11-10T01:00:00Z", stripe_charges_enabled: true, settings: { site: { published: true } } },
      ], error: null }),
    }));
    const res = await myShops();
    const [q] = calls("businesses", "select");
    expect(filterValue(q!, "sold_by")).toBe("seller-1");
    // Nothing about customers, money or settings goes back.
    expect(q!.columns).not.toMatch(/customer|order|stripe_account|contact|owner|phone|email/);
    expect((await res.json()).shops).toEqual([
      { id: "b1", name: "Joe's Pizza", address: "joes-pizza.zentrabite.com", sold_at: "2026-11-20T01:00:00Z", step: 3, steps: 9, stripe: false, live: false },
      { id: "b2", name: "Nonna's", address: "nonna.zentrabite.com", sold_at: "2026-11-10T01:00:00Z", step: 1, steps: 9, stripe: true, live: true },
    ]);
  });

  it("is for sellers and staff only", async () => {
    expect((await myShops()).status).toBe(403);
  });
});

describe("super admin's sellers", () => {
  it("is for super admins only", async () => {
    h.who = SELLER; // a seller can't add sellers
    expect((await listSellers()).status).toBe(403);
    expect((await addSeller(post("/api/admin/sellers", { name: "Sam", email: "sam@example.com" }))).status).toBe(403);
    expect((await removeSeller(new Request("https://x/"), { params: Promise.resolve({ id: "6f1c2a9e-0b3d-4e5f-8a7b-1c2d3e4f5a6b" }) })).status).toBe(403);
  });

  it("makes a new login a seller, and hands the invite link to staff", async () => {
    h.superAdmin = { id: "staff-1" };
    h.db = withAuth(fakeDb({ "users.select": () => ({ data: null, error: null }) }));
    h.generateLink.mockResolvedValue({ data: { properties: { action_link: "https://invite" }, user: { id: "new-1" } }, error: null });
    const res = await addSeller(post("/api/admin/sellers", { name: "Sam Lee", email: "Sam@Example.com", phone: "0400 000 000" }));
    expect(await res.json()).toMatchObject({ inviteLink: "https://invite", existing: false });
    expect(h.generateLink.mock.calls[0]![0]).toMatchObject({ type: "invite", email: "sam@example.com" });
    expect(calls("users", "upsert")[0]!.payload).toMatchObject({ id: "new-1", is_seller: true, role: "seller", business_id: null, name: "Sam Lee" });
  });

  it("makes someone who already has a login a seller, with no new login", async () => {
    h.superAdmin = { id: "staff-1" };
    h.db = withAuth(fakeDb({ "users.select": () => ({ data: { id: "owner-1", name: "Joe", phone: null }, error: null }) }));
    const res = await addSeller(post("/api/admin/sellers", { name: "Joe", email: "joe@example.com" }));
    expect(await res.json()).toMatchObject({ existing: true });
    expect(h.generateLink).not.toHaveBeenCalled();
    const [upd] = calls("users", "update");
    expect(upd!.payload).toEqual({ is_seller: true });
    expect(filterValue(upd!, "id")).toBe("owner-1");
  });

  it("takes access away without deleting the login", async () => {
    h.superAdmin = { id: "staff-1" };
    const res = await removeSeller(new Request("https://x/"), { params: Promise.resolve({ id: "6f1c2a9e-0b3d-4e5f-8a7b-1c2d3e4f5a6b" }) });
    expect(res.status).toBe(200);
    expect(calls("users", "update")[0]!.payload).toEqual({ is_seller: false });
    expect(calls("users", "delete")).toHaveLength(0);
  });
});

describe("ABN check", () => {
  it("accepts a real ABN and formats it, and catches typos", () => {
    expect(checkAbn("51 824 753 556")).toEqual({ ok: true, abn: "51 824 753 556" });
    expect(checkAbn("")).toEqual({ ok: true, abn: null });
    expect(checkAbn("51824753557")).toEqual({ ok: false, error: "That ABN doesn't check out. Look for a typo." });
    expect(checkAbn("1234")).toEqual({ ok: false, error: "An ABN has 11 digits." });
  });
});
