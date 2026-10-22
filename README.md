# ZentraBite

ZentraBite helps restaurants and small businesses take orders direct, keep their own customers and win them back, instead of paying 30% to delivery apps. One login covers online ordering, the restaurant's own website, a CRM, rewards, win-back texts and the day-to-day running of the business.

Live at [zentrabite.com](https://zentrabite.com). The merchant CRM is at [dashboard.zentrabite.com](https://dashboard.zentrabite.com), and each restaurant gets its own site at `name.zentrabite.com`.

## What's in this repo

| Folder | What it is |
|---|---|
| `apps/web` | The marketing site at zentrabite.com, plus the clickable demos under `/demo` |
| `apps/dashboard` | The merchant CRM, restaurant websites and ordering pages, and the admin tools |
| `apps/storefront` | A standalone storefront build. Not deployed, the live ordering pages are in `apps/dashboard` |
| `packages/eslint-config`, `packages/typescript-config` | Shared lint and TypeScript settings |
| `supabase/migrations` | The database schema |
| `supabase/functions` | Scheduled jobs (nightly analytics, win-back, birthday rewards) |
| `docs/context` | How the system works. Architecture, every CRM page, deploy steps |
| `docs/reference` | How it should look. Brand, logo, icons, design reference |

## Built with

Next.js 16 and React 19, Supabase (database, logins, storage), Stripe Connect for payments, Twilio for texts, Resend for email, and Claude for the AI features. Hosted on Vercel. The repo is a Turborepo monorepo using npm workspaces.

## Running it locally

```sh
npm install
npm run dev
```

Each app needs its own `.env.local`. The variable names and where each one comes from are in [docs/context/deploy-runbook.md](docs/context/deploy-runbook.md). Never commit real keys.

## Before you change anything

Read [CLAUDE.md](CLAUDE.md) and the docs in `docs/context`. They explain how tenants are kept apart, how modules are switched on, and which parts are live and which are still to do.
