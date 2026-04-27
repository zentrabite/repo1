-- ═══════════════════════════════════════════════════════════════════════════
-- ZentraBite — Initial Database Schema
-- Run this in: app.supabase.com → SQL Editor → New query → Run
-- ═══════════════════════════════════════════════════════════════════════════

-- ─── BUSINESSES ──────────────────────────────────────────────────────────────
-- One row per merchant on the platform
CREATE TABLE IF NOT EXISTS businesses (
  id                  UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name                TEXT NOT NULL,
  type                TEXT NOT NULL DEFAULT 'Restaurant',
  suburb              TEXT,
  stripe_account_id   TEXT,          -- Stripe Connect Express account
  stripe_customer_id  TEXT,          -- Stripe subscription customer
  subdomain           TEXT UNIQUE,   -- e.g. sorrentos.zentrabite.com.au
  logo_url            TEXT,
  settings            JSONB DEFAULT '{}',
  created_at          TIMESTAMPTZ DEFAULT now()
);

-- ─── USERS ───────────────────────────────────────────────────────────────────
-- Links Supabase auth users to a business
CREATE TABLE IF NOT EXISTS users (
  id              UUID REFERENCES auth.users(id) PRIMARY KEY,
  business_id     UUID REFERENCES businesses(id),
  role            TEXT DEFAULT 'owner',    -- owner | manager | staff
  name            TEXT,
  email           TEXT,
  is_super_admin  BOOLEAN DEFAULT false,   -- platform owner — sees all businesses
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- ─── CUSTOMERS ───────────────────────────────────────────────────────────────
-- Every person who has ever placed an order or been added to the CRM
CREATE TABLE IF NOT EXISTS customers (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id     UUID REFERENCES businesses(id) NOT NULL,
  name            TEXT NOT NULL,
  phone           TEXT,
  email           TEXT,
  source          TEXT DEFAULT 'direct',   -- direct | uber_eats | menulog
  segment         TEXT DEFAULT 'New',      -- New | Regular | VIP | At Risk
  first_order     TIMESTAMPTZ,
  last_order_date TIMESTAMPTZ,
  total_spent     NUMERIC DEFAULT 0,
  total_orders    INT DEFAULT 0,
  points_balance  INT DEFAULT 0,
  opted_out       BOOLEAN DEFAULT false,   -- SMS opt-out
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- ─── ORDERS ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS orders (
  id                  UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id         UUID REFERENCES businesses(id) NOT NULL,
  customer_id         UUID REFERENCES customers(id),
  items               JSONB NOT NULL DEFAULT '[]',
  total               NUMERIC NOT NULL,
  status              TEXT DEFAULT 'New',      -- New | Preparing | Ready | Delivered
  source              TEXT DEFAULT 'direct',   -- direct | uber_eats | menulog
  stripe_payment_id   TEXT,
  created_at          TIMESTAMPTZ DEFAULT now()
);

-- ─── CAMPAIGNS ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS campaigns (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id     UUID REFERENCES businesses(id) NOT NULL,
  type            TEXT NOT NULL,              -- win_back | birthday | welcome | etc.
  name            TEXT,
  template        TEXT,                       -- SMS template with {name}, {link} etc.
  active          BOOLEAN DEFAULT true,
  discount_amount NUMERIC DEFAULT 10,
  cooldown_days   INT DEFAULT 30,             -- days before re-sending to same customer
  trigger_days    INT DEFAULT 14,             -- days inactive before win-back fires
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- ─── SMS LOGS ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sms_logs (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id   UUID REFERENCES businesses(id) NOT NULL,
  customer_id   UUID REFERENCES customers(id),
  campaign_id   UUID REFERENCES campaigns(id),
  message       TEXT,
  status        TEXT DEFAULT 'queued',   -- queued | sent | delivered | failed
  converted     BOOLEAN DEFAULT false,   -- did the SMS result in an order?
  twilio_sid    TEXT,
  sent_at       TIMESTAMPTZ DEFAULT now()
);

-- ─── MENU ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS menu_categories (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id   UUID REFERENCES businesses(id) NOT NULL,
  name          TEXT NOT NULL,
  sort_order    INT DEFAULT 0
);

CREATE TABLE IF NOT EXISTS menu_items (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id   UUID REFERENCES businesses(id) NOT NULL,
  category_id   UUID REFERENCES menu_categories(id),
  name          TEXT NOT NULL,
  description   TEXT,
  price         NUMERIC NOT NULL,
  image_url     TEXT,
  available     BOOLEAN DEFAULT true,
  dietary_tags  TEXT[] DEFAULT '{}',   -- ['Vegan', 'GF', 'Halal']
  sort_order    INT DEFAULT 0
);

-- ─── ANALYTICS ───────────────────────────────────────────────────────────────
-- Pre-aggregated daily stats — updated nightly so dashboards load instantly
CREATE TABLE IF NOT EXISTS analytics_daily (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id     UUID REFERENCES businesses(id) NOT NULL,
  date            DATE NOT NULL,
  total_orders    INT DEFAULT 0,
  total_revenue   NUMERIC DEFAULT 0,
  direct_orders   INT DEFAULT 0,
  agg_orders      INT DEFAULT 0,
  new_customers   INT DEFAULT 0,
  sms_sent        INT DEFAULT 0,
  sms_converted   INT DEFAULT 0,
  UNIQUE(business_id, date)
);

-- ═══════════════════════════════════════════════════════════════════════════
-- INDEXES — for fast queries on the most common lookups
-- ═══════════════════════════════════════════════════════════════════════════

CREATE INDEX IF NOT EXISTS idx_customers_business        ON customers(business_id);
CREATE INDEX IF NOT EXISTS idx_customers_phone           ON customers(business_id, phone);
CREATE INDEX IF NOT EXISTS idx_customers_last_order      ON customers(business_id, last_order_date DESC);
CREATE INDEX IF NOT EXISTS idx_orders_business           ON orders(business_id);
CREATE INDEX IF NOT EXISTS idx_orders_created            ON orders(business_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_customer           ON orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_business        ON campaigns(business_id);
CREATE INDEX IF NOT EXISTS idx_sms_logs_business         ON sms_logs(business_id);
CREATE INDEX IF NOT EXISTS idx_sms_logs_customer         ON sms_logs(customer_id);
CREATE INDEX IF NOT EXISTS idx_menu_items_category       ON menu_items(category_id);
CREATE INDEX IF NOT EXISTS idx_analytics_business_date   ON analytics_daily(business_id, date DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_businesses_subdomain ON businesses(subdomain);
