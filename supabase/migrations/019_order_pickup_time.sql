-- ═══════════════════════════════════════════════════════════════════════════
-- 019 — Pick-up time on orders
-- Run in Supabase → SQL Editor on zentrabite-prod BEFORE merging the pick-up
-- time pull request. Additive only. Safe to run more than once. The code
-- that's live now ignores the new columns, so running it early is fine.
--
-- pickup_at   when the customer will collect the order, checked at checkout
--             against the shop's opening hours and prep time
-- pickup_asap true when they chose "as soon as possible", so pickup_at is
--             the time it should be ready by
-- Online orders save both. POS orders and older orders leave them empty.
-- ═══════════════════════════════════════════════════════════════════════════

alter table public.orders add column if not exists pickup_at   timestamptz;
alter table public.orders add column if not exists pickup_asap boolean not null default false;

comment on column public.orders.pickup_at is 'When the customer collects. Checked against the shop''s hours at checkout (apps/dashboard/lib/pickup-times.ts).';
comment on column public.orders.pickup_asap is 'True when the customer chose "as soon as possible".';
