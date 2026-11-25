// No browser can write to, change or list storage (migration 043). Logos and
// menu photos are saved by the server only (lib/logo.ts, /api/menu/upload-image).
// Runs every migration on a real Postgres in memory.

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { migratedDb, type MigratedDb } from "./migrated-db";

const SHOP = "aaaaaaaa-0000-4000-8000-00000000000b";
const OWNER = "aaaaaaaa-1111-4000-8000-00000000000b";

let m: MigratedDb;
const rows = async (sql: string, params: unknown[] = []) => (await m.db.query<Record<string, unknown>>(sql, params)).rows;

beforeAll(async () => {
  m = await migratedDb();
  await m.db.exec(`
    insert into businesses (id, name, subdomain) values ('${SHOP}', 'Shop B', 'shop-b');
    insert into auth.users (id, email) values ('${OWNER}', 'b@example.com');
    update users set business_id = '${SHOP}' where id = '${OWNER}';
    insert into storage.objects (bucket_id, name) values ('menu-images', 'logos/${SHOP}/1.png');
  `);
}, 60_000);

afterAll(async () => { await m?.db.close(); });

describe("storage is server only (043)", () => {
  it("has no rules that let a browser in", async () => {
    expect(await rows(`select policyname from pg_policies where schemaname = 'storage'`)).toEqual([]);
  });

  it("won't let a shop's own login put a logo in either bucket", async () => {
    for (const [bucket, name] of [["business-logos", `${SHOP}/logo.png`], ["menu-images", `logos/${SHOP}/2.png`]]) {
      await expect(m.asUser(OWNER, () => m.db.query(`insert into storage.objects (bucket_id, name) values ($1, $2)`, [bucket, name])))
        .rejects.toThrow(/row-level security/);
    }
  });

  it("lists nothing to a browser", async () => {
    expect(await m.asUser(OWNER, async () => (await m.db.query(`select name from storage.objects`)).rows)).toEqual([]);
    expect(await m.asAnon(async () => (await m.db.query(`select name from storage.objects`)).rows)).toEqual([]);
  });
});
