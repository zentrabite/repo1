// ─── Supabase browser client ─────────────────────────────────────────────────
// Use this in "use client" components and client-side code.
//
// IMPORTANT: We use createBrowserClient from @supabase/ssr (not createClient
// from @supabase/supabase-js) so the session is stored in COOKIES instead of
// localStorage. The proxy.ts middleware reads cookies to check auth — if the
// session is only in localStorage the middleware can't see it and will redirect
// every authenticated user back to /login.
//
// Lazy-initialised via a Proxy so Next.js build-time prerender doesn't crash
// when env vars happen to be missing (e.g. CI without a .env). Missing creds
// only surface at real call-time in the browser.

import { createBrowserClient } from "@supabase/ssr";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _client: any = null;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getClient(): any {
  if (_client) return _client;
  const url  = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) {
    throw new Error(
      "Missing Supabase env vars. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to .env.local",
    );
  }
  _client = createBrowserClient(url, anon);
  return _client;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const supabase: any = new Proxy({}, {
  get(_t, prop) {
    const c = getClient();
    return c[prop];
  },
});
