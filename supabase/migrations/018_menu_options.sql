-- ═══════════════════════════════════════════════════════════════════════════
-- 018 — Menu options: sizes, extras and choices on a menu item
-- Run in Supabase → SQL Editor on zentrabite-prod BEFORE merging the menu
-- options pull request. Additive only. Safe to run more than once. The code
-- that's live now ignores the new column, so running it early is fine.
--
-- Each item gets a list of option groups, for example:
--   [{ "id": "k3x9q2", "name": "Size", "min": 1, "max": 1, "choices": [
--      { "id": "a1b2c3", "name": "Small", "price": 0,   "available": true },
--      { "id": "d4e5f6", "name": "Large", "price": 4.5, "available": true } ] }]
-- min is how many the customer must pick, max the most they can pick, and a
-- choice's price is added to the item's price. The app reads it through
-- apps/dashboard/lib/menu-options.ts, which drops anything malformed, and
-- checkout prices every choice from here, never from the browser.
-- ═══════════════════════════════════════════════════════════════════════════

alter table public.menu_items
  add column if not exists options jsonb not null default '[]'::jsonb;

-- Always a list, so the app never has to guess.
alter table public.menu_items drop constraint if exists menu_items_options_is_list;
alter table public.menu_items
  add constraint menu_items_options_is_list check (jsonb_typeof(options) = 'array');

comment on column public.menu_items.options is
  'Sizes, extras and choices: [{id, name, min, max, choices:[{id, name, price, available}]}]. See apps/dashboard/lib/menu-options.ts.';
