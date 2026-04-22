-- ─── Zentra Bites — Supabase Schema ──────────────────────────────────────────
-- Run this entire file in your Supabase project:
--   Supabase Dashboard → SQL Editor → New query → paste → Run
-- ─────────────────────────────────────────────────────────────────────────────

-- Enable UUID generation
create extension if not exists "pgcrypto";


-- ─── businesses ──────────────────────────────────────────────────────────────
create table if not exists businesses (
  id                 uuid primary key default gen_random_uuid(),
  name               text not null,
  type               text not null,
  suburb             text,
  stripe_account_id  text,
  stripe_customer_id text,
  subdomain          text unique,
  logo_url           text,
  settings           jsonb not null default '{}',
  created_at         timestamptz not null default now()
);


-- ─── customers ───────────────────────────────────────────────────────────────
create table if not exists customers (
  id               uuid primary key default gen_random_uuid(),
  business_id      uuid not null references businesses(id) on delete cascade,
  name             text not null,
  phone            text,
  email            text,
  source           text not null default 'manual',
  segment          text not null default 'active',
  first_order      date,
  last_order_date  date,
  total_spent      numeric(10,2) not null default 0,
  total_orders     integer not null default 0,
  points_balance   integer not null default 0,
  opted_out        boolean not null default false,
  created_at       timestamptz not null default now()
);

create index if not exists customers_business_id_idx on customers(business_id);


-- ─── orders ──────────────────────────────────────────────────────────────────
create table if not exists orders (
  id                uuid primary key default gen_random_uuid(),
  business_id       uuid not null references businesses(id) on delete cascade,
  customer_id       uuid references customers(id) on delete set null,
  items             jsonb not null default '[]',
  total             numeric(10,2) not null default 0,
  status            text not null default 'pending',
  source            text not null default 'direct',
  stripe_payment_id text,
  created_at        timestamptz not null default now()
);

create index if not exists orders_business_id_idx on orders(business_id);
create index if not exists orders_customer_id_idx on orders(customer_id);


-- ─── campaigns ───────────────────────────────────────────────────────────────
create table if not exists campaigns (
  id               uuid primary key default gen_random_uuid(),
  business_id      uuid not null references businesses(id) on delete cascade,
  type             text not null,
  name             text,
  template         text,
  active           boolean not null default true,
  discount_amount  numeric(10,2) not null default 0,
  cooldown_days    integer not null default 30,
  trigger_days     integer not null default 30,
  created_at       timestamptz not null default now()
);

create index if not exists campaigns_business_id_idx on campaigns(business_id);


-- ─── sms_logs ────────────────────────────────────────────────────────────────
create table if not exists sms_logs (
  id           uuid primary key default gen_random_uuid(),
  business_id  uuid not null references businesses(id) on delete cascade,
  customer_id  uuid references customers(id) on delete set null,
  campaign_id  uuid references campaigns(id) on delete set null,
  message      text,
  status       text not null default 'sent',
  converted    boolean not null default false,
  twilio_sid   text,
  sent_at      timestamptz not null default now()
);

create index if not exists sms_logs_business_id_idx on sms_logs(business_id);
create index if not exists sms_logs_customer_id_idx on sms_logs(customer_id);


-- ─── menu_categories ─────────────────────────────────────────────────────────
create table if not exists menu_categories (
  id           uuid primary key default gen_random_uuid(),
  business_id  uuid not null references businesses(id) on delete cascade,
  name         text not null,
  sort_order   integer not null default 0
);

create index if not exists menu_categories_business_id_idx on menu_categories(business_id);


-- ─── menu_items ──────────────────────────────────────────────────────────────
create table if not exists menu_items (
  id            uuid primary key default gen_random_uuid(),
  business_id   uuid not null references businesses(id) on delete cascade,
  category_id   uuid references menu_categories(id) on delete set null,
  name          text not null,
  description   text,
  price         numeric(10,2) not null default 0,
  image_url     text,
  available     boolean not null default true,
  dietary_tags  text[] not null default '{}',
  sort_order    integer not null default 0
);

create index if not exists menu_items_business_id_idx on menu_items(business_id);
create index if not exists menu_items_category_id_idx on menu_items(category_id);


-- ─── analytics_daily ─────────────────────────────────────────────────────────
create table if not exists analytics_daily (
  id              uuid primary key default gen_random_uuid(),
  business_id     uuid not null references businesses(id) on delete cascade,
  date            date not null,
  total_orders    integer not null default 0,
  total_revenue   numeric(10,2) not null default 0,
  direct_orders   integer not null default 0,
  agg_orders      integer not null default 0,
  new_customers   integer not null default 0,
  sms_sent        integer not null default 0,
  sms_converted   integer not null default 0,
  unique(business_id, date)
);

create index if not exists analytics_daily_business_id_idx on analytics_daily(business_id);
create index if not exists analytics_daily_date_idx on analytics_daily(date);


-- ─── Row Level Security ───────────────────────────────────────────────────────
-- Enable RLS on all tables so users can only see their own business data.

alter table businesses       enable row level security;
alter table customers        enable row level security;
alter table orders           enable row level security;
alter table campaigns        enable row level security;
alter table sms_logs         enable row level security;
alter table menu_categories  enable row level security;
alter table menu_items       enable row level security;
alter table analytics_daily  enable row level security;

-- Service role bypasses RLS (used by your API routes via SUPABASE_SERVICE_ROLE_KEY).
-- Add user-level policies here once you have auth set up, e.g.:
--
-- create policy "Users can read own business"
--   on businesses for select
--   using (auth.uid() = owner_id);
--
-- For now, the dashboard uses the service role key so all operations work without
-- per-user policies. Add fine-grained policies before going multi-tenant.


-- ─── Done ─────────────────────────────────────────────────────────────────────
-- All 8 tables created. Go to /api/test-db to confirm Supabase is connected.
