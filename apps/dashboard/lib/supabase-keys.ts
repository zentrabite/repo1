// ─── Which Supabase key the browser and login checks use ───────────────────
// Supabase has two kinds of key. The older anon and service_role keys are
// JWTs signed with the project's JWT secret, so replacing a leaked one means
// switching them all off. The newer publishable and secret keys can be made
// and deleted one at a time (Supabase, Settings, API Keys).
//
// The newer key wins when it's set in Vercel, and the older one is used until
// then, so the move is adding two settings, and going back is removing them.
//   browser and login checks  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, else NEXT_PUBLIC_SUPABASE_ANON_KEY
//   server                    SUPABASE_SECRET_KEY, else SUPABASE_SERVICE_ROLE_KEY (serverKey() in lib/supabase-server.ts)
// Both NEXT_PUBLIC names are written out in full so Next puts them in the
// browser code. The secret key never goes to a browser, and Supabase refuses
// it from one anyway.

export function publicKey(): string {
  return process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
}
