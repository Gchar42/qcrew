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
      // Riot verification expects https://www.statgap.gg//riot.txt (double slash)
      { source: "//riot.txt", destination: "/riot.txt" },
    ];
  },
};

export default nextConfig;
