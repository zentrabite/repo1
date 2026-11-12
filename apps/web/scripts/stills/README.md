# Stills

Re-takes the screenshots the website uses (public/media/hero and public/media/features) from the demo, so they always match the app. Run them whenever the demo's look changes (a new colour, new data, a redesigned screen). The clips are separate, in `../record-app`.

1. Build and start the website on port 3401. Stop any old server first, or pages come out unstyled.
   ```
   cd apps/web
   pkill -f next-server; npx next build && npx next start -p 3401
   ```
2. Capture (needs Playwright, already in the workspace image).
   ```
   node scripts/stills/site.cjs stills-out       # the demo restaurant's site, its menu, the POS
   node scripts/stills/features.cjs stills-out   # feature page screens (fp-*) and the customer app
   node scripts/stills/crm.cjs stills-out        # the other CRM screens the homepage uses
   ```
3. Convert into the site's webp files.
   ```
   python3 scripts/stills/to-webp.py stills-out
   ```
4. Look at a few before committing, and delete `stills-out`.

How a CRM still is taken. A 1440 by 940 window at 2x, the demo banner and the sidebar's back link hidden, then the area right of the sidebar (x 232, y 40, 1208 by 755) is cut out and saved at 1120 by 700.
