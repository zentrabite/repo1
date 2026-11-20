// Tests for the money paths (checkout, the Stripe webhook, Stripe setup).
// Run with: npm test -w apps/dashboard
// Stripe and the database are replaced with fakes, so nothing here touches a
// real account or charges anything.
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
