// ─── POST /auth/logout ──────────────────────────────────────────────────────
// Server-side sign-out. We have to do this on the server (not via the browser
// client) because @supabase/ssr writes session cookies with options the
// browser can't always match when deleting — so `supabase.auth.signOut()`
// in a client component sometimes leaves stale cookies and the next request
// sees a valid session again.
//
// Flow:
//   1. Client POSTs to /auth/logout (no body).
//   2. We call supabase.auth.signOut({ scope: "global" }) on a server client
//      that is wired to write cookie mutations onto the response.
//   3. We explicitly overwrite any lingering sb-* cookies with Max-Age=0 as
//      a belt-and-braces cleanup.
//   4. Redirect to /login.
//
// GET is supported too so <a href="/auth/logout"> works as a fallback.
//
// ?idle=1 is the POS till signing itself out after 15 minutes with no taps
// (components/idle-sign-out.tsx). That signs out this device only, so another
// till on the same login stays signed in, and the login page says why.

import { NextResponse, type NextRequest } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { publicKey } from "@/lib/supabase-keys";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function handle(req: NextRequest) {
  const idle = req.nextUrl.searchParams.get("idle") === "1";
  const url = req.nextUrl.clone();
  url.pathname = "/login";
  url.search   = idle ? "?idle=1" : "";
  const response = NextResponse.redirect(url, { status: 303 });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    publicKey(),
    {
      cookies: {
        get(name: string) {
          return req.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          response.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          response.cookies.set({ name, value: "", ...options, maxAge: 0 });
        },
      },
    }
  );

  try {
    await supabase.auth.signOut({ scope: idle ? "local" : "global" });
  } catch (err) {
    // Even if the Supabase call fails, make sure we clear cookies locally.
    console.warn("[auth/logout] signOut failed:", err);
  }

  // Belt-and-braces: nuke every sb-* cookie the client sent us. The Supabase
  // SSR helper is supposed to do this via the `remove` hook above, but if an
  // older cookie path/scope lingers, this catches it.
  for (const cookie of req.cookies.getAll()) {
    if (cookie.name.startsWith("sb-")) {
      response.cookies.set({ name: cookie.name, value: "", maxAge: 0, path: "/" });
    }
  }

  // Also kill the impersonation cookie if it's there.
  response.cookies.set({ name: "zb_impersonate", value: "", maxAge: 0, path: "/" });

  return response;
}

export async function POST(req: NextRequest) { return handle(req); }
export async function GET(req: NextRequest)  { return handle(req); }
