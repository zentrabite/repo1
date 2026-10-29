-- ═══════════════════════════════════════════════════════════════════════════
-- 017 — Guards for the scheduled edge functions
-- Run in Supabase → SQL Editor on zentrabite-prod BEFORE redeploying the
-- win-back and birthday-loyalty functions. Additive only. Safe to run more
-- than once.
--
-- The pg_cron jobs call the functions with the public anon key, so anyone
-- with that key can call them too. Until a caller secret is added, these
-- stop repeat calls from doing anything twice.
-- ═══════════════════════════════════════════════════════════════════════════


-- ─── 1. One run per function per day ────────────────────────────────────────
-- Each function inserts (function_name, today) first. If the row is already
-- there the insert fails on the primary key and the function stops, so a
-- second call on the same day (or two at once) does nothing.
create table if not exists public.edge_function_runs (
  function_name text        not null,
  run_date      date        not null,
  started_at    timestamptz not null default now(),
  primary key (function_name, run_date)
);

-- Only the service role (the edge functions) uses this table.
alter table public.edge_function_runs enable row level security;
revoke all on public.edge_function_runs from anon, authenticated;


-- ─── 2. Birthday points at most once per customer per year ──────────────────
-- birthday-loyalty now writes source = 'birthday-year-<YYYY>' and inserts
-- the event before adding points. A second insert for the same customer and
-- year fails here, so the points can't be added twice even if two runs
-- overlap. Older rows ('birthday-<YYYY-MM-DD>') aren't covered or changed.
create unique index if not exists idx_loyalty_events_birthday_year
  on public.loyalty_events (customer_id, source)
  where event_type = 'birthday' and source like 'birthday-year-%';
