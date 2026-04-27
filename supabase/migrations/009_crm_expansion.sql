-- ═══════════════════════════════════════════════════════════════════════════
-- ZentraBite — CRM expansion
-- Adds tables required to make the following pages fully functional:
--   • BiteBack / Win-Back        → winback_rules
--   • AI Calls                   → ai_call_profiles
--   • Rostering                  → roster_shifts
--   • Dashboard AI copilot       → ai_recommendations
--   • Campaign attribution       → campaign_events
--
-- Automation rules intentionally NOT added here — /automations already runs on
-- the existing `campaigns` table and `/api/automations/run`. Folding in a new
-- generic engine is a separate piece of work; see CRM_BREAKDOWN.md.
-- Run once in Supabase SQL editor.
-- ═══════════════════════════════════════════════════════════════════════════

-- ─── WINBACK RULES ──────────────────────────────────────────────────────────
-- Each row defines an automated win-back trigger (e.g. "SMS after 14 days idle").
CREATE TABLE IF NOT EXISTS winback_rules (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id     UUID REFERENCES businesses(id) ON DELETE CASCADE NOT NULL,
  name            TEXT NOT NULL,
  inactive_days   INT NOT NULL DEFAULT 14,
  offer_type      TEXT NOT NULL DEFAULT 'percent',  -- percent | dollar | free_delivery | free_item
  offer_value     NUMERIC(10,2) DEFAULT 0,
  channel         TEXT NOT NULL DEFAULT 'sms',      -- sms | email | push
  template        TEXT NOT NULL,
  cooldown_days   INT DEFAULT 30,
  is_active       BOOLEAN DEFAULT true,
  redemptions     INT DEFAULT 0,
  revenue         NUMERIC(12,2) DEFAULT 0,
  created_at      TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_winback_business ON winback_rules(business_id);

-- ─── AI CALL PROFILES ───────────────────────────────────────────────────────
-- One profile per business — controls how the AI phone agent answers.
CREATE TABLE IF NOT EXISTS ai_call_profiles (
  id                UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id       UUID REFERENCES businesses(id) ON DELETE CASCADE UNIQUE NOT NULL,
  enabled           BOOLEAN DEFAULT false,
  answer_mode       TEXT DEFAULT 'after_hours',  -- after_hours | always | overflow
  voice             TEXT DEFAULT 'female_au',
  personality       TEXT DEFAULT 'friendly, concise, South-Australian',
  greeting          TEXT DEFAULT 'Hi, you''ve reached {business_name}, how can I help?',
  faq_context       TEXT,
  escalation_phone  TEXT,
  take_orders       BOOLEAN DEFAULT true,
  take_bookings     BOOLEAN DEFAULT true,
  send_followup_sms BOOLEAN DEFAULT true,
  created_at        TIMESTAMPTZ DEFAULT now(),
  updated_at        TIMESTAMPTZ DEFAULT now()
);

-- ─── ROSTER SHIFTS ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS roster_shifts (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id   UUID REFERENCES businesses(id) ON DELETE CASCADE NOT NULL,
  employee_id   UUID REFERENCES users(id) ON DELETE SET NULL,
  employee_name TEXT NOT NULL,     -- denormalised so deleted staff still appear in history
  role          TEXT,              -- kitchen | front | driver | manager
  shift_start   TIMESTAMPTZ NOT NULL,
  shift_end     TIMESTAMPTZ NOT NULL,
  hourly_rate   NUMERIC(8,2),
  status        TEXT DEFAULT 'scheduled',  -- scheduled | confirmed | completed | missed
  notes         TEXT,
  created_at    TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_roster_business_date ON roster_shifts(business_id, shift_start);

-- ─── AI RECOMMENDATIONS ─────────────────────────────────────────────────────
-- The copilot writes rows here; the dashboard reads them.
CREATE TABLE IF NOT EXISTS ai_recommendations (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id   UUID REFERENCES businesses(id) ON DELETE CASCADE NOT NULL,
  kind          TEXT NOT NULL,       -- stock | retention | staffing | menu | delivery | finance
  priority      TEXT DEFAULT 'normal',  -- urgent | high | normal | low
  title         TEXT NOT NULL,
  body          TEXT NOT NULL,
  action_label  TEXT,
  action_url    TEXT,
  status        TEXT DEFAULT 'open',    -- open | dismissed | actioned
  created_at    TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ai_recs_business ON ai_recommendations(business_id, status, created_at DESC);

-- ─── CAMPAIGN EVENTS (attribution) ──────────────────────────────────────────
-- Links SMS sends → orders so we can show "$X recovered from win-back".
CREATE TABLE IF NOT EXISTS campaign_events (
  id                    UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id           UUID REFERENCES businesses(id) ON DELETE CASCADE NOT NULL,
  campaign_id           UUID REFERENCES campaigns(id) ON DELETE SET NULL,
  winback_rule_id       UUID REFERENCES winback_rules(id) ON DELETE SET NULL,
  customer_id           UUID REFERENCES customers(id) ON DELETE SET NULL,
  order_id              UUID REFERENCES orders(id) ON DELETE SET NULL,
  event_type            TEXT NOT NULL,   -- sent | delivered | clicked | redeemed
  revenue_attributed    NUMERIC(10,2) DEFAULT 0,
  coupon_code           TEXT,
  created_at            TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_campaign_events_business ON campaign_events(business_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_campaign_events_campaign ON campaign_events(campaign_id);

-- ─── CHANNEL COLUMN ON ORDERS ───────────────────────────────────────────────
-- Required for the "revenue by channel" widget. Existing orders keep 'direct'.
ALTER TABLE orders ADD COLUMN IF NOT EXISTS channel TEXT DEFAULT 'direct';
UPDATE orders SET channel = COALESCE(source, 'direct') WHERE channel IS NULL;

-- ─── RLS ────────────────────────────────────────────────────────────────────
ALTER TABLE winback_rules       ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_call_profiles    ENABLE ROW LEVEL SECURITY;
ALTER TABLE roster_shifts       ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_recommendations  ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_events     ENABLE ROW LEVEL SECURITY;

-- Policies follow the same pattern used in 002_rls_policies.sql:
-- a merchant can only see rows where business_id = their business.
DO $$
DECLARE tbl TEXT;
BEGIN
  FOR tbl IN SELECT unnest(ARRAY[
    'winback_rules','ai_call_profiles','roster_shifts',
    'ai_recommendations','campaign_events'
  ])
  LOOP
    EXECUTE format($f$
      DROP POLICY IF EXISTS "members_read_%1$s" ON %1$I;
      CREATE POLICY "members_read_%1$s" ON %1$I FOR SELECT
        USING (business_id IN (
          SELECT business_id FROM users WHERE id = auth.uid()
        ));

      DROP POLICY IF EXISTS "members_write_%1$s" ON %1$I;
      CREATE POLICY "members_write_%1$s" ON %1$I FOR ALL
        USING (business_id IN (
          SELECT business_id FROM users WHERE id = auth.uid()
        ))
        WITH CHECK (business_id IN (
          SELECT business_id FROM users WHERE id = auth.uid()
        ));
    $f$, tbl);
  END LOOP;
END $$;

-- ─── Done ───────────────────────────────────────────────────────────────────
-- After running: refresh types in dashboard (lib/database.types.ts).
