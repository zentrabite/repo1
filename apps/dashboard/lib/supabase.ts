// ─── Supabase browser client ─────────────────────────────────────────────────
// Use this in "use client" components and client-side code.
// It uses the anon key — RLS policies control what users can see.
//
// Setup:
//   1. npm install @supabase/supabase-js
//   2. Add NEXT_PUBLIC_SUPABASE_URL + NEXT_PUBLIC_SUPABASE_ANON_KEY to .env.local

import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

const supabaseUrl  = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnon) {
  throw new Error(
    "Missing Supabase env vars.\n" +
    "Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to .env.local\n" +
    "Find them at: app.supabase.com → Project Settings → API"
  );
}

// Singleton — reuse the same client instance across the app
export const supabase = createClient<Database>(supabaseUrl, supabaseAnon);
