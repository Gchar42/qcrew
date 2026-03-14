import type { Metadata } from "next";
import RuneTreesView from "@/components/runes/RuneTreesView";
import { CURRENT_PATCH } from "@/lib/seo";

export const metadata: Metadata = {
  title: `Rune Trees — Pick Rates & Win Rates for Every Rune — Patch ${CURRENT_PATCH}`,
  description:
    "Complete rune reference for League of Legends. Pick rates and win rates for every keystone, rune, and stat shard in Patch " +
    CURRENT_PATCH +
    ".",
  alternates: {
    canonical: "/runes",
  },
};

export default function RunesPage() {
  return (
    <main className="min-h-screen bg-[#0E0F15] text-[#E8E9F0]">
      <div className="mx-auto max-w-[1400px] px-4 py-8 sm:px-6 lg:px-12">
        <RuneTreesView />
      </div>
    </main>
  );
}
