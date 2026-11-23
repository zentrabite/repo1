// Deleting a customer's details (migration 037 and /api/customers/[id]/delete).
// A customer can ask a shop to delete what it holds about them.
//
// The database half runs every migration on a real Postgres in memory, so it
// checks the real function: everything that says who the person is goes, the
// money stays for the shop's tax records, only in the shop's own customers,
// only once, and only from the server.

import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { migratedDb, type MigratedDb } from "./migrated-db";

const SHOP_A = "aaaaaaaa-0000-4000-8000-00000000000a";
const SHOP_B = "bbbbbbbb-0000-4000-8000-00000000000b";
const OWNER_A = "aaaaaaaa-1111-4000-8000-00000000000a";
const SOFIA = "aaaaaaaa-3333-4000-8000-000000000001";
const MARCO = "aaaaaaaa-3333-4000-8000-000000000002";
const BEA_B = "bbbbbbbb-3333-4000-8000-000000000001";
const ORDER_1 = "aaaaaaaa-5555-4000-8000-000000000001";
const ORDER_2 = "aaaaaaaa-5555-4000-8000-000000000002";
const MARCO_ORDER = "aaaaaaaa-5555-4000-8000-000000000003";

let m: MigratedDb;
type R = Record<string, unknown>;
const one = async (sql: string, params: unknown[] = []) => (await m.db.query<R>(sql, params)).rows[0] as R;
const all = async (sql: string, params: unknown[] = []) => (await m.db.query<R>(sql, params)).rows;
async function erase(shop: string, customer: string): Promise<R> {
  await m.db.exec("set role service_role");
  try { return (await one(`select erase_customer($1, $2) r`, [shop, customer])).r as R; } finally { await m.db.exec("reset role"); }
}

beforeAll(async () => {
  m = await migratedDb();
  await m.db.exec(`
    insert into businesses (id, name, subdomain) values ('${SHOP_A}', 'Shop A', 'shop-a'), ('${SHOP_B}', 'Shop B', 'shop-b');
    insert into auth.users (id, email) values ('${OWNER_A}', 'a@example.com');
    update users set business_id = '${SHOP_A}' where id = '${OWNER_A}';
    insert into customers (id, business_id, name, phone, email, points_balance, birth_month, birth_day, referral_code,
                           marketing_opt_in, marketing_opt_in_at, marketing_opt_in_source) values
      ('${SOFIA}', '${SHOP_A}', 'Sofia Rossi', '+61400000001', 'sofia@example.com', 650, 3, 14, 'SOFIA10', true, now(), 'checkout'),
      ('${MARCO}', '${SHOP_A}', 'Marco',       '+61400000002', 'marco@example.com', 120, null, null, null, true, now(), 'checkout'),
      ('${BEA_B}', '${SHOP_B}', 'Bea',         '+61400000003', 'bea@example.com',   900, null, null, null, true, now(), 'checkout');
    insert into orders (id, business_id, customer_id, total, status, source, items, ship_to, notes, refunded_amount) values
      ('${ORDER_1}', '${SHOP_A}', '${SOFIA}', 40, 'delivered', 'direct', '[{"name":"Margherita","qty":2}]',
        '{"name":"Sofia Rossi","phone":"+61400000001","address":"1 Basil Lane, Norwood"}', 'Ring the bell, ask for Sofia', 0),
      ('${ORDER_2}', '${SHOP_A}', '${SOFIA}', 25, 'refunded', 'direct', '[]', null, 'No onions', 25),
      ('${MARCO_ORDER}', '${SHOP_A}', '${MARCO}', 30, 'delivered', 'direct', '[]', '{"address":"9 Other St"}', 'Marco note', 0);
    insert into notifications (business_id, order_id, title, body) values
      ('${SHOP_A}', '${ORDER_1}', 'New order', 'Customer: Sofia Rossi'),
      ('${SHOP_A}', '${MARCO_ORDER}', 'New order', 'Customer: Marco');
    insert into delivery_jobs (business_id, order_id, dropoff_address, selected_provider, status) values
      ('${SHOP_A}', '${ORDER_1}', '1 Basil Lane, Norwood', 'none', 'delivered');
    insert into sms_logs (business_id, customer_id, message, recipient, status, kind, provider_id) values
      ('${SHOP_A}', '${SOFIA}', 'Hi Sofia, we miss you', '+61400000001', 'sent', 'marketing', 'SM1'),
      ('${SHOP_A}', '${MARCO}', 'Hi Marco', '+61400000002', 'sent', 'marketing', 'SM2');
    insert into reviews (business_id, customer_id, customer_name, rating, body) values
      ('${SHOP_A}', '${SOFIA}', 'Sofia Rossi', 5, 'Best pizza in Norwood'),
      ('${SHOP_A}', '${MARCO}', 'Marco', 4, 'Good');
    insert into offer_codes (business_id, code, customer_id, offer_type, offer_value, expires_at) values
      ('${SHOP_A}', 'SOFIAONE', '${SOFIA}', 'dollar', 10, now() + interval '10 days'),
      ('${SHOP_A}', 'MARCOONE', '${MARCO}', 'dollar', 10, now() + interval '10 days');
  `);
}, 60_000);

afterAll(async () => { await m?.db.close(); });

describe("deleting a customer's details (037)", () => {
  it("a browser can't call it, even the shop's owner", async () => {
    await m.asUser(OWNER_A, async () => {
      await expect(m.db.query(`select erase_customer('${SHOP_A}', '${SOFIA}')`)).rejects.toThrow(/permission denied/);
    });
    await m.asAnon(async () => {
      await expect(m.db.query(`select erase_customer('${SHOP_A}', '${SOFIA}')`)).rejects.toThrow(/permission denied/);
    });
  });

  it("won't touch another shop's customer", async () => {
    expect(await erase(SHOP_A, BEA_B)).toEqual({ ok: false, error: "customer" });
    expect(await one(`select name, phone from customers where id = $1`, [BEA_B])).toEqual({ name: "Bea", phone: "+61400000003" });
  });

  it("removes who they are and keeps the money", async () => {
    const before = await one(`select total_spent, total_orders from customers where id = $1`, [SOFIA]);
    expect(await erase(SHOP_A, SOFIA)).toEqual({ ok: true, orders: 2, texts: 1, reviews: 1 });

    const c = await one(`select * from customers where id = $1`, [SOFIA]);
    expect(c).toMatchObject({
      name: "Deleted customer", phone: null, email: null, birth_month: null, birth_day: null, referral_code: null,
      points_balance: 0, marketing_opt_in: false, marketing_opt_in_at: null, marketing_opt_in_source: null, opted_out: true,
    });
    expect(c.erased_at).not.toBeNull();
    expect(c.opted_out_at).not.toBeNull();
    // Sales stay for tax. The triggers that move totals didn't fire.
    expect({ total_spent: c.total_spent, total_orders: c.total_orders }).toEqual(before);

    expect(await all(`select id, total, items, ship_to, notes, refunded_amount from orders where customer_id = $1 order by id`, [SOFIA])).toEqual([
      { id: ORDER_1, total: "40", items: [{ name: "Margherita", qty: 2 }], ship_to: null, notes: null, refunded_amount: "0.00" },
      { id: ORDER_2, total: "25", items: [], ship_to: null, notes: null, refunded_amount: "25.00" },
    ]);
    expect(await one(`select title, body from notifications where order_id = $1`, [ORDER_1])).toEqual({ title: "New order", body: null });
    expect(await one(`select dropoff_address from delivery_jobs where order_id = $1`, [ORDER_1])).toEqual({ dropoff_address: null });
    expect(await one(`select message, recipient, status, provider_id from sms_logs where customer_id = $1`, [SOFIA]))
      .toEqual({ message: null, recipient: null, status: "sent", provider_id: "SM1" });
    expect(await one(`select count(*)::int n from reviews where customer_id = $1`, [SOFIA])).toEqual({ n: 0 });
    expect(await one(`select expires_at <= now() ended from offer_codes where code = 'SOFIAONE'`)).toEqual({ ended: true });
  });

  it("leaves everyone else alone", async () => {
    // 120 to start, plus 300 from his $30 order (the order trigger, 10 a dollar).
    expect(await one(`select name, phone, email, points_balance, erased_at from customers where id = $1`, [MARCO]))
      .toEqual({ name: "Marco", phone: "+61400000002", email: "marco@example.com", points_balance: 420, erased_at: null });
    expect(await one(`select ship_to, notes from orders where id = $1`, [MARCO_ORDER])).toEqual({ ship_to: { address: "9 Other St" }, notes: "Marco note" });
    expect(await one(`select body from notifications where order_id = $1`, [MARCO_ORDER])).toEqual({ body: "Customer: Marco" });
    expect(await one(`select message, recipient from sms_logs where customer_id = $1`, [MARCO])).toEqual({ message: "Hi Marco", recipient: "+61400000002" });
    expect(await one(`select count(*)::int n from reviews where customer_id = $1`, [MARCO])).toEqual({ n: 1 });
    expect(await one(`select expires_at > now() live from offer_codes where code = 'MARCOONE'`)).toEqual({ live: true });
  });

  it("only happens once", async () => {
    expect(await erase(SHOP_A, SOFIA)).toEqual({ ok: false, error: "customer" });
  });
});

// ─── The route ──────────────────────────────────────────────────────────────

const auth = vi.hoisted(() => ({ result: null as unknown, roles: null as unknown, rpc: null as unknown }));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/request-business", () => ({
  MANAGER_ROLES: ["Owner", "Manager"],
  requireBusiness: async (_id: unknown, opts: { roles?: unknown } = {}) => { auth.roles = opts.roles ?? null; return auth.result; },
}));
vi.mock("@/lib/supabase-server", () => ({
  createAdminClient: () => ({ rpc: async (name: string, args: unknown) => { auth.rpc = { name, args }; return { data: { ok: true, orders: 3, texts: 2, reviews: 0 }, error: null }; } }),
}));

describe("POST /api/customers/[id]/delete", () => {
  const call = async (id: string, body: unknown = { confirm: true }) => {
    const { POST } = await import("@/app/api/customers/[id]/delete/route");
    return POST(new Request("http://x", { method: "POST", body: JSON.stringify(body) }), { params: Promise.resolve({ id }) });
  };

  it("needs an owner or manager, and the shop from the login", async () => {
    auth.result = { ok: false, response: new Response(JSON.stringify({ error: "Your role can't do that" }), { status: 403 }) };
    const res = await call(SOFIA);
    expect(res.status).toBe(403);
    expect(auth.roles).toEqual(["Owner", "Manager"]);
  });

  it("asks for the confirm tick and a real customer id", async () => {
    auth.result = { ok: true, businessId: SHOP_A, role: "Owner" };
    expect((await call(SOFIA, {})).status).toBe(400);
    expect((await call("not-an-id")).status).toBe(400);
  });

  it("deletes through the database function for the login's shop", async () => {
    auth.result = { ok: true, businessId: SHOP_A, role: "Manager" };
    const res = await call(SOFIA);
    expect(res.status).toBe(200);
    expect(auth.rpc).toEqual({ name: "erase_customer", args: { p_business: SHOP_A, p_customer: SOFIA } });
    expect(await res.json()).toMatchObject({ ok: true, orders: 3 });
  });
});
