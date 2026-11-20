# ZentraBite product status

_Last updated: 12 November 2026. This replaces the April 2026 version, which is in the git history._

This is the short status for anyone reading the code. The team keeps the full dated list, with every pull request, outside the repo.

## What ZentraBite is

A website and CRM for local businesses. Their own site takes the orders, and their customer list brings people back. Food businesses that rely on delivery apps are the first and clearest example. It's also meant for shops, salons, gyms and trades.

Sign-ups aren't open yet, and no price has been set.

## Live now

- **Marketing site** at zentrabite.com (`apps/web`). The homepage and the 18 feature pages were redone in November 2026. The how it works, pricing and contact pages are still in the older style.
- **Demos** under zentrabite.com/demo. The CRM, the POS, the demo restaurant's own site, its customer app and super admin. All sample data.
- **Merchant CRM** at dashboard.zentrabite.com (`apps/dashboard`). Dashboard, AI Copilot, Orders, Fulfillment, POS, Menu, Stock, AI Calls, Delivery, Drivers, Reviews, Customers, Rewards, Win-Back, Automations, Analytics, Financials, Rostering and Settings, plus a super admin panel. It works on phones.
- **A site for each business** at `name.zentrabite.com`, with ordering at `/order`. The older ordering page at `/store/[subdomain]` still works.
- **Staff onboarding wizard.** It can read a business's existing website and pre-fill the name, hours, menu, logo, colours and photos.
- **Login, signup and password reset.**
- **Payments in Stripe test mode.** Customer payments go to the business's own Stripe Connect account. Stripe's webhook saves the order, the customer and their points.
- **Database.** Supabase, 27 tables, row level security on every table, migrations 001 to 017.
- **Scheduled jobs.** Nightly analytics, birthday points and win-back run in Supabase. Automations and trial reminders run on Vercel cron.

## Built, but not finished

- **Texts.** The code sends win-back and order texts with an opt-out, but no real text has been sent yet. It needs a paid Twilio number.
- **Email.** The code sends invites and marketing emails with an unsubscribe link, but the sending domain isn't verified yet.
- **Delivery.** It quotes and recommends a courier but doesn't book one.
- **AI calls.** The page is there. It needs a voice provider.
- **Xero.** A sales export file, not a live sync.
- **Pay with points.** Shown at checkout, not yet deducted on the server.
- **Super admin suspend and delete.** Placeholders.

## Not built yet

- A Website page in the CRM so owners can edit their own site.
- An installable app version of each business's site.
- Connecting a domain a business already owns.
- Bookings, quotes and jobs for businesses that don't take orders.

## Before the first paying business

1. Run a real order end to end, from the ordering page to the order board, the customer record and the points.
2. Create a second test business and confirm neither can see the other's data.
3. Send a real test text and a real test email.
4. Switch Stripe from test mode to live, and set the price.
5. Publish the terms and privacy pages once a solicitor has checked them.
6. Move the database to a paid plan with backups.

## Leftovers in the repo

- `apps/storefront` isn't deployed. The live ordering pages are in `apps/dashboard`.
- `zentrabite/` at the top level and `apps/zentrabite-dashboard-files/` are old April 2026 builds.
- `apps/dashboard/supabase/migrations/007_stock.sql` is a stray copy. The real migrations are in `supabase/migrations`.
- `docs/reference/archive/` holds old design experiments.
