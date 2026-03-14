import type { Metadata } from "next";
import { CURRENT_PATCH } from "@/lib/seo";

export const metadata: Metadata = {
  title: `Jungle Stats — Clear Speeds, Pathing & Objective Win Rates — Patch ${CURRENT_PATCH}`,
  description: `Jungle tier list, clear speed rankings, gank timing data, and objective win rates for every jungler in Patch ${CURRENT_PATCH}.`,
  alternates: {
    canonical: "/jungle-stats",
  },
};

export default function JungleStatsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
