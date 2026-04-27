# docs/reference — UI & visual reference

Source of truth for **how ZentraBite should look and feel**. For system logic and architecture, see [`../context/`](../context/).

## What lives here

Visual/UI reference material only — prototype components, mockups, design tokens, screenshots, and anything showing the intended look of the product.

## Existing reference assets

- **[apps/zentrabite-dashboard-files/](../../apps/zentrabite-dashboard-files/dashboard-build/)** — the original CRM dashboard prototype. Contains the canonical visual language (dark premium shell, green accent, glass-morphism cards, sidebar + topbar layout). Use this as the design reference when building new CRM pages. See its own [README](../../apps/zentrabite-dashboard-files/dashboard-build/README.md).
- **[apps/dashboard/components/](../../apps/dashboard/components/)** — the production component library built from the prototype. `dashboard-shell.tsx`, `dashboard-sidebar.tsx`, `dashboard-topbar.tsx`, `page-header.tsx`, `stat-card.tsx`, `empty-state.tsx`, `badge.tsx`, `modal.tsx`, `toast.tsx`, `impersonation-banner.tsx`. Extend these — don't rebuild.
- **[apps/dashboard/app/globals.css](../../apps/dashboard/app/globals.css)** and **[tailwind.config.ts](../../apps/dashboard/tailwind.config.ts)** — brand tokens and Tailwind theme.
- **[apps/web/app/globals.css](../../apps/web/app/globals.css)** — marketing-site tokens.
- **[apps/web/app/demo/live/](../../apps/web/app/demo/live/)** — the demo CRM sandbox; the reference for how each CRM module should feel when finished.

## Notes

- No `zentrabite_crm.jsx` file was found in the repo. The visual reference is split between the prototype build under `apps/zentrabite-dashboard-files/` and the production components under `apps/dashboard/components/`.
- If you add screenshots, annotated mockups, or new prototype files, drop them in this folder and list them above.

## Rules for using this folder

- Treat production components in `apps/dashboard/components/` as canonical — match their API, naming and styling when adding pages.
- Before introducing a new visual pattern, check if the prototype or production shell already covers it.
- Do not change application code just to satisfy reference material — reference guides new work, not retrofits.
