# ZentraBite CRM — page-by-page breakdown

> **Note, 12 November 2026.** This file was written in April 2026. What each page does still holds. The "what you still need to do" notes and the one-time setup steps are out of date, because most of that work has been done since. For what's live now, see [product-status-roadmap.md](./product-status-roadmap.md). The win-back page moved from `/biteback` to `/zentra-rewards`.

This is a plain-English map of every page: what it does, how it works behind the scenes, and what you still need to do to finalise it. It reflects the state of the code after the CRM expansion pass (migration 009 + new endpoints + fixes).

Everything talks to Supabase through the browser client (`lib/supabase.ts`) with RLS on, so each merchant only ever sees their own `business_id` rows. Server-only endpoints use a service-role client via `lib/supabase-server.ts`.

---

## Before you start — one-time setup

1. **Run migration 009.** `supabase/migrations/009_crm_expansion.sql` creates `winback_rules`, `ai_call_profiles`, `roster_shifts`, `ai_recommendations`, `campaign_events`, adds a `channel` column to `orders`, and applies per-business RLS policies. Apply it in the Supabase SQL editor or via `supabase db push`.
2. **Env vars.** The app relies on:
   - Supabase: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
   - Stripe: `STRIPE_SECRET_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET`
   - Twilio (powers SMS + AI calls): `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER`
   - AI voice (optional, falls back to a plain TwiML `<Say>` otherwise): `AI_VOICE_WEBHOOK_URL`
   - App URL for webhooks: `NEXT_PUBLIC_APP_URL`
3. **Mark yourself super-admin.** `UPDATE users SET is_super_admin = true WHERE email = 'you@zentrabite.com';` — gives you access to `/admin`.

---

## 1. Dashboard — `/dashboard`

**What it does.** The morning-coffee page. Today's orders and revenue, live kanban (Ordered → Being made → Ready → Out for delivery), recovered revenue from win-backs, repeat rate, 14-day revenue chart, revenue by channel, top customer, top 3 active win-back rules, recent orders, customer segments, and an AI copilot panel.

**How it works.** `getDashboardStats()` fans out a single `Promise.all` of five Supabase queries. Kanban reads `orders` filtered by `status`. Revenue chart pulls from `analytics_daily`. Win-back list reads `getTopWinbacks` from `winback_rules`. Copilot reads from `ai_recommendations` with a dismiss action.

**To finalise.**
- Populate `analytics_daily` nightly (Supabase Scheduled Functions, or a cron that groups `orders` by day and upserts).
- Create one winback rule on `/zentra-rewards` to light up the "Top winbacks" card.
- Seed `ai_recommendations` from your AI job to light up the copilot.

---

## 2. Orders — `/orders`

**What it does.** Live order board. New orders arrive in realtime with a beep. Status filter, source filter, history.

**How it works.** Subscribes to `postgres_changes` on `orders`, filtered to `business_id`. `INSERT` pushes to the top; `UPDATE` replaces the matching row. Browser `Notification` fires if permission is granted.

**Pick-up times and pausing, since migration 019.** Online orders carry `pickup_at` (when the customer collects) and `pickup_asap` (they chose "as soon as possible"). The board has a Pick-up column, for example "ASAP 6:25pm" or "6:45pm". The "Pause online orders" button sets `settings.ordering.paused`. While paused the ordering page shows the menu but takes no orders, and checkout refuses them too.

**Notes and delivery by the shop's own drivers, since migration 020.** Orders carry `notes`, the customer's note for the kitchen or driver, or one typed on the POS. The board shows a Note tag and the full note in the order. A delivery order has `fulfillment_type = 'delivery'`, the address in `ship_to.address` and the fee in `delivery_fee`, and "When" is the delivery time.

**To finalise.**
- Enable realtime on the `orders` table (Supabase → Database → Replication).
- Make sure checkout/POS writes `business_id`, `status`, `source`, `total` correctly.

---

## 3. POS — `/pos`

**What it does.** Counter point-of-sale. Cashier picks items, captures customer phone, places an order.

**How it works.** Reads menu via `getMenu()`. On "Pay" it looks up or creates a customer (by phone match) and inserts the `orders` row with `source='pos'`. The database then updates the customer's stats (`total_orders + 1`, `total_spent + total`, `points_balance + total × 10`, `last_order_date`) through the `on_order_update_customer` trigger, the same as for online orders. The page doesn't update them itself. Until 20 Nov 2026 it did, so every POS sale with a customer counted twice.

**To finalise.**
- Menu has to exist (`/menu`) or the POS is empty.
- For Stripe Terminal tap-to-pay, hook the "card" payment method into the Terminal SDK in `placeOrder()`. Today it just records `source='pos'` without charging a card.

---

## 4. Menu — `/menu`

**What it does.** CRUD for categories, items, options, availability, and images.

**How it works.** `menu_categories` and `menu_items`, business-scoped, with an `is_available` toggle. Images upload to Supabase Storage via `/api/menu/upload-image`.

**Options (sizes, extras, choices), since migration 018.** Each item has an `options` list of groups. A group has a name, how many the customer must pick (`min`, 0 or 1), the most they can pick (`max`) and its choices. A choice has a name, a price added to the item's price, and a sold-out switch. The Add and Edit item boxes edit them. `lib/menu-options.ts` reads and prices them, and is shared by every page below so they all agree:
- The ordering page, the website's "+" and the POS open a picker for any item with options. Lines with the same picks share a cart line. The menu shows "From $X" when choices cost extra.
- Checkout gets only the ids of the choices picked and prices them from the database. A missing required choice, a sold-out one or one that isn't on the item is refused. Options go in the Stripe line name, for example "Margherita (Large, Olives)".
- The webhook saves each order line with its options and the price charged, so the order matches the payment even if the menu changes before the customer pays. Orders, the receipt email and the success page show the options.
- The onboarding import turns two or more sizes into a required Size option.

**To finalise.**
- Create the `menu-images` bucket in Supabase Storage and make it public.
- Add categories and items — the POS, storefront, and AI phone agent all read from here.

---

## 5. Stock — `/stock`

**What it does.** Par levels, on-hand counts, lead time, expiry dates, auto-reorder flag.

**How it works.** Reads `stock_items`. Lives in `lib/stock-queries.ts`. Status badge (OK / Low / Critical / Out) is a pure function of `on_hand` vs `par_level`.

**To finalise.**
- Seed a starter stock list (or have onboarding generate one from the business type).
- **Recipes are not wired up yet.** To unlock margin analytics on `/analytics`, each menu item needs a linked recipe (list of `stock_items` and quantity per sale). This is a small schema addition — a `recipe_items` table or a JSONB column on `menu_items`.
- Wire the reorder trigger — currently it's a toast. You could hook it to a supplier email template, or to an integration (Gordon Foodservice, Bidfood).

---

## 6. AI Calls — `/ai-calls`

**What it does.** Configure the AI phone agent: on/off, answer mode (after_hours / always / overflow), voice, personality, greeting with `{business_name}` preview, FAQ knowledge base, take_orders / take_bookings / send_followup_sms toggles, escalation phone.

**How it works.** One row per business in `ai_call_profiles` (unique on `business_id`). `upsertAiCallProfile` does the save with `onConflict: 'business_id'`.

**To finalise.**
- Connect Twilio (buy a number, webhook → your voice provider).
- Set `AI_VOICE_WEBHOOK_URL` to point at Vapi / Retell / your custom stack. If you don't, outbound calls will use a simple inline TwiML `<Say>` that reads the greeting and hangs up — useful for verifying the wiring before a full voice provider is in place.
- Fill in the FAQ text. More domain detail = fewer escalations.
- Set the escalation phone so the agent has somewhere to hand off.

---

## 7. Delivery — `/delivery`

**What it does.** Smart dispatch prediction. Looks at 8 weeks of order history per weekday, predicts tomorrow's volume, and recommends a provider mix (Uber Direct only, Tasker only, Tasker + Uber overflow, or none).

**How it works.** Page calls `/api/delivery/predict` with `business_id` and `date`. The endpoint runs a median-over-last-8-weeks calculation and returns `{ dayOfWeek, date, predictedVolume, historicalAverage, recommendation }`. Costs are hardcoded today ($6.50/order Uber Direct, $180/day Tasker = 25-order capacity).

**To finalise.**
- Set the provider cost constants to match your actual contracts (search `6.50` and `180` in `app/api/delivery/predict/route.ts`).
- Add real drivers to the `drivers` table.
- Get Uber Direct (or DoorDash Drive / Sherpa) API credentials. The dispatch handler is a TODO — today the page only *recommends*, it doesn't actually book with the provider.

---

## 8. Customers — `/customers`

**What it does.** Your CRM database. Search, segment filter (All / VIP / Regular / New / At Risk), detail drawer with order history, LTV, points, add-customer modal, real SMS send, real AI call.

**How it works.** Reads `customers` with `getCustomers()`. The detail drawer:
- **SMS button** opens a compose modal and POSTs to `/api/sms/send` (real Twilio send, logged to `sms_logs`). Supports `{name}` placeholder replacement.
- **🤖 Call button** POSTs to `/api/ai-calls/start`, which loads the business's AI profile, verifies it's enabled, and initiates a Twilio outbound call to the customer. Logs a `campaign_events` row with `event_type='ai_call_started'`. If Twilio isn't configured, returns a clear error.

Buttons are disabled when no phone number is on file.

**To finalise.**
- Make sure the segment-calculator job is running (trigger from migration 005, or a nightly scheduled function). If `SELECT DISTINCT segment FROM customers` returns only NULL, the segment filter won't do anything.
- Set the Twilio env vars for SMS + AI calls to work.
- Decide your personalisation placeholders. Today only `{name}` is replaced client-side — you could add `{business}`, `{balance}` etc. in `app/customers/page.tsx → sendSms`.

---

## 9. Rewards — `/rewards`

**What it does.** Points & tiers (Bronze 0–299 / Silver 300–999 / Gold 1000+), points table per customer, CSV export, earn-rules card, pay-with-points UI.

**How it works.** Reads `customers.points_balance`. Tier is a pure function in `tierOf()` on the page (not a shared lib). The Export button now produces a real CSV blob with id, name, email, points, cash_value (pts/100), tier.

**To finalise.**
- Decide your points-per-dollar rate and tier cut-offs. Edit `tierOf()` on the page. The POS currently awards `pts = total × 10`; adjust in `app/pos/page.tsx → placeOrder`.
- Build the redemption catalogue (free coffee at 500 pts etc.) under `business.settings.rewards.catalogue`. The "pay with points" toggle doesn't do anything server-side yet.
- If you want points to decay, add a scheduled function that docks inactive customers.

---

## 10. Win-Back — `/zentra-rewards`

**What it does.** Automated retention rules. Each rule is "if a customer hasn't ordered in N days, send an offer via SMS/email". Supports percent off, dollar off, free delivery, free item. Template supports `{name}`, `{offer}`, `{business}`, `{link}`. Tracks active rules, redemptions, revenue recovered.

**How it works.** Rules in `winback_rules` (business-scoped, RLS-locked). Stats come from `campaign_events` where `event_type='redeemed'`. CRUD UI lets you edit/pause/resume/delete.

The **evaluator job is not included** — you need to build a scheduled Supabase function that:
1. Reads all active rules for all businesses
2. For each rule, finds customers where `last_order_at < now() - interval '<inactive_days> days'` and no recent send within `cooldown_days`
3. Sends via `/api/sms/send` and logs a `campaign_events` row
4. When the customer places an order within the offer window, writes a `event_type='redeemed'` event with `revenue_attributed = order.total`

**To finalise.**
- Build the evaluator job above (an endpoint at `app/api/cron/winback/route.ts` hit by Supabase Scheduled Functions or Vercel Cron).
- Wire a short-link service so `{link}` resolves (Bitly, or a `/r/<code>` handler in your storefront).

---

## 11. Automations — `/automations`

**What it does.** Trigger-based SMS/email campaigns. Similar shape to win-backs but broader: custom `name`, `trigger_days` (days inactive), `discount_amount`, `cooldown_days`, template. Has a "▶ Run Now" button.

**How it works.** Reads the existing `campaigns` table via `getCampaigns()`. The "Run Now" button POSTs to `/api/automations/run` which evaluates rules and sends SMS.

**Note on the table split.** The initial design added a separate `automation_rules` table, but `/automations` has always run on `campaigns` (with the `/api/automations/run` endpoint already built around it). The new table was dropped from migration 009 to avoid two overlapping models — you now have `campaigns` (generic retention) and `winback_rules` (lapsed-customer rules), each with its own page, rather than three.

**To finalise.**
- Verify `/api/automations/run` has the trigger logic you want. If you want more triggers than "days inactive" (birthday, first-order, etc.), extend the `campaigns` schema or introduce `automation_rules` as a follow-up.
- Schedule it via Supabase Scheduled Functions or Vercel Cron.

---

## 12. Analytics — `/analytics`

**What it does.** Revenue / orders / AOV / repeat rate / SMS conversion stat cards, 7/30/90-day toggle, revenue trend chart, top menu items table, channel performance bars, customer retention block.

**How it works.** Six parallel Supabase queries: top menu items (from `orders.items` JSON), revenue by channel (group by `source`), revenue by day, repeat-rate rollup, SMS stats, and `analytics_daily`.

**To finalise.**
- Nothing new beyond what's needed for the dashboard.
- To unlock margin analytics, add recipes (see Stock).

---

## 13. Financials — `/financials`

**What it does.** 90-day revenue, aggregator fees (estimated 30% cut on non-direct), retained margin, subscription fee. Revenue-by-source breakdown. Direct vs aggregator split. "Save $X by moving aggregator orders direct" recommendation. CSV export.

**How it works.** Reads `analytics_daily` for the window, prorates `direct_orders / total_orders` against revenue, applies flat 30% fee to the aggregator share. Subscription fee from `business.settings.subscription_fee`.

**To finalise.**
- Set `business.settings.subscription_fee` per tenant from `/admin`.
- Xero auto-export is a "coming soon" stub. When ready, build `app/api/xero/push/route.ts` against the Xero OAuth app.

---

## 14. Rostering — `/rostering`

**What it does.** Week grid (7 columns, Mon–Sun) with shifts colour-coded by role (kitchen / front / driver / manager). Shift CRUD. Labour hours and cost totals. Smart staff suggestion based on the last 4 weeks of revenue-by-weekday.

**How it works.** Shifts in `roster_shifts`. Suggestion rule: `max(2, round(avgRevenue / 400))` staff per day.

**To finalise.**
- Give staff `hourly_rate` values (users table or a new `staff_profiles` table).
- Payroll export: the "Export to payroll" button downloads a CSV. For direct push to KeyPay / Xero Payroll / Deputy, wire a matching API.
- Tweak the suggestion formula (currently flat ratio) to factor in a labour-budget cap as a % of revenue if that's your model. See `computeSuggestion` in `app/rostering/page.tsx`.

---

## 15. Settings — `/settings`

**What it does.** Business profile (name, type, suburb, subdomain, logo), operating hours (Mon–Sun with open/close + closed checkbox), Stripe Connect status, subscription status, pointer card to `/zentra-rewards` for winback config.

**How it works.** Persists to `businesses.settings` (JSONB) and first-class columns. `stripeConnected` from `business.stripe_account_id`. Subscription status from `business.settings.subscription_status`. Hours saved to `business.settings.hours` keyed by weekday. Settings saves go through `saveSettings()` in `lib/queries.ts`, which reads the saved settings first, so one section can't wipe another.

**Online ordering.** The Online ordering card saves `settings.ordering.prep_minutes` (20 by default), `settings.ordering.paused` and `settings.timezone` (the time zone the hours are in, Adelaide by default). `lib/pickup-times.ts` turns these and the hours into what the ordering page offers: "as soon as possible" (now plus prep time) or a later time today on the quarter hour, up to closing. A close at or before the open time runs past midnight. Closed now but open later today means order ahead only. Closed for the day or paused means no orders, with when it opens next. With no hours saved it works as before, as soon as possible only. Checkout checks the choice again with the same code, and the Stripe page expires after about 31 minutes.

**Delivery with your own drivers.** Also on the Online ordering card, saved to `settings.ordering.delivery` (`enabled`, `fee`, `min_order`, `extra_minutes`, `areas`). `lib/own-delivery.ts` reads it. Delivery stays off until at least one suburb or postcode is listed. The customer picks Pick-up or Delivery, gives a street, suburb and postcode in a listed area, and a phone number. The fee is its own Stripe line, the minimum is checked before the fee, and the drive time is added to the prep time for the time choices. This is the shop's own drivers only. Couriers are the Delivery page and aren't booked yet.

**To finalise.**
- Start Stripe Connect onboarding via the "Connect Stripe" button (`/api/stripe/connect/start`). The webhook in `app/api/stripe/webhook/route.ts` updates `stripe_account_id`.
- Make sure your Stripe webhook handler updates `business.settings.subscription_status` on `invoice.paid` / `customer.subscription.deleted`.
- Operating hours feed: AI Calls "after hours" logic, storefront open/closed state, POS display.

---

## Bonus: Super-admin — `/admin`

**What it does.** Platform control. Every tenant, module toggles, usage & billing, Impersonate button, danger zone (UI only).

**How it works.** Visible only when `users.is_super_admin = true`. Reads from `/api/admin/stats` (service-role, bypasses RLS). Module toggles PATCH `/api/admin/modules`. Impersonate POSTs `/api/admin/impersonate`, sets the `zb_impersonate` cookie for 4 hours, reloads into the target tenant. The orange banner (`components/impersonation-banner.tsx`) marks every page when you're impersonating.

**To finalise.**
- Mark one user super-admin (see top of doc).
- Implement suspend/delete endpoints if you want the danger zone buttons to actually do something (currently they toast "coming soon").

### Enquiries — `/admin/enquiries`

**What it does.** Every enquiry from the contact form on zentrabite.com/contact, newest first, 50 at a time. Mark each one new, contacted or closed. Linked from the Super Admin header.

**How it works.** The form in `apps/web/app/contact/page.tsx` posts from the browser to `POST /api/public/enquiries` on the CRM (apps/web has no Supabase keys). That route is let through the login gate in `proxy.ts`, allows CORS only from zentrabite.com, www, `repo1-web-*.vercel.app` and localhost in dev, checks every field (rules in `lib/enquiries.ts`), drops bots quietly (hidden `website` field, or sent under 3 seconds after the page opened), limits each address to 5 an hour and 20 a day (counted from saved rows by a keyed hash, never the raw IP), and inserts with the service role. After replying it emails hello@zentrabite.com through `lib/email.ts`, which skips quietly if Resend isn't set up. The page reads and updates through `/api/admin/enquiries` and `/api/admin/enquiries/[id]`, both checked with `lib/admin-auth.ts`.

**Table.** `enquiries` (migration 016). RLS on, no insert or delete for browser roles, super admins can read and change `status` only.

---

## New API endpoints added in this pass

- **`POST /api/sms/send`** *(already existed)* — Twilio send, logs to `sms_logs`. Wired into the Customers detail drawer.
- **`POST /api/ai-calls/start`** *(new)* — Twilio outbound, pulls the AI profile from `ai_call_profiles`, posts the greeting as TwiML (or hands off to `AI_VOICE_WEBHOOK_URL` if set). Logs to `campaign_events`. Wired into the Customers detail drawer.

## Bug fixes in this pass

- **POS `total_orders` bug.** An earlier version ran two updates on `customers` back-to-back; the first one was trying to increment `total_orders` but accidentally assigned the Supabase client's `.rpc` function to the column. The first update has been removed — stats are now only written once, in the correct block after the order insert.
- **Rewards page "Export" button** was a fake toast. It now generates a real CSV download with id, name, email, points, cash_value, tier.
- **Customers page "SMS" and "🤖 Call" buttons** were fake toasts. Now both call real endpoints (see above).
- **Seven truncated files** from a prior commit were repaired so the app typechecks (`hooks/use-business.ts`, `lib/admin-queries.ts`, both admin API routes, the store checkout route, the impersonation banner, and the admin page).

## Schema adjustment

- **`automation_rules` table dropped from migration 009.** `/automations` runs on the existing `campaigns` table with `/api/automations/run`, so a separate `automation_rules` table would have been two overlapping models. The type and query helpers were removed from `lib/database.types.ts` and `lib/queries.ts`. If you later decide you want a full generic automation engine, add it as a follow-up migration rather than shipping two tables that both mean "triggers & actions".

---

## Migration + config checklist (short version)

1. `supabase db push` (or paste `009_crm_expansion.sql` into the SQL editor)
2. Enable realtime on `orders`, `ai_recommendations`, `campaign_events`
3. Create the `menu-images` Supabase Storage bucket (public)
4. Set env vars: Supabase, Stripe, Twilio (+ optionally `AI_VOICE_WEBHOOK_URL`, `NEXT_PUBLIC_APP_URL`)
5. Seed at least one row in: `menu_categories`, `menu_items`, `customers`, `winback_rules`, `ai_call_profiles` to light up every page
6. Set `business.settings.subscription_fee` and `business.settings.hours`
7. Connect Stripe via the `/settings` button
8. Flip module toggles per tenant on `/admin`
9. Mark yourself super-admin

`npx tsc --noEmit` exits clean. The heavy lifting is done — most of what's left is data seeding and connecting outbound integrations (Stripe Connect, Twilio, Uber Direct, AI voice provider, Xero).
