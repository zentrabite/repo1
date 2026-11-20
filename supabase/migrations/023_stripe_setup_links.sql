-- ═══════════════════════════════════════════════════════════════════════════
-- 023 — Stripe setup links
-- Run in Supabase → SQL Editor on zentrabite-prod BEFORE merging the Stripe
-- link pull request. Additive only. Safe to run more than once.
--
-- Each shop can have one link the owner opens to set up payments with Stripe,
-- before they have a ZentraBite login: /stripe-setup/<code>. It's made when
-- the shop is sold, and staff can make a new one from the onboarding wizard
-- (the old one stops working).
--
-- Only a hash of the code is kept, so the table can't be used to open a
-- link. A link works for 14 days and stops once the shop takes payments.
-- Whoever finishes Stripe's setup chooses where the shop's money is paid, so
-- the link goes to the owner's email, never to the seller.
--
-- Only the server reads and writes it. Row security on, no rules, no grants.
-- ═══════════════════════════════════════════════════════════════════════════

create table if not exists public.stripe_setup_links (
  business_id uuid primary key references public.businesses(id) on delete cascade,
  token_hash  text not null unique,
  expires_at  timestamptz not null,
  created_by  uuid references public.users(id) on delete set null,
  created_at  timestamptz not null default now(),
  opened_at   timestamptz
);

alter table public.stripe_setup_links enable row level security;
revoke all on public.stripe_setup_links from anon, authenticated;

comment on table public.stripe_setup_links is 'One Stripe setup link per shop, for the owner. Only a hash of the code. Server only.';
