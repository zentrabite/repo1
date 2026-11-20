# apps/web: the marketing site and the demos

This is zentrabite.com. It's a Next.js 16 app (App Router, React 19).

## What's in it

| Path | What it is |
|---|---|
| `app/page.tsx` and `app/components/home/` | The homepage and its sections |
| `app/features/` | The features overview and the 18 feature pages. The copy is in `data.ts` |
| `app/how-it-works/`, `app/pricing/`, `app/contact/` | The other marketing pages |
| `app/demo/` | The clickable demos. The live CRM, the POS, the demo restaurant's own site, its customer app and super admin. All sample data, from `sample-business.ts` |
| `app/api/ai-chat/` | The website assistant. What it knows is in `lib/zentrabite-context.ts` |
| `app/globals.css` | Every colour and the motion rules for the marketing site |
| `app/fonts/` | Self-hosted fonts, so builds don't depend on Google Fonts |
| `public/media/` | `app` (recorded clips of the demo), `hero` and `features` (screenshots), `demo` (the demo restaurant's food photos) |
| `scripts/` | `record-app` re-records the clips, `stills` re-takes the screenshots, `checks` has the checks to run before shipping. Each has its own README |

## Run it

From the repo root.

```sh
npm install
npm run dev --workspace=web
```

It runs on http://localhost:3000. The website assistant needs `ANTHROPIC_API_KEY` in `apps/web/.env.local`. Everything else works without keys.

## Rules

The marketing site has its own design rules. Read "Marketing site rules" in the root [`CLAUDE.md`](../../CLAUDE.md) before changing anything here. The demos under `/demo` follow the app's look, not the marketing site's.

## Before shipping

Run the checks in [`scripts/checks`](scripts/checks/README.md) on a production build. If a screen in the demo changes, re-take the pictures with `scripts/stills` and `scripts/record-app` so the site still shows the real product.
