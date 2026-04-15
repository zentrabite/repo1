-- ═══════════════════════════════════════════════════════════════════════════
-- ZentraBite — Row Level Security Policies
-- Run AFTER 001_initial_schema.sql
--
-- RLS ensures one merchant can NEVER see another merchant's data,
-- even if there's a bug in the application code.
-- ═══════════════════════════════════════════════════════════════════════════

-- ─── Enable RLS on all tables ────────────────────────────────────────────────
ALTER TABLE businesses      ENABLE ROW LEVEL SECURITY;
ALTER TABLE users           ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers       ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders          ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns       ENABLE ROW LEVEL SECURITY;
ALTER TABLE sms_logs        ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_items      ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_daily ENABLE ROW LEVEL SECURITY;

-- ─── Helper function: get the current user's business_id ─────────────────────
-- Called in every RLS policy to filter rows to the logged-in merchant's data
CREATE OR REPLACE FUNCTION get_my_business_id()
RETURNS UUID AS $$
  SELECT business_id FROM users WHERE id = auth.uid()
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- ─── Helper function: check if current user is super admin ───────────────────
CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS BOOLEAN AS $$
  SELECT COALESCE(is_super_admin, false) FROM users WHERE id = auth.uid()
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- ─── BUSINESSES ──────────────────────────────────────────────────────────────
-- Merchant sees only their own business. Super admin sees all.
CREATE POLICY "businesses_select" ON businesses FOR SELECT
  USING (
    is_super_admin() OR id = get_my_business_id()
  );

CREATE POLICY "businesses_update" ON businesses FOR UPDATE
  USING (id = get_my_business_id());

-- ─── USERS ───────────────────────────────────────────────────────────────────
CREATE POLICY "users_select" ON users FOR SELECT
  USING (
    is_super_admin() OR business_id = get_my_business_id()
  );

CREATE POLICY "users_update" ON users FOR UPDATE
  USING (id = auth.uid());

-- ─── CUSTOMERS ───────────────────────────────────────────────────────────────
CREATE POLICY "customers_select" ON customers FOR SELECT
  USING (
    is_super_admin() OR business_id = get_my_business_id()
  );

CREATE POLICY "customers_insert" ON customers FOR INSERT
  WITH CHECK (business_id = get_my_business_id());

CREATE POLICY "customers_update" ON customers FOR UPDATE
  USING (business_id = get_my_business_id());

-- ─── ORDERS ──────────────────────────────────────────────────────────────────
CREATE POLICY "orders_select" ON orders FOR SELECT
  USING (
    is_super_admin() OR business_id = get_my_business_id()
  );

CREATE POLICY "orders_insert" ON orders FOR INSERT
  WITH CHECK (business_id = get_my_business_id());

CREATE POLICY "orders_update" ON orders FOR UPDATE
  USING (business_id = get_my_business_id());

-- ─── CAMPAIGNS ───────────────────────────────────────────────────────────────
CREATE POLICY "campaigns_all" ON campaigns FOR ALL
  USING (
    is_super_admin() OR business_id = get_my_business_id()
  );

-- ─── SMS LOGS ─────────────────────────────────────────────────────────────────
CREATE POLICY "sms_logs_select" ON sms_logs FOR SELECT
  USING (
    is_super_admin() OR business_id = get_my_business_id()
  );

CREATE POLICY "sms_logs_insert" ON sms_logs FOR INSERT
  WITH CHECK (business_id = get_my_business_id());

-- ─── MENU ────────────────────────────────────────────────────────────────────
CREATE POLICY "menu_categories_all" ON menu_categories FOR ALL
  USING (
    is_super_admin() OR business_id = get_my_business_id()
  );

CREATE POLICY "menu_items_all" ON menu_items FOR ALL
  USING (
    is_super_admin() OR business_id = get_my_business_id()
  );

-- ─── ANALYTICS ───────────────────────────────────────────────────────────────
CREATE POLICY "analytics_select" ON analytics_daily FOR SELECT
  USING (
    is_super_admin() OR business_id = get_my_business_id()
  );

-- ─── Service role bypass ─────────────────────────────────────────────────────
-- The service role key (used in API routes / webhooks) bypasses RLS entirely.
-- This is correct — Stripe webhooks need to write data without a user session.
