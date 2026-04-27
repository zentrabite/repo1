# ZentraBite — Full Product Rebuild Brief & Implementation Plan

_Sections 1–15 are the strategic direction. Section 16 is the code, shipping in this commit alongside this document._

---

## 1 · Executive summary

ZentraBite is repositioning from "restaurant loyalty app" to the **Business Operating System for small operators** — one system that runs customers, orders, ordering, rewards, stock, campaigns, AI calls, drivers, reporting, and billing, with a **Super Admin** that turns modules on/off per tenant.

This rebuild ships four connected products in one commit plus a documented roadmap for the rest:

1. **Public marketing funnel** (`zentrabite.com.au`) — converts hospitality / small-business owners into leads.
2. **Merchant CRM demo** (`/demo/live/*`) — 15+ screens that feel like production software, not mockups.
3. **Customer-facing storefront + app** (`/demo/merchant`, `/demo/app`) — the same demo brand seen through its own customers' eyes.
4. **Super Admin layer** (`/demo/super-admin`) — ZentraBite's own control plane for tenants, modules, usage, and billing.

Everything is wired to the same `data.ts` so toggling a module in Super Admin has visible downstream effects, and the CRM, storefront, and app all read the same orders/menu.

**Three non-negotiables this rebuild fixes:**

- **Rewards logic** — removes the confusing "pay with points" model. Replaces it with a transparent earn → unlock → redeem ladder tied to retention.
- **Demo discoverability** — demo is surfaced in hero, nav, and a dedicated `/demo` hub with three clearly labelled sandboxes (marketing deck, CRM, customer view).
- **Pricing transparency without a fixed public number** — tailored solution pricing with honest cost drivers, live estimate tool, and one-month free trial anchored on `/contact`.

---

## 2 · Main problems with the current version

| # | Problem | Impact | Fix |
|---|---|---|---|
| 1 | "Pay with points" reward on the demo is confusing | Undermines product credibility | Replace with earn / unlock discount / redeem free item, plus tier ladder |
| 2 | Demo is buried behind `#features` and a nav link | Visitors never see the product working | Put Demo in hero primary CTA, nav, and add `/demo` hub with 3 entry points |
| 3 | Fixed public pricing tiers feel arbitrary | Operators with unusual volume bounce | Replace with "tailored solution" framing + interactive estimator + 1-month free trial |
| 4 | No dedicated contact page — trial CTA is a dead link | Conversion is lossy | Build `/contact` as the conversion page for the whole site |
| 5 | CRM doesn't show all modules (no Super Admin, no Integrations, no Billing, no Team/Permissions, no Reviews) | Product feels smaller than it is | Scope and ship the missing CRM pages |
| 6 | Super Admin is invisible — multi-tenant story isn't told | Investors can't see the platform play | New `/demo/super-admin` with tenant list, module toggles, plan/usage, impersonation |
| 7 | No customer-facing demo — merchant's own website/app not shown | Buyers don't see what their customers will use | Build `/demo/merchant` (storefront) and `/demo/app` (mobile frame) for the same brand |
| 8 | Flow charts from brief aren't reflected in-product | Logic gaps between screens | Add `/how-it-works` page with order, rewards, campaign, dispatch, AI-call, stock-sync, and tenant-config diagrams |
| 9 | Free trial says "14 days" in some places, nothing in others | Broken promise | Unified **one month free trial** everywhere |
| 10 | Short demo trial banner reads as 14 days in sidebar | Contradicts homepage | Updated to 1 month |

---

## 3 · New information architecture (public website)

```
/                       Home (funnel entry, no scroll dead-ends)
/how-it-works           Visual product architecture + flow diagrams
/features               (existing) Feature deep-dive
/pricing                Tailored-solution page with estimator
/industries             Who it's for (linked from home)
/demo                   Demo hub (3 entry points)
  ├─ /demo              Guided slideshow
  ├─ /demo/live         Merchant CRM sandbox (existing, expanded)
  ├─ /demo/merchant     Customer-facing storefront
  ├─ /demo/app          Mobile customer app
  └─ /demo/super-admin  ZentraBite tenant control plane
/contact                Single conversion page (enquiry form, 1-mo trial, book demo)
/about                  (planned) Why ZentraBite
```

**Nav order (desktop):** Product · How it works · Industries · Pricing · Demo · Contact → [Start free trial].
**Primary CTA everywhere:** "Start 1-month free trial" → `/contact` (was: external `/signup`).
**Secondary CTA:** "See the demo" → `/demo`.

---

## 4 · Website page-by-page breakdown

### 4.1 Home (`/`)
- **Hero** — Business OS positioning (done). Primary CTA → `/contact`, secondary → `/demo`.
- **AI Brain** (done) — daily AI brief with 5 insight cards.
- **Revenue Engine** (done) — 5 pillars + customer value engine.
- **Industries** (done) — 6 categories + Personal Trainer spotlight.
- **Showcase** — existing feature tour.
- **FAQ** — includes pricing transparency, trial length, module toggling, onboarding.
- **CTA banner** → `/contact`.
- **Footer** — links to every page.

### 4.2 How It Works (`/how-it-works`) — NEW
Flow-diagram explainer across six systems:
1. Order flow (customer → storefront → CRM → driver → notifications → loyalty)
2. Rewards engine (action → points → tier → unlock → redemption)
3. Campaign automation (trigger → segment → channel → outcome → attribution)
4. AI voice calls (inbound → IVR → AI agent → order → CRM → SMS confirm)
5. Driver dispatch (order.ready → route optimiser → driver offer → live tracking → completion)
6. Super Admin → Merchant (create tenant → toggle modules → deploy config → merchant sees/doesn't see features)

### 4.3 Features (`/features`)
Existing file. Already deep. Adds inbound link to `/how-it-works` for the moving parts.

### 4.4 Pricing (`/pricing`) — REBUILT
- Removes fixed $49 / $99 tiers.
- Replaces with: **"Tailored to your business"** section explaining why per-business pricing is honest.
- **Cost drivers table** — what affects your monthly (locations, order volume, modules enabled, AI credit usage, integrations).
- **Interactive estimate tool** — 3 sliders (orders/mo, modules enabled, AI credits) → produces a monthly estimate band like `$89–$129/mo + AI usage`.
- **One-month free trial** CTA → `/contact` (no card required).
- **What every plan includes** — foundation features listed so buyers don't feel gated.

### 4.5 Industries (`/industries`)
Existing Industries component lives on home; dedicated page expands each of the 6 categories into a full section with example tenants and outcomes.

### 4.6 Demo hub (`/demo`)
Existing slideshow becomes the "guided tour" entry. The last slide now links to three sandboxes:
- **Run the CRM** → `/demo/live`
- **See the customer view** → `/demo/merchant` + `/demo/app`
- **See the control plane** → `/demo/super-admin`

### 4.7 Contact (`/contact`) — NEW
The conversion page for the entire site.
- H1: "Let's scope what ZentraBite looks like for your business."
- Enquiry form: Business name · Category · Locations · Current stack · Order volume band · Modules interested in · Goals · Contact details.
- Side card: **1-month free trial, no card required.**
- "What happens next" 4-step timeline (reply in 1 business day → 20-min scoping call → tailored quote → onboarding).
- "Book a live demo" Calendly-style link.

---

## 5 · Full CRM architecture overview

**Route tree:** `/demo/live/{dashboard, orders, pos, menu, stock, ai-calls, drivers, customers, rewards, winback, automations, reviews, analytics, financials, team, integrations, billing, settings, super-admin}`

**Shell:** sidebar (19 nav items, grouped) + sticky topbar with live-orders pill + "demo mode" banner. Feature-flag aware: items hide if the tenant's module is disabled.

**Data model (canonical entities):**
- `businesses` → tenant (has modules map, plan, subdomain, branding)
- `users` → staff accounts (role: owner, manager, staff)
- `menu_categories`, `menu_items`, `modifiers`, `recipes/product_components`
- `orders`, `order_items`, `order_events`
- `customers`, `customer_tags`, `loyalty_transactions`, `rewards_tiers`, `rewards_redemptions`
- `stock_items`, `stock_batches`, `stock_deliveries`, `stock_adjustments`
- `drivers`, `driver_shifts`, `delivery_jobs`
- `campaigns`, `segments`, `automation_rules`, `messages`
- `ai_calls`, `credit_transactions`
- `reviews`, `review_replies`
- `integrations` (Stripe/Twilio/Resend/Uber/DoorDash/Xero)
- `notifications`, `audit_logs`
- `subscriptions`, `invoices`, `usage_metrics`

**Permissions:** Row-Level Security by `business_id`; Super Admin uses service-role with audit trail.

**Module flag map (per-tenant JSONB):** `{ loyalty, ai_calls, driver_dispatch, stock, campaigns, sms, email, reviews, custom_website, ordering_app, advanced_analytics, premium_support }`.

---

## 6 · Every CRM page in detail

> Short form because the product already has five pages fleshed out from prior sessions. I'm scoping the full 19-screen set; the code ships the missing ones as real pages and documents the rest inline as the build plan.

### 6.1 Dashboard
- Purpose: 60-second "is the business healthy?" check.
- First view: today's revenue, open orders, stock alerts, AI insight card, winback queue.
- Actions: click-through to any module.
- Empty state: "No orders yet — share your storefront link."
- Disabled modules: card is hidden, grey info strip instead.
- Tests: zero orders, zero stock alerts, AI disabled, offline.

### 6.2 Orders
- Board (Incoming / In Prep / Ready / Out for delivery / Completed) + list view.
- Actions: accept/reject, assign driver, mark ready, issue refund, resend receipt.
- Filters: channel, status, date, customer.
- Edge cases: missed-ticket alarm, refund after payout, cancelled-by-customer.

### 6.3 POS
- Touch-friendly order entry for counter staff.
- Menu → cart → payment → receipt.
- Cash drawer, split bill, tip rules.

### 6.4 Menu Builder
- Categories → items → modifiers → availability rules (time-of-day, day-of-week).
- Recipe/component link to stock (auto-deduct on sale).
- AI suggestion: "Combo upsell candidate" + "Low-margin item flagged".

### 6.5 Stock / Inventory
- Par-level progress bars, expiry pills, AI reorder quantity, accept-all.
- Incoming deliveries, batch expiry, waste log.
- Disabled-module state: link to enable via Super Admin.

### 6.6 AI Calls
- Call log with transcript playback, intent, outcome.
- Credit balance, monthly usage, top-up button.
- Call routing rules (hours, overflow to human).

### 6.7 Drivers
- Live map mock, driver roster, offline/online toggle, delivery queue.
- Dispatch rules: auto-assign, manual, third-party fallback.

### 6.8 Customers
- Segments, LTV, last-seen, risk score.
- Profile drawer: orders, rewards balance, campaigns received, tags, notes.

### 6.9 Rewards — **REBUILT**
- Earn rules (order = 1pt / $1 spent, review = 50pts, referral = 200pts).
- Tier ladder (Regular → Silver → Gold) with thresholds and perks.
- Redemptions (free coffee 100pts, $10 voucher 500pts, free main 1000pts).
- Live redemption feed, ROI strip (retained customers, lift on repeat rate).
- **Removes "pay with points"** — that was UX noise. Points redeem for *unlocks* (free items, discounts), not as currency at checkout.

### 6.10 Winback
- At-risk customer queue with reason codes.
- One-click AI-drafted SMS/email.
- Attribution: orders recovered $ per week.

### 6.11 Campaigns / Automations
- Builder: trigger (event) → filter (segment) → delay → action (SMS/email/push/tag) → measure.
- Library of starter automations.

### 6.12 Reviews
- Inbox from Google / website / app with sentiment, AI reply draft, approve/send, escalate.
- Auto-ask rule after order completion.

### 6.13 Analytics
- Revenue, orders, AOV, repeat rate, channel split, cohort retention, hour-of-day heatmap, top items.

### 6.14 Financials
- Payouts, Stripe Connect status, fees, refunds, tip totals, export.

### 6.15 Team / Permissions — NEW
- Roles (Owner / Manager / Staff / View-only), per-page permissions matrix, invite links.

### 6.16 Integrations — NEW
- Stripe, Twilio, Resend, Uber Direct, DoorDash Drive, Xero, POS (Square/Lightspeed/Square KDS), Google Business.
- Connected / Not connected, last sync, reconnect.

### 6.17 Billing
- Current plan, modules enabled, monthly total, AI credit balance, top-up packs, invoices, payment method.
- Honest "your bill this month: base plan $X + usage $Y".

### 6.18 Settings
- Business profile, hours, printers, receipt templates, domain, tax, notifications, data export.

### 6.19 Super Admin link (visible only to platform staff).

---

## 7 · Super Admin architecture

**Route:** `/demo/super-admin` (separate from merchant CRM)

**Screens:**
- **Tenants list** — search, filter by plan/modules/health, MRR, last-active.
- **Tenant detail** — three tabs:
  1. **Modules & plan** — toggle any of the 12 modules on/off, change plan, set overrides.
  2. **Usage & billing** — orders this month, AI credits burn, Stripe payout status, invoice history.
  3. **Ops** — branding, domain, impersonate as merchant (opens `/demo/live?tenant=X`), audit log.
- **Create tenant** — onboarding wizard (business info → modules → billing → invite owner).
- **Platform health** — realtime: queue depth, API latency, webhook failures, AI credit usage across tenants.
- **Module catalogue** — master list of modules with description, pricing impact, dependencies.

**Controls (model):**
```ts
tenant.modules = {
  loyalty: boolean,
  ai_calls: boolean,
  driver_dispatch: boolean,
  stock: boolean,
  campaigns: boolean,
  sms: boolean,
  email: boolean,
  reviews: boolean,
  custom_website: boolean,
  ordering_app: boolean,
  advanced_analytics: boolean,
  premium_support: boolean,
}
```
Feature-flag hook `useModule('stock')` short-circuits UI when disabled. The CRM sidebar filters NAV items based on this map. Impersonation passes the same flag map through the demo shell.

---

## 8 · Demo merchant brand concept

**Brand:** **Harbour Lane Pizza Co** — a Sydney neighbourhood pizza bar.
- Colours: deep navy + warm cream + accent orange (distinct from ZentraBite's green so the brand layer is obvious).
- Voice: friendly, local, unpretentious.
- Offering: wood-fired pizzas, pastas, salads, soft drinks, a loyalty program ("Dough Club").
- Why it works as a demo: most buyers will be cafés/takeaways/restaurants; they immediately understand the use case.

All three experiences (`/demo/live`, `/demo/merchant`, `/demo/app`) show the **same** menu, the **same** 6 live orders, and the **same** customer records — proving the system is a single source of truth.

---

## 9 · Demo merchant website (`/demo/merchant`)

Public-facing Harbour Lane site. Pages:
- **Home** — hero, today's deals, menu preview, pickup/delivery toggle, rewards pitch, story.
- **Menu** — category nav, item cards with modifiers, add-to-cart.
- **Cart / Checkout** — address, time, payment (Apple Pay / Card), tip, loyalty apply.
- **Order tracking** — live status (Received → Preparing → Ready → Out for delivery → Delivered) with ETA and driver name.
- **Rewards / Dough Club** — points balance, tier, redemptions available.
- **Account** — order history, saved addresses, payment methods, notifications.

Ribbon: "Powered by ZentraBite" footer link + Ω in corner, subtle not overwhelming.

---

## 10 · Demo customer app (`/demo/app`)

Mobile-frame rendering of the same Harbour Lane brand. Tab bar:
- **Home** — featured deal, reorder, points.
- **Menu** — tap to add, modifier sheet, cart badge.
- **Cart** — checkout sheet.
- **Rewards** — balance, tier ring, available redemptions, referral code.
- **Orders** — history + active tracker.
- **Profile** — saved cards, addresses, notification prefs.

Renders in a 390×844 mobile frame on desktop. Single-column responsive on real mobile.

---

## 11 · End-to-end flow diagrams

Rendered inside `/how-it-works` as SVG. Textual overview of each:

**Order flow:**
```
customer (app/site)
  → create_order (storefront API)
  → Stripe payment_intent
  → orders.inserted (realtime)  ─┬→ CRM Orders board (toast + chime)
                                 ├→ KDS ticket
                                 ├→ stock auto-deduct (recipes)
                                 ├→ rewards points credited
                                 └→ notifications row (owner)
  → mark_ready event
  → driver dispatch (internal or Uber/DoorDash)
  → delivered event
  → auto-ask review (if enabled)
  → winback timer starts
```

**Rewards logic:**
```
earn trigger (order.completed | review.left | referral.signed) 
  → loyalty_transactions insert (points + reason)
  → tier evaluation (cumulative 12mo spend)
  → available redemptions refreshed
redeem → redemption row → voucher code → applied at checkout → points debit
```

**Campaign / automation:**
```
event source (order, customer, time, manual)
  → rule.match (segment + delay + throttle)
  → channel pick (sms|email|push)
  → message.send (Twilio|Resend|FCM)
  → attribution window opens (7d)
  → revenue linked back via customer_id
```

**AI voice call:**
```
inbound call → Twilio → AI agent (intent classify)
  ├─ order_placement → collect items + address → create pending_order → SMS link to pay
  ├─ status_check → order_id → read status
  └─ human_handoff → ring merchant phone
  → credit_transaction row (minutes × 10 credits)
```

**Driver dispatch:**
```
order.ready + delivery required
  → dispatch rule (internal first? third-party fallback?)
  → offer to available drivers OR POST to Uber Direct / DoorDash Drive
  → accepted → pickup window → delivered event
```

**Super Admin → Merchant config:**
```
super_admin sets tenant.modules
  → supabase update businesses.modules_json
  → CRM UI re-hydrates with feature flags
  → disabled modules hide nav + block routes
  → billing recalculates base plan + usage
```

---

## 12 · Technical architecture

**Frontend:**
- Next.js 16 App Router, React 19, TS strict.
- Turbo monorepo: `apps/web` (marketing + demo sandboxes), `apps/dashboard` (merchant CRM production build), shared `packages/ui`.
- Styling: inline tokens + `globals.css` (brand tokens), Tailwind available in `apps/dashboard`.
- State: React state in demos, Supabase client in production dashboard.
- Feature flags: `useModule(name)` hook reads `business.modules_json` from supabase session, falls back to demo data in sandboxes.

**Backend:**
- Supabase (Postgres + RLS + Realtime + Auth + Storage).
- Edge Functions for webhooks (Stripe, Twilio, third-party delivery).
- Background jobs via Trigger.dev or Supabase cron (winback engine, daily AI brief, tier rollup, expiry sweeper).

**Database (key relations):**
```
businesses(id, modules_json, plan, subdomain, stripe_account_id, ...)
  └─ users.business_id
  └─ orders.business_id
       └─ order_items.order_id
       └─ order_events.order_id  (audit trail)
  └─ customers.business_id
       └─ loyalty_transactions.customer_id
  └─ stock_items.business_id
       └─ stock_batches.stock_item_id
       └─ recipes.menu_item_id → components → stock_items
  └─ campaigns, automation_rules, ai_calls, drivers, ...
```

**Role-based access:**
- `owner` — everything.
- `manager` — everything except Billing + Team invite.
- `staff` — Orders, POS, Customers (read), Menu (read).
- `view_only` — read-only analytics.
- Super Admin role is outside business scope — has `service_role` key, full audit trail.

**Module toggling:**
- Server check in API routes: `if (!tenantHasModule('stock')) return 403`.
- Client hide in sidebar + route guard in middleware.
- Billing recalculates on toggle via usage_metrics cron.

**APIs:**
- `/api/orders` (CRUD + webhooks), `/api/menu`, `/api/customers`, `/api/rewards`, `/api/stock`, `/api/drivers`, `/api/campaigns`, `/api/ai-calls`, `/api/reviews`, `/api/super-admin/*`.
- All server routes assert `business_id` from session; super admin routes check role.

**Queues:**
- `order.created` → fanout (stock deduct, rewards credit, owner notify, review ask timer).
- `winback.tick` → daily cron, inserts automation_rules.
- `ai.credit_reconcile` → nightly sum.
- `expiry.sweeper` → daily, writes stock alerts.

**Analytics events:**
- `page_view`, `cta_click`, `order_created`, `redemption_used`, `campaign_sent`, `campaign_attributed_revenue`, `ai_call_minute`.

**Billing / usage:**
- Stripe Billing for subscription.
- Usage metered on `ai_credits`, `sms_sent`, `orders_over_cap` — pushed via `stripe.subscriptionItem.createUsageRecord`.

**AI credit consumption:**
- 1 credit = SMS draft, 5 = menu optimisation, 10 per AI voice-call minute, 1 per review reply. Logged in `credit_transactions`.

**Multi-tenant storefront/app:**
- Merchant website served on tenant subdomain (`harbourlane.zentrabite.store`) from `apps/web` with `generateStaticParams` + ISR.
- Customer mobile app = PWA today; React Native shell planned.

---

## 13 · Testing checklist

**Public site:**
- Every link reaches a real page.
- Pricing estimator produces sensible numbers at min/max.
- Contact form validates required fields; empty state copy on success.
- Nav collapses correctly under 820px.
- Lighthouse: Performance > 85 on Home.

**CRM demo:**
- Every sidebar item loads without error.
- Disabled module → hidden nav item + friendly info page at the route.
- Empty states for: no orders, no customers, no campaigns, no reviews, no drivers online, stock below zero, AI credits exhausted.
- Realtime toast fires on fake new order (interval).
- Refund flow disables button while pending.

**Rewards:**
- Earn rules calculate correctly for edge cases (zero spend, high spend, multi-order).
- Tier promotion / demotion logic.
- Redemption decrements points and can't go below zero.

**Super Admin:**
- Toggle flow on `loyalty` hides Rewards from merchant CRM when impersonating.
- Create-tenant wizard validates subdomain availability.
- Impersonation always shows "viewing as" banner.

**Storefront / app:**
- Add-to-cart persists through navigation.
- Checkout disables submit while processing.
- Order tracking updates status every 6s to simulate progress.
- Rewards tab reflects the same points as the CRM customer record.

**Edge cases tested:**
- Store closed (out-of-hours) → checkout blocked with message.
- Driver offline → order stays in "ready" until staff intervene.
- AI credits below threshold → banner + soft-fail (drops to SMS draft instead of voice).
- Multi-location customer → correct location selector.

---

## 14 · Conversion funnel strategy

**Funnel stages:**
1. **Land** (home or ad) — 6-second hero clarity test.
2. **Understand** (How It Works / Features) — diagrams beat paragraphs.
3. **See** (`/demo` hub) — three entry points so different buyer types (owner, ops, investor) pick their own.
4. **Believe** (Industries + case studies) — own-industry relevance.
5. **Decide** (Pricing + estimator) — tailored math, no surprise.
6. **Convert** (`/contact`) — form + 1-month free trial, no card.
7. **Close** (reply in 1 business day → 20-min scoping call → bespoke quote).

**Conversion mechanics shipped:**
- Primary CTA always says "Start 1-month free trial" and lands on `/contact`.
- Every long section ends with an inline `/contact` CTA.
- Exit-intent banner — intentionally NOT shipped (feels desperate; wait for data first).
- Social proof: industry pill count on hero ("Works across 30+ business types") + testimonial carousel slot on home (placeholder until real quotes exist — this is the one "coming soon" we allow because fake testimonials destroy trust).

**Funnel KPIs to instrument:**
- `hero_view → demo_click` > 12%
- `demo_view → contact_click` > 8%
- `contact_form_submit` > 3% of all sessions
- `contact_submit → scoping_call` > 40%

---

## 15 · Implementation roadmap (build order)

**Shipped in this commit:**
1. Strategic brief (this document).
2. Nav IA — Product / How it works / Industries / Pricing / Demo / Contact.
3. `/contact` — 1-month free trial form + next-steps.
4. `/how-it-works` — 6 flow diagrams as inline SVG.
5. `/pricing` — tailored-solution framing + interactive estimator.
6. `/demo` hub updates — three entry points surfaced.
7. `/demo/super-admin` — tenant list + module toggles + usage + impersonation.
8. `/demo/merchant` — Harbour Lane storefront (home, menu, checkout, tracking, rewards).
9. `/demo/app` — mobile-framed customer app (home, menu, cart, rewards, orders, profile).
10. `/demo/live/rewards` — rebuilt logic (earn, tiers, redemptions, ROI).
11. `/demo/live/integrations`, `/demo/live/team`, `/demo/live/billing`, `/demo/live/reviews` — new CRM pages.
12. Unified "1-month free trial" copy across site.
13. Primary CTA rewire from `SIGNUP_URL` → `/contact` on marketing site.

**Next 2 weeks (post-ship):**
- Wire real Supabase module flags to the CRM sidebar.
- Build order.created event fanout (stock, rewards, notify).
- Implement recipes/components table + auto stock deduction.
- Build winback cron job.

**Weeks 3–6:**
- Ship AI voice call MVP on Twilio + OpenAI Realtime.
- Ship campaign builder in production dashboard.
- Ship customer PWA shell.

**Weeks 7–12:**
- Analytics materialised tables (daily_metrics).
- Insight snapshots worker (daily AI brief email).
- Multi-location rollup.
- Stripe Connect merchant onboarding polish.

---

## 16 · Code

All of section 15's "shipped in this commit" is in the next commit on `main`. See `/apps/web/app/` for new pages, `/apps/web/app/demo/` for new sandboxes, and `/apps/web/app/components/nav.tsx` + `pricing.tsx` for the rewired marketing surface.

Run locally:
```bash
cd apps/web
npm install
npm run dev
# → http://localhost:3000
```

Type-check: `npx tsc --noEmit` (passes green).

**Routes to check after deploy:**
- `/` — updated CTAs
- `/how-it-works` — flow diagrams
- `/pricing` — estimator
- `/contact` — conversion form
- `/demo` — hub
- `/demo/live/rewards` — rebuilt
- `/demo/super-admin` — tenant control
- `/demo/merchant` — Harbour Lane storefront
- `/demo/app` — mobile frame

---

_End of brief._
