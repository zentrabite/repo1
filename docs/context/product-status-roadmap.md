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
- **Database.** Supabase, 31 tables, row level security on every table, migrations 001 to 039. Since 23 Nov the live row rules and grants match the migrations exactly (026 removed April rules no migration made), and tests prove one shop can't read, change, delete or add another shop's rows, and a logged-out browser can't read or add anything.
- **Scheduled jobs.** Nightly analytics and birthday points run in Supabase. Win-back, automations and trial reminders run on Vercel cron (`/api/automations/run`, daily).
- **Win-back offers that work.** Each win-back text or email carries its own one-use code in its link. Checkout takes it off on the shop's Stripe account, and the order counts towards the rule's redemptions and revenue recovered.
- **Counting with PostHog, ready but off.** Page views and the two actions on the marketing site, each step of the onboarding wizard with shops created and published, and the ordering page's views, adds, checkouts and paid orders (counted on the server). No PostHog script, no cookies, no replays, no names or contact details, and nothing from the address but utm tags. Switched on part by part with environment settings once ZentraBite's PostHog key is in Vercel, and for customer pages once the privacy policy names PostHog. See the deploy runbook.
- **Three kinds of message.** Every text and email is must reach (receipts, order alerts, login and invite links, the Stripe setup link, an owner's text about an order), account (trial reminders, monthly reports, enquiry alerts) or marketing (win-back, an owner's offer). An opt-out stops marketing only. Marketing is checked for consent right before each send, ends texts with Reply STOP, and emails from its own address under the shop's name. Receipts carry nothing that sells and replies reach the shop. On the Customers page the owner picks "Their order" or "An offer or news", and an order text that reads like an offer is refused. `sms_logs.kind` records which (migration 027).
- **Stop rules on sends.** Every shop shares one Twilio and one Resend account, so a shop's marketing texts or emails pause on their own when, over the last 30 days, more than 2% didn't arrive, more than 0.1% of emails were marked as spam, or more than 1% of texts got a STOP reply (with a few cases at least). Twilio and Resend report each send back (`/api/sms/status`, `/api/email/events`, both signed), and a STOP counts against the shop that last sent that number an offer. The owner sees why on the Win-Back and Automations pages. A super admin resumes it at `/admin/sending`. Order messages are never paused. Resend's reports wait on its domain and `RESEND_WEBHOOK_SECRET`. Migration 028.
- **Text cost and quiet hours.** Curly quotes, long dashes and the like are made plain before any text goes, so they never double its cost. The win-back editor shows the text as a customer gets it, with how many characters and texts it takes, and names any emoji that make it a costlier unicode text. The Customers and Automations text boxes count the same way. The default win-back text now fits one text (it took two). No marketing text goes between 8pm and 9am in the shop's time zone, and the daily run moved to 07:00 UTC (5:30pm Adelaide in summer) so it lands inside those hours across Australia.
- **Kill switches and connection lights.** Super Admin, Sending has a light for each outside service (database, Stripe, Twilio, Resend, Anthropic, PostHog, the daily jobs and any pauses), saying whether it works, is limited, is down or isn't set up, without showing any key. Three kill switches stop marketing texts, every text (order texts too), or marketing emails for every shop, each with a second tap to confirm. The team is emailed at `ALERT_EMAIL` when a stop rule pauses a shop, a switch changes, or the daily run finds a connection down. Migration 029.
- **Birthdays without a year.** A customer's birthday is stored as a day and a month only (`birth_month`, `birth_day`, migration 033), as the draft privacy policy says, and the birthday points job gives them on the shop's own day. Nothing asks customers for a birthday yet.
- **Counter sale refunds.** A refund given on the card machine or in cash is recorded on the sale with Record refund (owners and managers), so the sale, the customer's spend and their points go down to match.
- **Refunds reach the reports.** Analytics, Financials and the dashboard chart show what the shop kept after refunds, on the shop's own days. The nightly job works out the last 90 days again each night, so a later refund reaches its day, and counter sales are no longer counted as delivery app orders. The Xero export adds a credit note for each refund and uses the "GST on Income" tax rate name. Before migration 032 the live table had no one-row-a-day key, so every nightly save failed and Analytics' order counts and Financials were always empty.
- **Spending points.** Staff swap a customer's points for a reward from the customer's page, and owners and managers can undo a swap. The Rewards page shows only the points rules that actually happen (10 a dollar, taken back on a refund). Customers can't spend points online yet (migration 031).
- **Team logins.** Owners and managers invite people as Manager, Staff or POS, change their role and remove them in Settings → Team. A member sees the shop once they open their invite, and only the pages their role is given. Removing someone ends their access straight away (migration 030).
- **Deleting a customer's details when they ask.** On a customer's page, an owner or manager removes their name, contact details, birthday, points, delivery addresses, order notes, what texts and emails to them said, and their reviews. The sales stay for tax, under "Deleted customer" (migration 037).
- **The subscription card tells the truth.** Settings showed "Subscription active" for a cancelled or unpaid subscription. It now says Free trial, Active, Payment due, Paused or Cancelled. Checkout won't start a second subscription, and the free trial is only for a shop's first one.
- **What win-back earned.** About 1 in 10 customers due a win-back message is held back, so a monthly report on the Win-Back page compares the two groups, with codes used and where online orders came from. It's emailed to each owner on the 15th once email works.
- **Where each order came from.** Counter QR code, win-back, Google, the shop's website, social media or straight to the ordering page, on every online order (`orders.came_from`).

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

- The old `apps/storefront` app was deleted on 23 Nov 2026. It was never deployed and took prices from the browser. Each shop's site and ordering pages are in `apps/dashboard`.
- The April 2026 leftovers went on 23 Nov 2026. The top-level `zentrabite/` app, a copy of the prototype inside `apps/dashboard` and a stray `007_stock.sql` were deleted, and the CRM prototype moved to `docs/reference/archive/april-crm-prototype/`.
- `docs/reference/archive/` holds old design experiments.
