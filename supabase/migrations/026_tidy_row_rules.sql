-- ─── 026 Tidy the row rules so the repo matches the live database ──────────
-- Found on 23 Nov 2026 while writing tests that prove one shop can't see
-- another's data (apps/dashboard/tests/tenant-isolation.test.ts). The live
-- database had row rules that no migration made, left over from April, and
-- one rule that was too open. None of them let one shop read another's
-- data. This makes live and the migrations the same, so the tests check
-- what's really running.
--
-- 1. Anyone could add a notification to any shop. "service_role_insert_
--    notifications" allowed an insert with no check, to everyone, including
--    logged-out browsers holding the public key. The server writes
--    notifications with the service role, which skips row rules, so no
--    insert rule is needed at all.
--
-- 2. April's catch-all rules ("Owners can manage their ...",
--    "business_isolation", "...: business access") duplicated the reviewed
--    rules, and also let a logged-in browser delete its own shop's orders,
--    customers and text log. Nothing in the CRM deletes those from the
--    browser. Dropped. The reviewed rules from 002, 004 and 015 stay.
--
-- 3. "menu_items_public_select" and "menu_categories_public_select" let a
--    logged-out browser list every shop's menu at once, straight from the
--    database. The ordering pages and websites read a shop's menu on the
--    server, by its address, so these aren't needed. Dropped.
--
-- 4. A login with no shop yet (a seller, or a brand-new signup) needs to
--    read its own users row. Live had that rule ("Users can read own
--    record") but no migration did. It's added here as users_select_own.
--    "Users can update own record" was a copy of users_update. Dropped.
--
-- Changes only rules, not data. Safe to run more than once.

-- 1. Notifications
drop policy if exists "service_role_insert_notifications" on public.notifications;

-- 2. April catch-alls
drop policy if exists "Owners can manage their business"         on public.businesses;
drop policy if exists "Owners can manage their analytics"        on public.analytics_daily;
drop policy if exists "business_isolation"                       on public.analytics_daily;
drop policy if exists "Owners can manage their campaigns"        on public.campaigns;
drop policy if exists "business_isolation"                       on public.campaigns;
drop policy if exists "Owners can manage their customers"        on public.customers;
drop policy if exists "business_isolation"                       on public.customers;
drop policy if exists "Owners can manage their menu categories"  on public.menu_categories;
drop policy if exists "business_isolation"                       on public.menu_categories;
drop policy if exists "menu_categories: business access"         on public.menu_categories;
drop policy if exists "Owners can manage their menu"             on public.menu_items;
drop policy if exists "business_isolation"                       on public.menu_items;
drop policy if exists "menu_items: business access"              on public.menu_items;
drop policy if exists "Owners can manage their orders"           on public.orders;
drop policy if exists "business_isolation"                       on public.orders;
drop policy if exists "Owners can manage their sms_logs"         on public.sms_logs;
drop policy if exists "business_isolation"                       on public.sms_logs;

-- 3. Logged-out menu reads
drop policy if exists "menu_items_public_select"      on public.menu_items;
drop policy if exists "menu_categories_public_select" on public.menu_categories;

-- 4. A login reads its own row
drop policy if exists "Users can read own record"   on public.users;
drop policy if exists "Users can update own record" on public.users;
drop policy if exists "users_select_own"            on public.users;
create policy "users_select_own" on public.users
  for select using (id = auth.uid());
