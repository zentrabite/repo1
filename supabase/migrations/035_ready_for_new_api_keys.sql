-- 035 · Ready for Supabase's newer API keys
-- The project still uses Supabase's older keys (the anon and service_role
-- JWTs). Replacing a leaked one means moving to the newer publishable and
-- secret keys first, which would take a long night in the middle of a breach
-- (the data breach plan, 23 Nov). This gets the database ready, so the move
-- is a few clicks and swapping a leaked key later takes minutes.
--
--   1. A secret for signing unsubscribe links, made inside Vault like 034's.
--      Links were signed with a key made from the service_role key, so
--      replacing that key would have broken every unsubscribe link already
--      sent, and the Spam Act needs them to keep working. No marketing email
--      has been sent yet, so no link changes.
--   2. link_signing_secret() hands it to the server, and only the server.
--   3. The two nightly jobs stop sending the public anon key. The functions
--      check x-zb-cron themselves since 034 and are deployed without
--      Supabase's JWT check (nightly-analytics v6, birthday-loyalty v5), so
--      the key did nothing, and it would stop working once the older keys
--      are switched off.
--
-- Deploy the functions with the JWT check off before running this, or the
-- jobs' next calls are refused. Changes the two jobs' commands, taking one
-- header out. Safe to run twice.

-- ─── 1. The secret ──────────────────────────────────────────────────────────
do $$
begin
  if not exists (select 1 from vault.secrets where name = 'zb_link_secret') then
    perform vault.create_secret(
      replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''),
      'zb_link_secret',
      'Signs unsubscribe links in marketing emails (migration 035)'
    );
  end if;
end $$;

-- ─── 2. Only the server can read it ─────────────────────────────────────────
create or replace function public.link_signing_secret()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select decrypted_secret from vault.decrypted_secrets where name = 'zb_link_secret' limit 1
$$;

revoke execute on function public.link_signing_secret() from public, anon, authenticated;
grant  execute on function public.link_signing_secret() to service_role;

-- ─── 3. The jobs stop sending the anon key ──────────────────────────────────
-- Drops the literal headers in front of the x-zb-cron header 034 added, so
-- each job sends only x-zb-cron. Stops if a job isn't the shape 034 left it
-- in, so nothing half-changes.
do $$
declare
  j     record;
  v_new text;
begin
  for j in select jobid, jobname, command from cron.job where jobname in ('nightly-analytics', 'birthday-loyalty') loop
    v_new := regexp_replace(j.command, '(headers\s*:=\s*)''[^'']*''::jsonb\s*\|\|\s*', '\1');
    if position('x-zb-cron' in v_new) = 0 or v_new ~* 'authorization|bearer' then
      raise exception 'The % job''s command isn''t the shape 034 left it in, so it wasn''t changed', j.jobname;
    end if;
    continue when v_new = j.command;
    perform cron.alter_job(j.jobid, command := v_new);
  end loop;
end $$;
