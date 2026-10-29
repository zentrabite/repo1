# App clip recorder

Records the real ZentraBite demo app for the marketing site. Each flow in
`flows.mjs` is played by Playwright in Chromium, captured from the browser, then
trimmed, cropped and encoded with ffmpeg. Nothing is generated or faked. The
demo runs on its own sample data.

Output goes to `apps/web/public/media/app/`.

- `<flow>-<desktop|phone>.mp4` H.264, yuv420p, faststart, 30 fps, no audio
- `<flow>-<desktop|phone>.webm` VP9, same picture
- `<flow>-<desktop|phone>.webp` poster, which is the first frame
- `clips.json` lists every clip with its files, sizes, length and what it shows

Desktop clips are 1440x900. Phone clips are 390x844.

## Run it

You need Node 22, ffmpeg 6 (with libx264, libvpx-vp9 and libwebp) and
Playwright with Chromium. The script finds Playwright in `node_modules`, on
`NODE_PATH` or in the global npm folder (`npm i -g playwright`, then
`npx playwright install chromium`).

Start the site. A production build is best, so no dev overlay shows up.

```bash
cd apps/web
npx next build
npx next start --port 3401
```

Then, in another terminal, from `apps/web`

```bash
node scripts/record-app/record.mjs                 # all seven clips
node scripts/record-app/record.mjs --only pos,crm  # just these
node scripts/record-app/record.mjs --list          # list the flows
```

A full run takes ten minutes on a quiet two-core machine and more when the
machine is busy, because the page then runs in slow motion (see below).

| Option | Default | What it does |
|---|---|---|
| `--base <url>` | `http://localhost:3401` | Where the site is running |
| `--only <ids>` | all | Comma list of flow ids |
| `--out <dir>` | `public/media/app` | Where the clips go |
| `--work <dir>` | system temp | Scratch files |
| `--contact-sheet <file.webp>` | off | Also save one image of every poster |
| `--keep-raw` | off | Keep the captured frames |
| `--pace <n\|auto>` | `auto` | Run the page `n` times slower than the clip |
| `--capture video` | `screencast` | Use Playwright's recordVideo instead (see below) |
| `--headed` | off | Show the browser |

## How a clip is made

1. The page loads at the device size plus the height of the demo's banner.
2. A style tag hides the demo's own banners and the sidebar trial link, and
   turns off the phone's grey tap flash. The demo code is not changed.
3. The flow script taps, types and scrolls like a visitor. Each tap shows a
   small fading ring, drawn by the script, since a recording has no cursor.
4. Frames come from the Chromium screencast with the time each was drawn, and
   are placed on a steady 30 fps clock by that time. The screencast only sends
   a frame when something repaints and can drop the last frame of a motion, so
   during each hold the script touches a pixel in the cropped strip to make it
   send the settled screen.
5. If the machine is busy the screencast can drop to a few frames a second.
   So before each clip a one second test in the cropped strip measures the
   frame rate, and the page is run that many times slower (up to 16) until
   the clip gets at least 45 frames a second. CSS transitions, Web Animations,
   the page's timers and the script's own waits and scrolls all slow down
   together, and the frame times are divided back. The clip plays at real
   speed. A quiet machine gets pace 1 or 2.
6. A small colour marker in the cropped-off strip marks where the clip starts
   and ends, so the trim lands on the exact frame.
7. ffmpeg crops the strip off, then encodes at the lowest CRF from 26 up that
   keeps the file under budget (1.5 MB desktop, 800 KB phone). If CRF 32 is
   still too big it shrinks the picture a little.

`Math.random` is seeded, so things like the POS order number come out the same
on every run.

A flow either ends in the state it started in, so the loop has no seam, or ends
on a held screen and cuts back to the start. `clips.json` says which
(`loop` is `seamless` or `cut`).

## Why not recordVideo

recordVideo was tried first. It writes every frame it gets at 25 fps whatever
its real time, so scrolls and slides play about 1.2 times slower than they
happened (more on a faster machine), it loses the last frames when the page
closes, and it goes through a 1 Mbps VP8 file before our own encode. The
screencast gives the same frames with true timing and one lossy step.
`--capture video` still works if you want to compare.

Neither method can capture at 2x. The screencast always sends frames at CSS
pixel size, whatever the device scale. Full-scale screenshots of a 2x phone
only managed 11 to 14 fps and made sticky headers jitter, so phone clips stay
at 1x. Smooth beats sharp.

## Add or change a flow

Each flow in `flows.mjs` has an `id`, a `device` (`desktop` or `phone`), the
demo `path`, a `title`, a one-line `shows` for the manifest, its `chrome`
(what to hide and crop) and a `run(s)` function. Inside `run`

- `s.hold(ms)` waits
- `s.tap(locator)` shows the ring and taps or clicks the middle of it
- `s.scroll(y, ms)` scrolls the page, `s.scroll(y, ms, locator)` scrolls a panel
- `s.type(text)` types into the focused field
- `s.rest()` parks the mouse where it can't hover anything

Taps must be on screen. Scroll first, or the script stops with an error rather
than letting Playwright jump-scroll in the middle of a clip.

Slow motion covers CSS, Web Animations and timers, but not the browser's own
smooth scrolling. So scroll with `s.scroll`, and navigate from the top of a
page, since the site scrolls smoothly to the top after a route change.

After a change, watch the clip. Check frames at the start, middle and end for
blank frames, spinners, jumps and cut-off UI.
