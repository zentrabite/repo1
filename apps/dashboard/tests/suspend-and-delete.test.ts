// Super Admin's Suspend and Delete (migration 041). Runs every migration on a
// real Postgres in memory.
//
// Shop A is live with a team member, shop B has a customer and an order, and
// shop C is an empty test shop with a row in every other shop table, so a new
// table that doesn't go with its shop breaks the delete test.

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { migratedDb, type MigratedDb } from "./migrated-db";

const SHOP_A = "aaaaaaaa-0000-4000-8000-00000000000a";
const SHOP_B = "bbbbbbbb-0000-4000-8000-00000000000b";
const SHOP_C = "cccccccc-0000-4000-8000-00000000000c";
const OWNER_A = "aaaaaaaa-1111-4000-8000-00000000000a";
const OWNER_C = "cccccccc-1111-4000-8000-00000000000c";
const STAFF_A = "aaaaaaaa-2222-4000-8000-000000000001";
const ADMIN = "dddddddd-1111-4000-8000-00000000000d";

// Tables a shop with no customers or orders has nothing in.
const NEEDS_CUSTOMERS = new Set(["customers", "orders", "loyalty_events", "reward_redemptions", "reviews"]);

type Col = { t: string; c: string; u: string; nullable: boolean; hasDefault: boolean };
type R = Record<string, unknown>;

let m: MigratedDb;
let shopTables: string[] = [];

const rows = async (sql: string, params: unknown[] = []) => (await m.db.query<R>(sql, params)).rows;
const count = async (sql: string, params: unknown[] = []) => Number((await rows(sql, params))[0]?.n ?? 0);
async function asServer<T>(fn: () => Promise<T>): Promise<T> {
  await m.db.exec(`set role service_role; set request.jwt.claim.role = 'service_role'`);
  try { return await fn(); } finally { await m.db.exec(`reset request.jwt.claim.role; reset role`); }
}
const suspend = (shop: string) => asServer(() => m.db.query(`update businesses set suspended_at = now(), suspended_reason = 'test' where id = $1`, [shop]));
const resume = (shop: string) => asServer(() => m.db.query(`update businesses set suspended_at = null, suspended_reason = null where id = $1`, [shop]));
const deleteShop = (shop: string) => asServer(() => m.db.query<R>(`select delete_empty_shop($1) as name`, [shop]));

beforeAll(async () => {
  m = await migratedDb();
  await m.db.exec(`
    insert into businesses (id, name, subdomain) values
      ('${SHOP_A}', 'Shop A', 'shop-a'), ('${SHOP_B}', 'Shop B', 'shop-b'), ('${SHOP_C}', 'Test shop C', 'shop-c');
    insert into auth.users (id, email) values ('${OWNER_A}', 'a@example.com'), ('${OWNER_C}', 'c@example.com'), ('${ADMIN}', 'admin@example.com');
    insert into auth.users (id, email, invited_at, email_confirmed_at) values ('${STAFF_A}', 'mia@example.com', now(), now());
    insert into users (id, email, role) values ('${OWNER_A}', 'a@example.com', 'owner'), ('${OWNER_C}', 'c@example.com', 'owner'), ('${ADMIN}', 'admin@example.com', 'owner')
      on conflict (id) do nothing;
    update users set business_id = '${SHOP_A}' where id = '${OWNER_A}';
    update users set business_id = '${SHOP_C}' where id = '${OWNER_C}';
    update users set is_super_admin = true where id = '${ADMIN}';
    insert into business_members (business_id, email, role, status) values ('${SHOP_A}', 'mia@example.com', 'Staff', 'invited');
    insert into customers (business_id, name) values ('${SHOP_A}', 'Amy'), ('${SHOP_B}', 'Bea');
    insert into orders (business_id, total, status, source, items) values ('${SHOP_A}', 20, 'paid', 'pos', '[]'), ('${SHOP_B}', 30, 'paid', 'pos', '[]');
  `);

  // Shop C gets a row in every shop table it can have one in.
  const cols = (await rows(`
    select table_name t, column_name c, udt_name u, is_nullable = 'YES' nullable, column_default is not null "hasDefault"
      from information_schema.columns where table_schema = 'public' order by table_name, ordinal_position`)) as unknown as Col[];
  shopTables = [...new Set(cols.filter(c => c.c === "business_id").map(c => c.t))].filter(t => t !== "users" && !NEEDS_CUSTOMERS.has(t));
  // Parents before the rows that point at them.
  const PARENT: Record<string, Record<string, string>> = {
    delivery_quotes: { job_id: "delivery_jobs" },
    stock_counts:    { stock_item_id: "stock_items" },
    menu_items:      { category_id: "menu_categories" },
    sms_logs:        { campaign_id: "campaigns" },
  };
  shopTables.sort((a, b) => (PARENT[a] ? 1 : 0) - (PARENT[b] ? 1 : 0));
  const FIXED: Record<string, Record<string, string>> = {
    offer_codes: { offer_type: "'percent'" },
    send_pauses: { channel: "'sms'" },
    staff_access_log: { action: "'start'" },
  };
  const value = (c: Col): string => {
    if (c.c === "business_id") return `'${SHOP_C}'`;
    const parent = PARENT[c.t]?.[c.c];
    if (parent) return `(select id from ${parent} where business_id = '${SHOP_C}' limit 1)`;
    const fixed = FIXED[c.t]?.[c.c];
    if (fixed) return fixed;
    if (c.u === "uuid") return "gen_random_uuid()";
    if (/char|text/.test(c.u)) return `'x-' || substr(md5(random()::text), 1, 8)`;
    if (/int|numeric|float/.test(c.u)) return "1";
    if (c.u === "bool") return "false";
    if (/json/.test(c.u)) return `'{}'`;
    if (/timestamp/.test(c.u)) return "now()";
    if (c.u === "date") return "current_date";
    return "null";
  };
  for (const t of shopTables) {
    const need = cols.filter(c => c.t === t && (c.c === "business_id" || (!c.nullable && !c.hasDefault) || PARENT[t]?.[c.c]));
    await m.db.exec(`insert into ${t} (${need.map(c => c.c).join(", ")}) values (${need.map(value).join(", ")})`);
  }
}, 60_000);

afterAll(async () => { await m?.db.close(); });

describe("suspending a shop (041)", () => {
  it("leaves its logins with nothing, and says it's suspended", async () => {
    await suspend(SHOP_A);
    for (const who of [OWNER_A, STAFF_A]) {
      await m.asUser(who, async () => {
        expect((await rows(`select get_my_business_id() id, my_shop_suspended() s`))[0]).toEqual({ id: null, s: true });
        expect(await count(`select count(*) n from customers`)).toBe(0);
        expect(await count(`select count(*) n from orders`)).toBe(0);
        expect(await count(`select count(*) n from businesses`)).toBe(0);
        expect((await m.db.query(`update businesses set name = 'Mine' where id = $1`, [SHOP_A])).affectedRows).toBe(0);
        await expect(m.db.query(`insert into customers (business_id, name) values ($1, 'New')`, [SHOP_A])).rejects.toThrow(/row-level security/);
      });
    }
  });

  it("still lets a super admin open it", async () => {
    await m.asUser(ADMIN, async () => {
      expect(await count(`select count(*) n from businesses where id = $1`, [SHOP_A])).toBe(1);
    });
  });

  it("can be undone", async () => {
    await resume(SHOP_A);
    await m.asUser(STAFF_A, async () => {
      expect((await rows(`select get_my_business_id() id, my_shop_suspended() s`))[0]).toEqual({ id: SHOP_A, s: false });
      expect(await count(`select count(*) n from customers`)).toBe(1);
    });
    await m.asUser(OWNER_A, async () => {
      expect(await count(`select count(*) n from orders`)).toBe(1);
    });
  });

  it("can't be set or cleared from a shop's browser", async () => {
    await m.asUser(OWNER_A, async () => {
      await m.db.query(`update businesses set name = 'Shop A', suspended_at = now(), suspended_reason = 'me' where id = $1`, [SHOP_A]);
    });
    expect((await rows(`select suspended_at, suspended_reason from businesses where id = $1`, [SHOP_A]))[0]).toEqual({ suspended_at: null, suspended_reason: null });
    await m.asAnon(async () => {
      await expect(m.db.query(`select my_shop_suspended()`)).rejects.toThrow(/permission denied/);
    });
  });
});

describe("deleting an empty shop (041)", () => {
  it("can't be called from a browser", async () => {
    await m.asUser(OWNER_C, async () => {
      await expect(m.db.query(`select delete_empty_shop($1)`, [SHOP_C])).rejects.toThrow(/permission denied/);
      await expect(m.db.query(`select shop_of_login()`)).rejects.toThrow(/permission denied/);
    });
  });

  it("needs the shop suspended first", async () => {
    await expect(deleteShop(SHOP_C)).rejects.toThrow(/Suspend the shop/);
  });

  it("refuses a shop with orders or customers", async () => {
    await suspend(SHOP_B);
    await expect(deleteShop(SHOP_B)).rejects.toThrow(/orders or customers/);
    expect(await count(`select count(*) n from businesses where id = $1`, [SHOP_B])).toBe(1);
  });

  it("refuses a shop with a live subscription", async () => {
    await suspend(SHOP_C);
    await asServer(() => m.db.query(`update businesses set settings = settings || '{"subscription_status":"trialing"}' where id = $1`, [SHOP_C]));
    await expect(deleteShop(SHOP_C)).rejects.toThrow(/subscription/);
    await asServer(() => m.db.query(`update businesses set settings = settings || '{"subscription_status":"canceled"}' where id = $1`, [SHOP_C]));
  });

  it("deletes an empty suspended shop and everything in it, and nothing else", async () => {
    expect(shopTables.length).toBeGreaterThanOrEqual(20);
    const before: Record<string, number> = {};
    for (const t of shopTables) {
      expect(await count(`select count(*) n from ${t} where business_id = $1`, [SHOP_C]), t).toBe(1);
      before[t] = await count(`select count(*) n from ${t} where business_id <> $1 or business_id is null`, [SHOP_C]);
    }

    expect((await deleteShop(SHOP_C)).rows[0]).toEqual({ name: "Test shop C" });

    expect(await count(`select count(*) n from businesses where id = $1`, [SHOP_C])).toBe(0);
    for (const t of shopTables) {
      expect(await count(`select count(*) n from ${t} where business_id = $1`, [SHOP_C]), t).toBe(0);
      expect(await count(`select count(*) n from ${t} where business_id <> $1 or business_id is null`, [SHOP_C]), t).toBe(before[t]);
    }
    // The owner's login stays, with no shop.
    expect((await rows(`select business_id from users where id = $1`, [OWNER_C]))[0]).toEqual({ business_id: null });
    expect(await count(`select count(*) n from customers`)).toBe(2);
    expect(await count(`select count(*) n from orders`)).toBe(2);
  });

  it("says so for a shop that's gone", async () => {
    await expect(deleteShop(SHOP_C)).rejects.toThrow(/Shop not found/);
  });
});
