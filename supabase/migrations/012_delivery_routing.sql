-- ═══════════════════════════════════════════════════════════════════════════
-- Migration 012 — Smart Delivery Routing Engine
-- Adds: delivery_jobs, delivery_quotes tables
--       Updates businesses.delivery_settings schema documentation
-- Apply: supabase db push  OR  paste into Supabase SQL editor
-- ═══════════════════════════════════════════════════════════════════════════

-- ─── delivery_jobs ──────────────────────────────────────────────────────────
-- Each row = one routing decision made by the engine (per order dispatch).
-- The engine logs every decision here so the /delivery page can show
-- provider analytics, margin tracking, and routing history.

CREATE TABLE IF NOT EXISTS delivery_jobs (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id         UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  order_id            UUID REFERENCES orders(id) ON DELETE SET NULL,

  -- Order snapshot at time of routing
  order_value         NUMERIC(10,2) NOT NULL DEFAULT 0,
  distance_km         NUMERIC(6,2),
  pickup_address      TEXT,
  dropoff_address     TEXT,
  delivery_tier       TEXT NOT NULL DEFAULT 'standard',  -- 'standard' | 'priority'

  -- Routing decision
  selected_provider   TEXT NOT NULL,   -- 'uber_direct' | 'doordash' | 'sherpa' | 'zoom2u' | 'gopeople' | 'none'
  provider_cost       NUMERIC(10,2),   -- what ZentraBite actually pays the provider
  customer_fee        NUMERIC(10,2),   -- what the customer is charged
  service_fee         NUMERIC(10,2),   -- platform service fee charged to customer
  delivery_margin     NUMERIC(10,2),   -- customer_fee + service_fee - provider_cost
  selection_reason    TEXT,            -- human-readable rationale

  -- ETA metadata
  estimated_pickup_eta_min  INTEGER,
  estimated_delivery_eta_min INTEGER,

  -- Provider response ID for tracking
  provider_job_id     TEXT,

  -- Status lifecycle
  status              TEXT NOT NULL DEFAULT 'pending',  -- 'pending' | 'dispatched' | 'picked_up' | 'delivered' | 'failed' | 'cancelled'
  dispatched_at       TIMESTAMPTZ,
  picked_up_at        TIMESTAMPTZ,
  delivered_at        TIMESTAMPTZ,
  failed_at           TIMESTAMPTZ,
  failure_reason      TEXT,

  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_delivery_jobs_business ON delivery_jobs(business_id);
CREATE INDEX idx_delivery_jobs_order    ON delivery_jobs(order_id);
CREATE INDEX idx_delivery_jobs_created  ON delivery_jobs(business_id, created_at DESC);
CREATE INDEX idx_delivery_jobs_status   ON delivery_jobs(business_id, status);

-- ─── delivery_quotes ──────────────────────────────────────────────────────────
-- All provider quotes fetched for a single routing request.
-- One delivery_job → many delivery_quotes (one per provider queried).
-- Allows full transparency into why a provider was chosen.

CREATE TABLE IF NOT EXISTS delivery_quotes (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id          UUID NOT NULL REFERENCES delivery_jobs(id) ON DELETE CASCADE,
  business_id     UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,

  provider        TEXT NOT NULL,        -- 'uber_direct' | 'doordash' | 'sherpa' | 'zoom2u' | 'gopeople'
  cost            NUMERIC(10,2),        -- provider's quoted fee in AUD
  pickup_eta_min  INTEGER,              -- minutes until driver arrives at pickup
  delivery_eta_min INTEGER,             -- total minutes until customer receives order
  available       BOOLEAN DEFAULT true, -- false = no drivers / service unavailable
  error_message   TEXT,                 -- if the API call failed

  raw_response    JSONB,                -- full API response for debugging
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_delivery_quotes_job      ON delivery_quotes(job_id);
CREATE INDEX idx_delivery_quotes_business ON delivery_quotes(business_id);

-- ─── RLS policies ─────────────────────────────────────────────────────────────

ALTER TABLE delivery_jobs   ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_quotes ENABLE ROW LEVEL SECURITY;

-- Merchants see their own delivery jobs
CREATE POLICY "delivery_jobs_tenant_select" ON delivery_jobs
  FOR SELECT USING (
    business_id IN (
      SELECT business_id FROM business_members WHERE user_id = auth.uid()
      UNION
      SELECT id FROM businesses WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "delivery_jobs_tenant_insert" ON delivery_jobs
  FOR INSERT WITH CHECK (
    business_id IN (
      SELECT business_id FROM business_members WHERE user_id = auth.uid()
      UNION
      SELECT id FROM businesses WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "delivery_jobs_tenant_update" ON delivery_jobs
  FOR UPDATE USING (
    business_id IN (
      SELECT business_id FROM business_members WHERE user_id = auth.uid()
      UNION
      SELECT id FROM businesses WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "delivery_quotes_tenant_select" ON delivery_quotes
  FOR SELECT USING (
    business_id IN (
      SELECT business_id FROM business_members WHERE user_id = auth.uid()
      UNION
      SELECT id FROM businesses WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "delivery_quotes_tenant_insert" ON delivery_quotes
  FOR INSERT WITH CHECK (
    business_id IN (
      SELECT business_id FROM business_members WHERE user_id = auth.uid()
      UNION
      SELECT id FROM businesses WHERE owner_id = auth.uid()
    )
  );

-- Service role can do everything (edge functions, server routes)
CREATE POLICY "delivery_jobs_service_role" ON delivery_jobs
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "delivery_quotes_service_role" ON delivery_quotes
  FOR ALL USING (auth.role() = 'service_role');

-- ─── Updated trigger for updated_at ──────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER delivery_jobs_updated_at
  BEFORE UPDATE ON delivery_jobs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ─── Note on businesses.delivery_settings schema ─────────────────────────────
-- The delivery_settings JSONB column added in 011 now stores the following
-- additional fields for the multi-provider routing engine:
--
-- {
--   -- Uber Direct (existing)
--   uber_direct_api_key:       string,
--   uber_direct_customer_id:   string,
--
--   -- DoorDash Drive (NEW)
--   doordash_developer_id:     string,
--   doordash_key_id:           string,
--   doordash_signing_secret:   string,
--
--   -- Sherpa (NEW)
--   sherpa_api_key:            string,
--
--   -- Zoom2u (NEW)
--   zoom2u_api_key:            string,
--
--   -- GoPeople (NEW)
--   gopeople_api_key:          string,
--
--   -- Routing settings (NEW)
--   business_address:          string,   -- full address for pickup
--   max_eta_minutes:           number,   -- default 60
--   eta_diff_threshold_min:    number,   -- default 7 (spec: 7-min ETA diff rule)
--
--   -- Pricing (NEW)
--   service_fee:               number,   -- default 3.99
--   priority_surcharge:        number,   -- default 3.50
--   peak_surcharge:            number,   -- default 2.00
--   bad_weather_surcharge:     number,   -- default 3.00
--   min_order_threshold:       number,   -- default 25
--   high_value_discount:       number,   -- default 2.00 (for orders over $40)
--
--   -- Existing Tasker/other fields
--   tasker_rate_per_hour:      number,
--   tasker_capacity_per_day:   number,
--   other_provider_name:       string,
--   other_provider_rate_per_order: number,
-- }
