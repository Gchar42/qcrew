import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "ddragon.leagueoflegends.com" },
      { protocol: "https", hostname: "raw.communitydragon.org" },
    ],
  },
  async rewrites() {
    return [
      { source: "/riot.txt", destination: "/api/riot-verify" },
      { source: "//riot.txt", destination: "/api/riot-verify" },
    ];
  },
};

export default nextConfig;
