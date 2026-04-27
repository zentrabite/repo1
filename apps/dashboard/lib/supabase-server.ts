// ─── Supabase server clients ──────────────────────────────────────────────────
//
// Two separate clients for two separate use cases:
//
//   createSessionClient()  — anon key + cookies, reads the user's own session.
//                            Use in Server Components and Server Actions that
//                            need to know WHO is logged in.
//
//   createAdminClient()    — service-role key, bypasses RLS.
//                            Use only for privileged server-side operations
//                            (e.g. sending transactional data, admin tasks).
//                            NEVER import in client components.

import { createServerClient as createSSRClient, type CookieOptions } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

// ── Session-aware client (anon key + request cookies) ─────────────────────────
export async function createSessionClient() {
  const cookieStore = await cookies();

  return createSSRClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          cookieStore.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          cookieStore.set({ name, value: "", ...options });
        },
      },
    }
  );
}

// ── Admin client (service-role key, no cookie context needed) ─────────────────
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  if (!url || !key) {
    throw new Error(
      "Missing Supabase server env vars.\n" +
      "Add NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to .env.local"
    );
  }

  return createClient(url, key, { auth: { persistSession: false } });
}

// Legacy alias — keeps existing imports working while you migrate.
export const adminSupabase = createAdminClient;
export const createServerClient = createAdminClient;
