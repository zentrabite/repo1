// ─── proxy.ts ─────────────────────────────────────────────────────────────────
// Next.js 16 server proxy (replaces the deprecated middleware.ts).
// Runs on every request before the page renders — refreshes the Supabase
// session cookie and redirects unauthenticated users to /login.

import { NextResponse, type NextRequest } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

const PUBLIC_PATHS = ["/login", "/signup", "/auth", "/forgot-password", "/reset-password", "/store"];

// Paths that must render client-side even without a session so JS can inspect
// the URL hash fragment (which the server never sees, and some mobile browsers
// strip through a 303 redirect). The root "/" uses this to rescue
// password-recovery tokens that Supabase dumps there instead of /reset-password.
const HASH_RESCUE_PATHS = ["/"];

export async function proxy(req: NextRequest) {
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
  const isPublic     = PUBLIC_PATHS.some(p => pathname.startsWith(p));
  const isHashRescue = HASH_RESCUE_PATHS.includes(pathname);

  // 1. No session + protected route → send to login
  //    EXCEPT: paths in HASH_RESCUE_PATHS always render, even without a
  //    session, so client JS can inspect window.location.hash (which the
  //    server never sees). The root "/" page uses this to forward
  //    password-recovery tokens to /reset-password.
  if (!session && !isPublic && !isHashRescue) {
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
