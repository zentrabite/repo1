// Alcohol online is switched on by ZentraBite, never by the shop (migration
// 042). Runs every migration on a real Postgres in memory.

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { migratedDb, type MigratedDb } from "./migrated-db";

const SHOP = "aaaaaaaa-0000-4000-8000-00000000000a";
const OWNER = "aaaaaaaa-1111-4000-8000-00000000000a";

let m: MigratedDb;
const rows = async (sql: string, params: unknown[] = []) => (await m.db.query<Record<string, unknown>>(sql, params)).rows;

beforeAll(async () => {
  m = await migratedDb();
  await m.db.exec(`
    insert into businesses (id, name, subdomain, settings) values ('${SHOP}', 'Shop A', 'shop-a', '{"ordering":{"prep_minutes":20}}');
    insert into auth.users (id, email) values ('${OWNER}', 'a@example.com');
    update users set business_id = '${SHOP}' where id = '${OWNER}';
    insert into menu_items (business_id, name, price) values ('${SHOP}', 'Margherita', 18);
  `);
}, 60_000);

afterAll(async () => { await m?.db.close(); });

describe("alcohol online (042)", () => {
  it("marks no existing item as alcohol", async () => {
    expect(await rows(`select contains_alcohol from menu_items`)).toEqual([{ contains_alcohol: false }]);
  });

  it("lets the owner mark their own item", async () => {
    await m.asUser(OWNER, () => m.db.query(`insert into menu_items (business_id, name, price, contains_alcohol) values ($1, 'Peroni Lager', 9, true)`, [SHOP]));
    expect(await rows(`select name from menu_items where contains_alcohol`)).toEqual([{ name: "Peroni Lager" }]);
  });

  it("won't let the owner turn alcohol on from a browser, or off once we have", async () => {
    await m.asUser(OWNER, () => m.db.query(
      `update businesses set settings = settings || '{"alcohol":{"allowed":true,"licence":"made up"}}', name = 'Shop A' where id = $1`, [SHOP]));
    expect((await rows(`select settings from businesses where id = $1`, [SHOP]))[0]!.settings).toEqual({ ordering: { prep_minutes: 20 } });

    await m.db.query(`update businesses set settings = settings || '{"alcohol":{"allowed":true,"licence":"57512345"}}' where id = $1`, [SHOP]);
    await m.asUser(OWNER, () => m.db.query(`update businesses set settings = settings - 'alcohol' where id = $1`, [SHOP]));
    expect((await rows(`select settings->'alcohol'->>'licence' as l from businesses where id = $1`, [SHOP]))[0]).toEqual({ l: "57512345" });
  });
});
