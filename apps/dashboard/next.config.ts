import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
