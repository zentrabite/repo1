// ─── Supabase browser client ─────────────────────────────────────────────────
// Use this in "use client" components and client-side code.
//
// IMPORTANT: We use createBrowserClient from @supabase/ssr (not createClient
// from @supabase/supabase-js) so the session is stored in COOKIES instead of
// localStorage. The proxy.ts middleware reads cookies to check auth — if the
// session is only in localStorage the middleware can't see it and will redirect
// every authenticated user back to /login.

import { createBrowserClient } from "@supabase/ssr";

const supabaseUrl  = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnon) {
  throw new Error(
    "Missing Supabase env vars. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to .env.local"
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const supabase: any = createBrowserClient(supabaseUrl, supabaseAnon);
