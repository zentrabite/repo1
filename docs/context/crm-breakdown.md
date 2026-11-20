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

**New-order sound and dockets.** While an online order is still New, a chime repeats every 4 seconds (`lib/order-alarm.ts`, an `<audio>` loop so it keeps going in a background tab), the tab title shows the count, and a box at the top lists the waiting orders with Accept and Print. Accept moves the order to Preparing, which stops the chime. Orders older than 6 hours stay in the list but don't ring. Browsers need one click on the page before they play sound, so the box asks for one when needed. The sound can be turned off per device (saved in the browser). Print docket (in the box and in each order) prints an 80mm docket from a hidden frame (`lib/docket.ts`): pick-up or delivery, the time, the customer, the address, the items with options, the note and the total. A docket printer that prints with no dialog comes once a pilot names its printer.

**Notes and delivery by the shop's own drivers, since migration 020.** Orders carry `notes`, the customer's note for the kitchen or driver, or one typed on the POS. The board shows a Note tag and the full note in the order. A delivery order has `fulfillment_type = 'delivery'`, the address in `ship_to.address` and the fee in `delivery_fee`, and "When" is the delivery time.

**Refunds, since migration 021.** An online card order (`source = 'direct'`, a `pi_` payment) has a Refund button for owners and managers (`components/refund-panel.tsx`). It refunds all or part of what's left, in two clicks, through `POST /api/orders/[id]/refund`. The route reads what Stripe has already refunded on the payment, so refunds made in the shop's own Stripe Dashboard count, and refunds on the shop's own account with an idempotency key so a double click can't refund twice. The order keeps `refunded_amount` (the total refunded, as Stripe reports it) and `refunded_at`. Refunded in full, its status becomes Refunded. The Stripe webhook does the same on `charge.refunded` (from the button or the shop's Stripe Dashboard) and `refund.failed`. A full refund that fails later sets the status to "Refund failed", because the shop has to pay the customer back another way. Triggers in migration 021 take the refund off the customer's `total_spent` and points, take one off `total_orders` once it's refunded in full, and ignore browser changes to the two refund columns. Revenue on the Orders page, the dashboard's today figure, the AI Copilot and super admin is less refunds (`netTotal` in `lib/refunds.ts`). Counter sales (POS) are refunded on the card machine or in cash, and aren't recorded here yet. Past days in Analytics (`analytics_daily`) and the Xero export still show the full amount.

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

**Counter QR code and owner's guide.** `/print/counter` is a print-ready page (three A4 pages): two counter cards to cut in half, eight small cards for bags, receipts and the window, and the owner's one-page guide (taking an order, pausing, the menu, refunds, money, customers, where to get help). The QR code goes to the shop's ordering page with `?src=counter`, so its orders show "Came from: Counter QR code". It's made in the browser with the `qrcode` library. The cards use the shop's brand colour and logo and show the first order offer when it's on. Owners and managers open it from Settings (Counter QR code). Staff open any shop's from the wizard's Website step once it's published (`?shop=<id>`, super admins only). It's behind the login but has no CRM menu (`BARE_SEGMENTS` in `components/dashboard-shell.tsx`). The help line is `NEXT_PUBLIC_SUPPORT_EMAIL`, hello@zentrabite.com by default.

**First order offer.** A shop can give a set amount off a customer's first online order over a minimum spend, from the Settings page's Online ordering card or the wizard's Website step (`settings.ordering.first_order`, read by `lib/first-order.ts`). Up to $25, and the minimum has to be more than the amount. First means no earlier online order (`source = 'direct'`) from that mobile number at this shop, so a customer the shop knows from a counter sale or an imported list still gets it. Checkout works it out from the items (never the delivery fee), makes a one-use Stripe coupon on the shop's own account that stops working soon after the checkout expires, and adds `first_order_discount` to the session's metadata. The shop pays for it. The webhook saves it on the order (`orders.discount`, migration 024, server only) and the receipt, docket and order detail show it. `orders.total` stays what the customer paid. The ordering page, the shop's website banner and the counter QR code show it in the same words. Someone could claim it twice with a second mobile number, which is why it's capped.

**Where each order came from.** Every online order records `orders.came_from` (migration 025, server only): `counter` (the counter QR code), `winback` (a win-back link, or any order with a code), `google`, `website` (every order link on the shop's own site), `social`, or `direct` (none of those). It comes from `?src=` on the link to the ordering page, which passes it to checkout, which puts it in the Stripe metadata for the webhook. Unknown values become `direct`. Settings has a "Your ordering links" card with the Google link (for the Google Business Profile's Order button) and the social media link, each with Copy. The Orders page detail shows "Came from". Counter (POS) sales and orders before 21 Nov 2026 have none.

**Bring in a list.** Owners and managers can add the shop's existing customer list from a CSV (Square, Shopify, Mailchimp, a loyalty app or a spreadsheet). `components/customer-import.tsx` reads the file in the browser, guesses which column is which from the headings, and shows how many people are ready, which rows were left out and why, how many agreed to marketing and how many have a last visit date. `POST /api/customers/import` checks every row again with the same rules (`lib/customer-import.ts`) and saves with `source = 'import'`. Phones are kept as +61, and a number a spreadsheet stripped the 0 from is put right. People already in the list (same phone or email) aren't added twice: a missing phone or email is filled in and a later last visit moves `last_order_date` on, nothing else. Up to 5,000 rows a file. Marketing consent follows the Spam Act: a person is opted in only when the list says they agreed and the owner ticks that the shop collected that agreement, with `marketing_opt_in_source = 'import: <file name>'`. An import never opts anyone out and never opts in someone who opted out. Win-back only texts people whose last order is a while ago, so a last visit column matters. Without one, imported people aren't won back until they order. Dates of birth aren't brought in.

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

**What it does.** Automated retention rules. Each rule is "if a customer hasn't ordered in N days, send an offer via SMS/email". Offers are percent off, dollar off or free delivery. Template supports `{name}`, `{offer}`, `{business}`, `{link}`, `{code}` and `{ends}`. Tracks active rules, redemptions, revenue recovered.

**How it works (since 21 Nov 2026).** Rules in `winback_rules` (business-scoped, RLS-locked). `/api/automations/run` sends them, daily on Vercel cron and from Run Now on `/automations`. It's the only sender: the old Supabase `win-back` edge function is a stub and its cron job was switched off in migration 025.

- **Every offer is real.** Each message gets its own code (`offer_codes`, migration 025, server only, made by `lib/offer-codes.ts`) in its link, `name.zentrabite.com/order?code=K7MP4QXA&src=winback`. Eight letters and numbers with no look-alikes. It works for one online order and ends at the end of the day 14 days after it was sent, in the shop's time zone. If the template leaves out `{ends}`, the message ends with "Online orders only, ends Sat 5 Dec." If it leaves out `{link}`, the link is added. Old templates that say "{offer} off" read right ("20% off", not "20% off off").
- **Nothing is sent that can't be used.** No code saved, no message. A rule isn't sent at all while the shop isn't taking online payments, for free delivery while the shop doesn't deliver, or for a free item (no longer offered, an old free item rule shows "not sent"). Push is still logged as skipped.
- **The ordering page** reads `?code=` through `GET /api/store/[subdomain]?code=` and shows what it gives and when it ends, or why it can't be used. The cart shows the saving.
- **Checkout** (`/api/store/checkout`) checks the code again. A used or ended code stops the checkout with the reason. Percent and dollars come off the items, free delivery off the delivery fee, never leaving less than 50c. It comes off as a one-use Stripe coupon on the shop's account named "Offer code K7MP4QXA", instead of the first order offer (they never add up). Only one checkout can hold a code (`held_session`, `held_until`): a newer checkout ends the older Stripe page first, or is refused if that one was paid. Going back from Stripe keeps the code.
- **The webhook** saves `orders.offer_code` and `orders.discount`, marks the code used (`redeemed_at`, `order_id`, only if it wasn't already), adds one to the rule's `redemptions` and the order total to its `revenue`, and writes a `campaign_events` row with `event_type = 'redeemed'`, which the dashboard's Recovered revenue reads. The receipt and docket say "Offer code".
- Legacy `campaigns` (the `/automations` page) work the same way: `discount_amount` is dollars off with a code, and a campaign with no discount is a plain text.
- **Held back to measure it.** About 1 in 10 customers due a message (rule or campaign) is held back at random and sent nothing (`heldBack` in `lib/winback-report.ts`, decided from the rule, the customer and the day). They're logged in `sms_logs` with `status = 'held_back'` and no message, so the cooldown counts them and they aren't picked again the next day. Held-back rows don't count as texts sent anywhere (Automations, super admin, the monthly cap, and the nightly analytics job's `sms_sent`).
- **Monthly report** at `/zentra-rewards/report?month=2026-11` (Monthly report button on the Win-Back page, owners and managers, `GET /api/winback/report`). For a month in the shop's time zone: customers messaged and how many came back within 14 days (any order, online or at the counter) and what they spent, customers held back and how many came back anyway, and from 30 held back, about how many more came back than would have anyway. Each customer counts once a month, in the group of their first win-back that month. Plus offer codes used, and online orders by where they came from. On the 15th the daily run (`/api/automations/run`, cron only) emails each shop's order alert email, or its owner's login email, last month's report with a link (`sendMonthlyReports`, once a day through `edge_function_runs`). Shops with no win-back that month get nothing. No email sends until Resend's domain is verified.

---

## 11. Automations — `/automations`

**What it does.** Trigger-based SMS/email campaigns. Similar shape to win-backs but broader: custom `name`, `trigger_days` (days inactive), `discount_amount`, `cooldown_days`, template. Has a "▶ Run Now" button.

**How it works.** Reads the existing `campaigns` table via `getCampaigns()`. The "Run Now" button POSTs to `/api/automations/run`, which sends both win-back rules and campaigns (see Win-Back above for the offer codes).

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

**What it does.** Business profile (name, type, suburb, subdomain, logo), operating hours (Mon–Sun with open/close, an optional break, and a closed checkbox), Stripe Connect status, subscription status, pointer card to `/zentra-rewards` for winback config.

**How it works.** Persists to `businesses.settings` (JSONB) and first-class columns. `stripeConnected` from `business.stripe_account_id`. Subscription status from `business.settings.subscription_status`. Hours saved to `business.settings.hours` keyed by weekday. Settings saves go through `saveSettings()` in `lib/queries.ts`, which reads the saved settings first, so one section can't wipe another.

**Online ordering.** The Online ordering card saves `settings.ordering.prep_minutes` (20 by default), `settings.ordering.paused` and `settings.timezone` (the time zone the hours are in, Adelaide by default). `lib/pickup-times.ts` turns these and the hours into what the ordering page offers: "as soon as possible" (now plus prep time) or a later time today on the quarter hour, up to closing. A close at or before the open time runs past midnight. A day can have a break (`break_from`, `break_to`, for example 14:00 to 17:00) for a shop shut between lunch and dinner. `open` and `close` stay the first open and the last close, so anything that doesn't know about breaks still reads the day sensibly. No times are offered in the break, checkout refuses one ("We're closed then"), and a break that doesn't fall inside the day is ignored. Settings and the onboarding wizard won't save one that doesn't fit. The website import turns two sessions a day into a break, and the shop's website shows "11:30am to 2pm, 5pm to 9pm". Closed now but open later today, or in the break, means order ahead only. Closed for the day or paused means no orders, with when it opens next. With no hours saved it works as before, as soon as possible only. Checkout checks the choice again with the same code, and the Stripe page expires after about 31 minutes.

**Delivery with your own drivers.** Also on the Online ordering card, saved to `settings.ordering.delivery` (`enabled`, `fee`, `min_order`, `extra_minutes`, `areas`). `lib/own-delivery.ts` reads it. Delivery stays off until at least one suburb or postcode is listed. The customer picks Pick-up or Delivery, gives a street, suburb and postcode in a listed area, and a phone number. The fee is its own Stripe line, the minimum is checked before the fee, and the drive time is added to the prep time for the time choices. This is the shop's own drivers only. Couriers are the Delivery page and aren't booked yet.

**To finalise.**
- Start Stripe Connect onboarding via the "Connect Stripe" button (`POST /api/stripe/connect`, owners and managers). It makes or reuses the shop's own Stripe account (`ensureShopAccount` in `lib/stripe-connect.ts`) and opens Stripe's setup page. The `account.updated` webhook keeps the charges and payouts flags fresh.

**The owner's Stripe link, since migration 023.** Every new shop gets a link the owner opens before they have a login, `/stripe-setup/<code>` (`lib/stripe-setup-link.ts`). It's made when the shop is created (by staff or a seller) and emailed to the owner, so Stripe's ABN, ID and bank steps can be done before setup day. The page says what to have ready, and its Start button (`POST /api/stripe-setup/[code]`, public) makes or reuses the shop's Stripe account and sends the owner to Stripe, which sends them back to the same page. Only a hash of the code is stored (`stripe_setup_links`), a link works for 14 days and stops once the shop takes payments, and a new link stops the old one. Whoever finishes Stripe's setup picks the bank account the money goes to, so the link goes to the owner only. Staff see it in the wizard's Payments step (with when it was made and whether the owner has opened it) and can make a new one there (`/api/admin/onboarding/[id]/stripe-link`). A seller never sees it. Until Resend sends emails, staff copy the link and send it themselves.
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

### Sellers — `/admin/sellers`, `/sell` and `/sell/new`

**What it does.** The people who sell ZentraBite to shops. A super admin adds a seller at `/admin/sellers` (name, email, mobile) and can take access away. A seller logs in to `/sell`, a list of the shops they sold with how far setup has got, and `/sell/new`, the sale handover form they fill in with the owner. The shop goes to the team as a draft, and the team finishes it in the onboarding wizard.

**What a seller can't do.** Open any shop's CRM, customers, orders or settings, or get the owner's login. They have no business of their own, so every row rule shows them nothing, and `components/dashboard-shell.tsx` sends them from any CRM page to `/sell`. The handover form never sends the owner's invite, because the invite link logs in as the owner. Staff send it during setup.

**How it works.** `users.is_seller` (migration 022) marks a seller. Browsers can't write to `users` (migration 015). `lib/seller-auth.ts` (`assertSellerOrAdmin`) lets sellers and super admins run the website import and create a shop, through the same routes the staff form uses (`/api/admin/onboarding/import` and `POST /api/admin/onboarding`). A seller gets 20 imports a day (each costs AI time, counted in `import_runs`) and can add 20 shops a day, and must give the owner's mobile. Every shop records who sold it (`businesses.sold_by`, `sold_at`), which an owner can't change from a browser (`protect_business_fields`). `GET /api/sell/shops` lists a seller's shops with only the name, address, sale date, setup step, and whether payments and the site are on. `/api/admin/sellers` (super admin) lists, adds and removes sellers. A new email gets a login and an invite link, which comes back to the super admin to pass on until Resend sends emails. An email that already has a login just becomes a seller. Removing access keeps the login and the sales history. The staff form and the handover form are one component, `components/new-shop-form.tsx`, with an ABN check (`lib/abn.ts`) in both.

**Menu from a photo, a PDF or pasted text.** For a shop whose menu isn't on its website, or whose website menu is out of date. The handover form, the staff form and the onboarding wizard's Menu step have a box (`components/menu-upload.tsx`) to add up to 5 photos or PDFs, or paste the menu. Photos are shrunk in the browser to 2000 pixels on the long side as JPG, because Vercel turns away a request over 4.5 MB (the total is capped at 4.3 MB). `POST /api/admin/onboarding/menu-read` checks each file by its contents (JPG, PNG, WebP, GIF or PDF), then the same AI read as the website import turns it into a menu draft (`lib/import/menu-upload.ts`, `aiExtract` with source `upload`). Nothing is saved by the read. A read counts towards a seller's 20 imports a day, and a file that's turned away doesn't count. On the forms, the read menu goes back with `POST /api/admin/onboarding` as `menuUpload`, and `withUploadedMenu` in `lib/import/store.ts` keeps it on `settings.import` in place of the website's menu (`menu_from: "upload"`, with an empty `source_url` when there was no website import). In the wizard it replaces the draft in the Menu step, and nothing is saved until Seed menu.

**Go-live check.** The wizard's Website step shows what has to be true before the site is published (`lib/go-live.ts`, `GET /api/admin/onboarding/[id]/go-live`): the shop's name, street address, phone and ABN, a website address, at least one open day, at least one menu item on sale with a price, Stripe taking payments and paying out, an email or mobile for order alerts, the owner's login, and one order paid online (the payment webhook's `source = 'direct'` orders). Each gap has a button to the step that fixes it. Publish website stays off until everything passes, and `PATCH /api/admin/onboarding/[id]` checks again and answers 409 with what's left, so it can't be got round. Unpublishing, and every other save, isn't affected. For the test order, staff order on the shop's ordering page and pay, then refund it on the Orders page.

**The owner's login.** `lib/owner-invite.ts` makes the link the owner uses to set a password, links their login to the shop (`users.business_id`, role owner) and emails it. Staff creating a shop send it straight away. For a shop a seller sold, the go-live check has "Send the owner their login" (`POST /api/admin/onboarding/[id]/owner-invite`, super admins only). It's a Supabase invite the first time and a magic link after that, and a login that already belongs to a different shop is never moved. Until Resend sends emails, the link shows on screen for staff to send. It logs in as the owner, so it never goes to a seller.

### Setup board — `/admin/setup`

**What it does.** Every shop that isn't live yet, oldest sale first, so nothing a seller signs sits untouched. Each row shows who sold it and when, the wizard step it was left on, the first thing it's waiting for and the full list of what's left. When it's waiting on Stripe it says whether the owner has opened their Stripe link, or whether it ran out. A shop sold 3 or more days ago and still on step 1 shows as Not started. Each row opens the shop in the onboarding wizard.

**How it works.** `GET /api/admin/setup-board` (super admins only) runs `readSetupBoard` in `lib/setup-board.ts`. It reads every shop, keeps those whose site isn't published, and runs the go-live check (`goLiveChecks`) for each from five reads for all of them at once (menu items, paid online orders, owner logins, Stripe links, sellers' names). Not tracked yet, because neither is set up through the CRM: a shop's own text sender name and its own domain.

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
