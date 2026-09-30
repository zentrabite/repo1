-- ═══════════════════════════════════════════════════════════════════════════
-- 015 — Security hardening, working self-signup, marketing consent records
-- Run in Supabase → SQL Editor on zentrabite-prod BEFORE deploying the code
-- on branch fix/security-payments-signup. Safe to run more than once.
-- ═══════════════════════════════════════════════════════════════════════════


-- ─── 1. Pin search_path on every flagged function ───────────────────────────
alter function public.get_my_business_id()             set search_path = public;
alter function public.is_super_admin()                 set search_path = public;
alter function public.create_default_campaigns(uuid)   set search_path = public;
alter function public.attribute_sms_conversion()       set search_path = public;
alter function public.update_customer_on_order()       set search_path = public;
alter function public.update_updated_at_column()       set search_path = public;


-- ─── 2. Self-signup creates the business ────────────────────────────────────
-- The signup page puts business_name in the user's metadata. When it's there,
-- create the business with a unique subdomain and link the new user as owner.
-- Staff invites and admin onboarding don't set business_name, so they only
-- get a users row, as before.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_business_name text := nullif(trim(new.raw_user_meta_data->>'business_name'), '');
  v_name          text := nullif(trim(new.raw_user_meta_data->>'name'), '');
  v_base          text;
  v_sub           text;
  v_n             int  := 1;
  v_business_id   uuid;
  v_reserved      text[] := array['www','app','api','admin','dashboard','shop','store','mail','email',
                                  'help','support','status','docs','blog','demo','test','staging','zentrabite'];
begin
  if v_business_name is not null then
    v_base := trim(both '-' from regexp_replace(lower(v_business_name), '[^a-z0-9]+', '-', 'g'));
    if v_base = '' then v_base := 'shop'; end if;
    v_base := left(v_base, 40);
    v_sub  := v_base;
    while v_sub = any(v_reserved) or exists (select 1 from public.businesses where subdomain = v_sub) loop
      v_n   := v_n + 1;
      v_sub := v_base || '-' || v_n;
    end loop;

    insert into public.businesses (name, type, subdomain)
    values (left(v_business_name, 120), 'Restaurant', v_sub)
    returning id into v_business_id;

    perform public.create_default_campaigns(v_business_id);
  end if;

  insert into public.users (id, email, role, name, business_id)
  values (new.id, new.email, 'owner', v_name, v_business_id)
  on conflict (id) do nothing;

  return new;
end;
$$;


-- ─── 3. Stop outsiders calling internal functions over the API ──────────────
-- Triggers still fire without these grants. The server key keeps access.
-- get_my_business_id and is_super_admin stay callable on purpose: every row
-- security rule uses them and they only return facts about the caller.
revoke execute on function public.handle_new_user()             from public, anon, authenticated;
revoke execute on function public.attribute_sms_conversion()    from public, anon, authenticated;
revoke execute on function public.update_customer_on_order()    from public, anon, authenticated;
revoke execute on function public.create_default_campaigns(uuid) from public, anon, authenticated;
grant  execute on function public.create_default_campaigns(uuid) to service_role;


-- ─── 4. Marketing consent records (Spam Act) ────────────────────────────────
-- Win-back and automations only contact customers with marketing_opt_in = true
-- and opted_out = false. Consent is set by the checkout tick box; STOP replies
-- set opted_out via /api/sms/inbound.
alter table public.customers add column if not exists marketing_opt_in        boolean     default false;
alter table public.customers add column if not exists marketing_opt_in_at     timestamptz;
alter table public.customers add column if not exists marketing_opt_in_source text;
alter table public.customers add column if not exists opted_out_at            timestamptz;

create index if not exists idx_customers_business_phone on public.customers (business_id, phone);
create index if not exists idx_sms_logs_business_sent   on public.sms_logs  (business_id, sent_at desc);


-- ─── 5. Logo storage: each business can only write its own folder ───────────
-- Before this, any logged-in user could overwrite any business's logo, and
-- the bucket accepted any file type including SVG.
drop policy if exists "Auth logo write"  on storage.objects;
drop policy if exists "Auth logo update" on storage.objects;
drop policy if exists "Business logo write"  on storage.objects;
drop policy if exists "Business logo update" on storage.objects;

create policy "Business logo write" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'business-logos'
    and ((storage.foldername(name))[1] = public.get_my_business_id()::text or public.is_super_admin())
  );

create policy "Business logo update" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'business-logos'
    and ((storage.foldername(name))[1] = public.get_my_business_id()::text or public.is_super_admin())
  );

update storage.buckets
   set allowed_mime_types = array['image/png','image/jpeg','image/webp'],
       file_size_limit    = 5242880
 where id = 'business-logos';

update storage.buckets
   set allowed_mime_types = array['image/png','image/jpeg','image/webp','image/gif'],
       file_size_limit    = 5242880
 where id = 'menu-images';


-- ─── 6. Remove the broken nightly automations job ───────────────────────────
-- It called dashboard.zentrabite.com.au (doesn't exist) with no secret.
-- Vercel's cron in apps/dashboard/vercel.json now runs /api/automations/run
-- daily with CRON_SECRET, so this Supabase job isn't needed.
select cron.unschedule('automations-nightly')
 where exists (select 1 from cron.job where jobname = 'automations-nightly');
