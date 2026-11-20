# Fake login, for looking at CRM pages locally

Most CRM pages sit behind the login, so they can't be checked in a local browser without a real Supabase account. This folder runs a fake Supabase with sample data instead. The real CRM code runs against it, logged in as the owner of a sample shop (Nonna's Kitchen), and nothing is saved anywhere.

Use it to look at a page after a change, at desktop and phone widths, before opening a pull request.

## What's here

| File | What it does |
|---|---|
| `server.mjs` | The fake Supabase on port 54321. Answers the logged-in user and table reads from `fixtures.json`. Every write is logged to `writes.log`, so you can check what a Save button sent, and nothing is stored |
| `fixtures.json` | The sample data. One owner (also a super admin, so the onboarding wizard opens), one seller (Sam Lee) with two shops sold, two owner Stripe links (see `_notes` in the file), one shop with split hours, own-driver delivery and a $10 first order offer, one menu item, six orders in different states (new, delivered, refunded, part refunded, refund failed, a counter sale), and two win-back offer codes. `/store/nonna?code=W4NTPRZZ` shows a live 20% off code and `?code=K7MP4QXA` a used one. The first order came from the counter QR code and the second used a code. Four win-back sends in November (three messaged, one held back) fill `/zentra-rewards/report?month=2026-11` |
| `login.mjs` | `open(path, viewport, as)` opens a logged-in page in Playwright and returns `{ browser, page, errors }`. `as` is `"owner"` (the default) or `"seller"` |

## Run it

```bash
# 1. The fake Supabase
node apps/dashboard/scripts/fake-login/server.mjs &

# 2. The CRM, pointed at it (stop any old server first)
pkill -f next-server
cd apps/dashboard
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321 \
NEXT_PUBLIC_SUPABASE_ANON_KEY=fake \
SUPABASE_SERVICE_ROLE_KEY=fake \
npm run dev
```

Since Next.js 16.4.6, `next dev` can reload a page over and over under Playwright (it does on main too). If a screenshot fails with "Execution context was destroyed", build and start it instead, with the same three settings in front of each: `npx next build` then `npx next start -p 3000`.

Then, from a `.mjs` script in this folder:

```js
import { open } from "./login.mjs";
const { browser, page, errors } = await open("/orders", { width: 390, height: 844 });
await page.screenshot({ path: "orders.png" });
await browser.close();
```

Pages that keep a live connection open (Orders) never go quiet, so wait for something on the page rather than for the network.

If the server won't start because port 54321 is in use, an old copy is still running. Stop it with `pkill -f server.mjs`.

## Limits

- Reads understand `eq`, `neq`, `in`, `is.null` and simple `gt`/`lt` filters. Anything else returns every row.
- Live updates (realtime), file storage and anything outside Supabase (Stripe, Twilio, Resend) aren't faked. Routes that call Stripe will fail.
- Add a table to `fixtures.json` when a page needs it. A table that isn't there reads as empty.
