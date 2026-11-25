-- ═══════════════════════════════════════════════════════════════════════════
-- 041. Super Admin can suspend a shop, and delete an empty one (25 Nov 2026)
--
-- 1. businesses.suspended_at, suspended_by and suspended_reason. Only the
--    server and super admins set them (protect_business_fields).
-- 2. A suspended shop's logins reach nothing. get_my_business_id() gives no
--    shop while it's suspended, so every row rule (they all use it, 030)
--    refuses its owner and its team. Super admins can still open it. The
--    server routes check the same thing (lib/request-business.ts), and
--    my_shop_suspended() tells the CRM to show the "paused" screen.
-- 3. delete_empty_shop() deletes a shop that's suspended, has no orders and
--    no customers, and has no live ZentraBite subscription. For test shops
--    and set-ups that never went ahead. Server only.
--
-- Safe to run twice. Adds three columns and functions, changes no rows.
-- ═══════════════════════════════════════════════════════════════════════════

alter table public.businesses add column if not exists suspended_at     timestamptz;
alter table public.businesses add column if not exists suspended_by     uuid references public.users(id) on delete set null;
alter table public.businesses add column if not exists suspended_reason text;

comment on column public.businesses.suspended_at     is 'When ZentraBite suspended the shop. Its logins, ordering page, website and texts stop. Server only.';
comment on column public.businesses.suspended_by     is 'The super admin who suspended it. Server only.';
comment on column public.businesses.suspended_reason is 'Why, for the team. Never shown to the shop. Server only.';


-- ─── 1. Browsers can't suspend or unsuspend ─────────────────────────────────
-- The same function as 022, plus the three new columns.
create or replace function public.protect_business_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text   := coalesce(auth.role(), '');
  v_keys text[] := array['billing_plan','sms_monthly_cap','sms_per_minute',
                         'subscription_status','subscription_period_end','modules'];
  k      text;
begin
  -- Service role, SQL editor and super admins can change anything.
  if v_role not in ('authenticated', 'anon') or public.is_super_admin() then
    return new;
  end if;

  new.stripe_account_id        := old.stripe_account_id;
  new.stripe_customer_id       := old.stripe_customer_id;
  new.stripe_charges_enabled   := old.stripe_charges_enabled;
  new.stripe_payouts_enabled   := old.stripe_payouts_enabled;
  new.stripe_details_submitted := old.stripe_details_submitted;
  new.sold_by                  := old.sold_by;
  new.sold_at                  := old.sold_at;
  new.suspended_at             := old.suspended_at;
  new.suspended_by             := old.suspended_by;
  new.suspended_reason         := old.suspended_reason;

  new.settings := coalesce(new.settings, '{}'::jsonb) - v_keys;
  foreach k in array v_keys loop
    if coalesce(old.settings, '{}'::jsonb) ? k then
      new.settings := new.settings || jsonb_build_object(k, old.settings -> k);
    end if;
  end loop;

  return new;
end;
$$;

revoke execute on function public.protect_business_fields() from public, anon, authenticated;


-- ─── 2. A suspended shop's logins reach nothing ─────────────────────────────
-- The shop a login belongs to, suspended or not. The same rule as 030's
-- get_my_business_id(): the login's own shop first, then the oldest team it
-- joined through an opened invite and wasn't removed from. Only used by the
-- two functions below.
create or replace function public.shop_of_login()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select u.business_id from public.users u where u.id = auth.uid()),
    (select m.business_id
       from public.business_members m
       join auth.users a on lower(a.email) = m.email
      where a.id = auth.uid()
        and a.invited_at is not null
        and a.email_confirmed_at is not null
        and m.status not in ('removed', 'revoked')
      order by m.created_at, m.business_id
      limit 1)
  )
$$;

revoke execute on function public.shop_of_login() from public, anon, authenticated;

-- Every row rule uses this, so a suspended shop's owner and team get nothing.
create or replace function public.get_my_business_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select b.id
    from public.businesses b
   where b.id = public.shop_of_login()
     and b.suspended_at is null
$$;

-- For the CRM's "paused" screen. Says only whether the caller's own shop is
-- suspended, never why.
create or replace function public.my_shop_suspended()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select b.suspended_at is not null from public.businesses b where b.id = public.shop_of_login()),
    false)
$$;

revoke execute on function public.my_shop_suspended() from public, anon;
grant execute on function public.my_shop_suspended() to authenticated;


-- ─── 3. Deleting an empty shop ──────────────────────────────────────────────
-- Most tables go with the shop (on delete cascade). These don't, so they're
-- cleared first, children before parents: sms_logs (points at campaigns),
-- campaigns, analytics_daily, menu_items (point at menu_categories) and
-- menu_categories. Logins stay, with no shop. A shop with orders or
-- customers is refused, and so is one that isn't suspended or still has a
-- ZentraBite subscription. The shop's row is locked first, so an order can't
-- arrive in between (and the orders key would refuse the delete anyway).
create or replace function public.delete_empty_shop(p_business uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_name      text;
  v_suspended timestamptz;
  v_sub       text;
begin
  select b.name, b.suspended_at, lower(coalesce(b.settings ->> 'subscription_status', ''))
    into v_name, v_suspended, v_sub
    from public.businesses b
   where b.id = p_business
     for update;
  if not found then
    raise exception 'Shop not found' using errcode = 'P0002';
  end if;
  if v_suspended is null then
    raise exception 'Suspend the shop before deleting it';
  end if;
  if exists (select 1 from public.orders where business_id = p_business)
     or exists (select 1 from public.customers where business_id = p_business) then
    raise exception 'This shop has orders or customers, so it can''t be deleted';
  end if;
  if v_sub in ('trialing', 'active', 'past_due', 'unpaid', 'incomplete', 'paused') then
    raise exception 'This shop has a ZentraBite subscription. Cancel it in Stripe first';
  end if;

  delete from public.sms_logs        where business_id = p_business;
  delete from public.campaigns       where business_id = p_business;
  delete from public.analytics_daily where business_id = p_business;
  delete from public.menu_items      where business_id = p_business;
  delete from public.menu_categories where business_id = p_business;
  update public.users set business_id = null where business_id = p_business;
  delete from public.businesses where id = p_business;
  return v_name;
end;
$$;

revoke execute on function public.delete_empty_shop(uuid) from public, anon, authenticated;
grant execute on function public.delete_empty_shop(uuid) to service_role;
