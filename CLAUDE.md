# CLAUDE.md — Working instructions for this repo

## Working Instructions (read first)

This repo is an **existing, working CRM** called ZentraBite — a multi-tenant Business Operating System for small operators (hospitality, retail, services). It is not a new project. Do not rebuild anything.

Before making any changes:

1. **Read [docs/context/system-architecture.md](docs/context/system-architecture.md)** to understand how the system is wired.
2. **Read [docs/context/crm-breakdown.md](docs/context/crm-breakdown.md)** to understand what each page does, what's live, what's mocked, and what's pending.
3. **Read [docs/context/rebuild-brief.md](docs/context/rebuild-brief.md)** for product positioning, information architecture, and the rewards/demo strategy.
4. **Skim [docs/reference/](docs/reference/)** for the visual/UI language — component conventions, design tokens, prototype patterns.

## How the two docs folders differ

| Folder | Use for |
|---|---|
| `docs/context/` | **How the system works.** Logic, architecture, business rules, data model, module behaviour, cross-module dependencies, pending gaps. Source of truth for *behaviour*. |
| `docs/reference/` | **How the system should look.** Prototype files, component examples, design tokens, mockups. Source of truth for *UI/visual style*. |

## Rules when working in this repo

- **Extend existing code, don't rebuild.** The monorepo already contains a working CRM (`apps/dashboard`), marketing site (`apps/web`), storefront (`apps/storefront`), and a Supabase schema with 10 applied migrations. Match existing patterns — don't invent parallel ones.
- **Follow the architecture.** Tenant scoping (`business_id` + RLS), module flags (`businesses.settings.modules`), server routes that verify session → `business_id`. See `system-architecture.md` §4–§7.
- **Follow the design system.** Reuse components from `apps/dashboard/components/` (shell, sidebar, topbar, stat-card, page-header, empty-state, modal, toast, badge). Match the look in `apps/zentrabite-dashboard-files/dashboard-build/`. Dark premium shell, green accent, glass-morphism cards.
- **The marketing site (`apps/web`) is different.** It follows the taste skill (design-taste-frontend), and its rules win over older site rules. See "Marketing site rules" below. The demo sandboxes under `/demo/*` stay dark and keep their old colours.
- **Treat `docs/context/` as logic/architecture guidance** — when in doubt about *what should happen*, read context first, don't guess.
- **Treat `docs/reference/` as UI/component guidance** — when in doubt about *what it should look like*, check reference first.
- **Respect the Next.js 16 note** in `apps/dashboard/AGENTS.md` — App Router, React 19, TS strict. Read `node_modules/next/dist/docs/` before writing Next-specific code.
- **Supabase is the backend.** Browser client in `lib/supabase.ts`, server/service-role client in `lib/supabase-server.ts`. Migrations under `supabase/migrations/`.

## Marketing site rules (`apps/web`, not the demos)

- **Colour.** Light only (12 Nov), no dark mode or switch. Use the theme colours in `apps/web/app/globals.css` (`--bg`, `--band`, `--text`, `--accent` ...), never hex colours in components. Navy chapters (`.on-navy`: the homepage close and the footer) are navy. The homepage opens on white (round 3, picked 11 Nov), with the CRM screen running down into a green band (`.hm-green`, near-black words). Brand: green #00AD82 (changed from #00B67A on 12 Nov, because the old green was too close to Uber Eats; the other greens are shades of it), navy #1C2D48, near-black #0F1F2D. The marketing site uses the deeper navy #0E192C (`--nv-bg`, picked 11 Nov) on a white page; the demos keep #1C2D48. On light grounds green text uses `--accent-text`, because brand green is too faint there.
- **Type.** Plus Jakarta Sans (picked 11 Nov). The logo keeps Outfit (`--font-logo`), and so do the demos. Headlines two lines or fewer (the homepage hero is the agreed exception: up to three on desktop, four on a phone). About five sizes on a page. Running text in the full ink at 16px or more; grey is for notes.
- **Actions.** One main action, "Book a call", always worded exactly that way, as a flat green pill with near-black text. The only secondary action is "Try the live demo" (`/demo/live`), as a text link.
- **Banned.** Eyebrow labels above headings, numbered steps and 01/02 counters, hairline dividers and 1px outlined boxes, shadows on things at rest (only what floats may have one: the sticky bar, the assistant, dialogs, and the app cards laid over the hero's screen), gradients, glows, glass, gradient or coloured words in headlines, rows of icon-topped cards, emoji, monospace, device frames. Tell surfaces apart with a step in tone (`--band`, `--surface-2`), not a line.
- **Pictures.** Show the real product: the clips in `public/media/app` through `AppScreen`, and the screenshots in `public/media/hero` and `public/media/features`. Mark interface fragments with `data-ui` (they keep their own borders). Caption them as our demo restaurant with sample data.
- **Honest proof only.** The live demo, built in Adelaide, no commission on direct orders and you keep your customer list. No invented stats, testimonials, logos or results, and never present demo data as a real customer. Sign-ups aren't open yet; there'll be a 1-month free trial at launch. Price talk goes to `/pricing`.
- **Words.** Short sentences, plain Australian English, no em dashes.
- **Motion.** Transform and opacity only. Words never fade in: only pictures and app screens move, each section in its own way, quick and short (about 300 to 450ms). The list is under "Reveals" in `globals.css`. Scroll reveals fire once (`data-reveal` and `data-r`, run by `components/reveal.tsx`). Every move has a `prefers-reduced-motion` fallback, and hover styles sit behind `(hover: hover) and (pointer: fine)`.
- **Phones.** Inputs 16px or more, targets 44px or more, `env(safe-area-inset-*)` on anything fixed, and no sideways page scroll at 320px.
- **The website assistant** is the floating button from `components/assistant.tsx` (rendered by the footer). It loads the chat only when first opened. Open it from anywhere with `AskAssistant` in `components/assistant-trigger.tsx`.
- **Check before shipping.** Run the taste skill's `lint.mjs` and `inspect.mjs` on a production build. The features pages are done (12 Nov). The pricing and how-it-works pages still carry some older devices (labels, numbered steps, outlined cards) until they're redone.

## Key references

- [docs/context/system-architecture.md](docs/context/system-architecture.md) — overall architecture, data model, module map, cross-module flows, pending gaps.
- [docs/context/crm-breakdown.md](docs/context/crm-breakdown.md) — page-by-page behaviour of every CRM screen.
- [docs/context/rebuild-brief.md](docs/context/rebuild-brief.md) — product strategy, IA, demo architecture, rewards rebuild, roadmap.
- [docs/context/deploy-runbook.md](docs/context/deploy-runbook.md) — env, migrations, Stripe webhook, domains.
- [docs/reference/](docs/reference/) — visual/UI reference (component library, prototype, design tokens).

## Repo map (quick)

```
apps/web              Marketing site + demo sandboxes
apps/dashboard        Production merchant CRM (Supabase-backed)
apps/storefront       Tenant storefront build
packages/*-config     Shared eslint and TypeScript settings
supabase/migrations   001 → 010 schema
supabase/functions    Edge functions (nightly-analytics, win-back)
docs/context          System logic + architecture (start here)
docs/reference        UI/visual reference
```

## Do not

- Do not rebuild modules that exist.
- Do not duplicate the schema — extend migrations in-place.
- Do not invent new design primitives when `components/` already has one.
- Do not mix concerns between `docs/context/` (logic) and `docs/reference/` (visual).
