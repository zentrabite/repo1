-- ═══════════════════════════════════════════════════════════════════════════
-- 038. Fixes from the second security run (24 Nov 2026)
--
-- 1. A browser can't change a customer's consent, opt-out, points or totals,
--    or anything on a customer whose details were deleted (037). New
--    customers added from a browser start with no consent and no points.
--    The server, the SQL editor, and the order and refund triggers (which run
--    one level down) still can.
-- 2. Points events, reward swaps and win-back results are read only from a
--    browser. The server writes them.
-- 3. Courier keys (Uber Direct, DoorDash Drive, Sherpa, Zoom2u, GoPeople)
--    live in business_secrets, which only the server can read. They're never
--    kept in businesses, which every team member can read.
--
-- Safe to run twice. Moves any courier keys already saved (live had none on
-- 25 Nov) and touches no other rows.
-- ═══════════════════════════════════════════════════════════════════════════


-- ─── 1. Customers ───────────────────────────────────────────────────────────
create or replace function public.protect_customer_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- The server and the SQL editor change anything. So do the order and refund
  -- triggers, which update customers from inside another trigger.
  if coalesce(auth.role(), '') not in ('authenticated', 'anon') or pg_trigger_depth() > 1 then
    return new;
  end if;

  if tg_op = 'INSERT' then
    new.points_balance          := 0;
    new.total_spent             := 0;
    new.total_orders            := 0;
    new.first_order             := null;
    new.last_order_date         := null;
    new.marketing_opt_in        := false;
    new.marketing_opt_in_at     := null;
    new.marketing_opt_in_source := null;
    new.opted_out               := coalesce(new.opted_out, false);
    new.opted_out_at            := case when new.opted_out then now() else null end;
    new.erased_at               := null;
    return new;
  end if;

  -- A customer whose details were deleted stays deleted.
  if old.erased_at is not null then
    return old;
  end if;

  new.points_balance          := old.points_balance;
  new.total_spent             := old.total_spent;
  new.total_orders            := old.total_orders;
  new.first_order             := old.first_order;
  new.last_order_date         := old.last_order_date;
  new.marketing_opt_in        := old.marketing_opt_in;
  new.marketing_opt_in_at     := old.marketing_opt_in_at;
  new.marketing_opt_in_source := old.marketing_opt_in_source;
  new.opted_out               := old.opted_out;
  new.opted_out_at            := old.opted_out_at;
  new.erased_at               := old.erased_at;
  return new;
end;
$$;

revoke execute on function public.protect_customer_fields() from public, anon, authenticated;

drop trigger if exists protect_customer_fields on public.customers;
create trigger protect_customer_fields
  before insert or update on public.customers
  for each row execute function public.protect_customer_fields();


-- ─── 2. Points, swaps and win-back results, read only ──────────────────────
drop policy if exists "Tenant: loyalty_events" on public.loyalty_events;
drop policy if exists "members_read_loyalty_events" on public.loyalty_events;
create policy "members_read_loyalty_events" on public.loyalty_events
  for select using (business_id = public.get_my_business_id());

drop policy if exists "Tenant: reward_redemptions" on public.reward_redemptions;
drop policy if exists "members_read_reward_redemptions" on public.reward_redemptions;
create policy "members_read_reward_redemptions" on public.reward_redemptions
  for select using (business_id = public.get_my_business_id());

drop policy if exists "members_write_campaign_events" on public.campaign_events;

revoke insert, update, delete on public.loyalty_events, public.reward_redemptions, public.campaign_events
  from anon, authenticated;


-- ─── 3. Courier keys, server only ───────────────────────────────────────────
create or replace function public.courier_key_names()
returns text[]
language sql
immutable
set search_path = public
as $$
  select array['uber_direct_api_key', 'uber_direct_customer_id', 'doordash_developer_id',
               'doordash_key_id', 'doordash_signing_secret', 'sherpa_api_key',
               'zoom2u_api_key', 'gopeople_api_key']
$$;

create table if not exists public.business_secrets (
  business_id uuid primary key references public.businesses(id) on delete cascade,
  courier     jsonb not null default '{}'::jsonb,
  updated_at  timestamptz not null default now(),
  updated_by  uuid
);

alter table public.business_secrets enable row level security;
revoke all on public.business_secrets from public, anon, authenticated;
grant all on public.business_secrets to service_role;

-- Keys saved before today, from the delivery_settings column or the older
-- copy in settings. Empty boxes saved as "" are left behind.
with found as (
  select b.id, k.name,
         coalesce(nullif(b.delivery_settings ->> k.name, ''),
                  nullif(case when jsonb_typeof(b.settings -> 'delivery_settings') = 'object'
                              then b.settings -> 'delivery_settings' ->> k.name end, '')) as value
  from public.businesses b
  cross join unnest(public.courier_key_names()) as k(name)
)
insert into public.business_secrets (business_id, courier)
select id, jsonb_object_agg(name, value) from found where value is not null group by id
on conflict (business_id) do update set courier = excluded.courier || public.business_secrets.courier;

-- Keys never sit in businesses again, whoever writes the row.
create or replace function public.keep_courier_keys_out()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if jsonb_typeof(new.delivery_settings) = 'object' then
    new.delivery_settings := new.delivery_settings - public.courier_key_names();
  end if;
  if jsonb_typeof(new.settings -> 'delivery_settings') = 'object' then
    new.settings := jsonb_set(new.settings, '{delivery_settings}',
                              (new.settings -> 'delivery_settings') - public.courier_key_names());
  end if;
  return new;
end;
$$;

revoke execute on function public.keep_courier_keys_out() from public, anon, authenticated;

drop trigger if exists keep_courier_keys_out on public.businesses;
create trigger keep_courier_keys_out
  before insert or update on public.businesses
  for each row execute function public.keep_courier_keys_out();

-- Clears what's there now. The trigger above does the work.
update public.businesses set delivery_settings = delivery_settings
where delivery_settings ?| public.courier_key_names()
   or (jsonb_typeof(settings -> 'delivery_settings') = 'object'
       and (settings -> 'delivery_settings') ?| public.courier_key_names());
