// A real Postgres in memory (PGlite) with every migration in
// supabase/migrations applied, in order, for tests of the database's own
// rules. Supabase's own pieces (auth, storage, cron, pg_net and the anon,
// authenticated and service_role roles) are stood in for with the smallest
// thing that behaves the same.
//
// asUser() and asAnon() run SQL the way a browser holding the public key
// does, so row level security and grants apply exactly as they do live.

import { PGlite } from "@electric-sql/pglite";
import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const MIGRATIONS = fileURLToPath(new URL("../../../supabase/migrations/", import.meta.url));

const SUPABASE_STANDINS = `
  create role anon nologin;
  create role authenticated nologin;
  create role service_role nologin bypassrls;
  grant anon, authenticated, service_role to postgres;

  create schema auth; create schema storage; create schema cron; create schema net; create schema extensions;

  create table auth.users (id uuid primary key, email text, raw_user_meta_data jsonb default '{}'::jsonb, invited_at timestamptz, email_confirmed_at timestamptz, created_at timestamptz default now());
  create function auth.uid() returns uuid language sql stable as
    $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  create function auth.role() returns text language sql stable as
    $$ select nullif(current_setting('request.jwt.claim.role', true), '') $$;
  create function auth.jwt() returns jsonb language sql stable as
    $$ select coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb $$;

  create table storage.buckets (id text primary key, name text, public boolean default false, file_size_limit bigint, allowed_mime_types text[], created_at timestamptz default now());
  create table storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text, name text, owner uuid, created_at timestamptz default now());
  alter table storage.objects enable row level security;
  create function storage.foldername(name text) returns text[] language sql immutable as $$ select string_to_array(name, '/') $$;

  create table cron.job (jobid serial primary key, jobname text, schedule text, command text, active boolean default true);
  create function cron.schedule(jobname text, schedule text, command text) returns bigint language sql as
    $$ insert into cron.job (jobname, schedule, command) values ($1, $2, $3) returning jobid $$;
  create function cron.unschedule(jobname text) returns boolean language sql as
    $$ delete from cron.job where jobname = $1 returning true $$;
  create function net.http_post(url text, headers jsonb default '{}', body jsonb default '{}') returns bigint language sql as $$ select 1::bigint $$;
  create function cron.alter_job(job_id bigint, schedule text default null, command text default null, database text default null, username text default null, active boolean default null) returns void language sql as
    $$ update cron.job set schedule = coalesce($2, schedule), command = coalesce($3, command), active = coalesce($6, active) where jobid = $1 $$;

  -- Supabase Vault: secrets stored by the database (encrypted live, plain here).
  create schema vault;
  create table vault.secrets (id uuid primary key default gen_random_uuid(), name text unique, secret text not null, description text default '', created_at timestamptz default now());
  create view vault.decrypted_secrets as select id, name, secret as decrypted_secret, description, created_at from vault.secrets;
  create function vault.create_secret(new_secret text, new_name text default null, new_description text default '') returns uuid language sql as
    $$ insert into vault.secrets (secret, name, description) values ($1, $2, $3) returning id $$;
  revoke all on schema vault from public;

  -- What Supabase grants on everything new in public, before any migration revokes it.
  grant usage on schema public, auth, storage to anon, authenticated, service_role;
  alter default privileges in schema public grant all on tables    to anon, authenticated, service_role;
  alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
  alter default privileges in schema public grant execute on functions to anon, authenticated, service_role;
  grant all on all tables in schema storage to anon, authenticated, service_role;
`;

export type MigratedDb = {
  db: PGlite;
  migrations: string[];
  /** Runs fn as a logged-in browser (role authenticated) for that user. */
  asUser<T>(userId: string, fn: () => Promise<T>): Promise<T>;
  /** Runs fn as a logged-out browser holding the public key (role anon). */
  asAnon<T>(fn: () => Promise<T>): Promise<T>;
};

export async function migratedDb(): Promise<MigratedDb> {
  const db = new PGlite();
  await db.exec(SUPABASE_STANDINS);
  const migrations = readdirSync(MIGRATIONS).filter(f => /^\d{3}_.*\.sql$/.test(f)).sort();
  for (const f of migrations) {
    try {
      await db.exec(readFileSync(`${MIGRATIONS}${f}`, "utf8"));
    } catch (err) {
      throw new Error(`Migration ${f} failed: ${err instanceof Error ? err.message : err}`);
    }
  }

  const as = async <T>(role: "authenticated" | "anon", sub: string, fn: () => Promise<T>): Promise<T> => {
    await db.query(`select set_config('request.jwt.claim.sub', $1, false), set_config('request.jwt.claim.role', $2, false)`, [sub, role]);
    await db.exec(`set role ${role}`);
    try {
      return await fn();
    } finally {
      await db.exec(`reset role`);
      await db.query(`select set_config('request.jwt.claim.sub', '', false), set_config('request.jwt.claim.role', '', false)`);
    }
  };

  return {
    db, migrations,
    asUser: (userId, fn) => as("authenticated", userId, fn),
    asAnon: fn => as("anon", "", fn),
  };
}
