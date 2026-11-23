// Every API route checks who's calling before it touches data.
//
// Routes use the service role, which skips the database's row rules, so the
// route itself has to tie the request to the caller's shop. This reads every
// app/api/**/route.ts and fails when one has no check:
//   • a route behind the login must call requireBusiness (the caller's own
//     shop), assertSuperAdmin, assertSellerOrAdmin, or read the login with
//     auth.getUser() and take the shop from it
//   • a route open without a login (the list in proxy.ts) must be listed
//     below with what protects it, and use that protection
// A new route fails here until it has one of these.

import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const API = join(ROOT, "app/api");

const LOGIN_GUARDS = /\brequireBusiness\(|\bassertSuperAdmin\(|\bassertSellerOrAdmin\(|\bauth\.getUser\(/;

// Open without a login, and what keeps each one safe instead.
const PUBLIC: Record<string, { why: string; check: RegExp }> = {
  "/api/stripe/webhook":           { why: "Stripe, checked by its signature", check: /constructEvent\(/ },
  "/api/sms/inbound":              { why: "Twilio, checked by its signature", check: /validTwilioSignature\(/ },
  "/api/sms/status":               { why: "Twilio's delivery reports, checked by its signature", check: /validTwilioSignature\(/ },
  "/api/email/events":             { why: "Resend's delivery reports, checked by their Svix signature", check: /validResendSignature\(/ },
  "/api/automations/run":          { why: "Vercel cron with CRON_SECRET, or a logged-in manager", check: /CRON_SECRET[\s\S]*requireBusiness\(/ },
  "/api/billing/trial-reminders":  { why: "Vercel cron with CRON_SECRET", check: /CRON_SECRET/ },
  "/api/delivery/fee":             { why: "A shop's public delivery price, nothing private", check: /delivery/ },
  "/api/unsubscribe":              { why: "A signed unsubscribe token", check: /readUnsubscribeToken\(/ },
  "/api/public/enquiries":         { why: "The website's contact form, with a spam guard and a rate limit", check: /ENQUIRY_RATE_LIMITS/ },
  "/api/store/[subdomain]":        { why: "One shop's menu and hours, by its address (no prices or settings beyond what the ordering page shows)", check: /Only the public bits of settings/ },
  "/api/store/checkout":           { why: "Prices come from the database, payment on the shop's Stripe account", check: /menu_items/ },
  "/api/store/session":            { why: "A paid Stripe session, read on the shop's own account", check: /stripeAccount/ },
  "/api/stripe-setup/[code]":      { why: "A one-use code, stored only as a hash", check: /findSetupLink\(/ },
};

function routes(dir: string): string[] {
  return readdirSync(dir).flatMap(name => {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) return routes(p);
    return name === "route.ts" ? [p] : [];
  });
}

const urlOf = (file: string) => "/" + relative(join(ROOT, "app"), file).replace(/\/route\.ts$/, "").split("\\").join("/");

describe("API routes", () => {
  const files = routes(API);

  it("finds the routes", () => {
    expect(files.length).toBeGreaterThan(30);
  });

  it("match the proxy's list of routes open without a login", () => {
    const proxy = readFileSync(join(ROOT, "proxy.ts"), "utf8");
    const exact = [...(/PUBLIC_API_EXACT\s*=\s*\[([\s\S]*?)\]/.exec(proxy)?.[1] ?? "").matchAll(/"([^"]+)"/g)].map(x => x[1]);
    const prefix = [...(/PUBLIC_API_PREFIX\s*=\s*\[([\s\S]*?)\]/.exec(proxy)?.[1] ?? "").matchAll(/"([^"]+)"/g)].map(x => x[1]!);
    const open = files.map(urlOf).filter(u => exact.includes(u) || prefix.some(p => u.startsWith(p))).sort();
    expect(open).toEqual(Object.keys(PUBLIC).sort());
  });

  for (const file of routes(API)) {
    const url = urlOf(file);
    it(`${url} checks who's calling`, () => {
      const src = readFileSync(file, "utf8");
      const open = PUBLIC[url];
      if (open) expect(src, `${url} should use: ${open.why}`).toMatch(open.check);
      else expect(src, `${url} has no login check`).toMatch(LOGIN_GUARDS);
    });
  }
});
