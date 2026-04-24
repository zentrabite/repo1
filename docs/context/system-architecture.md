# ZentraBite — System Architecture

> Source of truth for **how the CRM works**. For UI/visual patterns, see `docs/reference/`.
> For page-by-page behaviour, see [crm-breakdown.md](./crm-breakdown.md).
> For strategic direction and rebuild plan, see [rebuild-brief.md](./rebuild-brief.md).

---

## 1. Product positioning

ZentraBite is the **Business Operating System for small operators** (hospitality, retail, services). One multi-tenant platform covering customers, orders, ordering, rewards, stock, campaigns, AI calls, drivers, reporting and billing — with a **Super Admin** that toggles modules per tenant.

Each tenant (a `business`) only sees the modules enabled for it. Billing is driven by module mix + usage (AI credits, SMS).

---

## 2. Repo layout

```
apps/
  web/              Marketing site + public demo sandboxes (zentrabite.com.au)
                    — /, /how-it-works, /features, /pricing, /industries,
                      /demo, /demo/live/*, /demo/merchant, /demo/app,
                      /demo/super-admin, /contact
  dashboard/        Production merchant CRM (dashboard.zentrabite.com.au)
                    — real Supabase-backed app, 19 modules under /app/*
  docs/             Next.js docs app (scaffolded)
  storefront/       Tenant-facing storefront build
  zentrabite-dashboard-files/  UI prototype reference (see docs/reference/)
packages/
  ui/               Shared React components
  eslint-config/    Lint presets
  typescript-config/ tsconfig presets
supabase/
  migrations/       001 → 010 schema
  functions/        Edge functions (nightly-analytics, win-back)
```

Stack: Next.js 16 (App Router), React 19, TS strict, Supabase (Postgres + RLS + Realtime + Auth + Storage), Stripe, Twilio, Resend, Turbo monorepo.

---

## 3. Data model (canonical entities)

Tenant-scoped by `business_id` with RLS policies locking each merchant to their own rows. Service-role bypass is used by server routes in `lib/supabase-server.ts`.

**Core**
- `businesses` — tenant. `settings` JSONB holds hours, subscription_fee, modules_json feature flags, rewards catalogue.
- `users` — staff accounts with `business_id`, `role` (owner/manager/staff/view_only), `is_super_admin`.
- `customers` — CRM records with `segment` (VIP/Regular/New/At Risk), `points_balance`, `total_spent`, `last_order_date`, `opted_out`.

**Orders & menu**
- `orders` — `items` JSONB, `status`, `source` (direct/pos/ubereats/doordash…), `channel`, `stripe_payment_id`.
- `menu_categories`, `menu_items` — per-business catalogue, image upload to Supabase Storage `menu-images` bucket.
- `stock_items` — par-level inventory. **Recipe linkage to menu items is not wired yet** — gating margin analytics.

**Retention**
- `campaigns` — generic trigger-based automations (`/automations` page).
- `winback_rules` — lapsed-customer rules (`/biteback` page). Separate model from `campaigns`.
- `campaign_events` — sends + `redeemed` events with `revenue_attributed`.
- `sms_logs` — Twilio send log.

**Analytics & ops**
- `analytics_daily` — daily rollup (`total_orders`, `total_revenue`, `direct_orders`, `agg_orders`, `sms_sent`, `sms_converted`). Populated by a nightly job.
- `ai_recommendations` — copilot suggestions surfaced on dashboard.
- `ai_call_profiles` — one row per business: mode, voice, greeting, FAQ, escalation phone.
- `roster_shifts` — week-grid rostering.
- `drivers` — driver roster (dispatch integrations pending).

**Migrations applied (001 → 010):** initial schema → RLS → auth → super-admin → attribution trigger → notifications → realtime orders → remove plan tier → CRM expansion → fulfillment tracking.

---

## 4. Module map

Per-tenant JSONB `businesses.settings.modules`:

```ts
{
  loyalty, ai_calls, driver_dispatch, stock, campaigns,
  sms, email, reviews, custom_website, ordering_app,
  advanced_analytics, premium_support
}
```

Flipped from **Super Admin → Tenant detail**. Enforced three ways:
1. Server: API routes check `tenantHasModule('x')` → 403 if disabled.
2. Sidebar: `dashboard-sidebar.tsx` filters nav items.
3. Route guard: middleware blocks direct URL access.

Billing recalculates base plan + usage when modules change.

---

## 5. Module catalogue — what each page does + how it connects

| Route | Reads | Writes | Depends on |
|---|---|---|---|
| `/dashboard` | analytics_daily, orders (kanban), winback_rules, ai_recommendations | ai_recommendations (dismiss) | nightly analytics job |
| `/orders` | orders (realtime subscription) | orders.status | Supabase realtime on `orders` |
| `/pos` | menu_items, customers | orders, customers (stats) | menu exists |
| `/menu` | menu_categories, menu_items | same + Storage upload | `menu-images` bucket |
| `/stock` | stock_items | stock_items | — (recipe link pending) |
| `/ai-calls` | ai_call_profiles | ai_call_profiles, campaign_events | Twilio, optional `AI_VOICE_WEBHOOK_URL` |
| `/delivery` | orders (history), drivers | campaign_events | — (Uber Direct/DoorDash pending) |
| `/customers` | customers | sms_logs, campaign_events (via SMS/AI call) | Twilio |
| `/rewards` | customers.points_balance | — (redemption server-side pending) | POS earn rule |
| `/biteback` | winback_rules, campaign_events | winback_rules | **Cron evaluator pending** |
| `/automations` | campaigns | campaign_events | `/api/automations/run` |
| `/analytics` | orders, analytics_daily | — | nightly analytics job |
| `/financials` | analytics_daily, businesses.settings | — | subscription_fee set per tenant |
| `/rostering` | roster_shifts, orders (history) | roster_shifts | — |
| `/settings` | businesses | businesses | Stripe Connect |
| `/admin` | everything (service role) | module toggles, impersonation cookie | `is_super_admin` flag |

---

## 6. Cross-module flows

**Order flow**

```
customer (storefront/app/POS)
  → create_order
  → Stripe payment_intent
  → orders INSERT (realtime)
    ├→ /orders board (toast + chime)
    ├→ POS updates customer.total_orders / points_balance
    ├→ (pending) stock_items auto-deduct via recipes
    ├→ rewards points credited
    └→ notifications row for owner
  → status progression: Ordered → Being made → Ready → Out for delivery → Completed
  → driver dispatch (internal or Uber/DoorDash fallback)
  → delivered → (optional) review ask + winback timer starts
```

**Rewards earn → unlock → redeem** (replaces earlier "pay with points"):
```
earn trigger (order.completed | review.left | referral)
  → loyalty_transactions insert
  → tier evaluation (Bronze 0-299 / Silver 300-999 / Gold 1000+)
  → redemptions unlock
  → redemption → voucher code → applied at checkout → points debit
```
Current: points awarded in POS as `total × 10`; tier in `tierOf()` on `/rewards`.

**Winback** — `winback_rules` + cron (to build) sends SMS/email when a customer's `last_order_at < now() - inactive_days` with cooldown enforcement. Attribution closes on next order via `campaign_events event_type='redeemed'`.

**AI voice call** — inbound Twilio → (optional `AI_VOICE_WEBHOOK_URL` to Vapi/Retell, fallback inline TwiML). Outbound via `/api/ai-calls/start` triggered from Customers drawer. Every call writes `campaign_events event_type='ai_call_started'` and (eventually) a `credit_transactions` row.

**Super Admin → Tenant config**
```
super_admin toggles tenant.modules
  → businesses.settings update
  → CRM UI re-hydrates, disabled nav items hidden
  → impersonation cookie `zb_impersonate` (4hr) surfaces orange banner
  → billing recalculates
```

---

## 7. Key business rules

- **Tenancy.** Every tenant-scoped table has `business_id` + RLS. Service role is only used in server routes that verify session → `business_id` match (or super-admin impersonation).
- **Segments.** `customers.segment` is populated by a scheduled job (seeded in migration 005). If it returns only NULL, segment filters on `/customers` are dead.
- **Aggregator margin.** `/financials` assumes a 30% cut on non-direct orders. `business.settings.subscription_fee` set per tenant from `/admin`.
- **Module flags.** Nav + routes + billing all derive from the same `businesses.settings.modules` map.
- **Realtime.** Enable Supabase Realtime on `orders`, `notifications`, `order_items`, `ai_recommendations`, `campaign_events` or live toasts fail silently.
- **Storage.** `menu-images` Supabase bucket must exist and be public.
- **Super admin.** `users.is_super_admin = true` gates `/admin`. Impersonation sets `zb_impersonate` cookie and the orange banner renders on every page.

---

## 8. Integrations

| Integration | Purpose | Env |
|---|---|---|
| Supabase | DB + Auth + Realtime + Storage + Edge | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` |
| Stripe | Checkout + Connect + Billing + webhooks | `STRIPE_SECRET_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_MERCHANT_MONTHLY` |
| Twilio | SMS + outbound AI calls | `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER` |
| Resend | Transactional email | `RESEND_API_KEY`, `RESEND_FROM_EMAIL` |
| AI voice (Vapi/Retell/custom) | AI call runtime | `AI_VOICE_WEBHOOK_URL` (optional) |
| Uber Direct / DoorDash Drive | Delivery fallback | **pending** |
| Xero | Accounting export | **pending stub** |
| App URL | Webhooks + redirects | `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_MARKETING_URL` |

---

## 9. Known gaps / pending work

From the breakdown + deploy runbook:

1. **Recipes / stock deduct.** No `recipes` or `product_components` table yet. Blocks `/analytics` margin view and auto-deduct on order.completed.
2. **Winback cron.** `/biteback` rules exist but no evaluator job sending messages + closing attribution.
3. **Dispatch integration.** `/delivery` only *recommends* — Uber Direct / DoorDash booking not wired.
4. **Stripe Terminal** not hooked in POS — `source='pos'` is recorded without a card charge.
5. **Reward redemption server side.** Pay-with-points UI on `/rewards` has no server handler.
6. **Xero export** — stub button.
7. **Payroll export** — CSV only; KeyPay/Deputy direct push pending.
8. **Short-link service** for `{link}` in campaign templates.
9. **`analytics_daily` nightly job** must be running for the dashboard, analytics, and financials pages to have data.
10. **Migrations 006 + 007** (notifications + realtime) may need applying in prod — see [deploy-runbook.md](./deploy-runbook.md).

---

## 10. Roles & permissions

- `owner` — everything.
- `manager` — everything except Billing + Team invite.
- `staff` — Orders, POS, Customers (r), Menu (r).
- `view_only` — read-only analytics.
- `super_admin` — outside business scope, service-role, audit trail.

---

## 11. Where to read more

- [crm-breakdown.md](./crm-breakdown.md) — every page, what's wired, what's mocked, what to finalise.
- [rebuild-brief.md](./rebuild-brief.md) — product positioning, IA, rewards logic, demo strategy, full roadmap.
- [deploy-runbook.md](./deploy-runbook.md) — env, migrations, Stripe webhook, domain steps.
- `docs/reference/` — UI/visual patterns, component structure, design tokens.
