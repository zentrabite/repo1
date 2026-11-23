-- 034 · A secret for the nightly jobs
-- The pg_cron jobs call the nightly-analytics and birthday-loyalty edge
-- functions with the public anon key, so anyone holding that key could
-- start them too. Their once-a-day guards (017) kept the damage small: a
-- stranger could run a job early and the real run would then be skipped.
--
-- Now the jobs also send x-zb-cron, a secret kept in Supabase Vault, and the
-- functions refuse a call without it (nightly-analytics v5, birthday-loyalty
-- v4). The secret is made inside the database and nobody needs to see it:
-- the cron jobs read it from Vault when they run, and the functions check
-- it with cron_secret_ok(), which only the server role can call.
--
-- Changes the two jobs' commands, adding one header. Run before deploying
-- the functions that need it. Safe to run twice.

-- ─── 1. The secret ──────────────────────────────────────────────────────────
do $$
begin
  if not exists (select 1 from vault.secrets where name = 'zb_cron_secret') then
    perform vault.create_secret(
      replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''),
      'zb_cron_secret',
      'Sent by the nightly pg_cron jobs to the edge functions as x-zb-cron (migration 034)'
    );
  end if;
end $$;

-- ─── 2. The check the functions call ────────────────────────────────────────
create or replace function public.cron_secret_ok(p_secret text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    length(p_secret) >= 32
    and p_secret = (select decrypted_secret from vault.decrypted_secrets where name = 'zb_cron_secret' limit 1),
    false
  )
$$;

revoke execute on function public.cron_secret_ok(text) from public, anon, authenticated;
grant  execute on function public.cron_secret_ok(text) to service_role;

-- ─── 3. The jobs send it ────────────────────────────────────────────────────
-- Adds the header next to the existing Authorization header. Stops if a
-- job's command isn't the shape this expects, so nothing half-changes.
do $$
declare
  j     record;
  v_new text;
begin
  for j in select jobid, jobname, command from cron.job where jobname in ('nightly-analytics', 'birthday-loyalty') loop
    continue when position('x-zb-cron' in j.command) > 0;
    v_new := regexp_replace(
      j.command,
      '(headers\s*:=\s*''[^'']*''::jsonb)',
      '\1 || jsonb_build_object(''x-zb-cron'', (select decrypted_secret from vault.decrypted_secrets where name = ''zb_cron_secret''))'
    );
    if position('x-zb-cron' in v_new) = 0 then
      raise exception 'The % job''s command isn''t the expected shape, so the secret wasn''t added', j.jobname;
    end if;
    perform cron.alter_job(j.jobid, command := v_new);
  end loop;
end $$;
