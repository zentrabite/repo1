-- ═══════════════════════════════════════════════════════════════════════════
-- ZentraBite — Make yourself super admin
-- Run this AFTER you've signed up via http://localhost:3000/signup
--
-- Replace 'your@email.com' with the email you signed up with.
-- ═══════════════════════════════════════════════════════════════════════════

UPDATE users
SET is_super_admin = true
WHERE email = 'your@email.com';

-- Verify it worked:
-- SELECT id, email, is_super_admin FROM users;
