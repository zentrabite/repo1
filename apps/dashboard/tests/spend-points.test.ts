// Tests for spending points (migration 031 and /api/rewards/redeem). Points
// were earned on every order, but nothing could spend them.
//
// The database half runs on a real Postgres in memory with every migration,
// so it checks the real functions: a reward is swapped only when the points
// are there, never below 0, never twice at once, only in the shop's own
// rewards and customers, and only from the server.

import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { migratedDb, type MigratedDb } from "./migrated-db";

const SHOP_A = "aaaaaaaa-0000-4000-8000-00000000000a";
const SHOP_B = "bbbbbbbb-0000-4000-8000-00000000000b";
const OWNER_A = "aaaaaaaa-1111-4000-8000-00000000000a";
const SOFIA = "aaaaaaaa-3333-4000-8000-000000000001";
const MARCO = "aaaaaaaa-3333-4000-8000-000000000002";
const BEA_B = "bbbbbbbb-3333-4000-8000-000000000001";
const COFFEE = "aaaaaaaa-4444-4000-8000-000000000001"; // 100 points
const MAIN = "aaaaaaaa-4444-4000-8000-000000000002";   // 500 points
const OLD = "aaaaaaaa-4444-4000-8000-000000000003";    // switched off
const B_REWARD = "bbbbbbbb-4444-4000-8000-000000000001";

let m: MigratedDb;
type R = Record<string, unknown>;
const one = async (sql: string, params: unknown[] = []) => (await m.db.query<R>(sql, params)).rows[0] as R;
/** Calls a function the way the server does, with the service role. */
async function server(sql: string, params: unknown[]): Promise<R> {
  await m.db.exec("set role service_role");
  try { return (await one(sql, params)).r as R; } finally { await m.db.exec("reset role"); }
}
const redeem = (shop: string, customer: string, reward: string) => server(`select redeem_reward($1, $2, $3) r`, [shop, customer, reward]);
const undo = (shop: string, id: string) => server(`select undo_redemption($1, $2) r`, [shop, id]);
const balance = async (id: string) => Number((await one(`select points_balance b from customers where id = $1`, [id])).b);

beforeAll(async () => {
  m = await migratedDb();
  await m.db.exec(`
    insert into businesses (id, name, subdomain) values ('${SHOP_A}', 'Shop A', 'shop-a'), ('${SHOP_B}', 'Shop B', 'shop-b');
    insert into auth.users (id, email) values ('${OWNER_A}', 'a@example.com');
    update users set business_id = '${SHOP_A}' where id = '${OWNER_A}';
    insert into customers (id, business_id, name, phone, points_balance) values
      ('${SOFIA}', '${SHOP_A}', 'Sofia', '+61400000001', 650),
      ('${MARCO}', '${SHOP_A}', 'Marco', '+61400000002', 120),
      ('${BEA_B}', '${SHOP_B}', 'Bea',   '+61400000003', 900);
    insert into rewards_catalogue (id, business_id, title, points_cost, is_active) values
      ('${COFFEE}', '${SHOP_A}', 'Free coffee', 100, true),
      ('${MAIN}',   '${SHOP_A}', 'Free main',   500, true),
      ('${OLD}',    '${SHOP_A}', 'Old reward',   10, false),
      ('${B_REWARD}', '${SHOP_B}', 'Shop B pizza', 100, true);
  `);
}, 60_000);

afterAll(async () => { await m?.db.close(); });

describe("swapping points for a reward (031)", () => {
  it("takes the points, records the redemption and the points event", async () => {
    const r = await redeem(SHOP_A, SOFIA, MAIN);
    expect(r).toMatchObject({ ok: true, title: "Free main", cost: 500, balance: 150 });
    expect(await balance(SOFIA)).toBe(150);
    expect(await one(`select status, points_spent, catalogue_id, redeemed_at is not null done from reward_redemptions where id = $1`, [r.id]))
      .toEqual({ status: "redeemed", points_spent: 500, catalogue_id: MAIN, done: true });
    expect(await one(`select event_type, points from loyalty_events where source = $1`, [String(r.id)])).toEqual({ event_type: "redeem", points: -500 });
  });

  it("won't go below 0, and says how many points they have", async () => {
    expect(await redeem(SHOP_A, SOFIA, MAIN)).toEqual({ ok: false, error: "points", balance: 150, cost: 500 });
    expect(await balance(SOFIA)).toBe(150);
  });

  it("a second swap straight after sees the new balance", async () => {
    // Marco has 120, enough for one coffee. PGlite has one connection, so this
    // can't race two sessions. Live, the conditional update's row lock makes a
    // second redemption wait and then see the new balance, the same as here.
    await m.db.exec("set role service_role");
    const both = (await m.db.query<R>(`select redeem_reward($1, $2, $3) a, redeem_reward($1, $2, $3) b`, [SHOP_A, MARCO, COFFEE])).rows[0]!;
    await m.db.exec("reset role");
    const oks = [both.a, both.b].filter(x => (x as R).ok === true);
    expect(oks).toHaveLength(1);
    expect(await balance(MARCO)).toBe(20);
    expect(Number((await one(`select count(*) n from reward_redemptions where customer_id = $1`, [MARCO])).n)).toBe(1);
  });

  it("only the shop's own active rewards and its own customers", async () => {
    expect(await redeem(SHOP_A, SOFIA, OLD)).toEqual({ ok: false, error: "reward" });
    expect(await redeem(SHOP_A, SOFIA, B_REWARD)).toEqual({ ok: false, error: "reward" });
    expect(await redeem(SHOP_A, BEA_B, COFFEE)).toEqual({ ok: false, error: "customer" });
    expect(await redeem(SHOP_B, SOFIA, B_REWARD)).toEqual({ ok: false, error: "customer" });
    expect(await balance(BEA_B)).toBe(900);
    expect(await balance(SOFIA)).toBe(150);
  });

  it("undo gives the points back once", async () => {
    const r = await redeem(SHOP_A, SOFIA, COFFEE);
    expect(await balance(SOFIA)).toBe(50);
    expect(await undo(SHOP_B, String(r.id))).toEqual({ ok: false, error: "redemption" });
    expect(await undo(SHOP_A, String(r.id))).toEqual({ ok: true, points: 100, balance: 150 });
    expect(await undo(SHOP_A, String(r.id))).toEqual({ ok: false, error: "redemption" });
    expect(await balance(SOFIA)).toBe(150);
    expect((await one(`select status from reward_redemptions where id = $1`, [r.id])).status).toBe("cancelled");
  });

  it("a browser can't call either, even the shop's owner", async () => {
    await m.asUser(OWNER_A, async () => {
      for (const sql of [`select redeem_reward('${SHOP_A}', '${SOFIA}', '${COFFEE}')`, `select undo_redemption('${SHOP_A}', gen_random_uuid())`]) {
        await expect(m.db.query(sql)).rejects.toThrow(/permission denied/);
      }
    });
    expect(await balance(SOFIA)).toBe(150);
  });
});

// ─── The route ────────────────────────────────────────────────────────────────

const h = vi.hoisted(() => ({
  rpc: vi.fn(),
  auth: { ok: true, businessId: "shop-a", userId: "u1", email: "mia@a.com", role: "Staff", isSuperAdmin: false } as Record<string, unknown>,
}));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase-server", () => ({ createAdminClient: () => ({ rpc: h.rpc }) }));
vi.mock("@/lib/request-business", () => ({
  MANAGER_ROLES: ["Owner", "Manager"],
  requireBusiness: vi.fn(async (_id: unknown, opts?: { roles?: string[] }) =>
    opts?.roles && !opts.roles.includes(String(h.auth.role))
      ? { ok: false, response: new Response(JSON.stringify({ error: "role" }), { status: 403 }) }
      : h.auth),
}));

import { DELETE as undoRoute, POST as redeemRoute } from "@/app/api/rewards/redeem/route";

const req = (method: string, body: unknown) => new Request("https://dashboard.zentrabite.com/api/rewards/redeem", { method, headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
const ID = "aaaaaaaa-5555-4000-8000-000000000001";
const ID2 = "aaaaaaaa-5555-4000-8000-000000000002";

describe("/api/rewards/redeem", () => {
  beforeEach(() => {
    h.rpc.mockReset();
    h.auth = { ok: true, businessId: "shop-a", userId: "u1", email: "mia@a.com", role: "Staff", isSuperAdmin: false };
  });

  it("anyone on the team swaps points, in their own shop only", async () => {
    h.rpc.mockResolvedValue({ data: { ok: true, id: "r1", title: "Free coffee", cost: 100, balance: 50 }, error: null });
    const res = await redeemRoute(req("POST", { customerId: ID, rewardId: ID2, businessId: "shop-b" }));
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ ok: true, title: "Free coffee", balance: 50 });
    expect(h.rpc).toHaveBeenCalledWith("redeem_reward", { p_business: "shop-a", p_customer: ID, p_reward: ID2 });
  });

  it("says plainly why it didn't work", async () => {
    h.rpc.mockResolvedValue({ data: { ok: false, error: "points", balance: 40, cost: 100 }, error: null });
    let res = await redeemRoute(req("POST", { customerId: ID, rewardId: ID2 }));
    expect(res.status).toBe(409);
    expect((await res.json()).error).toBe("They have 40 points. This reward needs 100.");
    h.rpc.mockResolvedValue({ data: { ok: false, error: "reward" }, error: null });
    res = await redeemRoute(req("POST", { customerId: ID, rewardId: ID2 }));
    expect(res.status).toBe(404);
    res = await redeemRoute(req("POST", { customerId: "not-an-id", rewardId: ID2 }));
    expect(res.status).toBe(400);
  });

  it("only owners and managers undo", async () => {
    expect((await undoRoute(req("DELETE", { redemptionId: ID }))).status).toBe(403);
    expect(h.rpc).not.toHaveBeenCalled();
    h.auth = { ...h.auth, role: "Manager" };
    h.rpc.mockResolvedValue({ data: { ok: true, points: 100, balance: 150 }, error: null });
    const res = await undoRoute(req("DELETE", { redemptionId: ID }));
    expect(res.status).toBe(200);
    expect(h.rpc).toHaveBeenCalledWith("undo_redemption", { p_business: "shop-a", p_redemption: ID });
  });
});
