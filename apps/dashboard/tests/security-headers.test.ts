// Every CRM, shop website and ordering page response carries the security
// headers (security-headers.ts, next.config.ts).

import { describe, expect, it } from "vitest";
import nextConfig from "../next.config";

describe("security headers", () => {
  it("go on every path, and the Next.js banner doesn't", async () => {
    expect(nextConfig.poweredByHeader).toBe(false);
    const rules = await nextConfig.headers!();
    expect(rules).toHaveLength(1);
    expect(rules[0]!.source).toBe("/:path*");
    const h = Object.fromEntries(rules[0]!.headers.map(x => [x.key, x.value]));
    expect(h["X-Content-Type-Options"]).toBe("nosniff");
    expect(h["Referrer-Policy"]).toBe("strict-origin-when-cross-origin");
    expect(h["X-Frame-Options"]).toBe("SAMEORIGIN");
    expect(h["Content-Security-Policy"]).toContain("frame-ancestors 'self'");
    // Only these rules. A script allow list would break Next's inline scripts.
    expect(h["Content-Security-Policy"]).not.toMatch(/script-src|default-src/);
    expect(h["Permissions-Policy"]).toContain("camera=()");
  });
});
