// Proves one shop can't see or change another shop's data, using the
// database's own rules. Every migration runs on a real Postgres in memory
// (tests/migrated-db.ts), two shops get a row in every table, and then each
// shop's owner, and a logged-out browser holding the public key, tries to
// read, change, delete and add the other shop's rows.
//
// The server uses the service role, which skips these rules, so the routes
// have their own check (tests/route-guards.test.ts). This file is about
// what a browser can do with the public key, which is the part an attacker
// can reach directly.
//
// A new table with a business_id is tested automatically. A new table
// without row level security fails the test.
//
// Team members (030) are logins with no shop of their own and a row in
// business_members. They reach the shop they joined once the invite link is
// opened, and nothing before, after being removed, or by signing up with an
// invited email.

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { migratedDb, type MigratedDb } from "./migrated-db";

const SHOP_A = "aaaaaaaa-0000-4000-8000-00000000000a";
const SHOP_B = "bbbbbbbb-0000-4000-8000-00000000000b";
const OWNER_A = "aaaaaaaa-1111-4000-8000-00000000000a";
const OWNER_B = "bbbbbbbb-1111-4000-8000-00000000000b";
const SELLER = "cccccccc-1111-4000-8000-00000000000c";
// Shop A's team (030).
const STAFF_A   = "aaaaaaaa-2222-4000-8000-000000000001"; // invited, opened the link
const MANAGER_A = "aaaaaaaa-2222-4000-8000-000000000002"; // invited, opened the link
const PENDING_A = "aaaaaaaa-2222-4000-8000-000000000003"; // invited, hasn't opened it
const SQUAT_A   = "aaaaaaaa-2222-4000-8000-000000000004"; // signed up with an invited email, never invited
const GONE_A    = "aaaaaaaa-2222-4000-8000-000000000005"; // opened it, then removed

// Tables only the server reads or writes. Their owners can't read them either.
// business_members since 030: the team is listed and changed through /api/team.
const SERVER_ONLY = new Set(["offer_codes", "stripe_setup_links", "import_runs", "edge_function_runs", "enquiries", "send_pauses", "business_members", "staff_access_log", "business_secrets"]);

// Columns that point at another row of the same shop, so seeding fills them in.
const PARENT: Record<string, Record<string, string>> = {
  delivery_quotes:    { job_id: "delivery_jobs" },
  loyalty_events:     { customer_id: "customers" },
  reward_redemptions: { customer_id: "customers" },
  stock_counts:       { stock_item_id: "stock_items" },
};
const FIXED: Record<string, Record<string, string>> = {
  offer_codes: { offer_type: "'percent'" },
  send_pauses: { channel: "'sms'" },
  staff_access_log: { action: "'start'" },
};

type Col = { t: string; c: string; u: string; nullable: boolean; hasDefault: boolean };

let m: MigratedDb;
let shopTables: string[] = [];

const rows = async (sql: string, params: unknown[] = []) => (await m.db.query<Record<string, unknown>>(sql, params)).rows;
const count = async (sql: string, params: unknown[] = []) => Number((await rows(sql, params))[0]?.n ?? 0);

/** Runs sql and returns how many rows it touched, or the error message if it was refused. */
async function attempt(sql: string, params: unknown[] = []): Promise<number | string> {
  try {
    const r = await m.db.query(sql, params);
    return r.affectedRows ?? 0;
  } catch (err) {
    return err instanceof Error ? err.message : String(err);
  }
}
const REFUSED = /row-level security|permission denied|must belong to the same shop/;

beforeAll(async () => {
  m = await migratedDb();

  await m.db.exec(`
    insert into businesses (id, name, subdomain) values ('${SHOP_A}', 'Shop A', 'shop-a'), ('${SHOP_B}', 'Shop B', 'shop-b');
    insert into auth.users (id, email) values ('${OWNER_A}', 'a@example.com'), ('${OWNER_B}', 'b@example.com'), ('${SELLER}', 's@example.com');
    -- 015's signup trigger made a users row for each login. Put them in their shops.
    insert into users (id, email, role) values ('${OWNER_A}', 'a@example.com', 'owner'), ('${OWNER_B}', 'b@example.com', 'owner'), ('${SELLER}', 's@example.com', 'owner')
      on conflict (id) do nothing;
    update users set business_id = '${SHOP_A}' where id = '${OWNER_A}';
    update users set business_id = '${SHOP_B}' where id = '${OWNER_B}';
    update users set business_id = null, is_seller = true where id = '${SELLER}';
  `);

  const cols = (await rows(`
    select table_name t, column_name c, udt_name u, is_nullable = 'YES' nullable, column_default is not null "hasDefault"
      from information_schema.columns where table_schema = 'public' order by table_name, ordinal_position`)) as unknown as Col[];
  shopTables = [...new Set(cols.filter(c => c.c === "business_id").map(c => c.t))]
    .filter(t => t !== "users")
    .sort((a, b) => (PARENT[a] ? 1 : 0) - (PARENT[b] ? 1 : 0));

  const value = (c: Col, shop: string): string => {
    if (c.c === "business_id") return `'${shop}'`;
    const parent = PARENT[c.t]?.[c.c];
    if (parent) return `(select id from ${parent} where business_id = '${shop}' limit 1)`;
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
    // business_id always, even where it may be null (send_pauses uses null for every shop).
    const need = cols.filter(c => c.t === t && (c.c === "business_id" || (!c.nullable && !c.hasDefault)));
    for (const shop of [SHOP_A, SHOP_B]) {
      await m.db.exec(`insert into ${t} (${need.map(c => c.c).join(", ")}) values (${need.map(c => value(c, shop)).join(", ")})`);
    }
  }

  // Shop A's team. Added after the seeding, so every shop table still has one row per shop.
  await m.db.exec(`
    insert into auth.users (id, email, invited_at, email_confirmed_at) values
      ('${STAFF_A}',   'Mia@Example.com', now(), now()),
      ('${MANAGER_A}', 'max@example.com', now(), now()),
      ('${PENDING_A}', 'pia@example.com', now(), null),
      ('${SQUAT_A}',   'sam@example.com', null,  now()),
      ('${GONE_A}',    'gus@example.com', now(), now());
    insert into business_members (business_id, email, role, status) values
      ('${SHOP_A}', 'mia@example.com', 'Staff',   'invited'),
      ('${SHOP_A}', 'max@example.com', 'Manager', 'invited'),
      ('${SHOP_A}', 'pia@example.com', 'Staff',   'invited'),
      ('${SHOP_A}', 'sam@example.com', 'Manager', 'invited'),
      ('${SHOP_A}', 'gus@example.com', 'Manager', 'removed'),
      ('${SHOP_A}', 'a@example.com',   'Staff',   'invited');
  `);
}, 60_000);

afterAll(async () => { await m?.db.close(); });

describe("the database", () => {
  it("runs every migration", () => {
    expect(m.migrations.length).toBeGreaterThanOrEqual(26);
  });

  it("has row level security on every table", async () => {
    const off = await rows(`select tablename from pg_tables where schemaname = 'public' and not rowsecurity`);
    expect(off).toEqual([]);
  });

  it("has a row of each shop in every shop table", async () => {
    expect(shopTables.length).toBeGreaterThanOrEqual(25);
    for (const t of shopTables) {
      expect(await count(`select count(*) n from ${t} where business_id = $1`, [SHOP_B]), t).toBe(1);
    }
  });
});

describe("a shop owner", () => {
  it("can read their own shop's rows, except tables only the server uses", async () => {
    await m.asUser(OWNER_A, async () => {
      for (const t of shopTables) {
        const n = await count(`select count(*) n from ${t} where business_id = $1`, [SHOP_A]).catch(() => 0);
        expect(n, t).toBe(SERVER_ONLY.has(t) ? 0 : 1);
      }
    });
  });

  it("can't read another shop's rows in any table", async () => {
    await m.asUser(OWNER_A, async () => {
      for (const t of shopTables) {
        const n = await count(`select count(*) n from ${t} where business_id = $1`, [SHOP_B]).catch(() => 0);
        expect(n, t).toBe(0);
      }
      expect(await count(`select count(*) n from businesses where id = $1`, [SHOP_B])).toBe(0);
      expect(await count(`select count(*) n from users where business_id = $1`, [SHOP_B])).toBe(0);
    });
  });

  it("can't change or delete another shop's rows", async () => {
    await m.asUser(OWNER_A, async () => {
      for (const t of shopTables) {
        const changed = await attempt(`update ${t} set business_id = business_id where business_id = $1`, [SHOP_B]);
        expect(changed === 0 || REFUSED.test(String(changed)), `${t} update: ${changed}`).toBe(true);
        const deleted = await attempt(`delete from ${t} where business_id = $1`, [SHOP_B]);
        expect(deleted === 0 || REFUSED.test(String(deleted)), `${t} delete: ${deleted}`).toBe(true);
      }
      const shop = await attempt(`update businesses set name = 'Taken' where id = $1`, [SHOP_B]);
      expect(shop === 0 || REFUSED.test(String(shop))).toBe(true);
    });
    // And nothing of shop B's actually changed.
    for (const t of shopTables) expect(await count(`select count(*) n from ${t} where business_id = $1`, [SHOP_B]), t).toBe(1);
    expect((await rows(`select name from businesses where id = $1`, [SHOP_B]))[0]?.name).toBe("Shop B");
  });

  it("can't add a row to another shop", async () => {
    const copies = new Map<string, unknown>();
    for (const t of shopTables) {
      copies.set(t, (await rows(`select row_to_json(x) j from ${t} x where business_id = $1`, [SHOP_B]))[0]?.j);
    }
    await m.asUser(OWNER_A, async () => {
      for (const t of shopTables) {
        const row = { ...(copies.get(t) as Record<string, unknown>) };
        if ("id" in row) row.id = crypto.randomUUID();
        const added = await attempt(`insert into ${t} select * from json_populate_record(null::${t}, $1::json)`, [JSON.stringify(row)]);
        expect(REFUSED.test(String(added)), `${t} insert: ${added}`).toBe(true);
      }
    });
  });

  it("can't move their own rows into another shop", async () => {
    await m.asUser(OWNER_A, async () => {
      for (const t of shopTables) {
        const moved = await attempt(`update ${t} set business_id = $1 where business_id = $2`, [SHOP_B, SHOP_A]);
        expect(moved === 0 || REFUSED.test(String(moved)), `${t} move: ${moved}`).toBe(true);
      }
    });
    for (const t of shopTables) expect(await count(`select count(*) n from ${t} where business_id = $1`, [SHOP_B]), t).toBe(1);
  });

  it("can't make themselves a super admin, a seller, or join another shop", async () => {
    await m.asUser(OWNER_A, async () => {
      for (const set of ["is_super_admin = true", "is_seller = true", `business_id = '${SHOP_B}'`, "role = 'admin'"]) {
        const r = await attempt(`update users set ${set} where id = $1`, [OWNER_A]);
        expect(REFUSED.test(String(r)), `${set}: ${r}`).toBe(true);
      }
    });
    const me = (await rows(`select business_id, is_super_admin, is_seller from users where id = $1`, [OWNER_A]))[0];
    expect(me).toMatchObject({ business_id: SHOP_A, is_super_admin: false, is_seller: false });
  });

  it("can't change who sold their shop or its Stripe and billing fields", async () => {
    await m.asUser(OWNER_A, async () => {
      await attempt(`update businesses set stripe_account_id = 'acct_fake', stripe_charges_enabled = true, sold_by = $2 where id = $1`, [SHOP_A, OWNER_A]);
    });
    const shop = (await rows(`select stripe_account_id, stripe_charges_enabled, sold_by from businesses where id = $1`, [SHOP_A]))[0];
    expect(shop).toMatchObject({ stripe_account_id: null, sold_by: null });
    expect(shop?.stripe_charges_enabled).not.toBe(true);
  });

  it("can't delete their own orders, customers or text log from the browser", async () => {
    await m.asUser(OWNER_A, async () => {
      for (const t of ["orders", "customers", "sms_logs", "analytics_daily"]) {
        const r = await attempt(`delete from ${t} where business_id = $1`, [SHOP_A]);
        expect(r === 0 || REFUSED.test(String(r)), `${t}: ${r}`).toBe(true);
      }
    });
    for (const t of ["orders", "customers", "sms_logs", "analytics_daily"]) {
      expect(await count(`select count(*) n from ${t} where business_id = $1`, [SHOP_A]), t).toBe(1);
    }
  });

  it("can't add made-up sends to their own text log, so the stop rules can't be watered down (028)", async () => {
    await m.asUser(OWNER_A, async () => {
      const r = await attempt(`insert into sms_logs (business_id, status, channel, kind) values ($1, 'sent', 'sms', 'marketing')`, [SHOP_A]);
      expect(r, String(r)).toMatch(REFUSED);
    });
    expect(await count(`select count(*) n from sms_logs where business_id = $1`, [SHOP_A])).toBe(1);
  });
});

describe("a team member (030)", () => {
  const one = async (sql: string) => (await rows(sql))[0] as Record<string, unknown>;

  it("who opened their invite works in that shop, in every table the owner can", async () => {
    for (const [who, role] of [[STAFF_A, "Staff"], [MANAGER_A, "Manager"]] as const) {
      await m.asUser(who, async () => {
        expect(await one(`select get_my_business_id() b, get_my_role() r`)).toEqual({ b: SHOP_A, r: role });
        for (const t of shopTables) {
          const n = await count(`select count(*) n from ${t} where business_id = $1`, [SHOP_A]).catch(() => 0);
          expect(n, `${role} ${t}`).toBe(SERVER_ONLY.has(t) ? 0 : 1);
        }
        expect(await count(`select count(*) n from businesses`)).toBe(1);
      });
    }
  });

  it("can't read, change or add to another shop", async () => {
    const copy = (await rows(`select row_to_json(x) j from customers x where business_id = $1`, [SHOP_B]))[0]?.j as Record<string, unknown>;
    await m.asUser(STAFF_A, async () => {
      for (const t of shopTables) {
        expect(await count(`select count(*) n from ${t} where business_id = $1`, [SHOP_B]).catch(() => 0), t).toBe(0);
        const moved = await attempt(`update ${t} set business_id = $1 where business_id = $2`, [SHOP_B, SHOP_A]);
        expect(moved === 0 || REFUSED.test(String(moved)), `${t} move: ${moved}`).toBe(true);
        const deleted = await attempt(`delete from ${t} where business_id = $1`, [SHOP_B]);
        expect(deleted === 0 || REFUSED.test(String(deleted)), `${t} delete: ${deleted}`).toBe(true);
      }
      const added = await attempt(`insert into customers select * from json_populate_record(null::customers, $1::json)`, [JSON.stringify({ ...copy, id: crypto.randomUUID() })]);
      expect(REFUSED.test(String(added)), String(added)).toBe(true);
    });
    for (const t of shopTables) expect(await count(`select count(*) n from ${t} where business_id = $1`, [SHOP_B]), t).toBe(1);
  });

  it("gets nothing before opening the invite, after being removed, or by signing up with an invited email", async () => {
    for (const who of [PENDING_A, SQUAT_A, GONE_A]) {
      await m.asUser(who, async () => {
        expect(await one(`select get_my_business_id() b, get_my_role() r`), who).toEqual({ b: null, r: null });
        expect(await count(`select count(*) n from businesses`), who).toBe(0);
        expect(await count(`select count(*) n from customers`), who).toBe(0);
        expect(await count(`select count(*) n from roster_shifts`), who).toBe(0);
      });
    }
  });

  it("can't see or change the team, so nobody gives themselves a better role", async () => {
    await m.asUser(STAFF_A, async () => {
      expect(await count(`select count(*) n from business_members`).catch(() => 0)).toBe(0);
      for (const sql of [
        `update business_members set role = 'Owner' where email = 'mia@example.com'`,
        `insert into business_members (business_id, email, role) values ('${SHOP_A}', 'friend@example.com', 'Owner')`,
        `delete from business_members where email = 'max@example.com'`,
      ]) {
        const r = await attempt(sql);
        expect(r === 0 || REFUSED.test(String(r)), `${sql}: ${r}`).toBe(true);
      }
      expect(await one(`select get_my_role() r`)).toEqual({ r: "Staff" });
    });
    await m.asUser(OWNER_A, async () => {
      const r = await attempt(`update business_members set role = 'Owner' where email = 'mia@example.com'`);
      expect(r === 0 || REFUSED.test(String(r)), String(r)).toBe(true);
    });
    expect(await count(`select count(*) n from business_members where business_id = $1`, [SHOP_A])).toBe(7);
    expect((await rows(`select role from business_members where email = 'mia@example.com'`))[0]?.role).toBe("Staff");
  });

  it("only owners and managers change the shop's own settings", async () => {
    const tried = async (who: string) => m.asUser(who, () => attempt(`update businesses set name = 'Renamed' where id = $1`, [SHOP_A]));
    expect(await tried(STAFF_A)).toBe(0);
    expect((await rows(`select name from businesses where id = $1`, [SHOP_A]))[0]?.name).toBe("Shop A");
    expect(await tried(MANAGER_A)).toBe(1);
    expect(await tried(OWNER_A)).toBe(1);
    await m.db.query(`update businesses set name = 'Shop A' where id = $1`, [SHOP_A]);
  });

  it("an owner stays the owner, even if their email was invited to their own team", async () => {
    await m.asUser(OWNER_A, async () => {
      expect(await one(`select get_my_business_id() b, get_my_role() r`)).toEqual({ b: SHOP_A, r: "Owner" });
    });
  });

  it("no rule reads users.business_id on its own any more", async () => {
    const left = await rows(`select tablename, policyname from pg_policies where schemaname = 'public' and (coalesce(qual, '') ~ 'FROM users' or coalesce(with_check, '') ~ 'FROM users')`);
    expect(left).toEqual([]);
  });
});

describe("a logged-in seller with no shop", () => {
  it("reads their own login, and nobody else's or any shop's", async () => {
    await m.asUser(SELLER, async () => {
      expect(await count(`select count(*) n from users`)).toBe(1);
      expect(await count(`select count(*) n from businesses`)).toBe(0);
      expect(await count(`select count(*) n from orders`)).toBe(0);
    });
  });
});

describe("a logged-out browser holding the public key", () => {
  it("can't read anything", async () => {
    await m.asAnon(async () => {
      for (const t of [...shopTables, "businesses", "users", "enquiries"]) {
        const n = await count(`select count(*) n from ${t}`).catch(() => 0);
        expect(n, t).toBe(0);
      }
    });
  });

  it("can't add anything, including a notification to a shop", async () => {
    const copy = (await rows(`select row_to_json(x) j from notifications x where business_id = $1`, [SHOP_B]))[0]?.j as Record<string, unknown>;
    await m.asAnon(async () => {
      const r = await attempt(`insert into notifications select * from json_populate_record(null::notifications, $1::json)`, [JSON.stringify({ ...copy, id: crypto.randomUUID(), title: "Click here" })]);
      expect(REFUSED.test(String(r)), String(r)).toBe(true);
      for (const t of ["orders", "customers", "businesses", "users", "enquiries"]) {
        const added = await attempt(`insert into ${t} (id) values (gen_random_uuid())`);
        expect(REFUSED.test(String(added)), `${t}: ${added}`).toBe(true);
      }
    });
  });
});
