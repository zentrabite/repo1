# Ship the Business OS upgrade — full runbook

Everything from the upgrade brief is built and type-clean. None of it is on
the live site yet because git pushes from the Cowork sandbox can't auth to
GitHub. This file walks you through the **5 steps to get it live** plus the
remaining infra tasks.

---

## Step 1 · Push the upgrade to GitHub (5 min)

The whole upgrade is in `business-os-upgrade.patch` (in this folder). Apply
it from your local repo and push.

**Important:** stop using `C:\Windows\System32\zentrabite\repo1` — that path
needs admin permissions and breaks git locks. Move the repo first:

```powershell
# In PowerShell (Run as Administrator the first time):
move C:\Windows\System32\zentrabite C:\dev\zentrabite
```

Then apply and push:

```powershell
cd C:\dev\zentrabite\repo1
git checkout main
git pull origin main
git am C:\dev\zentrabite\business-os-upgrade.patch
git push origin main
```

If `git am` complains, use the simpler `git apply` path:

```powershell
git apply --3way C:\dev\zentrabite\business-os-upgrade.patch
git add -A
git commit -m "Reposition as Business OS + Stock take / AI ordering"
git push origin main
```

If Vercel is connected to the repo it will auto-deploy in ~2 min and the
new homepage will be live at https://repo1-web-rho.vercel.app/.

---

## Step 2 · Run the pending Supabase migrations (5 min)

Go to **Supabase → SQL Editor → New query**. Paste each file and run.

1. `supabase/migrations/006_notifications.sql` — owner notifications table
2. `supabase/migrations/007_realtime_orders.sql` — turn on realtime for
   orders, notifications, and order_items (so live order toasts work)

Both are idempotent. Confirm success in **Database → Replication** — you
should see `orders`, `notifications`, and `order_items` listed under
`supabase_realtime`.

---

## Step 3 · Set production env vars in Vercel (10 min)

Open `.env.production.example` (in the repo root, just added). Copy each
line into **Vercel → Project → Settings → Environment Variables** for the
**Production** scope. You'll need:

| Source | Variables |
|---|---|
| Supabase → Settings → API | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` |
| Stripe → Developers → API keys (live) | `STRIPE_SECRET_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `STRIPE_PRICE_MERCHANT_MONTHLY` |
| (after Step 4) | `STRIPE_WEBHOOK_SECRET` |
| Twilio | `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER` |
| Resend | `RESEND_API_KEY`, `RESEND_FROM_EMAIL` |
| Set yourself | `NEXT_PUBLIC_APP_URL=https://dashboard.zentrabite.com.au`, `NEXT_PUBLIC_MARKETING_URL=https://zentrabite.com.au` |

After saving, redeploy: **Deployments → … → Redeploy**.

---

## Step 4 · Add the production Stripe webhook (3 min)

In **Stripe → Developers → Webhooks → Add endpoint**:

- **Endpoint URL:** `https://dashboard.zentrabite.com.au/api/stripe/webhook`
  (or your current Vercel URL until the custom domain is live)
- **Events to listen to** (the ones the handler already supports):
  - `payment_intent.succeeded`
  - `payment_intent.payment_failed`
  - `charge.refunded`
  - `account.updated` (Stripe Connect)
  - `payout.paid`

Copy the **Signing secret** (`whsec_...`) into Vercel as
`STRIPE_WEBHOOK_SECRET`, then redeploy.

---

## Step 5 · Swap Stripe test keys for live (3 min)

In **Stripe → Developers → API keys**, toggle **"Viewing test data"** off
and copy:

- **Secret key** → `STRIPE_SECRET_KEY` in Vercel
- **Publishable key** → `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` in Vercel

Re-create your `$99/mo Growth` price in **live mode**, copy its
`price_...` ID, paste into `STRIPE_PRICE_MERCHANT_MONTHLY`. Redeploy.

⚠️ Real charges from real cards will start working immediately. Make sure
your bank details on the connected Stripe account are correct first.

---

## Step 6 · Point the custom domain at Vercel (5 min, then DNS time)

In **Vercel → Project → Settings → Domains → Add**:
- `dashboard.zentrabite.com.au`
- (and `zentrabite.com.au` for the marketing project once split — see below)

Vercel will give you a CNAME target like `cname.vercel-dns.com.`. Add that
in your domain registrar's DNS panel (Route53, Cloudflare, etc.). DNS can
take 5 min – 24 hr to propagate.

---

## Step 7 · (Optional) Split apps/web into its own Vercel project

Right now both `apps/dashboard` and `apps/web` likely share one Vercel
project. Split them so the marketing site lives at
`zentrabite.com` independently:

1. **Vercel → Add New → Project → Import** the same GitHub repo
2. **Root Directory:** `apps/web`
3. **Build Command:** `cd ../.. && npx turbo run build --filter=web`
4. **Install Command:** `npm install` (run at repo root)
5. **Output Directory:** `.next`
6. Add domain `zentrabite.com.au` (or `zentrabite.com`) to this new project
7. Add the marketing-site env vars: `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_MARKETING_URL`

---

## Step 8 · Smoke-test a real storefront order (5 min)

Once Steps 1–6 are done:

1. Open your real storefront URL (`https://dashboard.zentrabite.com.au/store/<your-subdomain>`)
2. Add an item, check out with a real card (Apple Pay or saved card)
3. Watch your dashboard's **Orders** page — the new order should appear
   within 2 seconds with a toast/chime (proves realtime works)
4. Confirm the Stripe webhook fired in **Stripe → Webhooks → … → Events**
5. Check your phone for the SMS notification (if the order automation rule
   is on)
6. Refund it from the dashboard to confirm the refund flow

If anything fails, check **Vercel → Deployments → … → Functions → Logs**
for the relevant route.

---

## Step 9 · Move the repo out of `C:\Windows\System32` (1 min, must do)

Already covered in Step 1. Don't skip — every git operation creates lock
files that the System32 ACL won't release, which is what's been breaking
your local commits.

---

## Reference: what's pending after this

These are roadmap items from the new `ZentraBite_CRM_Backend_Handover.docx`.
None of them block shipping the upgrade. They're the real engineering work
to make the Business OS positioning *technically true* (not just a UX
promise on the marketing site):

- Event-driven order orchestration (order.created → fanout to inventory,
  CRM, loyalty, finance, reporting)
- `recipes / product_components` table + auto stock deduction on
  order.completed
- `stock_batches` with expiry (currently a flat `stock_items` table)
- `daily_metrics` materialised tables for the dashboard
- `insight_snapshots` worker for the daily AI brief email
- Loyalty events table + rebuilt CRM segments
- Background job runner (Inngest / Trigger.dev / Supabase Edge Functions)

Want me to scope and sequence those next? They're 4–8 weeks of focused
backend work, not a one-shot.
