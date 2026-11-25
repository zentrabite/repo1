// Super Admin's Suspend and Delete (lib/shop-status.ts, migration 041), what a
// suspended shop loses (logins, ordering page, texts, the daily run), and the
// POS till signing out after 15 minutes with no taps.
// The database side is in tests/suspend-and-delete.test.ts.

import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { fakeDb, filterValue, type Query } from "./fake-db";

vi.mock("server-only", () => ({}));

const ADMIN = "aaaaaaaa-0000-4000-8000-000000000001";
const OWNER = "cccccccc-0000-4000-8000-000000000003";
const SHOP = "bbbbbbbb-0000-4000-8000-000000000002";

const h = vi.hoisted(() => ({
  db: null as unknown as ReturnType<typeof import("./fake-db").fakeDb>,
  user: "",
}));

vi.mock("next/headers", () => ({ cookies: async () => ({ get: () => undefined }) }));
vi.mock("@/lib/supabase-server", () => ({
  createSessionClient: async () => ({ auth: { getUser: async () => ({ data: { user: { id: h.user, email: "x@example.com" } } }) } }),
  createAdminClient: () => h.db,
  createServerClient: () => h.db,
}));

import { deleteEmptyShop, resumeShop, suspendShop } from "@/lib/shop-status";
import { requireBusiness, SUSPENDED_MESSAGE } from "@/lib/request-business";
import { checkSmsAllowance } from "@/lib/sms";
import { idleState, IDLE_MS, WARN_MS } from "@/components/idle-sign-out";
import { deleteBlocker, type DangerShop } from "@/app/admin/danger-zone";
import { POST as suspendRoute } from "@/app/api/admin/businesses/[id]/suspend/route";
import { DELETE as deleteRoute } from "@/app/api/admin/businesses/[id]/route";
import { GET as storeGet } from "@/app/api/store/[subdomain]/route";
import { loadSite } from "@/lib/site";

type Shop = { id: string; name: string; suspended_at: string | null };
let shop: Shop | null;
let rpcError: { message: string } | null;
let removed: string[];

function world(isSuperAdmin: boolean) {
  const db = fakeDb({
    "users.select": () => ({ data: { business_id: isSuperAdmin ? null : SHOP, is_super_admin: isSuperAdmin }, error: null }),
    "businesses.select": () => ({ data: shop, error: null }),
    "businesses.update": (q: Query) => {
      if (!shop || filterValue(q, "id") !== shop.id) return { data: null, error: null };
      shop = { ...shop, ...(q.payload as Partial<Shop>) };
      return { data: { id: shop.id, name: shop.name }, error: null };
    },
    "rpc.delete_empty_shop": () => ({ data: rpcError ? null : shop?.name ?? null, error: rpcError }),
  });
  const storage = {
    from: () => ({
      list: async (folder: string) => ({ data: folder === SHOP ? [{ name: "1.jpg" }, { name: "2.png" }] : [], error: null }),
      remove: async (paths: string[]) => { removed.push(...paths); return { data: null, error: null }; },
    }),
  };
  return Object.assign(db, { storage });
}

beforeEach(() => {
  shop = { id: SHOP, name: "Test Pizza", suspended_at: null };
  rpcError = null;
  removed = [];
  h.user = ADMIN;
  h.db = world(true);
});

describe("suspending a shop", () => {
  it("needs a reason, and saves who and when", async () => {
    expect(await suspendShop(h.db, SHOP, ADMIN, "  ")).toMatchObject({ ok: false, status: 400 });
    expect(await suspendShop(h.db, SHOP, ADMIN, "x".repeat(301))).toMatchObject({ ok: false, status: 400 });
    expect(await suspendShop(h.db, SHOP, ADMIN, " test shop ")).toEqual({ ok: true, name: "Test Pizza" });
    expect(shop).toMatchObject({ suspended_by: ADMIN, suspended_reason: "test shop" });
    expect(shop!.suspended_at).toBeTruthy();
  });

  it("can be undone", async () => {
    await suspendShop(h.db, SHOP, ADMIN, "unpaid");
    expect(await resumeShop(h.db, SHOP)).toEqual({ ok: true, name: "Test Pizza" });
    expect(shop).toMatchObject({ suspended_at: null, suspended_by: null, suspended_reason: null });
  });

  it("says so for a shop that isn't there", async () => {
    expect(await suspendShop(h.db, "nope", ADMIN, "x")).toMatchObject({ ok: false, status: 404 });
  });

  it("is super admin only", async () => {
    h.db = world(false);
    const res = await suspendRoute(new Request("http://x", { method: "POST", body: JSON.stringify({ reason: "x" }) }), { params: Promise.resolve({ id: SHOP }) });
    expect(res.status).toBe(403);
    expect(shop!.suspended_at).toBeNull();
  });
});

describe("deleting a shop", () => {
  const del = (name: unknown) => deleteRoute(
    new NextRequest("http://x", { method: "DELETE", body: JSON.stringify({ name }) }),
    { params: Promise.resolve({ id: SHOP }) },
  );

  it("needs the shop's name typed", async () => {
    expect((await del("Test")).status).toBe(400);
    expect(h.db.rpcCalls).toHaveLength(0);
  });

  it("deletes through delete_empty_shop, then removes the shop's pictures", async () => {
    const res = await del(" Test Pizza ");
    expect(res.status).toBe(200);
    expect(h.db.rpcCalls).toEqual([{ name: "delete_empty_shop", args: { p_business: SHOP } }]);
    expect(removed).toEqual([`${SHOP}/1.jpg`, `${SHOP}/2.png`]);
  });

  it("passes on the database's refusal, and removes nothing", async () => {
    rpcError = { message: "This shop has orders or customers, so it can't be deleted" };
    const out = await deleteEmptyShop(h.db, SHOP, "Test Pizza");
    expect(out).toEqual({ ok: false, status: 409, error: "This shop has orders or customers, so it can't be deleted." });
    expect(removed).toEqual([]);
  });

  it("is super admin only", async () => {
    h.db = world(false);
    expect((await del("Test Pizza")).status).toBe(403);
    expect(h.db.rpcCalls).toHaveLength(0);
  });
});

describe("a suspended shop", () => {
  it("can't use the CRM's server routes, but a super admin can", async () => {
    shop = { ...shop!, suspended_at: "2026-11-25T05:00:00Z" };
    h.user = OWNER;
    h.db = world(false);
    const auth = await requireBusiness(null);
    expect(auth.ok).toBe(false);
    if (!auth.ok) {
      expect(auth.response.status).toBe(403);
      expect(await auth.response.json()).toEqual({ error: SUSPENDED_MESSAGE });
    }

    h.user = ADMIN;
    h.db = world(true);
    expect((await requireBusiness(SHOP)).ok).toBe(true);
  });

  it("works again once it's undone", async () => {
    h.user = OWNER;
    h.db = world(false);
    expect(await requireBusiness(null)).toMatchObject({ ok: true, businessId: SHOP, role: "Owner" });
  });

  it("sends no texts", async () => {
    shop = { ...shop!, suspended_at: "2026-11-25T05:00:00Z" };
    expect(await checkSmsAllowance(world(false), SHOP)).toEqual({ ok: false, status: 403, reason: "This shop's account is paused, so it can't send texts." });
    shop = { ...shop!, suspended_at: null };
    expect(await checkSmsAllowance(world(false), SHOP)).toEqual({ ok: true });
  });
});

describe("a suspended shop's ordering page and website", () => {
  // Answers like the database: a filter on suspended_at hides a suspended shop.
  function publicDb() {
    return fakeDb({
      "businesses.select": (q: Query) => {
        const hides = q.filters.some(([c, v]) => c === "suspended_at is" && v === null);
        return { data: shop && !(hides && shop.suspended_at) ? { ...shop, subdomain: "test-pizza", settings: {} } : null, error: null };
      },
    });
  }

  it("are off while it's suspended, and back once it's undone", async () => {
    shop = { ...shop!, suspended_at: "2026-11-25T05:00:00Z" };
    h.db = publicDb();
    const call = () => storeGet(new Request("http://x/api/store/test-pizza"), { params: Promise.resolve({ subdomain: "test-pizza" }) });
    expect((await call()).status).toBe(404);
    expect(await loadSite("test-pizza")).toBeNull();

    shop = { ...shop!, suspended_at: null };
    expect((await call()).status).toBe(200);
    expect(await loadSite("test-pizza")).not.toBeNull();
  });
});

describe("Delete on the admin page", () => {
  const base: DangerShop = { id: SHOP, name: "Test Pizza", suspended_at: "2026-11-25T05:00:00Z", suspended_reason: "test", orderCount: 0, customerCount: 0, settings: {} };

  it("works only for a suspended, empty shop with no live subscription", () => {
    expect(deleteBlocker(base)).toBeNull();
    expect(deleteBlocker({ ...base, settings: { subscription_status: "canceled" } })).toBeNull();
    expect(deleteBlocker({ ...base, suspended_at: null })).toMatch(/Suspend/);
    expect(deleteBlocker({ ...base, orderCount: 1 })).toMatch(/orders or customers/);
    expect(deleteBlocker({ ...base, customerCount: 3 })).toMatch(/orders or customers/);
    expect(deleteBlocker({ ...base, settings: { subscription_status: "trialing" } })).toMatch(/subscription/);
    expect(deleteBlocker({ ...base, settings: { subscription_status: "past_due" } })).toMatch(/subscription/);
  });
});

describe("the POS till signing out", () => {
  it("warns a minute before 15 minutes with no taps, then signs out", () => {
    const t0 = 1_000_000;
    expect(idleState(t0 + 5 * 60_000, t0)).toBe("ok");
    expect(idleState(t0 + IDLE_MS - WARN_MS - 1, t0)).toBe("ok");
    expect(idleState(t0 + IDLE_MS - WARN_MS, t0)).toBe("warn");
    expect(idleState(t0 + IDLE_MS - 1, t0)).toBe("warn");
    expect(idleState(t0 + IDLE_MS, t0)).toBe("out");
    // A tablet that slept for an hour signs out as it wakes.
    expect(idleState(t0 + 60 * 60_000, t0)).toBe("out");
  });
});
