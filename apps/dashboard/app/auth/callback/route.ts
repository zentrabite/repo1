// ─── Auth callback handler ────────────────────────────────────────────────────
// Supabase redirects here after email confirmation.
// Exchanges the code for a session then sends the user on.
//
// ?next= is only followed when it's a path on this site. Anything else
// (//evil.example, @evil.example, /\evil.example, full URLs) goes to
// /dashboard, so this route can't be used to bounce people to another site.
// A failed code exchange goes to /login with an error instead.

import { NextResponse } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

const DEFAULT_NEXT = "/dashboard";

/** A same-site path to send the user to, or /dashboard. */
function safeNextPath(raw: string | null, origin: string): string {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//") || raw.startsWith("/\\")) return DEFAULT_NEXT;
  try {
    // The URL parser drops tabs and newlines and treats \ as /, so check
    // where it really lands rather than trusting the string.
    const url = new URL(raw, origin);
    if (url.origin !== origin) return DEFAULT_NEXT;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return DEFAULT_NEXT;
  }
}

export async function GET(req: Request) {
  const { searchParams, origin } = new URL(req.url);
  const code = searchParams.get("code");
  const next = safeNextPath(searchParams.get("next"), origin);

  if (code) {
    const response = NextResponse.redirect(new URL(next, origin));

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return req.headers.get("cookie")?.split("; ").find(c => c.startsWith(`${name}=`))?.split("=")[1];
          },
          set(name: string, value: string, options: CookieOptions) {
            response.cookies.set({ name, value, ...options });
          },
          remove(name: string, options: CookieOptions) {
            response.cookies.set({ name, value: "", ...options });
          },
        },
      }
    );

    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return response;
    console.error("[auth/callback] code exchange failed:", error.message);
  }

  return NextResponse.redirect(new URL("/login?error=auth_callback_failed", origin));
}
