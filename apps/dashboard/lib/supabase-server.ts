// ─── Supabase server client ───────────────────────────────────────────────────
// Use this in Server Components, API routes, and Server Actions.
// Uses the service role key — bypasses RLS for admin operations.
// NEVER import this in client components — it would expose the service key.

import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

export function createServerClient() {
  const url  = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key  = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  if (!url || !key) {
    throw new Error(
      "Missing Supabase server env vars.\n" +
      "Add NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to .env.local"
    );
  }

  return createClient<Database>(url, key, {
    auth: { persistSession: false },
  });
}

// Convenience export for one-off use in API routes
export const adminSupabase = () => createServerClient();
