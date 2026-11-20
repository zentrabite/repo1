-- ═══════════════════════════════════════════════════════════════════════════
-- 022 — Sellers
-- Run in Supabase → SQL Editor on zentrabite-prod BEFORE merging the seller
-- logins pull request. Additive only. Safe to run more than once. The code
-- that's live now ignores the new columns and table.
--
-- users.is_seller        the login can fill in the sale handover form and see
--                        the shops it sold. Nothing else. Set by a super
--                        admin from Super Admin → Sellers. Browsers can't
--                        write to users at all (migration 015).
-- businesses.sold_by     the seller (or staff member) who made the sale
-- businesses.sold_at     when, for commission
-- import_runs            one row per website import, so a seller's imports
--                        can be limited (each one costs AI time). Only the
--                        server reads and writes it.
--
-- protect_business_fields (migration 015) now also keeps sold_by and sold_at,
-- so an owner editing their business from a browser can't change who sold it.
-- ═══════════════════════════════════════════════════════════════════════════

alter table public.users add column if not exists is_seller boolean not null default false;

alter table public.businesses add column if not exists sold_by uuid references public.users(id) on delete set null;
alter table public.businesses add column if not exists sold_at timestamptz;
create index if not exists idx_businesses_sold_by on public.businesses (sold_by);

comment on column public.users.is_seller      is 'Can fill in the sale handover form and see the shops they sold. Set by a super admin.';
comment on column public.businesses.sold_by   is 'Who made the sale. Server only.';
comment on column public.businesses.sold_at   is 'When the sale was made. Server only.';


-- ─── Website imports, for the seller limit ──────────────────────────────────
create table if not exists public.import_runs (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.users(id) on delete cascade,
  url        text,
  created_at timestamptz not null default now()
);
create index if not exists idx_import_runs_user_created on public.import_runs (user_id, created_at desc);

-- Row security on with no rules, and no grants: browsers can't touch it.
alter table public.import_runs enable row level security;
revoke all on public.import_runs from anon, authenticated;

comment on table public.import_runs is 'One row per website import. Server only.';


-- ─── Owners can't change who sold their business ────────────────────────────
-- The same function as migration 015, plus sold_by and sold_at.
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
