// Tests for the money paths, the setup tools, win-back, every API route's
// login check, and the database's row rules.
// Run with: npm test -w apps/dashboard
// Stripe, Twilio, email and the Supabase client are replaced with fakes. The
// row rule tests run every migration on PGlite, a Postgres in memory. Nothing
// here touches a real account or charges anything.
import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL(".", import.meta.url)) },
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
  },
});
