// Tests for recording a counter sale refund (/api/orders/[id]/refund with a
// source "pos" order). The money goes back on the shop's card machine or in
// cash. Before 23 Nov 2026 nothing recorded it, so the sale, the customer's
// spend and their points stayed as if it never happened.

import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { fakeDb, filterValue, type Query } from "./fake-db";
import { migratedDb, type MigratedDb } from "./migrated-db";

const h = vi.hoisted(() => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  db: null as any,
  auth: { ok: true, businessId: "shop-a", userId: "u1", email: "o@a.com", role: "Owner", isSuperAdmin: false } as Record<string, unknown>,
  stripeCalled: vi.fn(),
}));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase-server", () => ({ createAdminClient: () => h.db }));
vi.mock("@/lib/stripe", () => ({ stripe: new Proxy({}, { get: () => new Proxy({}, { get: () => h.stripeCalled }) }) }));
vi.mock("@/lib/request-business", () => ({
  MANAGER_ROLES: ["Owner", "Manager"],
  requireBusiness: vi.fn(async (_id: unknown, opts?: { roles?: string[] }) =>
    opts?.roles && !opts.roles.includes(String(h.auth.role))
      ? { ok: false, response: new Response(JSON.stringify({ error: "role" }), { status: 403 }) }
      : h.auth),
}));

import { POST as refund } from "@/app/api/orders/[id]/refund/route";
import { counterSale } from "@/lib/refunds";

const ID = "aaaaaaaa-1111-4000-8000-000000000001";
const sale = (over: Record<string, unknown> = {}) => ({ id: ID, business_id: "shop-a", total: 15, status: "Delivered", source: "pos", stripe_payment_id: null, refunded_amount: 0, ...over });
const post = (body: Record<string, unknown>) => refund(new Request(`https://dashboard.zentrabite.com/api/orders/${ID}/refund`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }), { params: Promise.resolve({ id: ID }) });

function shop(order: Record<string, unknown>, saved: unknown[] = [{ id: ID }]) {
  h.db = fakeDb({
    "orders.select": () => ({ data: order, error: null }),
    "orders.update": () => ({ data: saved, error: null }),
  });
}
const updates = (): Query[] => h.db.calls.filter((q: Query) => q.table === "orders" && q.op === "update");

beforeEach(() => {
  h.stripeCalled.mockReset();
  h.auth = { ok: true, businessId: "shop-a", userId: "u1", email: "o@a.com", role: "Owner", isSuperAdmin: false };
});

describe("recording a counter sale refund", () => {
  it("a full refund marks the sale Refunded, and only if nothing was recorded since it was read", async () => {
    shop(sale());
    const res = await post({ amount: 15 });
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ refunded: "$15.00", refund_status: "recorded", refunded_amount: 15, status: "Refunded" });
    const [u] = updates();
    expect(u!.payload).toMatchObject({ refunded_amount: 15, status: "Refunded" });
    expect(filterValue(u!, "business_id")).toBe("shop-a");
    expect(filterValue(u!, "refunded_amount")).toBe(0);
    expect(h.stripeCalled).not.toHaveBeenCalled();
  });

  it("a part refund adds to what's recorded and keeps the status", async () => {
    shop(sale({ refunded_amount: 4 }));
    const res = await post({ amount: "5.50" });
    expect(await res.json()).toMatchObject({ refunded_amount: 9.5, status: "Delivered" });
    const [u] = updates();
    expect(u!.payload).not.toHaveProperty("status");
    expect(filterValue(u!, "refunded_amount")).toBe(4);
  });

  it("a double click records once", async () => {
    shop(sale(), []); // the first click already moved refunded_amount on
    const res = await post({ amount: 15 });
    expect(res.status).toBe(409);
    expect((await res.json()).error).toMatch(/changed while you had it open/);
  });

  it("refuses too much, a sale already refunded, and staff", async () => {
    shop(sale({ refunded_amount: 10 }));
    expect((await post({ amount: 6 })).status).toBe(400);
    shop(sale({ refunded_amount: 15 }));
    expect((await post({})).status).toBe(409);
    h.auth = { ...h.auth, role: "Staff" };
    expect((await post({ amount: 1 })).status).toBe(403);
    expect(updates()).toHaveLength(0);
  });

  it("an online order not paid through Stripe still can't be refunded here", async () => {
    shop(sale({ source: "direct", stripe_payment_id: "cs_test_1" }));
    const res = await post({ amount: 1 });
    expect(res.status).toBe(409);
    expect((await res.json()).error).toMatch(/wasn't paid through ZentraBite/);
    expect(counterSale({ source: "pos" })).toBe(true);
    expect(counterSale({ source: "direct" })).toBe(false);
  });
});

describe("in the database", () => {
  let m: MigratedDb;
  const SHOP = "aaaaaaaa-0000-4000-8000-00000000000a";
  const CUST = "aaaaaaaa-3333-4000-8000-000000000001";
  beforeAll(async () => {
    m = await migratedDb();
    await m.db.exec(`
      insert into businesses (id, name, subdomain) values ('${SHOP}', 'Shop A', 'shop-a');
      insert into customers (id, business_id, name, phone, total_orders, total_spent, points_balance) values ('${CUST}', '${SHOP}', 'Sofia', '+61400000001', 0, 0, 0);
      insert into orders (id, business_id, customer_id, total, source, status) values ('${ID}', '${SHOP}', '${CUST}', 15, 'pos', 'Delivered');
    `);
  }, 60_000);
  afterAll(async () => { await m?.db.close(); });

  it("the customer's spend and points follow, and a second save of the same refund does nothing", async () => {
    const cust = async () => (await m.db.query<Record<string, unknown>>(`select total_orders, total_spent::float s, points_balance from customers where id = $1`, [CUST])).rows[0];
    expect(await cust()).toEqual({ total_orders: 1, s: 15, points_balance: 150 });
    const save = `update orders set refunded_amount = 15, refunded_at = now(), status = 'Refunded' where id = $1 and business_id = $2 and refunded_amount = 0`;
    expect((await m.db.query(save, [ID, SHOP])).affectedRows).toBe(1);
    expect((await m.db.query(save, [ID, SHOP])).affectedRows).toBe(0);
    expect(await cust()).toEqual({ total_orders: 0, s: 0, points_balance: 0 });
  });
});
