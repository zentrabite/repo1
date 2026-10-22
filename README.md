# ZentraBite

ZentraBite gives small businesses one system to win customers, keep them and bring them back. That means their own website and online ordering, a customer list, rewards, win-back texts, reviews and an AI assistant, with modules switched on per business. It started with restaurants, where it replaces 30% delivery app fees with direct ordering. The same core is built to work for salons, gyms, shops, trades and other local businesses.

Live at [zentrabite.com](https://zentrabite.com). The merchant CRM is at [dashboard.zentrabite.com](https://dashboard.zentrabite.com), and each business gets its own site at `name.zentrabite.com`.

## What's in this repo

| Folder | What it is |
|---|---|
| `apps/web` | The marketing site at zentrabite.com, plus the clickable demos under `/demo` |
| `apps/dashboard` | The merchant CRM, each business's website and ordering page, and the admin tools |
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
