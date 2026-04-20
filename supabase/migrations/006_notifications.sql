-- ─── Owner notifications ─────────────────────────────────────────────────────
-- Stores a record of every notification sent to a business owner.
-- Used by the in-app notification panel and for auditing order alerts.

create table if not exists public.notifications (
  id          uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  order_id    uuid references public.orders(id) on delete set null,
  title       text not null,
  body        text,
  read        boolean not null default false,
  created_at  timestamptz not null default now()
);

create index if not exists idx_notifications_business_id on public.notifications(business_id);
create index if not exists idx_notifications_unread
  on public.notifications(business_id)
  where read = false;

-- ─── RLS ─────────────────────────────────────────────────────────────────────
alter table public.notifications enable row level security;

-- Business owners see only their own notifications
drop policy if exists "owners_read_own_notifications" on public.notifications;
create policy "owners_read_own_notifications"
  on public.notifications for select
  using (
    business_id in (
      select business_id from public.users where id = auth.uid()
    )
  );

drop policy if exists "owners_update_own_notifications" on public.notifications;
create policy "owners_update_own_notifications"
  on public.notifications for update
  using (
    business_id in (
      select business_id from public.users where id = auth.uid()
    )
  );

-- Service role inserts (webhook)
drop policy if exists "service_role_insert_notifications" on public.notifications;
create policy "service_role_insert_notifications"
  on public.notifications for insert
  with check (true);
