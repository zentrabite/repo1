-- ═══════════════════════════════════════════════════════════════════════════
-- ZentraBite — Remove plan-tier column
-- Plan tiers (Starter/Growth/Scale/Pro) have been replaced by per-module
-- pricing (businesses.settings.modules). The plan column is no longer used.
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TABLE businesses DROP COLUMN IF EXISTS plan;
