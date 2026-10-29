// ─── proxy.ts ─────────────────────────────────────────────────────────────────
// Next.js 16 server proxy (replaces the deprecated middleware.ts).
// Runs on every request before the page renders — refreshes the Supabase
// session cookie and redirects unauthenticated users to /login.

import { NextResponse, type NextRequest } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { tenantFromHost } from "@/lib/tenant";

// /site is each restaurant's public website (also served at name.zentrabite.com).
// /unsubscribe is where the link in a marketing email lands.
const PUBLIC_PATHS = ["/login", "/signup", "/auth", "/forgot-password", "/reset-password", "/store", "/site", "/unsubscribe"];

// API routes that are called by outside services or by customers who aren't
// logged in. Each one checks its own credentials, so the login gate must let
// them through:
//   /api/stripe/webhook    — Stripe, verified by signature
//   /api/sms/inbound       — Twilio replies (STOP), verified by signature
//   /api/automations/run   — Vercel cron, verified by CRON_SECRET (the manual
//                            path inside it checks the login itself)
//   /api/billing/trial-reminders — Vercel cron, verified by CRON_SECRET
//   /api/store/            — the public ordering page (menu, checkout, receipt)
//   /api/delivery/fee      — fee preview on the public ordering page
//   /api/unsubscribe       — email unsubscribe, verified by a signed token
// Match exact paths or a trailing-slash prefix so "/api/store" can't be used
// to open something like "/api/storefront-admin" by accident.
const PUBLIC_API_EXACT  = [
  "/api/stripe/webhook", "/api/sms/inbound", "/api/automations/run", "/api/billing/trial-reminders",
  "/api/delivery/fee", "/api/unsubscribe",
];
const PUBLIC_API_PREFIX = ["/api/store/"];

function isPublicApi(pathname: string): boolean {
  return PUBLIC_API_EXACT.includes(pathname) || PUBLIC_API_PREFIX.some(p => pathname.startsWith(p));
}

// Paths that must render client-side even without a session so JS can inspect
// the URL hash fragment (which the server never sees, and some mobile browsers
// strip through a 303 redirect). The root "/" uses this to rescue
// password-recovery tokens that Supabase dumps there instead of /reset-password.
const HASH_RESCUE_PATHS = ["/"];

// ─── Restaurant hosts (name.zentrabite.com) ─────────────────────────────────
// Only the public website and ordering page are reachable on a restaurant's
// host. The CRM never answers there.
//   /                         → /site/<name>      their website
//   /order                    → /store/<name>     ordering page
//   /store/<name>[/success]   → as is              Stripe sends customers back here
//   /api/store/*, /api/delivery/fee              public ordering APIs
// Anything else goes back to their home page.
function tenantResponse(req: NextRequest, tenant: string): NextResponse {
  const { pathname } = req.nextUrl;
  const url = req.nextUrl.clone();
  if (pathname === "/") {
    url.pathname = `/site/${tenant}`;
    return NextResponse.rewrite(url);
  }
  if (pathname === "/order") {
    url.pathname = `/store/${tenant}`;
    return NextResponse.rewrite(url);
  }
  if (pathname === `/store/${tenant}` || pathname.startsWith(`/store/${tenant}/`)) return NextResponse.next();
  if (pathname.startsWith("/api/store/") || pathname === "/api/delivery/fee") return NextResponse.next();
  url.pathname = "/";
  url.search = "";
  const host = req.headers.get("host");
  if (host) url.host = host;
  return NextResponse.redirect(url);
}

export async function proxy(req: NextRequest) {
  const tenant = tenantFromHost(req.headers.get("host"));
  if (tenant) return tenantResponse(req, tenant);

  // Start with a pass-through response so cookie mutations are forwarded.
  let res = NextResponse.next({ request: { headers: req.headers } });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return req.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          // Write back to both the request (for downstream server components)
          // and the response (so the browser receives the refreshed cookie).
          req.cookies.set({ name, value, ...options });
          res = NextResponse.next({ request: { headers: req.headers } });
          res.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          req.cookies.set({ name, value: "", ...options });
          res = NextResponse.next({ request: { headers: req.headers } });
          res.cookies.set({ name, value: "", ...options });
        },
      },
    }
  );

  // getSession() also silently refreshes an expired access token if a valid
  // refresh token exists — this is why the proxy exists at all.
  const { data: { session } } = await supabase.auth.getSession();

  const { pathname } = req.nextUrl;
  // Public API routes still get the session refresh above (so a logged-in
  // "Run now" on automations keeps working), they just never get redirected.
  const isPublic     = PUBLIC_PATHS.some(p => pathname.startsWith(p)) || isPublicApi(pathname);
  const isHashRescue = HASH_RESCUE_PATHS.includes(pathname);

  // 1. No session + protected route → send to login
  //    EXCEPT: paths in HASH_RESCUE_PATHS always render, even without a
  //    session, so client JS can inspect window.location.hash (which the
  //    server never sees). The root "/" page uses this to forward
  //    password-recovery tokens to /reset-password.
  if (!session && !isPublic && !isHashRescue) {
    // API callers get a JSON 401 instead of an HTML login page, so failures
    // show up clearly in logs and in the browser's network tab.
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirect", pathname);
    return NextResponse.redirect(url);
  }

  // 2. Has session + hitting login/signup → send to dashboard
  if (session && (pathname === "/login" || pathname === "/signup")) {
    const url = req.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  return res;
}

export const config = {
  matcher: [
    // Run on everything except static assets and Next.js internals.
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
