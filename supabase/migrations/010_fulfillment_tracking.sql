-- ═══════════════════════════════════════════════════════════════════════════
-- ZentraBite — E-commerce fulfillment tracking
-- Adds a picked → packed → shipped → delivered pipeline on top of the
-- existing `orders` table.
--
-- The existing status column (New | Preparing | Ready | Delivered) stays as
-- the short "kitchen lane" status used on the /orders page. The columns
-- below are the longer "shipping lane" stamps used on the /fulfillment page.
--
-- Businesses that ship physical goods can use the full pipeline.
-- Businesses that only do dine-in / takeaway can ignore these columns
-- entirely — they all default to NULL.
-- Run once in Supabase SQL editor.
-- ═══════════════════════════════════════════════════════════════════════════

-- ─── FULFILLMENT TYPE ──────────────────────────────────────────────────────
-- dine_in      — consumed on site, no fulfillment tracking needed
-- takeaway     — collect at counter
-- delivery     — rider brings hot food, same-day
-- shipping     — physical goods, courier, multi-day (THE one that uses checkpoints)
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS fulfillment_type TEXT DEFAULT 'dine_in';

-- Backfill existing rows based on the `source` column so older orders
-- appear sensibly in the new view.
UPDATE orders
SET fulfillment_type = CASE
  WHEN source IN ('uber_eats','menulog','doordash') THEN 'delivery'
  WHEN source = 'direct'                             THEN 'takeaway'
  ELSE 'dine_in'
END
WHERE fulfillment_type IS NULL OR fulfillment_type = 'dine_in';

-- ─── CHECKPOINT TIMESTAMPS ─────────────────────────────────────────────────
-- Each timestamp is stamped when staff tap the matching button on the
-- fulfillment checklist. NULL means "not done yet".
ALTER TABLE orders ADD COLUMN IF NOT EXISTS placed_at    TIMESTAMPTZ;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS picked_at    TIMESTAMPTZ;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS packed_at    TIMESTAMPTZ;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipped_at   TIMESTAMPTZ;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ;

-- Existing paid orders had no `placed_at` — treat `created_at` as placement.
UPDATE orders SET placed_at = created_at WHERE placed_at IS NULL;

-- ─── CARRIER / TRACKING ────────────────────────────────────────────────────
-- Human-typed, not validated — matches how merchants actually think about
-- Auspost / Sendle / StarTrack / DHL / etc. Can be integrated with a live
-- tracking API later without schema changes.
ALTER TABLE orders ADD COLUMN IF NOT EXISTS carrier         TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS tracking_number TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS tracking_url    TEXT;

-- ─── SHIP-TO ADDRESS ────────────────────────────────────────────────────────
-- Stored as JSONB so future fields (unit, delivery instructions) can be
-- added without a migration. For the typical case we only use street,
-- suburb, postcode, state.
ALTER TABLE orders ADD COLUMN IF NOT EXISTS ship_to JSONB;

-- ─── INDEXES ───────────────────────────────────────────────────────────────
-- The fulfillment view queries by business_id + fulfillment_type and sorts
-- by the latest open checkpoint. An index on business_id + placed_at gets
-- us most of the way there; the type filter is a small cardinality scan.
CREATE INDEX IF NOT EXISTS idx_orders_fulfillment
  ON orders(business_id, fulfillment_type, placed_at DESC);

-- ─── Done ───────────────────────────────────────────────────────────────────
-- After running: regenerate types in dashboard (lib/database.types.ts).
