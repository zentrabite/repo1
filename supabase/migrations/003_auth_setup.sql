-- ═══════════════════════════════════════════════════════════════════════════
-- ZentraBite — Auth Setup
-- Run AFTER 002_rls_policies.sql
-- ═══════════════════════════════════════════════════════════════════════════

-- ─── Auto-create user record on signup ───────────────────────────────────────
-- When a merchant signs up via Supabase Auth, automatically create a row
-- in the public.users table linked to their auth account.

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, role)
  VALUES (
    NEW.id,
    NEW.email,
    'owner'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fire the function every time a new auth user is created
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ─── Create your super admin account ─────────────────────────────────────────
-- After you've signed up via the app, run this to give yourself super admin:
--
--   UPDATE users
--   SET is_super_admin = true
--   WHERE email = 'your@email.com';
--
-- Super admin can see all businesses in the platform admin view.

-- ─── Default campaigns for new businesses ────────────────────────────────────
-- When a new business is created, insert the default campaign templates.

CREATE OR REPLACE FUNCTION create_default_campaigns(p_business_id UUID)
RETURNS VOID AS $$
BEGIN
  INSERT INTO campaigns (business_id, type, name, template, active, discount_amount, trigger_days, cooldown_days)
  VALUES
    (p_business_id, 'win_back',    'Win-Back',         'Hey {name}, we miss you at {shop}! Here''s $10 off your next order: {link}', false, 10, 14, 30),
    (p_business_id, 'birthday',    'Birthday Offer',   'Happy birthday {name}! Treat yourself to 15% off today: {link}',              false, 15, 3,  365),
    (p_business_id, 'welcome',     'Welcome',          'Welcome to {shop}, {name}! Here''s 10% off your next order: {link}',          false, 10, 0,  0),
    (p_business_id, 'loyalty',     'Loyalty Milestone','You''ve unlocked Silver tier at {shop}! Enjoy $15 off: {link}',               false, 15, 0,  0),
    (p_business_id, 're_engage',   'Re-engagement',    'It''s been a while {name}. We''d love to see you again: $15 on us: {link}',   false, 15, 30, 60),
    (p_business_id, 'review',      'Review Request',   'How was your order from {shop}? Leave us a review: {link}',                   false, 0,  0,  30)
  ON CONFLICT DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
