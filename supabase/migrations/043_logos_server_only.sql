-- ═══════════════════════════════════════════════════════════════════════════
-- 043. Browsers can't write to storage (25 Nov 2026)
--
-- Settings used to upload a shop's logo straight from the browser into the
-- business-logos bucket, under <shop id>/logo.<ext>. The rules from 011 and
-- 015 let any login at the shop write there, so a POS or Staff login could
-- replace the logo on the shop's public website, even though only owners
-- and managers can change the shop's details. Nothing checked the file was
-- really an image. And "Public logo read" let anyone list every shop's
-- folder, which isn't needed to show a logo in a public bucket.
--
-- Logos are now saved by the server (lib/logo.ts, /api/logo for owners and
-- managers), in the menu-images bucket under logos/<shop id>/, the same as
-- the setup wizard has always done. So these three rules go, and no browser
-- can write to, change or list any bucket. Menu photos were already server
-- only (menu-images has no rules).
--
-- Run after the code that stops Settings uploading from the browser is live.
-- Safe to run twice. Drops three storage rules. Changes no rows. The
-- business-logos bucket was empty when this was written, and stays as it is.
-- ═══════════════════════════════════════════════════════════════════════════

drop policy if exists "Business logo write"  on storage.objects;
drop policy if exists "Business logo update" on storage.objects;
drop policy if exists "Public logo read"     on storage.objects;
