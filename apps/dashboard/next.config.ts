import type { NextConfig } from "next";
import { SECURITY_HEADERS } from "./security-headers";

const nextConfig: NextConfig = {
  // No "X-Powered-By: Next.js" on every response.
  poweredByHeader: false,
  // security-headers.ts says what each one does.
  async headers() {
    return [{ source: "/:path*", headers: SECURITY_HEADERS }];
  },
  // Type errors fail the build. There were 14 old ones until 23 Nov 2026,
  // when they were cleared, so this is back on and a new one stands out.
  typescript: {
    ignoreBuildErrors: false,
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**.supabase.co" },
    ],
  },
};

export default nextConfig;
