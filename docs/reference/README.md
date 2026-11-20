# docs/reference: how ZentraBite should look

Updated 12 November 2026. For how the system works, see [`../context/`](../context/).

## Start here

- **[brand/zentrabite-brand.html](brand/zentrabite-brand.html)** is the brand sheet. Logo, colours, type, buttons, how we write, and the look of the website and the app. If the sheet and the code disagree, the code wins.
- **[brand/logo/](brand/logo/)** has the vector ZB logo and when to use each file.
- **[brand/icons/](brand/icons/)** has ZentraBite's own icon set. Both apps use it.
- **The marketing site rules** are in the root [`CLAUDE.md`](../../CLAUDE.md), under "Marketing site rules". They win over anything older.

## The two looks

ZentraBite has two looks on purpose.

| | Marketing site (`apps/web`, not the demos) | The app (`apps/dashboard`, and the demos under `apps/web/app/demo`) |
|---|---|---|
| Ground | Light only. White page, navy `#0E192C` for the closing section and footer | Dark shell. `#0F1F2D` background, `#1C2D48` cards |
| Font | Plus Jakarta Sans. The logo stays in Outfit | Outfit for headings, Inter for body text |
| Colours live in | `apps/web/app/globals.css` | `apps/dashboard/app/globals.css` and `apps/dashboard/tailwind.config.ts` |
| Rules | Root `CLAUDE.md` | The components in `apps/dashboard/components/` |

The marketing site was redone in November 2026. The app still has its April 2026 look, including frosted glass on some cards. A colour tidy-up for the app is planned, so check with the team before copying its older patterns into new work.

## Reference code

- **[apps/dashboard/components/](../../apps/dashboard/components/)** is the app's component library. `dashboard-shell.tsx`, `dashboard-sidebar.tsx`, `dashboard-topbar.tsx`, `page-header.tsx`, `stat-card.tsx`, `empty-state.tsx`, `badge.tsx`, `modal.tsx`, `toast.tsx`, `impersonation-banner.tsx`. Extend these, don't rebuild them.
- **[apps/web/app/components/](../../apps/web/app/components/)** has the marketing site's parts. The homepage sections are in `home/`.
- **[apps/web/app/demo/live/](../../apps/web/app/demo/live/)** is the demo CRM. It shows how each part of the app should feel when finished.
- **[apps/zentrabite-dashboard-files/](../../apps/zentrabite-dashboard-files/dashboard-build/)** is the original April 2026 CRM prototype the app was built from. It's kept as a record of where the app's look came from.

## Archive

[`archive/`](archive/) holds old experiments. Don't build from them.

## Rules for using this folder

- Match the production components when adding app pages.
- Before adding a new visual pattern, check whether one already exists.
- Don't change application code just to match reference material. Reference guides new work.
