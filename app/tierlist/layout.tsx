import type { Metadata } from "next";
import { CURRENT_PATCH } from "@/lib/seo";

export const metadata: Metadata = {
  title: `LoL Tier List — Patch ${CURRENT_PATCH} Champion Rankings`,
  description: `Updated tier list for League of Legends Patch ${CURRENT_PATCH}. See which champions are S-tier, win rates, pick rates, and ban rates across all ranks.`,
  keywords: `lol tier list, league tier list, best champions, champion rankings, patch ${CURRENT_PATCH} tier list`,
  alternates: {
    canonical: "/tierlist",
  },
};

export default function TierlistLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
