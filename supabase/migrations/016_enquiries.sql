-- ═══════════════════════════════════════════════════════════════════════════
-- 016 — Enquiries from the contact form on zentrabite.com/contact
-- Run in Supabase → SQL Editor on zentrabite-prod BEFORE deploying the code
-- on branch feat/contact-form-enquiries. Safe to run more than once.
--
-- The form posts to the CRM's /api/public/enquiries, which inserts with the
-- service role. Browsers can't insert, update or delete. Super admins can
-- read and change the status (the CRM page goes through /api/admin/enquiries,
-- these rules are the back-up).
--
-- Length limits match ENQUIRY_LIMITS in apps/dashboard/lib/enquiries.ts.
-- ═══════════════════════════════════════════════════════════════════════════


-- ─── 1. Table ───────────────────────────────────────────────────────────────
create table if not exists public.enquiries (
  id             uuid        primary key default gen_random_uuid(),
  created_at     timestamptz not null default now(),
  name           text        not null check (char_length(name) between 1 and 120),
  email          text        not null check (char_length(email) between 3 and 254),
  phone          text        check (char_length(phone) <= 40),
  business_name  text        not null check (char_length(business_name) between 1 and 160),
  business_type  text        check (char_length(business_type) <= 80),
  locations      text        check (char_length(locations) <= 20),
  current_tools  text        check (char_length(current_tools) <= 500),
  modules        text[]      not null default '{}' check (cardinality(modules) <= 20),
  message        text        check (char_length(message) <= 2000),
  source         text        not null default 'website' check (char_length(source) <= 40),
  status         text        not null default 'new' check (status in ('new', 'contacted', 'closed')),
  -- Keyed hash of the sender's address for the rate limit. Never the raw IP.
  ip_hash        text        check (char_length(ip_hash) <= 64)
);

comment on table public.enquiries is
  'Contact form enquiries from zentrabite.com/contact. Written by /api/public/enquiries with the service role. Super admins only.';

create index if not exists idx_enquiries_created on public.enquiries (created_at desc);
create index if not exists idx_enquiries_ip_hash on public.enquiries (ip_hash, created_at desc);


-- ─── 2. Row security ────────────────────────────────────────────────────────
-- No insert or delete rules for anon or authenticated, so with RLS on they
-- can't do either. The service role skips RLS.
alter table public.enquiries enable row level security;

drop policy if exists "enquiries_super_admin_select" on public.enquiries;
create policy "enquiries_super_admin_select" on public.enquiries
  for select to authenticated
  using (public.is_super_admin());

drop policy if exists "enquiries_super_admin_update" on public.enquiries;
create policy "enquiries_super_admin_update" on public.enquiries
  for update to authenticated
  using (public.is_super_admin())
  with check (public.is_super_admin());


-- ─── 3. Grants ──────────────────────────────────────────────────────────────
-- Belt and braces on top of RLS. Logged-out browsers get nothing. Logged-in
-- browsers can read, and can only ever change the status column.
revoke all on public.enquiries from anon;
revoke insert, update, delete, truncate, references, trigger on public.enquiries from authenticated;
grant  select on public.enquiries to authenticated;
grant  update (status) on public.enquiries to authenticated;
grant  all on public.enquiries to service_role;
