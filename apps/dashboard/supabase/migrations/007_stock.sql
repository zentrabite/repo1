-- 007_stock.sql — Stock intelligence: par levels, counts, reorder suggestions
-- Run in Supabase SQL editor.

create table if not exists stock_items (
  id               uuid primary key default gen_random_uuid(),
  business_id      uuid not null references businesses(id) on delete cascade,
  name             text not null,
  sku              text,
  unit             text not null default 'each',   -- each, kg, L, box, pack
  supplier         text,
  cost             numeric(10,2) not null default 0,
  on_hand          numeric(10,2) not null default 0,
  par_level        numeric(10,2) not null default 0,
  reorder_to       numeric(10,2) not null default 0,
  lead_time_days   integer not null default 2,
  expiry_date      date,
  last_counted_at  timestamptz,
  last_delivered_at timestamptz,
  auto_reorder     boolean not null default false,
  created_at       timestamptz not null default now()
);

create index if not exists stock_items_business_id_idx on stock_items(business_id);
create index if not exists stock_items_expiry_idx     on stock_items(expiry_date);

create table if not exists stock_counts (
  id               uuid primary key default gen_random_uuid(),
  stock_item_id    uuid not null references stock_items(id) on delete cascade,
  business_id      uuid not null references businesses(id) on delete cascade,
  counted_by       text,
  before_qty       numeric(10,2) not null default 0,
  after_qty        numeric(10,2) not null default 0,
  note             text,
  counted_at       timestamptz not null default now()
);

create index if not exists stock_counts_item_idx     on stock_counts(stock_item_id);
create index if not exists stock_counts_business_idx on stock_counts(business_id);

alter table stock_items  enable row level security;
alter table stock_counts enable row level security;
