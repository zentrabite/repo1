// Fixes from the second security run (migration 038, lib/courier-keys.ts,
// /api/delivery/keys and lib/ai-calls-gate.ts).
//
// The database half runs every migration on a real Postgres in memory and
// acts as a shop owner's browser, the way the isolation tests do.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { migratedDb, type MigratedDb } from "./migrated-db";

const SHOP_A = "aaaaaaaa-0000-4000-8000-00000000000a";
const SHOP_C = "cccccccc-0000-4000-8000-00000000000c";
const OWNER_A = "aaaaaaaa-1111-4000-8000-00000000000a";
const SOFIA = "aaaaaaaa-3333-4000-8000-000000000001";   // opted out, 650 points
const GONE = "aaaaaaaa-3333-4000-8000-000000000002";    // details deleted (037)
const NEWBIE = "aaaaaaaa-3333-4000-8000-000000000003";  // added from a browser
const ORDER = "aaaaaaaa-5555-4000-8000-000000000001";
const MIGRATION_038 = fileURLToPath(new URL("../../../supabase/migrations/038_security_run_2.sql", import.meta.url));

let m: MigratedDb;
type R = Record<string, unknown>;
const one = async (sql: string, params: unknown[] = []) => (await m.db.query<R>(sql, params)).rows[0] as R;
const owner = <T>(fn: () => Promise<T>) => m.asUser(OWNER_A, fn);

beforeAll(async () => {
  m = await migratedDb();
  await m.db.exec(`
    insert into businesses (id, name, subdomain) values ('${SHOP_A}', 'Shop A', 'shop-a');
    insert into auth.users (id, email) values ('${OWNER_A}', 'a@example.com');
    update users set business_id = '${SHOP_A}' where id = '${OWNER_A}';
    insert into customers (id, business_id, name, phone, points_balance, total_spent, total_orders,
                           opted_out, opted_out_at, marketing_opt_in, erased_at) values
      ('${SOFIA}', '${SHOP_A}', 'Sofia Rossi', '+61400000001', 650, 120, 4, true, now(), false, null),
      ('${GONE}',  '${SHOP_A}', 'Deleted customer', null, 0, 80, 2, true, now(), false, now());
    insert into reward_redemptions (business_id, customer_id, points_spent, status) values ('${SHOP_A}', '${SOFIA}', 500, 'redeemed');
    insert into campaign_events (business_id, customer_id, event_type) values ('${SHOP_A}', '${SOFIA}', 'sent');
  `);
}, 60_000);

afterAll(async () => { await m?.db.close(); });

describe("a browser can't change a customer's consent, opt-out, points or totals (038)", () => {
  it("keeps them as they were on an update, and still saves the name", async () => {
    await owner(() => m.db.query(`
      update customers set name = 'Sofia R', opted_out = false, opted_out_at = null, marketing_opt_in = true,
        marketing_opt_in_at = now(), marketing_opt_in_source = 'checkout', points_balance = 9999,
        total_spent = 1, total_orders = 99, last_order_date = now(), erased_at = now()
      where id = $1`, [SOFIA]));
    expect(await one(`select name, opted_out, opted_out_at is not null stamped, marketing_opt_in, marketing_opt_in_source,
                              points_balance, total_spent::float8 spent, total_orders, last_order_date, erased_at
                       from customers where id = $1`, [SOFIA])).toEqual({
      name: "Sofia R", opted_out: true, stamped: true, marketing_opt_in: false, marketing_opt_in_source: null,
      points_balance: 650, spent: 120, total_orders: 4, last_order_date: null, erased_at: null,
    });
  });

  it("starts a customer added from a browser with no consent and no points", async () => {
    await owner(() => m.db.query(`
      insert into customers (id, business_id, name, phone, points_balance, total_spent, total_orders,
                             marketing_opt_in, marketing_opt_in_at, marketing_opt_in_source, erased_at)
      values ($1, $2, 'Newbie', '+61400000009', 5000, 999, 50, true, now(), 'checkout', now())`, [NEWBIE, SHOP_A]));
    expect(await one(`select name, points_balance, total_spent::float8 spent, total_orders, marketing_opt_in,
                              marketing_opt_in_at, marketing_opt_in_source, opted_out, erased_at
                       from customers where id = $1`, [NEWBIE])).toEqual({
      name: "Newbie", points_balance: 0, spent: 0, total_orders: 0, marketing_opt_in: false,
      marketing_opt_in_at: null, marketing_opt_in_source: null, opted_out: false, erased_at: null,
    });
  });

  it("still lets a counter sale move the customer's totals through the order trigger", async () => {
    await owner(() => m.db.query(
      `insert into orders (id, business_id, customer_id, total, status, source, items) values ($1, $2, $3, 30, 'delivered', 'pos', '[]')`,
      [ORDER, SHOP_A, NEWBIE]));
    expect(await one(`select points_balance, total_spent::float8 spent, total_orders, last_order_date is not null dated
                       from customers where id = $1`, [NEWBIE]))
      .toEqual({ points_balance: 300, spent: 30, total_orders: 1, dated: true });
  });

  it("leaves a deleted customer deleted", async () => {
    await owner(() => m.db.query(`update customers set name = 'Back again', phone = '+61400000002' where id = $1`, [GONE]));
    expect(await one(`select name, phone from customers where id = $1`, [GONE])).toEqual({ name: "Deleted customer", phone: null });
  });

  it("lets the server change them", async () => {
    await m.db.exec("set role service_role");
    await m.db.exec(`set request.jwt.claim.role = 'service_role'`);
    try {
      await m.db.query(`update customers set marketing_opt_in = true, points_balance = 700 where id = $1`, [SOFIA]);
    } finally {
      await m.db.exec("reset request.jwt.claim.role");
      await m.db.exec("reset role");
    }
    expect(await one(`select marketing_opt_in, points_balance from customers where id = $1`, [SOFIA]))
      .toEqual({ marketing_opt_in: true, points_balance: 700 });
  });
});

describe("points, swaps and win-back results are read only from a browser (038)", () => {
  it("the owner still reads them", async () => {
    const n = await owner(async () => ({
      swaps: (await one(`select count(*)::int n from reward_redemptions`)).n,
      events: (await one(`select count(*)::int n from campaign_events`)).n,
    }));
    expect(n).toEqual({ swaps: 1, events: 1 });
  });

  it("but can't add, change or delete them", async () => {
    for (const sql of [
      `insert into reward_redemptions (business_id, customer_id, points_spent, status) values ('${SHOP_A}', '${SOFIA}', 1, 'redeemed')`,
      `update reward_redemptions set status = 'cancelled'`,
      `delete from reward_redemptions`,
      `insert into loyalty_events (business_id, customer_id, event_type, points, source) values ('${SHOP_A}', '${SOFIA}', 'birthday', 100, 'birthday-2026')`,
      `insert into campaign_events (business_id, customer_id, event_type, revenue_attributed) values ('${SHOP_A}', '${SOFIA}', 'redeemed', 5000)`,
      `delete from campaign_events`,
    ]) {
      await expect(owner(() => m.db.query(sql)), sql).rejects.toThrow(/permission denied/);
    }
    expect((await one(`select count(*)::int n from reward_redemptions where status = 'redeemed'`)).n).toBe(1);
  });
});

describe("courier keys are server only (038)", () => {
  it("a browser can't read business_secrets, logged in or out", async () => {
    await expect(owner(() => m.db.query(`select * from business_secrets`))).rejects.toThrow(/permission denied/);
    await expect(m.asAnon(() => m.db.query(`select * from business_secrets`))).rejects.toThrow(/permission denied/);
  });

  it("keys typed into the shop's row never stay there", async () => {
    await owner(() => m.db.query(`
      update businesses set
        delivery_settings = '{"service_fee": 3.5, "sherpa_api_key": "sk_live_x", "uber_direct_customer_id": "c1"}',
        settings = coalesce(settings, '{}') || '{"delivery_settings": {"gopeople_api_key": "gp", "max_eta_minutes": 50}}'
      where id = $1`, [SHOP_A]));
    expect(await one(`select delivery_settings, settings -> 'delivery_settings' copy from businesses where id = $1`, [SHOP_A]))
      .toEqual({ delivery_settings: { service_fee: 3.5 }, copy: { max_eta_minutes: 50 } });
  });

  it("moves keys saved before 038 into business_secrets, and is safe to run twice", async () => {
    await m.db.exec(`
      alter table businesses disable trigger keep_courier_keys_out;
      insert into businesses (id, name, subdomain, delivery_settings, settings) values ('${SHOP_C}', 'Shop C', 'shop-c',
        '{"uber_direct_api_key": "u-key", "uber_direct_customer_id": "u-id", "sherpa_api_key": "", "service_fee": 4}',
        '{"delivery_settings": {"zoom2u_api_key": "z-key"}, "notify_email": "c@example.com"}');
      alter table businesses enable trigger keep_courier_keys_out;
    `);
    const sql = readFileSync(MIGRATION_038, "utf8");
    await m.db.exec(sql);
    await m.db.exec(sql);
    expect(await one(`select courier from business_secrets where business_id = $1`, [SHOP_C]))
      .toEqual({ courier: { uber_direct_api_key: "u-key", uber_direct_customer_id: "u-id", zoom2u_api_key: "z-key" } });
    expect(await one(`select delivery_settings, settings from businesses where id = $1`, [SHOP_C])).toEqual({
      delivery_settings: { service_fee: 4 },
      settings: { delivery_settings: {}, notify_email: "c@example.com" },
    });
    expect(await one(`select count(*)::int n from business_secrets where business_id = $1`, [SHOP_A])).toEqual({ n: 0 });
  });
});

// ─── The routes ─────────────────────────────────────────────────────────────

const h = vi.hoisted(() => ({
  auth: null as unknown,
  roles: null as unknown,
  saved: {} as Record<string, unknown> | null,
  upserts: [] as unknown[],
  adminCalls: 0,
}));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/request-business", () => ({
  MANAGER_ROLES: ["Owner", "Manager"],
  requireBusiness: async (_id: unknown, opts: { roles?: unknown } = {}) => { h.roles = opts.roles ?? null; return h.auth; },
}));
vi.mock("@/lib/supabase-server", () => ({
  createAdminClient: () => {
    h.adminCalls++;
    return {
      from: (table: string) => ({
        select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: h.saved === null ? null : { courier: h.saved }, error: null, table }) }) }),
        upsert: async (row: unknown) => { h.upserts.push(row); return { error: null }; },
      }),
    };
  },
}));

const MANAGER = { ok: true, businessId: SHOP_A, role: "Manager", userId: OWNER_A, email: "a@example.com" };

describe("/api/delivery/keys", () => {
  const call = async (method: "GET" | "POST", body?: unknown) => {
    const route = await import("@/app/api/delivery/keys/route");
    const req = new Request(`http://x/api/delivery/keys?businessId=${SHOP_A}`,
      method === "POST" ? { method, body: typeof body === "string" ? body : JSON.stringify(body) } : undefined);
    return method === "POST" ? route.POST(req) : route.GET(req);
  };

  it("is for owners and managers", async () => {
    h.auth = { ok: false, response: new Response(JSON.stringify({ error: "Your role can't do that" }), { status: 403 }) };
    expect((await call("GET")).status).toBe(403);
    expect(h.roles).toEqual(["Owner", "Manager"]);
    expect((await call("POST", { set: { sherpa_api_key: "x" } })).status).toBe(403);
  });

  it("says which keys are saved and never sends one back", async () => {
    h.auth = MANAGER;
    h.saved = { sherpa_api_key: "sk_live_secret", uber_direct_api_key: "  " };
    const res = await call("GET");
    const text = await res.text();
    expect(res.status).toBe(200);
    expect(text).not.toContain("sk_live_secret");
    expect(JSON.parse(text).saved).toMatchObject({ sherpa_api_key: true, uber_direct_api_key: false, gopeople_api_key: false });
  });

  it("adds, replaces and removes keys, and leaves the rest", async () => {
    h.auth = MANAGER;
    h.saved = { sherpa_api_key: "old", zoom2u_api_key: "z" };
    h.upserts = [];
    const res = await call("POST", { set: { sherpa_api_key: " new ", gopeople_api_key: "" }, clear: ["zoom2u_api_key"] });
    expect(res.status).toBe(200);
    expect(h.upserts[0]).toMatchObject({ business_id: SHOP_A, courier: { sherpa_api_key: "new" }, updated_by: OWNER_A });
    const text = JSON.stringify(await res.json());
    expect(text).not.toContain("new");
    expect(JSON.parse(text).saved).toMatchObject({ sherpa_api_key: true, zoom2u_api_key: false });
  });

  it("refuses anything that isn't a courier key", async () => {
    h.auth = MANAGER;
    h.upserts = [];
    expect((await call("POST", { set: { service_fee: "1" } })).status).toBe(400);
    expect((await call("POST", { clear: ["settings"] })).status).toBe(400);
    expect((await call("POST", { set: { sherpa_api_key: "a\nb" } })).status).toBe(400);
    expect((await call("POST", {})).status).toBe(400);
    expect((await call("POST", "not json")).status).toBe(400);
    expect(h.upserts).toHaveLength(0);
  });
});

describe("AI calls are switched off (lib/ai-calls-gate.ts)", () => {
  it("refuses a call before looking anyone up", async () => {
    h.auth = MANAGER;
    h.adminCalls = 0;
    const { POST } = await import("@/app/api/ai-calls/start/route");
    const res = await POST(new Request("http://x", { method: "POST", body: JSON.stringify({ customerId: SOFIA }) }));
    expect(res.status).toBe(503);
    expect((await res.json()).error).toMatch(/Do Not Call Register/);
    expect(h.adminCalls).toBe(0);
  });

  it("still needs an owner or manager login first", async () => {
    h.auth = { ok: false, response: new Response("{}", { status: 401 }) };
    const { POST } = await import("@/app/api/ai-calls/start/route");
    expect((await POST(new Request("http://x", { method: "POST", body: "{}" }))).status).toBe(401);
  });
});
