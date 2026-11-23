// Opens a logged-in page of the local CRM against the fake Supabase
// (server.mjs). See README.md.
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";

// Playwright is installed globally in the workspace, which a plain import
// can't see. Loading it the CommonJS way finds it either way.
const load = createRequire(import.meta.url);
const { chromium } = load("playwright");

const dir = new URL(".", import.meta.url).pathname;

/** The session cookie @supabase/ssr reads. as: "owner" (also a super admin), "seller" or "staff" (Mia, a team member). */
export function sessionCookie(as = "owner") {
  const fx = JSON.parse(readFileSync(dir + "fixtures.json", "utf8"));
  const user = as === "seller" ? fx.seller : as === "staff" ? fx.staff : fx.user;
  const session = {
    access_token: `fake-${user.id}`,
    token_type: "bearer",
    expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    refresh_token: "fake-refresh-token",
    user,
  };
  return { name: "sb-localhost-auth-token", value: "base64-" + Buffer.from(JSON.stringify(session)).toString("base64url"), domain: "localhost", path: "/" };
}

/** A logged-in page at path, e.g. open("/settings", { width: 390, height: 844 }) or open("/sell", undefined, "seller"). */
export async function open(path, viewport = { width: 1280, height: 900 }, as = "owner") {
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport, deviceScaleFactor: 1 });
  await context.addCookies([sessionCookie(as)]);
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", e => errors.push(String(e)));
  page.on("console", m => { if (m.type() === "error") errors.push(m.text()); });
  await page.goto("http://localhost:3000" + path, { waitUntil: "load" });
  return { browser, page, errors };
}
