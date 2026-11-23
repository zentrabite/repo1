-- 036 · A record of ZentraBite staff opening a shop's CRM
-- A super admin can open any shop's CRM as its owner (Super Admin, a shop,
-- Impersonate). Nothing recorded who did that, when, or which shop. Now
-- every start and stop is written here, and so is the first use of the CRM
-- as a shop in each 4-hour window (the impersonation cookie's life), which
-- catches use without the button. The shop's owner sees the list in
-- Settings, and staff see it on the shop's Super Admin page.
--
-- Server only. Only adds a table. Safe to run twice.

create table if not exists public.staff_access_log (
  id          uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  staff_id    uuid not null,
  staff_email text,
  action      text not null check (action in ('start', 'used', 'stop')),
  created_at  timestamptz not null default now()
);

create index if not exists idx_staff_access_log_business
  on public.staff_access_log (business_id, created_at desc);
create index if not exists idx_staff_access_log_staff
  on public.staff_access_log (staff_id, business_id, created_at desc);

alter table public.staff_access_log enable row level security;
revoke all on public.staff_access_log from anon, authenticated;

comment on table public.staff_access_log is 'ZentraBite staff opening a shop''s CRM as its owner (migration 036). Server only.';
