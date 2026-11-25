-- ═══════════════════════════════════════════════════════════════════════════
-- 042. Alcohol stays off the ordering page until ZentraBite turns it on
--      for a shop (25 Nov 2026)
--
-- The draft terms (9.4) and acceptable use policy (4.3) say a business may
-- only sell alcohol online once it holds the right licence and we have
-- enabled alcohol for its account. Nothing enforced that.
--
-- 1. menu_items.contains_alcohol, set on the Menu page (ticked for the
--    owner when the name looks like a drink with alcohol) and by the menu
--    import. Items with it set stay on the POS but are hidden from the
--    ordering page and website, and checkout refuses them, until the shop
--    is allowed (lib/alcohol.ts).
-- 2. businesses.settings.alcohol says whether the shop is allowed, with the
--    licence number, who allowed it and when. Only the server and super
--    admins can set it (protect_business_fields gets the key).
--
-- Safe to run twice. Adds a column (false for every existing item) and
-- changes a function. Changes no rows.
-- ═══════════════════════════════════════════════════════════════════════════

alter table public.menu_items add column if not exists contains_alcohol boolean not null default false;

comment on column public.menu_items.contains_alcohol is 'The item contains alcohol. Hidden online until the shop is allowed (settings.alcohol, set by a super admin).';


-- The same function as 041, with 'alcohol' among the settings a browser can't change.
create or replace function public.protect_business_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text   := coalesce(auth.role(), '');
  v_keys text[] := array['billing_plan','sms_monthly_cap','sms_per_minute',
                         'subscription_status','subscription_period_end','modules',
                         'alcohol'];
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
