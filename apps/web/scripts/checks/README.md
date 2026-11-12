# Checks before shipping the website

Run these on a production build (`npx next build && npx next start -p 3100`). Stop any old `next-server` first.

**Taste lint and inspector.** From the design-taste-frontend skill's `scripts` folder.
```
node <skill>/scripts/lint.mjs app/features app/components app/globals.css app/page.tsx app/layout.tsx
CHROME_PATH=/path/to/chrome-nosandbox.sh node <skill>/scripts/inspect.mjs http://localhost:3100/features
```
In the cloud workspace, Chrome needs `--no-sandbox`. Make a two-line wrapper and point CHROME_PATH at it.
```
#!/bin/sh
exec "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" --no-sandbox "$@"
```
The target is 0 fails. Warnings about "no real photos" and "no footage" are expected for a software site that shows its own screens.

**Phone check.** `phone-check.py` taps through the demos and website pages on an emulated phone and flags anything wider than the screen, spilling out or squashed.
```
BASE=http://localhost:3100 WEB=1 ONLYWEB=1 SHOTS=0 python3 scripts/checks/phone-check.py 360 "Site features,Site feature pos"
```
Without a label list it checks everything, which takes a long time. Keep it to the pages you changed.

**Sideways scroll.** Load each changed page at 320, 768, 1024 and 1280 wide and check `document.documentElement.scrollWidth` isn't bigger than the window.
