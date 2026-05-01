**To:** [Developer email]
**Subject:** ZentraBite — Dev Handover & Outstanding Task List

---

Hi [Name],

The ZentraBite CRM build is complete on our end — all pages are built, the schema is finalised (14 migrations), and the codebase typechecks clean. I'm handing over the remaining setup, infrastructure, and backend tasks below.

The repo is at [your GitHub URL]. All new code is on `main`.

---

## 1. Apply pending Supabase migrations

Run these in order via **Supabase → SQL Editor → New query**, or via `supabase db push`:

- `supabase/migrations/011_pending_schema.sql`
- `supabase/migrations/012_delivery_routing.sql`
- `supabase/migrations/013_orders_delivery_fields.sql`
- `supabase/migrations/014_stock_management.sql`

All are idempotent.

---

## 2. Enable Supabase Realtime

In **Supabase → Database → Replication**, enable realtime for these tables:

- `orders`
- `ai_recommendations`
- `campaign_events`

This powers the live order board, AI copilot dismiss actions, and campaign event tracking.

---

## 3. Create Supabase Storage bucket

Create a public bucket named **`menu-images`**. This is used by the Menu page image upload endpoint (`/api/menu/upload-image`).

---

## 4. Set production environment variables in Vercel

Add these to **Vercel → Project → Settings → Environment Variables** (Production scope):

| Variable | Where to get it |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Settings → API |
| `STRIPE_SECRET_KEY` | Stripe → Developers → API keys (live mode) |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe → Developers → API keys (live mode) |
| `STRIPE_WEBHOOK_SECRET` | After creating webhook (step 5) |
| `TWILIO_ACCOUNT_SID` | Twilio console |
| `TWILIO_AUTH_TOKEN` | Twilio console |
| `TWILIO_PHONE_NUMBER` | Twilio console |
| `RESEND_API_KEY` | Resend dashboard |
| `RESEND_FROM_EMAIL` | e.g. `orders@zentrabite.com.au` |
| `NEXT_PUBLIC_APP_URL` | `https://dashboard.zentrabite.com.au` |
| `NEXT_PUBLIC_STOREFRONT_URL` | Storefront base URL |

Redeploy after saving.

---

## 5. Register the Stripe production webhook

In **Stripe → Developers → Webhooks → Add endpoint**:

- **URL:** `https://dashboard.zentrabite.com.au/api/stripe/webhook`
- **Events:**
  - `payment_intent.succeeded`
  - `checkout.session.completed`
  - `account.updated`
  - `customer.subscription.created`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`

Copy the signing secret (`whsec_...`) into Vercel as `STRIPE_WEBHOOK_SECRET`, then redeploy.

---

## 6. Set up custom domains in Vercel

- `dashboard.zentrabite.com.au` → dashboard app (`apps/dashboard`)
- `zentrabite.com.au` → marketing site (separate Vercel project, root directory `apps/web`)

For the marketing site, use these Vercel build settings:
- **Build Command:** `cd ../.. && npx turbo run build --filter=web`
- **Install Command:** `npm install` (run at repo root)
- **Output Directory:** `.next`

---

## 7. Mark super-admin user

Run this in the Supabase SQL editor once auth is set up:

```sql
UPDATE users SET is_super_admin = true WHERE email = '<your-owner-email>';
```

This unlocks the `/admin` panel (platform control, tenant management, module toggles, impersonation).

---

## 8. Build the win-back cron job

The win-back rules UI is fully built. The evaluator job is not — it needs to be built and scheduled.

**Create:** `apps/dashboard/app/api/cron/winback/route.ts`

Logic:
1. Read all active `winback_rules` across all businesses
2. For each rule, find customers where `last_order_date < now() - interval '<inactive_days> days'` and no `campaign_events` send within `cooldown_days`
3. POST to `/api/sms/send` for each customer, log a row to `campaign_events` with `event_type = 'sent'`
4. When a customer places a next order within the offer window, write `event_type = 'redeemed'` with `revenue_attributed = order.total`

Schedule via **Vercel Cron** (add to `vercel.json`) or a **Supabase Scheduled Function**.

---

## 9. Build the automations cron job

Same pattern as above but for the `campaigns` table. The `/api/automations/run` route already exists and has the send logic — it just needs to be scheduled via Vercel Cron or Supabase Scheduled Functions to run nightly.

---

## 10. Build the nightly analytics aggregation job

The Dashboard and Analytics pages read from `analytics_daily`. This table needs to be populated nightly by a job that groups `orders` by `business_id` and `date` and upserts into `analytics_daily`.

Fields to aggregate per business per day: `total_orders`, `total_revenue`, `direct_orders`, `agg_orders`, `new_customers`, `sms_sent`, `sms_converted`.

Can be a Supabase Scheduled Function or Vercel Cron.

---

## Phase 2 (roadmap — not blocking launch)

These are features where the UI exists but the backend isn't wired up yet. None of these block going live.

- **Recipes / margin analytics** — a `recipe_items` table linking menu items to stock ingredients so the Analytics page can show cost and margin per item
- **Live delivery provider dispatch** — the Delivery page recommends a provider split today (Uber Direct vs Tasker) but doesn't call the Uber Direct / DoorDash Drive APIs to actually book a job
- **Stripe Terminal on POS** — the POS records sales correctly but doesn't integrate the tap-to-pay Terminal SDK for card-present payments
- **Xero export** — the Financials page has a "Export to Xero" button (currently stubbed); needs Xero OAuth app + `/api/xero/push/route.ts`
- **Points decay** — optional scheduled function to reduce points balances for inactive customers

---

Let me know if you have any questions on any of the above. Happy to jump on a call.
