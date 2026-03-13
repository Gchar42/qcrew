import type { Metadata } from "next";
import RuneTreesView from "@/components/runes/RuneTreesView";

export const metadata: Metadata = {
  title: "Rune Trees – StatGap.gg",
  description:
    "Browse all five League of Legends rune trees with pick rates and win rates for every rune, every patch.",
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
