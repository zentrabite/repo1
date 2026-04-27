-- ─── Realtime publication for orders ────────────────────────────────────────
-- Enables Supabase Realtime on the orders table so the dashboard can
-- subscribe to INSERT/UPDATE/DELETE events (Live Orders, toast chime,
-- missed-ticket alarm, etc.)
--
-- Run this in Supabase → SQL Editor after 006_notifications.sql.
-- Idempotent: safe to run more than once.

do $$
begin
  -- Create the supabase_realtime publication if missing
  if not exists (
    select 1 from pg_publication where pubname = 'supabase_realtime'
  ) then
    create publication supabase_realtime;
  end if;

  -- Add public.orders to the publication if not already there
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'orders'
  ) then
    alter publication supabase_realtime add table public.orders;
  end if;

  -- Also publish notifications + order_items so in-app toasts pick up
  -- line-item changes and unread counts update live
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'notifications'
  ) then
    alter publication supabase_realtime add table public.notifications;
  end if;

  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'order_items'
  ) and not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'order_items'
  ) then
    alter publication supabase_realtime add table public.order_items;
  end if;
end $$;

-- Ensure the replica identity is FULL so UPDATE events include old + new rows
alter table public.orders replica identity full;
alter table public.notifications replica identity full;
