-- ═══════════════════════════════════════════════════════════════════════════
-- PASTE THIS INTO THE SUPABASE SQL EDITOR AND HIT "RUN"
-- (Project → SQL editor → New query → paste → Run)
--
-- Safe to run multiple times — every statement uses IF NOT EXISTS / idempotent
-- updates. Brings your production DB in line with migrations 009 + 010.
-- ═══════════════════════════════════════════════════════════════════════════


-- ─── From 009: safety-net columns (no-ops if already applied) ──────────────

ALTER TABLE winback_rules  ADD COLUMN IF NOT EXISTS channel      TEXT NOT NULL DEFAULT 'sms';
ALTER TABLE winback_rules  ADD COLUMN IF NOT EXISTS cooldown_days INT  DEFAULT 30;


-- ─── 010: e-commerce fulfillment tracking ──────────────────────────────────

ALTER TABLE orders ADD COLUMN IF NOT EXISTS fulfillment_type TEXT DEFAULT 'dine_in';

-- Backfill the new column from the existing source value so old rows
-- show up sensibly in the Fulfillment view.
UPDATE orders
SET fulfillment_type = CASE
  WHEN source IN ('uber_eats','menulog','doordash') THEN 'delivery'
  WHEN source = 'direct'                             THEN 'takeaway'
  ELSE 'dine_in'
END
WHERE fulfillment_type IS NULL OR fulfillment_type = 'dine_in';

-- Stage timestamps (NULL = "not done yet")
ALTER TABLE orders ADD COLUMN IF NOT EXISTS placed_at    TIMESTAMPTZ;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS picked_at    TIMESTAMPTZ;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS packed_at    TIMESTAMPTZ;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipped_at   TIMESTAMPTZ;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ;

-- Old rows don't have placed_at — fall back to created_at
UPDATE orders SET placed_at = created_at WHERE placed_at IS NULL;

-- Carrier / tracking (human-typed)
ALTER TABLE orders ADD COLUMN IF NOT EXISTS carrier         TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS tracking_number TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS tracking_url    TEXT;

-- Ship-to address (JSONB so future fields don't need migrations)
ALTER TABLE orders ADD COLUMN IF NOT EXISTS ship_to JSONB;

-- Fulfillment view index
CREATE INDEX IF NOT EXISTS idx_orders_fulfillment
  ON orders(business_id, fulfillment_type, placed_at DESC);


-- ─── Stripe Connect onboarding state (used by /api/stripe/webhook) ─────────

ALTER TABLE businesses ADD COLUMN IF NOT EXISTS stripe_charges_enabled  BOOLEAN DEFAULT false;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS stripe_payouts_enabled  BOOLEAN DEFAULT false;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS stripe_details_submitted BOOLEAN DEFAULT false;


-- ─── Verify ────────────────────────────────────────────────────────────────
-- Expect: 14 rows, all with data_type (no NULL)
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'orders'
  AND column_name IN (
    'fulfillment_type','placed_at','picked_at','packed_at','shipped_at',
    'delivered_at','carrier','tracking_number','tracking_url','ship_to'
  )
ORDER BY column_name;
