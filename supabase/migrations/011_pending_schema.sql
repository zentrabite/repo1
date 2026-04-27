-- ═══════════════════════════════════════════════════════════════════════════
-- ZentraBite — Migration 011
-- Absorbs APPLY_NOW.sql + adds new tables for drivers, reviews, loyalty,
-- rewards catalogue, redemptions, earn events, logo, delivery settings,
-- and cron schedules for both edge functions.
--
-- Safe to run multiple times — all statements use IF NOT EXISTS / idempotent.
-- Apply via: supabase db push
-- OR paste into Supabase SQL Editor → Run
-- ═══════════════════════════════════════════════════════════════════════════


-- ─── From APPLY_NOW: safety-net columns on winback_rules ──────────────────
ALTER TABLE winback_rules ADD COLUMN IF NOT EXISTS channel      TEXT NOT NULL DEFAULT 'sms';
ALTER TABLE winback_rules ADD COLUMN IF NOT EXISTS cooldown_days INT  DEFAULT 30;


-- ─── From APPLY_NOW: fulfillment tracking columns on orders ───────────────
ALTER TABLE orders ADD COLUMN IF NOT EXISTS fulfillment_type TEXT DEFAULT 'dine_in';

UPDATE orders
SET fulfillment_type = CASE
  WHEN source IN ('uber_eats','menulog','doordash') THEN 'delivery'
  WHEN source = 'direct'                             THEN 'takeaway'
  ELSE 'dine_in'
END
WHERE fulfillment_type IS NULL OR fulfillment_type = 'dine_in';

ALTER TABLE orders ADD COLUMN IF NOT EXISTS placed_at       TIMESTAMPTZ;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS picked_at       TIMESTAMPTZ;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS packed_at       TIMESTAMPTZ;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipped_at      TIMESTAMPTZ;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivered_at    TIMESTAMPTZ;

UPDATE orders SET placed_at = created_at WHERE placed_at IS NULL;

ALTER TABLE orders ADD COLUMN IF NOT EXISTS carrier         TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS tracking_number TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS tracking_url    TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS ship_to         JSONB;

CREATE INDEX IF NOT EXISTS idx_orders_fulfillment
  ON orders(business_id, fulfillment_type, placed_at DESC);


-- ─── From APPLY_NOW: Stripe Connect columns on businesses ─────────────────
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS stripe_charges_enabled   BOOLEAN DEFAULT false;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS stripe_payouts_enabled   BOOLEAN DEFAULT false;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS stripe_details_submitted BOOLEAN DEFAULT false;


-- ─── From APPLY_NOW: sms_logs send log columns ────────────────────────────
ALTER TABLE sms_logs ADD COLUMN IF NOT EXISTS channel   TEXT DEFAULT 'sms';
ALTER TABLE sms_logs ADD COLUMN IF NOT EXISTS rule_id   UUID;
ALTER TABLE sms_logs ADD COLUMN IF NOT EXISTS recipient TEXT;

CREATE INDEX IF NOT EXISTS idx_sms_logs_rule_customer
  ON sms_logs(rule_id, customer_id, sent_at DESC);


-- ─── From APPLY_NOW: users phone + businesses contact/about fields ─────────
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone TEXT;
CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone) WHERE phone IS NOT NULL;

ALTER TABLE businesses ADD COLUMN IF NOT EXISTS description   TEXT;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS contact_phone TEXT;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS contact_email TEXT;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS website       TEXT;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS abn           TEXT;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS address       TEXT;

CREATE INDEX IF NOT EXISTS idx_businesses_contact_phone
  ON businesses(contact_phone) WHERE contact_phone IS NOT NULL;


-- ─── From APPLY_NOW: business_members table ────────────────────────────────
CREATE TABLE IF NOT EXISTS business_members (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id  UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  email        TEXT NOT NULL,
  role         TEXT NOT NULL DEFAULT 'Staff',
  invited_by   UUID,
  status       TEXT NOT NULL DEFAULT 'invited',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (business_id, email)
);
CREATE INDEX IF NOT EXISTS idx_business_members_business
  ON business_members(business_id);


-- ─── NEW: logo_url + delivery_settings on businesses ──────────────────────
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS logo_url          TEXT;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS delivery_settings JSONB DEFAULT '{}';
-- delivery_settings shape:
-- {
--   "uber_direct_api_key": "...",
--   "uber_direct_customer_id": "...",
--   "tasker_rate_per_hour": 180,
--   "tasker_capacity_per_day": 25,
--   "other_provider_name": "DoorDash Drive",
--   "other_provider_rate_per_order": 7.50
-- }


-- ─── NEW: customers earn columns (birthday, referral) ─────────────────────
ALTER TABLE customers ADD COLUMN IF NOT EXISTS date_of_birth  DATE;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS referral_code  TEXT UNIQUE;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS referred_by    UUID REFERENCES customers(id);

CREATE INDEX IF NOT EXISTS idx_customers_dob
  ON customers(date_of_birth) WHERE date_of_birth IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_customers_referral_code
  ON customers(referral_code) WHERE referral_code IS NOT NULL;


-- ─── NEW: loyalty_events — audit trail for every points earn ──────────────
CREATE TABLE IF NOT EXISTS loyalty_events (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id  UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  customer_id  UUID NOT NULL REFERENCES customers(id)  ON DELETE CASCADE,
  event_type   TEXT NOT NULL,
  -- 'order' | 'referral' | 'birthday' | 'streak' | 'review' | 'manual'
  points       INT  NOT NULL DEFAULT 0,
  multiplier   NUMERIC(4,2) DEFAULT 1.0,
  source       TEXT, -- order_id, referral_code, etc.
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_loyalty_events_customer
  ON loyalty_events(customer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_loyalty_events_business_type
  ON loyalty_events(business_id, event_type, created_at DESC);


-- ─── NEW: rewards_catalogue — items merchants offer for redemption ─────────
CREATE TABLE IF NOT EXISTS rewards_catalogue (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id  UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  title        TEXT NOT NULL,
  description  TEXT,
  points_cost  INT  NOT NULL,
  reward_type  TEXT NOT NULL DEFAULT 'free_item',
  -- 'free_item' | 'discount_pct' | 'discount_dollar' | 'free_delivery'
  reward_value NUMERIC(10,2),
  is_active    BOOLEAN DEFAULT true,
  sort_order   INT DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_rewards_catalogue_business
  ON rewards_catalogue(business_id, is_active, sort_order);


-- ─── NEW: reward_redemptions — customer redemption records ────────────────
CREATE TABLE IF NOT EXISTS reward_redemptions (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id  UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  customer_id  UUID NOT NULL REFERENCES customers(id)  ON DELETE CASCADE,
  catalogue_id UUID REFERENCES rewards_catalogue(id),
  points_spent INT  NOT NULL,
  voucher_code TEXT,
  redeemed_at  TIMESTAMPTZ,
  order_id     UUID REFERENCES orders(id),
  status       TEXT NOT NULL DEFAULT 'pending',
  -- 'pending' | 'redeemed' | 'expired'
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_reward_redemptions_customer
  ON reward_redemptions(customer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reward_redemptions_business
  ON reward_redemptions(business_id, status, created_at DESC);


-- ─── NEW: drivers table ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS drivers (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id  UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  phone        TEXT,
  email        TEXT,
  vehicle_type TEXT DEFAULT 'car',
  -- 'car' | 'bike' | 'scooter' | 'van'
  status       TEXT DEFAULT 'offline',
  -- 'online' | 'offline' | 'on_delivery'
  hourly_rate  NUMERIC(8,2),
  notes        TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_drivers_business_status
  ON drivers(business_id, status);


-- ─── NEW: reviews table ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS reviews (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id   UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  customer_id   UUID REFERENCES customers(id),
  customer_name TEXT,
  source        TEXT NOT NULL DEFAULT 'google',
  -- 'google' | 'app' | 'website' | 'manual'
  rating        INT  CHECK (rating BETWEEN 1 AND 5),
  body          TEXT,
  sentiment     TEXT,
  -- 'positive' | 'neutral' | 'negative'
  reply         TEXT,
  reply_sent_at TIMESTAMPTZ,
  status        TEXT NOT NULL DEFAULT 'pending',
  -- 'pending' | 'replied' | 'escalated' | 'ignored'
  order_id      UUID REFERENCES orders(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_reviews_business_status
  ON reviews(business_id, status, created_at DESC);


-- ─── NEW: RLS on all new tables ────────────────────────────────────────────
ALTER TABLE loyalty_events     ENABLE ROW LEVEL SECURITY;
ALTER TABLE rewards_catalogue  ENABLE ROW LEVEL SECURITY;
ALTER TABLE reward_redemptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews            ENABLE ROW LEVEL SECURITY;
ALTER TABLE drivers            ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_members   ENABLE ROW LEVEL SECURITY;

-- Helper: resolve business_id for the current user
-- (re-uses the pattern from existing migrations)
CREATE POLICY IF NOT EXISTS "Tenant: loyalty_events"
  ON loyalty_events FOR ALL
  USING (business_id = (SELECT business_id FROM users WHERE id = auth.uid()));

CREATE POLICY IF NOT EXISTS "Tenant: rewards_catalogue"
  ON rewards_catalogue FOR ALL
  USING (business_id = (SELECT business_id FROM users WHERE id = auth.uid()));

CREATE POLICY IF NOT EXISTS "Tenant: reward_redemptions"
  ON reward_redemptions FOR ALL
  USING (business_id = (SELECT business_id FROM users WHERE id = auth.uid()));

CREATE POLICY IF NOT EXISTS "Tenant: reviews"
  ON reviews FOR ALL
  USING (business_id = (SELECT business_id FROM users WHERE id = auth.uid()));

CREATE POLICY IF NOT EXISTS "Tenant: drivers"
  ON drivers FOR ALL
  USING (business_id = (SELECT business_id FROM users WHERE id = auth.uid()));

CREATE POLICY IF NOT EXISTS "Tenant: business_members"
  ON business_members FOR ALL
  USING (business_id = (SELECT business_id FROM users WHERE id = auth.uid()));


-- ─── NEW: Supabase Storage bucket for business logos ──────────────────────
-- If the SQL editor doesn't support storage inserts, create the bucket
-- manually: Storage → New bucket → "business-logos" → Public: ON
INSERT INTO storage.buckets (id, name, public)
VALUES ('business-logos', 'business-logos', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY IF NOT EXISTS "Public logo read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'business-logos');

CREATE POLICY IF NOT EXISTS "Auth logo write"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'business-logos' AND auth.role() = 'authenticated');

CREATE POLICY IF NOT EXISTS "Auth logo update"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'business-logos' AND auth.role() = 'authenticated');


-- ─── NEW: Cron schedules for edge functions ────────────────────────────────
-- IMPORTANT: Replace YOUR_ANON_KEY with the value from:
-- Supabase Dashboard → Project Settings → API → anon public key
--
-- Nightly analytics — 2:00 AM ACST (4:00 PM UTC)
SELECT cron.schedule(
  'nightly-analytics',
  '0 16 * * *',
  $$SELECT net.http_post(
    url     := 'https://ojwzberovbhgnwfpgaoh.supabase.co/functions/v1/nightly-analytics',
    headers := '{"Authorization":"Bearer YOUR_ANON_KEY"}'::jsonb
  )$$
);

-- Win-back — 9:00 AM ACST (11:00 PM UTC)
SELECT cron.schedule(
  'win-back-daily',
  '0 23 * * *',
  $$SELECT net.http_post(
    url     := 'https://ojwzberovbhgnwfpgaoh.supabase.co/functions/v1/win-back',
    headers := '{"Authorization":"Bearer YOUR_ANON_KEY"}'::jsonb
  )$$
);


-- ─── Verify ────────────────────────────────────────────────────────────────
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
    'loyalty_events','rewards_catalogue','reward_redemptions',
    'reviews','drivers','business_members'
  )
ORDER BY table_name;
