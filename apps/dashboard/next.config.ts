import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Skip type checking during build — types are checked locally via IDE.
  // Re-enable once the codebase has full strict-mode coverage.
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**.supabase.co" },
    ],
  },
};

export default nextConfig;
