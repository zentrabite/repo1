# ZentraBite — Merchant Portal

> Next.js 14 · TypeScript · App Router · Tailwind CSS

---

## Getting started

```bash
cd zentrabite
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — it redirects straight to `/dashboard`.

---

## Project structure

```
src/
  app/
    layout.tsx                  # Root layout (fonts, global CSS)
    page.tsx                    # Redirects → /dashboard
    dashboard/
      layout.tsx                # Sidebar + TopBar shell
      page.tsx                  # Dashboard home
      customers/page.tsx
      orders/page.tsx
      campaigns/page.tsx
      analytics/page.tsx
      menu/page.tsx
      settings/page.tsx
  components/
    dashboard/
      Sidebar.tsx               # Left nav (7 tabs, active state via usePathname)
      TopBar.tsx                # Header with breadcrumb + user menu
      Icon.tsx                  # Inline SVG icon set
      pages/
        DashboardHome.tsx       # Stat cards, orders, win-back ROI, 7-day chart
        PlaceholderPage.tsx     # Shared stub for pages not yet built
  lib/
    brand.ts                    # Colours + fonts — single source of truth
```

---

## Brand tokens

All colours and fonts live in `src/lib/brand.ts`. Edit once, updates everywhere.

| Token | Value |
|-------|-------|
| nearBlack | `#0A1628` |
| darkNavy  | `#0F1F2D` |
| green     | `#00B67A` |
| orange    | `#FF6B35` |
| cloud     | `#E2E8F0` |

Fonts: **Outfit** (headings) · **Inter** (body) · **JetBrains Mono** (data)

---

## Next steps (from the blueprint)

- **Step 7** — Stripe Connect + webhook endpoint
- **Step 8** — Supabase client, RLS policies, live data on Dashboard
- **Step 9** — Real-time orders Kanban (Supabase Realtime WebSocket)
- **Step 10** — Customer list + CRM profile page
