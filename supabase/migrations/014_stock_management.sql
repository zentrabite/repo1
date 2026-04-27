-- migration 014 — stock management tables
-- stock_items: per-business ingredient/product inventory tracking
-- stock_counts: audit trail of every manual stock take

CREATE TABLE IF NOT EXISTS stock_items (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id       UUID        NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  name              TEXT        NOT NULL,
  sku               TEXT,
  unit              TEXT        NOT NULL DEFAULT 'each',
  supplier          TEXT,
  cost              NUMERIC(10,2) DEFAULT 0,
  on_hand           NUMERIC(10,2) DEFAULT 0,
  par_level         NUMERIC(10,2) DEFAULT 0,
  reorder_to        NUMERIC(10,2) DEFAULT 0,
  lead_time_days    INT         DEFAULT 2,
  auto_reorder      BOOLEAN     DEFAULT false,
  expiry_date       DATE,
  last_counted_at   TIMESTAMPTZ,
  last_delivered_at TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_stock_items_business ON stock_items (business_id, name);
CREATE UNIQUE INDEX IF NOT EXISTS idx_stock_items_sku ON stock_items (business_id, sku) WHERE sku IS NOT NULL;

CREATE TABLE IF NOT EXISTS stock_counts (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id   UUID        NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  stock_item_id UUID        NOT NULL REFERENCES stock_items(id) ON DELETE CASCADE,
  before_qty    NUMERIC(10,2) NOT NULL,
  after_qty     NUMERIC(10,2) NOT NULL,
  note          TEXT,
  counted_by    TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_stock_counts_item    ON stock_counts (stock_item_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_stock_counts_business ON stock_counts (business_id, created_at DESC);

-- RLS
ALTER TABLE stock_items  ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_counts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "stock_items_tenant_select" ON stock_items
  FOR SELECT USING (business_id = (
    SELECT business_id FROM users WHERE id = auth.uid() LIMIT 1
  ));
CREATE POLICY "stock_items_tenant_all" ON stock_items
  FOR ALL USING (business_id = (
    SELECT business_id FROM users WHERE id = auth.uid() LIMIT 1
  ));
CREATE POLICY "stock_counts_tenant_select" ON stock_counts
  FOR SELECT USING (business_id = (
    SELECT business_id FROM users WHERE id = auth.uid() LIMIT 1
  ));
CREATE POLICY "stock_counts_tenant_all" ON stock_counts
  FOR ALL USING (business_id = (
    SELECT business_id FROM users WHERE id = auth.uid() LIMIT 1
  ));
