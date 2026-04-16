// ─── Supabase server client ───────────────────────────────────────────────────
// Use this in Server Components, API routes, and Server Actions.
// Uses the service role key — bypasses RLS for admin operations.
// NEVER import this in client components.

import { createClient } from "@supabase/supabase-js";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function createServerClient(): any {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  if (!url || !key) {
    throw new Error(
      "Missing Supabase server env vars.\n" +
      "Add NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to .env.local"
    );
  }

  return createClient(url, key, {
    auth: { persistSession: false },
  });
}

export const adminSupabase = () => createServerClient();
