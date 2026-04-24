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

- **Extend existing code, don't rebuild.** The monorepo already contains a working CRM (`apps/dashboard`), marketing site (`apps/web`), storefront (`apps/storefront`), shared UI (`packages/ui`), and a Supabase schema with 10 applied migrations. Match existing patterns — don't invent parallel ones.
- **Follow the architecture.** Tenant scoping (`business_id` + RLS), module flags (`businesses.settings.modules`), server routes that verify session → `business_id`. See `system-architecture.md` §4–§7.
- **Follow the design system.** Reuse components from `apps/dashboard/components/` (shell, sidebar, topbar, stat-card, page-header, empty-state, modal, toast, badge). Match the look in `apps/zentrabite-dashboard-files/dashboard-build/`. Dark premium shell, green accent, glass-morphism cards.
- **Treat `docs/context/` as logic/architecture guidance** — when in doubt about *what should happen*, read context first, don't guess.
- **Treat `docs/reference/` as UI/component guidance** — when in doubt about *what it should look like*, check reference first.
- **Respect the Next.js 16 note** in `apps/dashboard/AGENTS.md` — App Router, React 19, TS strict. Read `node_modules/next/dist/docs/` before writing Next-specific code.
- **Supabase is the backend.** Browser client in `lib/supabase.ts`, server/service-role client in `lib/supabase-server.ts`. Migrations under `supabase/migrations/`.

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
apps/docs             Docs app (scaffolded)
packages/ui           Shared React components
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
