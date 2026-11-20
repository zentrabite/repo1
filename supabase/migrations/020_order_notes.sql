-- ═══════════════════════════════════════════════════════════════════════════
-- 020 — A note on each order
-- Run in Supabase → SQL Editor on zentrabite-prod BEFORE merging the order
-- notes and delivery pull request. Additive only. Safe to run more than
-- once. The code that's live now ignores the new column.
--
-- notes  what the customer typed for the kitchen or the driver ("no onions",
--        "ring the bell"), or what staff typed on the POS. 500 characters at
--        most. The ordering page and the POS allow 300.
-- Delivery addresses already have a home (orders.ship_to, migration 010).
-- ═══════════════════════════════════════════════════════════════════════════

alter table public.orders add column if not exists notes text;

alter table public.orders drop constraint if exists orders_notes_length;
alter table public.orders
  add constraint orders_notes_length check (notes is null or char_length(notes) <= 500);

comment on column public.orders.notes is 'The customer''s note for the kitchen or the driver, or the POS note.';
