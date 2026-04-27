# ZentraBite — Product Status & Roadmap
_Last updated: April 2026_

---

## ✅ Working Now

- [ ] Auth — login, signup, session handling (cookie-based)
- [ ] Dashboard — real stats from Supabase (revenue, orders, customers)
- [ ] Customers — view, add manually, segments, order history
- [ ] Menu — add/edit/delete categories and items
- [ ] Automations — create SMS campaigns, run manually, real sent/converted stats
- [ ] Settings — business profile, Stripe Connect (saves account ID), subscription checkout
- [ ] Financials — real revenue data, margin breakdown, direct vs aggregator split
- [ ] Orders page — view and filter orders
- [ ] Analytics page
- [ ] Rewards page — points leaderboard
- [ ] Stripe webhook — orders, customers, and points update automatically on payment
- [ ] Vercel deployment + daily automation cron job (9am)
- [ ] RLS — row-level security on all Supabase tables

---

## 🔴 Must Have Before Launch

These are table-stakes — clients will expect them on day one.

- [ ] **Client storefront** — public ordering page at `yourbusiness.zentrabite.com` where customers browse menu and place orders
- [ ] **Order intake** — way for restaurants to take phone/walk-in orders manually; or QR menu for dine-in customers
- [ ] **Twilio SMS tested end-to-end** — confirm real messages send to Australian numbers before charging clients
- [ ] **Stripe subscription live** — add real product/price ID to `.env` so clients can actually pay $500/mo
- [ ] **Multi-tenant isolation tested** — verify two restaurant accounts are fully isolated (RLS working in production)
- [ ] **Password reset flow** — "Forgot password" link on login page so clients don't get locked out

---

## 🟡 Important — Launch Without If Needed

Can go live without these but should be built soon after.

- [ ] **POS screen** — basic order-taking screen for front-of-house staff on tablet
- [ ] **CSV customer import** — restaurants have existing lists they'll want to bulk-upload
- [ ] **Xero integration** — accounting sync (Restoplus also has this as "coming soon")
- [ ] **AI calls** — automated voice follow-up calls (placeholder page exists)
- [ ] **BiteBack network** — aggregator offer marketplace concept
- [ ] **Email campaigns** — currently SMS-only; email expands reach significantly
- [ ] **Richer analytics charts** — more detailed revenue and retention charts

---

## 🔵 Competitive Advantages Over Restoplus

- Automated win-back engine with configurable triggers, discounts, and cooldowns
- Transparent flat pricing ($500/mo — Restoplus hides pricing behind "get a quote")
- Customer segmentation (VIP / At Risk / New) built in
- Aggregator fee calculator showing restaurants exactly what they're losing
- Fully self-serve — no sales call needed to get started
- No POS lock-in — sits on top of whatever system they already use

---

## 🗓 Suggested Launch Order

1. Confirm Twilio sends real SMS ✓
2. Add Stripe price ID → subscription billing live ✓
3. Build password reset page ✓
4. Test two-account isolation ✓
5. Build basic client storefront (direct ordering page)
6. Soft launch with 2–3 pilot restaurants
7. Build POS screen + CSV import based on pilot feedback
8. Xero, AI calls, email campaigns in order of client demand
