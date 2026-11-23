// Tests for the nightly jobs' secret (migration 034). The pg_cron jobs send
// x-zb-cron, a secret kept in Supabase Vault, and the edge functions check it
// with cron_secret_ok() before doing anything. Before this, anyone with the
// public anon key could start the jobs.

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { migratedDb, type MigratedDb } from "./migrated-db";

let m: MigratedDb;
const one = async (sql: string, params: unknown[] = []) => (await m.db.query<Record<string, unknown>>(sql, params)).rows[0]!;
const asServer = async (sql: string, params: unknown[] = []) => {
  await m.db.exec("set role service_role");
  try { return await one(sql, params); } finally { await m.db.exec("reset role"); }
};
const secret = async () => String((await one(`select decrypted_secret s from vault.decrypted_secrets where name = 'zb_cron_secret'`)).s);

beforeAll(async () => { m = await migratedDb(); }, 60_000);
afterAll(async () => { await m?.db.close(); });

describe("the unsubscribe link secret (035)", () => {
  const linkSecret = async () => String((await one(`select decrypted_secret s from vault.decrypted_secrets where name = 'zb_link_secret'`)).s);

  it("is made in the database, long, random, once, and not the cron secret", async () => {
    const s = await linkSecret();
    expect(s).toMatch(/^[0-9a-f]{64}$/);
    expect(s).not.toBe(await secret());
    await m.db.exec(readFileSync(new URL("../../../supabase/migrations/035_ready_for_new_api_keys.sql", import.meta.url), "utf8"));
    expect(await linkSecret()).toBe(s);
  });

  it("only the server can read it", async () => {
    expect((await asServer(`select link_signing_secret() s`)).s).toBe(await linkSecret());
    await m.asUser("aaaaaaaa-1111-4000-8000-00000000000a", async () => {
      await expect(m.db.query(`select link_signing_secret()`)).rejects.toThrow(/permission denied/);
    });
    await m.asAnon(async () => {
      await expect(m.db.query(`select link_signing_secret()`)).rejects.toThrow(/permission denied/);
    });
  });
});

describe("the secret (034)", () => {
  it("is made in the database, long and random, once", async () => {
    const s = await secret();
    expect(s).toMatch(/^[0-9a-f]{64}$/);
    await m.db.exec(readFileSync(new URL("../../../supabase/migrations/034_nightly_jobs_secret.sql", import.meta.url), "utf8"));
    expect(await secret()).toBe(s);
    expect(Number((await one(`select count(*) n from vault.secrets where name = 'zb_cron_secret'`)).n)).toBe(1);
  });

  it("only the right secret passes the check", async () => {
    const s = await secret();
    expect((await asServer(`select cron_secret_ok($1) ok`, [s])).ok).toBe(true);
    for (const wrong of ["", "x", s.slice(0, 31), s.toUpperCase(), `${s} `, null]) {
      expect((await asServer(`select cron_secret_ok($1) ok`, [wrong])).ok, String(wrong)).toBe(false);
    }
  });

  it("browsers can't ask, logged in or out", async () => {
    const s = await secret();
    await m.asUser("aaaaaaaa-1111-4000-8000-00000000000a", async () => {
      await expect(m.db.query(`select cron_secret_ok($1)`, [s])).rejects.toThrow(/permission denied/);
      await expect(m.db.query(`select decrypted_secret from vault.decrypted_secrets`)).rejects.toThrow(/permission denied/);
    });
    await m.asAnon(async () => {
      await expect(m.db.query(`select cron_secret_ok($1)`, [s])).rejects.toThrow(/permission denied/);
    });
  });

  it("the nightly jobs send only the secret, no key (035), and still run", async () => {
    // Only nightly-analytics is scheduled by a migration. Live has birthday-loyalty too.
    const jobs = (await m.db.query<{ jobname: string; command: string }>(`select jobname, command from cron.job where jobname in ('nightly-analytics', 'birthday-loyalty')`)).rows;
    expect(jobs.length).toBeGreaterThan(0);
    for (const { jobname: name, command } of jobs) {
      expect(command.match(/x-zb-cron/g), name).toHaveLength(1);
      expect(command, name).not.toMatch(/authorization|bearer|eyJ/i);
      expect(command, name).toMatch(/headers\s*:=\s*jsonb_build_object\('x-zb-cron', \(select decrypted_secret from vault\.decrypted_secrets where name = 'zb_cron_secret'\)\)/);
      await m.db.exec(command); // the stand-in net.http_post takes it
    }
  });

  it("035 leaves the jobs alone the second time", async () => {
    const before = await m.db.query(`select jobname, command from cron.job order by jobname`);
    await m.db.exec(readFileSync(new URL("../../../supabase/migrations/035_ready_for_new_api_keys.sql", import.meta.url), "utf8"));
    expect((await m.db.query(`select jobname, command from cron.job order by jobname`)).rows).toEqual(before.rows);
  });

  it("stops instead of half-changing a job it doesn't recognise", async () => {
    await m.db.exec(`insert into cron.job (jobname, schedule, command) values ('birthday-loyalty', '0 22 * * *', 'select net.http_post(url := ''x'')')`);
    const sql = readFileSync(new URL("../../../supabase/migrations/034_nightly_jobs_secret.sql", import.meta.url), "utf8");
    await expect(m.db.exec(sql)).rejects.toThrow(/isn't the expected shape/);
    expect(String((await one(`select command from cron.job where jobname = 'birthday-loyalty'`)).command)).not.toMatch(/x-zb-cron/);
    const sql035 = readFileSync(new URL("../../../supabase/migrations/035_ready_for_new_api_keys.sql", import.meta.url), "utf8");
    await expect(m.db.exec(sql035)).rejects.toThrow(/isn't the shape 034 left it in/);
  });
});
