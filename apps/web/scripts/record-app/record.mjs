#!/usr/bin/env node
// Records real screen clips of the ZentraBite demo app for the marketing site.
//
// Each flow in flows.mjs is played by Playwright against a running copy of
// apps/web, captured from the Chromium screencast, then trimmed, cropped and
// encoded with ffmpeg into public/media/app/. See README.md in this folder.
//
// Nothing here changes the demo's code. While it records, the script adds a
// style tag that hides the demo's own banners (see `chrome` in flows.mjs), a
// tap ring at each click, a small colour marker in the strip the crop removes
// (so the trim lands on the exact frame), and a seeded Math.random so ids like
// the POS order number come out the same every run.

/* global process, Buffer, window, document, requestAnimationFrame, getComputedStyle */

import { createRequire } from "node:module";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { flows } from "./flows.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const WEB_ROOT = path.resolve(HERE, "../..");

// ── Settings ────────────────────────────────────────────────────────────────

// Viewport sizes are CSS pixels, and clips come out at exactly that size:
// 1440x900 desktop, 390x844 phone. `scale` is the device pixel ratio the page
// sees. It does not make the clip bigger: the Chromium screencast that both
// capture methods use always sends CSS-pixel frames (checked, 1x and 2x give
// identical frames). Full-scale screenshots of a 2x phone only managed 11 to
// 14 fps here and let fixed headers jitter during scrolls, and smooth beats
// sharp, so phone clips are 1x too.
const DEVICES = {
  desktop: { width: 1440, height: 900, scale: 1, mobile: false, maxBytes: 1_500_000, ring: 34 },
  phone: { width: 390, height: 844, scale: 2, mobile: true, maxBytes: 800_000, ring: 44 },
};

// Clips are exported at 30 fps.
const OUT_FPS = 30;

const MARK = { start: [255, 0, 255], end: [0, 255, 255] };

// ── CLI ─────────────────────────────────────────────────────────────────────

function parseArgs(argv) {
  const args = {
    base: "http://localhost:3401",
    only: null,
    out: path.join(WEB_ROOT, "public/media/app"),
    work: path.join(tmpdir(), "zb-record-app"),
    contactSheet: null,
    keepRaw: false,
    headed: false,
    capture: "screencast",
    pace: "auto",
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const next = () => argv[++i];
    if (a === "--base") args.base = next().replace(/\/$/, "");
    else if (a === "--only") args.only = next().split(",").map((s) => s.trim()).filter(Boolean);
    else if (a === "--out") args.out = path.resolve(next());
    else if (a === "--work") args.work = path.resolve(next());
    else if (a === "--contact-sheet") args.contactSheet = path.resolve(next());
    else if (a === "--keep-raw") args.keepRaw = true;
    else if (a === "--headed") args.headed = true;
    else if (a === "--pace") {
      const v = next();
      args.pace = v === "auto" ? "auto" : Math.min(12, Math.max(1, Math.round(Number(v)) || 1));
    }
    else if (a === "--capture") {
      args.capture = next();
      if (!["screencast", "video"].includes(args.capture)) {
        console.error("--capture is screencast or video.");
        process.exit(1);
      }
    }
    else if (a === "--list") {
      for (const f of flows) console.log(`${f.id.padEnd(10)} ${f.device.padEnd(8)} ${f.path}`);
      process.exit(0);
    } else if (a === "--help" || a === "-h") {
      console.log(readFileSync(path.join(HERE, "README.md"), "utf8"));
      process.exit(0);
    } else {
      console.error(`Unknown option ${a}. Try --help.`);
      process.exit(1);
    }
  }
  return args;
}

function loadPlaywright() {
  const require = createRequire(import.meta.url);
  try {
    return require("playwright");
  } catch {
    // Fall back to a global install (npm i -g playwright).
    const root = spawnSync("npm", ["root", "-g"], { encoding: "utf8" }).stdout.trim();
    try {
      return require(path.join(root, "playwright"));
    } catch {
      console.error("Playwright is not installed. Install it with `npm i -g playwright` and `npx playwright install chromium`.");
      process.exit(1);
    }
  }
}

// ── In-page helpers (run inside the browser) ────────────────────────────────

function pageHelpers({ ring, ringSize, seed }) {
  // Slow motion (see "Recording"): once window.__zbPace is set, the page's own
  // timers run that many times slower, in step with its animations, so a
  // 2.4 s message still lasts 2.4 s in the clip.
  const st = window.setTimeout.bind(window);
  const si = window.setInterval.bind(window);
  window.setTimeout = (fn, ms, ...rest) => st(fn, (Number(ms) || 0) * (window.__zbPace || 1), ...rest);
  window.setInterval = (fn, ms, ...rest) => si(fn, (Number(ms) || 0) * (window.__zbPace || 1), ...rest);

  // Seeded Math.random, so ids such as the POS order number repeat run to run.
  let s = seed >>> 0;
  Math.random = () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  const RING = {
    dark: { fill: "rgba(255,255,255,0.16)", line: "rgba(255,255,255,0.62)" },
    light: { fill: "rgba(26,22,18,0.10)", line: "rgba(26,22,18,0.42)" },
  }[ring];

  function layer(css) {
    const d = document.createElement("div");
    d.setAttribute("aria-hidden", "true");
    d.style.cssText = `position:fixed;pointer-events:none;z-index:2147483647;${css}`;
    document.documentElement.appendChild(d);
    return d;
  }

  let marker = null;
  let pulse = null;
  let pulseOn = false;
  const frames = (n) => new Promise((res) => {
    const step = () => (n-- <= 0 ? res() : requestAnimationFrame(step));
    requestAnimationFrame(step);
  });
  const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

  window.__zb = {
    // A small square in the top-left corner. It sits in the demo banner,
    // which the crop removes, so it never shows in a clip.
    mark(color) {
      if (!marker) marker = layer("left:0;top:0;width:12px;height:12px;");
      marker.style.background = `rgb(${color.join(",")})`;
      return frames(2);
    },
    // A tiny change in the cropped strip. The screencast only sends a frame
    // when something repaints, and when it is behind it can drop the last
    // frame of a motion, which would leave a stale picture on screen for the
    // whole hold. A poke makes it send the settled picture.
    poke() {
      if (!pulse) pulse = layer("left:20px;top:0;width:4px;height:4px;");
      pulseOn = !pulseOn;
      pulse.style.background = pulseOn ? "rgb(50,50,50)" : "rgb(60,60,60)";
    },
    // Change the marker on every frame for `ms`, to measure how many frames
    // the capture keeps up with. Greys only, so it never reads as a marker.
    flicker(ms) {
      if (!marker) marker = layer("left:0;top:0;width:12px;height:12px;");
      const t0 = performance.now();
      let n = 0;
      return new Promise((res) => {
        const step = () => {
          marker.style.background = n++ % 2 ? "rgb(40,40,40)" : "rgb(80,80,80)";
          if (performance.now() - t0 < ms) requestAnimationFrame(step);
          else res();
        };
        requestAnimationFrame(step);
      });
    },
    // The tap highlight: a soft ring that grows and fades. transform and
    // opacity only, so it never costs a layout.
    ring(x, y) {
      const r = ringSize / 2;
      const d = layer(
        `left:${x - r}px;top:${y - r}px;width:${ringSize}px;height:${ringSize}px;border-radius:50%;` +
          `background:${RING.fill};box-shadow:inset 0 0 0 2px ${RING.line};opacity:0;`,
      );
      const a = d.animate(
        [
          { opacity: 0, transform: "scale(0.55)" },
          { opacity: 1, transform: "scale(1)", offset: 0.3 },
          { opacity: 0, transform: "scale(1.3)" },
        ],
        { duration: 620, easing: "cubic-bezier(0.22, 0.61, 0.36, 1)" },
      );
      a.onfinish = () => d.remove();
    },
    // Eased scroll over a fixed time. The site sets scroll-behavior: smooth on
    // <html>, so each step asks for an instant jump to stay in control.
    scroll(el, to, ms) {
      const target = el || document.scrollingElement;
      const from = { top: target.scrollTop, left: target.scrollLeft };
      const dest = { top: to.top ?? from.top, left: to.left ?? from.left };
      // performance.now, not the rAF timestamp: the slowed animation clock
      // also slows rAF timestamps, and `ms` is already wall time.
      const t0 = performance.now();
      return new Promise((res) => {
        const step = () => {
          const p = Math.min(1, (performance.now() - t0) / ms);
          const k = ease(p);
          target.scrollTo({
            top: from.top + (dest.top - from.top) * k,
            left: from.left + (dest.left - from.left) * k,
            behavior: "instant",
          });
          if (p < 1) requestAnimationFrame(step);
          else res();
        };
        requestAnimationFrame(step);
      });
    },
  };
}

// ── Studio: what a flow script can do ───────────────────────────────────────

class Studio {
  // All times a flow passes in are clip time. The page runs `pace` times
  // slower than the clip, so every wait here is stretched by `pace`.
  constructor(page, device, flow) {
    this.page = page;
    this.device = device;
    this.flow = flow;
    this.pace = 1;
    this.cropTop = flow.chrome?.cropTop ?? 0;
    // Time spent finding things before a tap. On a busy machine this adds up
    // and stretches the clip, so the next hold is shortened to pay it back.
    this.debt = 0;
  }

  async hold(ms) {
    const wait = Math.max(ms * 0.5, ms - this.debt);
    this.debt = Math.max(0, this.debt - (ms - wait));
    // Poke every 250 ms of clip time so a hold always shows the settled screen.
    this.poke();
    for (let left = wait; left > 0; left -= 250) {
      await this.sleep(Math.min(250, left));
      this.poke();
    }
  }

  // Fire and forget, so a slow round trip never stretches the clip.
  poke() {
    this.page.evaluate(() => window.__zb.poke()).catch(() => {});
  }

  sleep(ms) {
    return new Promise((res) => setTimeout(res, ms * this.pace));
  }

  async point(target, at = {}) {
    if (typeof target.x === "number" && typeof target.y === "number") return target;
    await target.waitFor({ state: "visible" });
    const box = await target.boundingBox();
    if (!box) throw new Error(`${this.flow.id}: target has no box`);
    return { x: box.x + box.width * (at.x ?? 0.5), y: box.y + box.height * (at.y ?? 0.5) };
  }

  // Tap or click. The target must already be on screen: Playwright would
  // otherwise jump-scroll to it, which looks wrong in a clip. Scroll first.
  async tap(target, { at, lead = 150, after = 0 } = {}) {
    const t0 = performance.now();
    const { x, y } = await this.point(target, at);
    const vp = this.page.viewportSize();
    if (x < 0 || x > vp.width || y < this.cropTop || y > vp.height) {
      throw new Error(`${this.flow.id}: tap at ${Math.round(x)},${Math.round(y)} is off screen. Scroll to it first.`);
    }
    await this.page.evaluate(([px, py]) => window.__zb.ring(px, py), [x, y]);
    this.debt += (performance.now() - t0) / this.pace;
    await this.sleep(lead);
    if (this.device.mobile) {
      await this.page.touchscreen.tap(x, y);
    } else {
      await this.page.mouse.move(x, y);
      await this.page.mouse.down();
      await this.sleep(70);
      await this.page.mouse.up();
    }
    if (after) await this.hold(after);
  }

  async type(text, delay = 75) {
    await this.page.keyboard.type(text, { delay });
  }

  // Scroll the page (or an element when `el` is a locator) over `ms`.
  async scroll(to, ms = 900, el = null) {
    const dest = typeof to === "number" ? { top: to } : to;
    const wall = ms * this.pace;
    if (el) await el.evaluate((node, [d, t]) => window.__zb.scroll(node, d, t), [dest, wall]);
    else await this.page.evaluate(([d, t]) => window.__zb.scroll(null, d, t), [dest, wall]);
    this.poke();
  }

  // Park the mouse in the strip the crop removes, so nothing shows a hover state.
  async rest() {
    if (!this.device.mobile) await this.page.mouse.move(2, 2);
  }

  async mark(kind) {
    await this.page.evaluate((c) => window.__zb.mark(c), MARK[kind]);
  }
}

// ── Recording ───────────────────────────────────────────────────────────────

// Two ways to capture, both built on the Chromium screencast.
//
// screencast (default)  Frames straight from the DevTools screencast, sent
//                       whenever the page repaints, each with the time it was
//                       drawn. They are laid on a constant 30 fps clock by that
//                       time, so motion plays at real speed, and there is only
//                       one lossy encode.
// video                 Playwright's recordVideo, kept for comparison. It writes
//                       every frame it gets at 25 fps whatever its real time, so
//                       a scroll or a slide plays slower than it happened (about
//                       1.2x on this machine, more on a faster one), and it goes
//                       through a 1 Mbps VP8 file first.
async function startScreencast(page, size, dir) {
  const cdp = await page.context().newCDPSession(page);
  const frames = [];
  const writes = [];
  cdp.on("Page.screencastFrame", ({ data, metadata, sessionId }) => {
    cdp.send("Page.screencastFrameAck", { sessionId }).catch(() => {});
    const file = path.join(dir, `f${String(frames.length).padStart(5, "0")}.jpg`);
    frames.push({ ts: metadata.timestamp, file });
    writes.push(writeFile(file, Buffer.from(data, "base64")));
  });
  await cdp.send("Page.startScreencast", {
    format: "jpeg",
    quality: 95,
    maxWidth: size.width,
    maxHeight: size.height,
    everyNthFrame: 1,
  });
  return {
    count: () => frames.length,
    async stop() {
      await cdp.send("Page.stopScreencast");
      await Promise.all(writes);
      await cdp.detach().catch(() => {});
      return frames;
    },
  };
}

// Lay the frames on a constant 30 fps clock by the time each was drawn.
// Stored lossless.
function assembleFrames(frames, dir, pace) {
  if (frames.length < 2) throw new Error("The capture returned fewer than two frames.");
  const lines = ["ffconcat version 1.0"];
  for (let i = 0; i < frames.length; i++) {
    const next = frames[i + 1];
    const duration = next ? Math.max(0.001, (next.ts - frames[i].ts) / pace) : 0.5;
    lines.push(`file '${path.basename(frames[i].file)}'`, `duration ${duration.toFixed(6)}`);
  }
  // The concat demuxer drops the last duration unless the file repeats.
  lines.push(`file '${path.basename(frames[frames.length - 1].file)}'`);
  const list = path.join(dir, "frames.ffconcat");
  writeFileSync(list, lines.join("\n") + "\n");
  const raw = path.join(dir, "raw.mkv");
  run("ffmpeg", [
    "-v", "error", "-y", "-f", "concat", "-safe", "0", "-i", list,
    "-vf", `fps=${OUT_FPS}`, "-an", "-c:v", "libx264rgb", "-qp", "0", "-preset", "ultrafast", raw,
  ]);
  const gaps = frames.slice(1).map((f, i) => (f.ts - frames[i].ts) / pace).sort((x, y) => x - y);
  return { raw, frames: frames.length, medianGapMs: Math.round(gaps[Math.floor(gaps.length / 2)] * 1000) };
}

// The demo's own "this is a demo" strips and the sidebar trial link are hidden
// with a style tag while recording. The demo code is untouched. Each selector
// must match and end up hidden, so a change to the demo fails loudly here
// instead of leaking into a clip.
async function hideDemoChrome(page, flow) {
  const chrome = flow.chrome;
  if (!chrome) return;
  await page.addStyleTag({ content: chrome.css });
  const missing = await page.evaluate((selectors) => {
    return selectors.filter((sel) => {
      const els = [...document.querySelectorAll(sel)];
      if (els.length === 0) return true;
      return els.some((el) => {
        const cs = getComputedStyle(el);
        return cs.display !== "none" && cs.visibility !== "hidden";
      });
    });
  }, chrome.hidden);
  if (missing.length) throw new Error(`${flow.id}: could not hide ${missing.join(", ")}`);
}

// On a busy machine the screencast can fall to a few frames a second. So the
// page is run in slow motion and the frames are laid back on the clock at
// real speed: at pace 4 the page runs four times slower than the clip, and a
// capture of 8 fps becomes 32 fps in the clip. With `--pace auto` the pace is
// picked per flow from a one second test in the cropped strip.
async function choosePace(page, capture, wanted) {
  const before = capture.count();
  const t0 = performance.now();
  await page.evaluate(() => window.__zb.flicker(1000));
  const fps = ((capture.count() - before) * 1000) / (performance.now() - t0);
  const pace = wanted === "auto" ? Math.min(16, Math.max(1, Math.ceil(45 / Math.max(fps, 1)))) : wanted;
  return { pace, fps: Math.round(fps * 10) / 10 };
}

// CSS transitions, Web Animations and the page's timers all run `pace` times
// slower. (rAF timestamps slow down with the animation clock too, which is why
// the scroll helper times itself with performance.now.)
async function slowDown(page, pace) {
  await page.evaluate((p) => {
    window.__zbPace = p;
  }, pace);
  if (pace === 1) return;
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Animation.enable");
  await cdp.send("Animation.setPlaybackRate", { playbackRate: 1 / pace });
}

async function recordFlow(browser, flow, args) {
  const dev = DEVICES[flow.device];
  const grab = args.capture;
  const out = 1;
  const cropTop = flow.chrome?.cropTop ?? 0;
  const viewport = { width: dev.width, height: dev.height + cropTop };
  const size = { width: viewport.width * out, height: viewport.height * out };
  const rawDir = path.join(args.work, "raw", flow.id);
  rmSync(rawDir, { recursive: true, force: true });
  mkdirSync(rawDir, { recursive: true });

  const context = await browser.newContext({
    viewport,
    deviceScaleFactor: dev.scale,
    isMobile: dev.mobile,
    hasTouch: dev.mobile,
    locale: "en-AU",
    timezoneId: "Australia/Adelaide",
    reducedMotion: "no-preference",
    ...(grab === "video" ? { recordVideo: { dir: rawDir, size } } : {}),
  });
  await context.addInitScript(pageHelpers, { ring: flow.ring ?? "dark", ringSize: dev.ring, seed: 20260418 });
  const page = await context.newPage();
  const video = page.video();
  let capture = null;
  let frames = null;
  let pace = 1;
  let fps = null;
  try {
    await page.goto(args.base + flow.path, { waitUntil: "networkidle" });
    await hideDemoChrome(page, flow);
    await page.evaluate(() => document.fonts.ready);
    // Let images and emoji settle before the first frame of the clip.
    await page.waitForTimeout(700);
    const studio = new Studio(page, dev, flow);
    if (flow.setup) await flow.setup(studio);
    await studio.rest();
    if (grab === "screencast") {
      capture = await startScreencast(page, size, rawDir);
      ({ pace, fps } = await choosePace(page, capture, args.pace));
      await slowDown(page, pace);
      studio.pace = pace;
    }
    await studio.hold(500);
    await studio.mark("start");
    await flow.run(studio);
    await studio.mark("end");
    // recordVideo can run a little behind, so give it time to catch up.
    await studio.hold(grab === "video" ? 2500 : 600);
    if (capture) frames = await capture.stop();
  } finally {
    await context.close();
  }
  if (grab === "video") return { raw: await video.path(), dir: rawDir, out, grab, pace, fps };
  const assembled = assembleFrames(frames, rawDir, pace);
  return { ...assembled, dir: rawDir, out, grab, pace, fps };
}

// ── Video processing ────────────────────────────────────────────────────────

function run(cmd, cmdArgs, opts = {}) {
  const r = spawnSync(cmd, cmdArgs, { maxBuffer: 1 << 30, ...opts });
  if (r.status !== 0) {
    throw new Error(`${cmd} failed: ${(r.stderr || "").toString().slice(-2000)}`);
  }
  return r;
}

// Find the frames where the start and end markers first appear.
function findMarks(raw, scale) {
  const box = 4 * scale;
  const r = run("ffmpeg", ["-v", "error", "-i", raw, "-vf", `crop=${box}:${box}:${box}:${box}`, "-f", "rawvideo", "-pix_fmt", "rgb24", "-"]);
  const buf = r.stdout;
  const size = box * box * 3;
  const count = Math.floor(buf.length / size);
  const near = (rgb, want) => want.every((v, i) => Math.abs(rgb[i] - v) < 70);
  let start = -1;
  let end = -1;
  for (let f = 0; f < count; f++) {
    const rgb = [0, 0, 0];
    for (let p = 0; p < box * box; p++) for (let c = 0; c < 3; c++) rgb[c] += buf[f * size + p * 3 + c];
    for (let c = 0; c < 3; c++) rgb[c] /= box * box;
    if (start < 0 && near(rgb, MARK.start)) start = f;
    if (start >= 0 && near(rgb, MARK.end)) {
      end = f;
      break;
    }
  }
  if (start < 0 || end < 0) throw new Error(`Could not find the start and end markers in ${raw}`);
  return { start, end, total: count };
}

function probe(file) {
  const r = run("ffprobe", ["-v", "error", "-select_streams", "v:0", "-count_frames", "-show_entries", "stream=width,height,nb_read_frames:format=duration", "-of", "json", file]);
  const j = JSON.parse(r.stdout.toString());
  const s = j.streams[0];
  return { width: s.width, height: s.height, frames: Number(s.nb_read_frames), duration: Number(j.format.duration) };
}

const bytes = (f) => statSync(f).size;

// Trim, crop and convert to 30 fps, stored lossless so each encode starts from
// the same clean frames.
function makeMaster(raw, marks, cropPx, master) {
  const vf = [
    `trim=start_frame=${marks.start}:end_frame=${marks.end}`,
    "setpts=PTS-STARTPTS",
    `crop=iw:ih-${cropPx}:0:${cropPx}`,
    `fps=${OUT_FPS}`,
  ].join(",");
  run("ffmpeg", ["-v", "error", "-y", "-i", raw, "-vf", vf, "-an", "-c:v", "libx264rgb", "-qp", "0", "-preset", "ultrafast", master]);
}

function scaleFilter(width, height, k) {
  if (k === 1) return [];
  const w = Math.round((width * k) / 2) * 2;
  const h = Math.round((height * k) / 2) * 2;
  return [`scale=${w}:${h}:flags=lanczos`];
}

function encodeMp4(master, out, crf, scale) {
  const vf = [...scale, "format=yuv420p"].join(",");
  run("ffmpeg", [
    "-v", "error", "-y", "-i", master, "-vf", vf, "-an",
    "-c:v", "libx264", "-preset", "veryslow", "-tune", "animation", "-crf", String(crf),
    "-profile:v", "high", "-pix_fmt", "yuv420p",
    "-x264-params", `keyint=${OUT_FPS * 5}:min-keyint=${OUT_FPS}`,
    "-movflags", "+faststart", out,
  ]);
}

function encodeWebm(master, out, crf, scale) {
  const vf = [...scale, "format=yuv420p"].join(",");
  run("ffmpeg", [
    "-v", "error", "-y", "-i", master, "-vf", vf, "-an",
    "-c:v", "libvpx-vp9", "-b:v", "0", "-crf", String(crf), "-deadline", "good", "-cpu-used", "2",
    "-row-mt", "1", "-tile-columns", "1", "-g", String(OUT_FPS * 5), "-pix_fmt", "yuv420p", out,
  ]);
}

// Lowest CRF that fits the size budget. If even the top CRF is too big, step
// the size down a little: smooth beats sharp.
function fitBudget(label, maxBytes, crfs, scales, encode) {
  let last = null;
  for (const k of scales) {
    for (const crf of crfs) {
      const size = encode(crf, k);
      last = { crf, scale: k, size };
      if (size <= maxBytes) return last;
    }
  }
  console.warn(`  ${label}: over budget at the smallest setting (${last.size} bytes)`);
  return last;
}

function frameAt(master, index, outPng) {
  run("ffmpeg", ["-v", "error", "-y", "-i", master, "-vf", `select=eq(n\\,${index})`, "-frames:v", "1", outPng]);
}

function ssim(a, b) {
  const r = spawnSync("ffmpeg", ["-v", "info", "-i", a, "-i", b, "-lavfi", "ssim", "-f", "null", "-"], { encoding: "utf8" });
  const m = /All:([0-9.]+)/.exec(r.stderr || "");
  return m ? Number(m[1]) : 0;
}

function encodeFlow(flow, rec, args) {
  const dev = DEVICES[flow.device];
  const raw = rec.raw;
  const work = path.join(args.work, "enc", flow.id);
  rmSync(work, { recursive: true, force: true });
  mkdirSync(work, { recursive: true });

  const marks = findMarks(raw, rec.out);
  const master = path.join(work, "master.mkv");
  makeMaster(raw, marks, (flow.chrome?.cropTop ?? 0) * rec.out, master);
  const m = probe(master);

  const name = `${flow.id}-${flow.device}`;
  const mp4 = path.join(args.out, `${name}.mp4`);
  const webm = path.join(args.out, `${name}.webm`);
  const webp = path.join(args.out, `${name}.webp`);

  const scales = [1, 0.85, 0.75];
  const mp4Fit = fitBudget(`${name}.mp4`, dev.maxBytes, [26, 27, 28, 29, 30, 31, 32], scales, (crf, k) => {
    encodeMp4(master, mp4, crf, scaleFilter(m.width, m.height, k));
    return bytes(mp4);
  });
  // Same picture size as the MP4 so either source fits the same frame.
  const scale = scaleFilter(m.width, m.height, mp4Fit.scale);
  const webmFit = fitBudget(`${name}.webm`, dev.maxBytes, [34, 36, 38, 40, 42], [mp4Fit.scale], (crf) => {
    encodeWebm(master, webm, crf, scale);
    return bytes(webm);
  });

  // Poster: the first frame, so the switch from poster to video is invisible.
  const first = path.join(work, "first.png");
  const lastPng = path.join(work, "last.png");
  frameAt(master, 0, first);
  frameAt(master, m.frames - 1, lastPng);
  run("ffmpeg", ["-v", "error", "-y", "-i", first, "-vf", [...scale].join(",") || "null", "-c:v", "libwebp", "-quality", "82", "-compression_level", "6", webp]);
  const loopScore = ssim(first, lastPng);

  const out = probe(mp4);
  return {
    id: flow.id,
    device: flow.device,
    title: flow.title,
    shows: flow.shows,
    route: flow.path,
    width: out.width,
    height: out.height,
    viewport: { width: dev.width, height: dev.height },
    fps: OUT_FPS,
    duration: Math.round((m.frames / OUT_FPS) * 100) / 100,
    loop: loopScore >= 0.97 ? "seamless" : "cut",
    loopSsim: Math.round(loopScore * 1000) / 1000,
    files: {
      mp4: `/media/app/${name}.mp4`,
      webm: `/media/app/${name}.webm`,
      poster: `/media/app/${name}.webp`,
    },
    bytes: { mp4: bytes(mp4), webm: bytes(webm), poster: bytes(webp) },
    encode: { mp4Crf: mp4Fit.crf, webmCrf: webmFit.crf, scale: mp4Fit.scale },
    capture: { method: rec.grab, pace: rec.pace, testFps: rec.fps },
  };
}

// ── Manifest and contact sheet ──────────────────────────────────────────────

function writeManifest(outDir, entries) {
  const file = path.join(outDir, "clips.json");
  let existing = [];
  if (existsSync(file)) {
    try {
      existing = JSON.parse(readFileSync(file, "utf8")).clips ?? [];
    } catch {
      existing = [];
    }
  }
  // Keep clips that were not re-recorded this run, in the order of flows.mjs.
  const byId = new Map(existing.map((c) => [`${c.id}-${c.device}`, c]));
  for (const e of entries) byId.set(`${e.id}-${e.device}`, e);
  const order = flows.map((f) => `${f.id}-${f.device}`);
  const clips = [...byId.values()].sort((a, b) => order.indexOf(`${a.id}-${a.device}`) - order.indexOf(`${b.id}-${b.device}`));
  const manifest = {
    about:
      "Real screen recordings of the ZentraBite demo app (sample data). Made by apps/web/scripts/record-app. " +
      "Each clip is muted and loops. Poster is the first frame.",
    generated: new Date().toISOString().slice(0, 10),
    clips,
  };
  writeFileSync(file, JSON.stringify(manifest, null, 2) + "\n");
  return manifest;
}

async function contactSheet(browser, outDir, manifest, target, workDir) {
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
  const kb = (n) => `${Math.round(n / 1024)} KB`;
  const cards = manifest.clips
    .map((c) => {
      const src = pathToFileURL(path.join(outDir, path.basename(c.files.poster))).href;
      return `<figure class="${c.device}"><img src="${src}" alt=""><figcaption><b>${esc(c.id)}-${esc(c.device)}</b>
        <span>${c.duration}s · ${c.width}×${c.height} · mp4 ${kb(c.bytes.mp4)} · webm ${kb(c.bytes.webm)} · ${c.loop}</span>
        <em>${esc(c.shows)}</em></figcaption></figure>`;
    })
    .join("");
  const html = `<!doctype html><meta charset="utf-8"><style>
    body{margin:0;padding:32px;background:#e9edf1;font:14px/1.4 system-ui,sans-serif;color:#0f1f2d;width:1856px}
    h1{font-size:20px;margin:0 0 20px}
    .grid{display:flex;flex-wrap:wrap;gap:24px;align-items:flex-start}
    figure{margin:0;background:#fff;border:1px solid #cbd5e1;border-radius:10px;padding:10px}
    figure.desktop img{width:576px;height:360px}
    figure.phone img{width:240px;height:519px}
    figure.phone{width:240px} figure.desktop{width:576px}
    img{display:block;border-radius:6px;object-fit:cover;background:#0f1f2d}
    figcaption{margin-top:8px;display:grid;gap:2px}
    figcaption span{color:#44546a;font-size:12.5px} figcaption em{font-style:normal;color:#44546a;font-size:12.5px}
  </style><h1>ZentraBite app clips · posters</h1><div class="grid">${cards}</div>`;
  const htmlFile = path.join(workDir, "contact-sheet.html");
  writeFileSync(htmlFile, html);
  const context = await browser.newContext({ viewport: { width: 1920, height: 1000 }, deviceScaleFactor: 1 });
  const page = await context.newPage();
  await page.goto(pathToFileURL(htmlFile).href, { waitUntil: "load" });
  const png = target.replace(/\.webp$/, "") + ".png";
  mkdirSync(path.dirname(target), { recursive: true });
  await page.screenshot({ path: png, fullPage: true });
  await context.close();
  rmSync(htmlFile, { force: true });
  run("ffmpeg", ["-v", "error", "-y", "-i", png, "-c:v", "libwebp", "-quality", "88", target]);
  rmSync(png, { force: true });
}

// ── Main ────────────────────────────────────────────────────────────────────

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const selected = args.only ? flows.filter((f) => args.only.includes(f.id) || args.only.includes(`${f.id}-${f.device}`)) : flows;
  if (args.only && selected.length === 0) {
    console.error(`No flow matches ${args.only.join(", ")}. Try --list.`);
    process.exit(1);
  }

  const ping = await fetch(args.base + "/demo/live").catch(() => null);
  if (!ping || !ping.ok) {
    console.error(`Can't reach ${args.base}/demo/live. Start the site first, see README.md.`);
    process.exit(1);
  }

  mkdirSync(args.out, { recursive: true });
  mkdirSync(args.work, { recursive: true });
  const { chromium } = loadPlaywright();
  const browser = await chromium.launch({ headless: !args.headed });
  const entries = [];
  try {
    for (const flow of selected) {
      const t = Date.now();
      process.stdout.write(`● ${flow.id}-${flow.device}: recording`);
      const rec = await recordFlow(browser, flow, args);
      process.stdout.write(", encoding");
      const entry = encodeFlow(flow, rec, args);
      entries.push(entry);
      // Written after every clip, so a failure later in the run keeps it.
      writeManifest(args.out, entries);
      if (!args.keepRaw) rmSync(rec.dir, { recursive: true, force: true });
      console.log(
        `\n  ${entry.duration}s ${entry.width}x${entry.height} · mp4 ${entry.bytes.mp4} B (crf ${entry.encode.mp4Crf}) · ` +
          `webm ${entry.bytes.webm} B (crf ${entry.encode.webmCrf}) · loop ${entry.loop} (${entry.loopSsim}) · ` +
          `capture ${entry.capture.testFps} fps, pace ${entry.capture.pace} · ${Math.round((Date.now() - t) / 1000)}s`,
      );
    }
    const manifest = writeManifest(args.out, entries);
    if (args.contactSheet) {
      await contactSheet(browser, args.out, manifest, args.contactSheet, args.work);
      console.log(`Contact sheet: ${args.contactSheet}`);
    }
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
