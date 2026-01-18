import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@qase-analytics/ui", "@qase-analytics/utils", "@qase-analytics/types"],
  experimental: {
    typedRoutes: true,
  },
};

export default nextConfig;
