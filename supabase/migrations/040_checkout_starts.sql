-- ═══════════════════════════════════════════════════════════════════════════
-- 040. A count of checkouts started, so /api/store/checkout can limit them
--      (second security run, left for later, 25 Nov 2026)
--
-- The ordering page needs no login, and every checkout makes two to four
-- calls to Stripe on the shop's account. Without a limit a script could fill
-- a shop's Stripe account with checkouts and coupons, and use up ZentraBite's
-- Stripe rate limit, which refunds and every other shop also need.
--
-- One row per checkout started. The address is kept only as a keyed hash
-- (lib/checkout-limit.ts), never the address itself, and rows older than two
-- days are cleared as new ones come in. Server only.
--
-- Safe to run twice. Only adds a table.
-- ═══════════════════════════════════════════════════════════════════════════

create table if not exists public.checkout_starts (
  id          uuid        primary key default gen_random_uuid(),
  business_id uuid        not null references public.businesses(id) on delete cascade,
  ip_key      text        not null,
  created_at  timestamptz not null default now()
);

create index if not exists checkout_starts_shop on public.checkout_starts (business_id, created_at desc);
create index if not exists checkout_starts_ip   on public.checkout_starts (ip_key, created_at desc);

alter table public.checkout_starts enable row level security;
revoke all on public.checkout_starts from public, anon, authenticated;
grant all on public.checkout_starts to service_role;
