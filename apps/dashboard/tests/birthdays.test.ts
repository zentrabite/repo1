// Tests for birthdays (migration 033 and the birthday-loyalty job's
// supabase/functions/birthday-loyalty/birthdays.ts). A birthday is a day and
// a month, never a year (the draft privacy policy), and it's today in the
// shop's own time zone. Before 23 Nov 2026 the database kept a full date of
// birth and the job used the UTC date at 10pm UTC, a day behind Australia.

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { candidateDays, isBirthday, shopToday } from "../../../supabase/functions/birthday-loyalty/birthdays";
import { migratedDb, type MigratedDb } from "./migrated-db";

const TZ = "Australia/Adelaide";

describe("whose birthday it is", () => {
  it("is the shop's day, not UTC's", () => {
    const run = new Date("2026-11-22T22:00:00Z"); // the cron's 10pm UTC, 8:30am 23 Nov in Adelaide
    expect(shopToday(run, TZ)).toEqual({ year: 2026, month: 11, day: 23 });
    expect(isBirthday(11, 23, shopToday(run, TZ))).toBe(true);
    expect(isBirthday(11, 22, shopToday(run, TZ))).toBe(false);
    expect(shopToday(run, "Australia/Perth")).toEqual({ year: 2026, month: 11, day: 23 }); // 6am
    expect(shopToday(run, "Not/AZone")).toEqual({ year: 2026, month: 11, day: 23 });       // falls back to Adelaide
  });

  it("29 February is celebrated on the 28th when the year isn't a leap year", () => {
    expect(isBirthday(2, 29, { year: 2027, month: 2, day: 28 })).toBe(true);
    expect(isBirthday(2, 29, { year: 2028, month: 2, day: 28 })).toBe(false);
    expect(isBirthday(2, 29, { year: 2028, month: 2, day: 29 })).toBe(true);
    expect(isBirthday(null, 5, { year: 2027, month: 2, day: 5 })).toBe(false);
  });

  it("the first read covers every shop's possible today", () => {
    const days = candidateDays(new Date("2026-11-22T22:00:00Z"));
    expect(days).toEqual(expect.arrayContaining([{ month: 11, day: 21 }, { month: 11, day: 22 }, { month: 11, day: 23 }]));
    expect(candidateDays(new Date("2026-12-31T23:00:00Z"))).toEqual(expect.arrayContaining([{ month: 1, day: 1 }]));
  });
});

describe("in the database (033)", () => {
  let m: MigratedDb;
  const SHOP = "aaaaaaaa-0000-4000-8000-00000000000a";
  beforeAll(async () => {
    m = await migratedDb();
    await m.db.exec(`insert into businesses (id, name, subdomain) values ('${SHOP}', 'Shop A', 'shop-a')`);
  }, 60_000);
  afterAll(async () => { await m?.db.close(); });

  const add = (month: unknown, day: unknown) =>
    m.db.query(`insert into customers (business_id, name, phone, birth_month, birth_day) values ($1, 'X', '+61400000009', $2, $3)`, [SHOP, month, day])
      .then(() => "saved", (e: Error) => e.message);

  it("keeps no year, and only real days of the year", async () => {
    const cols = await m.db.query<{ column_name: string }>(`select column_name from information_schema.columns where table_name = 'customers' and (column_name like '%birth%' or column_name like '%dob%') order by 1`);
    expect(cols.rows.map(r => r.column_name)).toEqual(["birth_day", "birth_month"]);
    expect(await add(2, 29)).toBe("saved");
    expect(await add(12, 31)).toBe("saved");
    expect(await add(null, null)).toBe("saved");
    for (const [month, day] of [[2, 30], [4, 31], [13, 1], [0, 5], [6, null], [null, 6]]) {
      expect(await add(month, day), `${month}/${day}`).toMatch(/customers_birthday_valid/);
    }
  });
});
