// Rows only point at rows in the same shop, and a browser changes only what
// the CRM needs on an order (migration 039). Runs every migration on a real
// Postgres in memory and acts as a shop owner's browser.

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { migratedDb, type MigratedDb } from "./migrated-db";

const SHOP_A = "aaaaaaaa-0000-4000-8000-00000000000a";
const SHOP_B = "bbbbbbbb-0000-4000-8000-00000000000b";
const OWNER_A = "aaaaaaaa-1111-4000-8000-00000000000a";
const AMY_A = "aaaaaaaa-3333-4000-8000-000000000001";
const BEA_B = "bbbbbbbb-3333-4000-8000-000000000001";
const ORDER_A = "aaaaaaaa-5555-4000-8000-000000000001";
const CAT_B = "bbbbbbbb-6666-4000-8000-000000000001";
const STOCK_B = "bbbbbbbb-7777-4000-8000-000000000001";

let m: MigratedDb;
type R = Record<string, unknown>;
const one = async (sql: string, params: unknown[] = []) => (await m.db.query<R>(sql, params)).rows[0] as R;
const owner = <T>(fn: () => Promise<T>) => m.asUser(OWNER_A, fn);
async function asServer<T>(fn: () => Promise<T>): Promise<T> {
  await m.db.exec(`set role service_role; set request.jwt.claim.role = 'service_role'`);
  try { return await fn(); } finally { await m.db.exec(`reset request.jwt.claim.role; reset role`); }
}
const bea = async () => one(`select points_balance, total_spent::float8 spent, total_orders from customers where id = $1`, [BEA_B]);

beforeAll(async () => {
  m = await migratedDb();
  await m.db.exec(`
    insert into businesses (id, name, subdomain) values ('${SHOP_A}', 'Shop A', 'shop-a'), ('${SHOP_B}', 'Shop B', 'shop-b');
    insert into auth.users (id, email) values ('${OWNER_A}', 'a@example.com');
    update users set business_id = '${SHOP_A}' where id = '${OWNER_A}';
    insert into customers (id, business_id, name, points_balance, total_spent, total_orders) values
      ('${AMY_A}', '${SHOP_A}', 'Amy', 0, 0, 0),
      ('${BEA_B}', '${SHOP_B}', 'Bea', 120, 12, 1);
    insert into menu_categories (id, business_id, name) values ('${CAT_B}', '${SHOP_B}', 'Pizza');
    insert into stock_items (id, business_id, name) values ('${STOCK_B}', '${SHOP_B}', 'Flour');
  `);
}, 60_000);

afterAll(async () => { await m?.db.close(); });

describe("an order can't use another shop's customer (039)", () => {
  it("is refused from a browser, and the other shop's customer doesn't change", async () => {
    await expect(owner(() => m.db.query(
      `insert into orders (business_id, customer_id, total, status, source, items) values ($1, $2, 5000, 'paid', 'pos', '[]')`,
      [SHOP_A, BEA_B]))).rejects.toThrow(/same shop/);
    expect(await bea()).toEqual({ points_balance: 120, spent: 12, total_orders: 1 });
  });

  it("is refused from the server too", async () => {
    await expect(asServer(() => m.db.query(
      `insert into orders (business_id, customer_id, total, status, source, items) values ($1, $2, 50, 'paid', 'direct', '[]')`,
      [SHOP_A, BEA_B]))).rejects.toThrow(/same shop/);
  });

  it("works with the shop's own customer", async () => {
    await owner(() => m.db.query(
      `insert into orders (id, business_id, customer_id, total, status, source, stripe_payment_id, items)
       values ($1, $2, $3, 30, 'paid', 'direct', 'pi_fake', '[]')`, [ORDER_A, SHOP_A, AMY_A]));
    expect(await one(`select source, stripe_payment_id from orders where id = $1`, [ORDER_A]))
      .toEqual({ source: "pos", stripe_payment_id: null });
    expect(await one(`select points_balance, total_orders from customers where id = $1`, [AMY_A]))
      .toEqual({ points_balance: 300, total_orders: 1 });
  });

  it("refuses a sale below zero from a browser", async () => {
    await expect(owner(() => m.db.query(
      `insert into orders (business_id, total, status, source, items) values ($1, -100, 'paid', 'pos', '[]')`, [SHOP_A])))
      .rejects.toThrow(/less than zero/);
  });

  it("keeps the order and refund triggers inside the shop even if a bad row got in", async () => {
    await m.db.exec(`alter table orders disable trigger same_shop_links`);
    try {
      await asServer(() => m.db.query(
        `insert into orders (business_id, customer_id, total, status, source, items) values ($1, $2, 5000, 'paid', 'direct', '[]')`,
        [SHOP_A, BEA_B]));
      await asServer(() => m.db.query(`update orders set refunded_amount = 5000 where customer_id = $1`, [BEA_B]));
    } finally {
      await m.db.exec(`alter table orders enable trigger same_shop_links`);
      await m.db.exec(`delete from orders where customer_id = '${BEA_B}'`);
    }
    expect(await bea()).toEqual({ points_balance: 120, spent: 12, total_orders: 1 });
  });
});

describe("a browser changes only an order's status, stages and tracking (039)", () => {
  it("saves those and keeps the rest", async () => {
    await owner(() => m.db.query(`
      update orders set status = 'Preparing', picked_at = now(), carrier = 'Sherpa', tracking_number = 'T1',
        source = 'direct', total = 1, stripe_payment_id = 'pi_x', customer_id = null, items = '[{"name":"x"}]',
        notes = 'changed', created_at = now() - interval '1 year'
      where id = $1`, [ORDER_A]));
    expect(await one(`select status, picked_at is not null picked, carrier, tracking_number, source, total::float8 total,
                              stripe_payment_id, customer_id, items, notes, created_at > now() - interval '1 day' recent
                       from orders where id = $1`, [ORDER_A])).toEqual({
      status: "Preparing", picked: true, carrier: "Sherpa", tracking_number: "T1", source: "pos", total: 30,
      stripe_payment_id: null, customer_id: AMY_A, items: [], notes: null, recent: true,
    });
  });

  it("can clear a stage again", async () => {
    await owner(() => m.db.query(`update orders set picked_at = null where id = $1`, [ORDER_A]));
    expect(await one(`select picked_at from orders where id = $1`, [ORDER_A])).toEqual({ picked_at: null });
  });

  it("lets the server change the rest", async () => {
    await asServer(() => m.db.query(`update orders set notes = 'from the server' where id = $1`, [ORDER_A]));
    expect(await one(`select notes from orders where id = $1`, [ORDER_A])).toEqual({ notes: "from the server" });
  });
});

describe("other links stay in the shop (039)", () => {
  it("a review, menu item or stock count can't point at another shop's row", async () => {
    for (const [sql, params] of [
      [`insert into reviews (business_id, customer_id, customer_name, rating, body) values ($1, $2, 'Bea', 1, 'x')`, [SHOP_A, BEA_B]],
      [`insert into menu_items (business_id, category_id, name, price) values ($1, $2, 'Stolen', 1)`, [SHOP_A, CAT_B]],
      [`insert into stock_counts (business_id, stock_item_id, before_qty, after_qty) values ($1, $2, 1, 2)`, [SHOP_A, STOCK_B]],
      [`insert into customers (business_id, name, referred_by) values ($1, 'Ref', $2)`, [SHOP_A, BEA_B]],
    ] as const) {
      await expect(owner(() => m.db.query(sql, [...params])), sql).rejects.toThrow(/same shop/);
    }
  });
});
