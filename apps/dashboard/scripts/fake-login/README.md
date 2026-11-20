# Fake login, for looking at CRM pages locally

Most CRM pages sit behind the login, so they can't be checked in a local browser without a real Supabase account. This folder runs a fake Supabase with sample data instead. The real CRM code runs against it, logged in as the owner of a sample shop (Nonna's Kitchen), and nothing is saved anywhere.

Use it to look at a page after a change, at desktop and phone widths, before opening a pull request.

## What's here

| File | What it does |
|---|---|
| `server.mjs` | The fake Supabase on port 54321. Answers the logged-in user and table reads from `fixtures.json`. Every write is logged to `writes.log`, so you can check what a Save button sent, and nothing is stored |
| `fixtures.json` | The sample data. One owner (also a super admin, so the onboarding wizard opens), one shop with split hours and own-driver delivery, one menu item, and six orders in different states (new, delivered, refunded, part refunded, refund failed, a counter sale) |
| `login.mjs` | `open(path, viewport)` opens a logged-in page in Playwright and returns `{ browser, page, errors }` |

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

Then, from a `.mjs` script in this folder:

```js
import { open } from "./login.mjs";
const { browser, page, errors } = await open("/orders", { width: 390, height: 844 });
await page.screenshot({ path: "orders.png" });
await browser.close();
```

Pages that keep a live connection open (Orders) never go quiet, so wait for something on the page rather than for the network.

## Limits

- Reads understand `eq`, `neq`, `in`, `is.null` and simple `gt`/`lt` filters. Anything else returns every row.
- Live updates (realtime), file storage and anything outside Supabase (Stripe, Twilio, Resend) aren't faked. Routes that call Stripe will fail.
- Add a table to `fixtures.json` when a page needs it. A table that isn't there reads as empty.
