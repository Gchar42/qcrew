"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import JungleStatsContent, { type JungleTab } from "@/components/jungle/JungleStatsContent";
import type { ClearSpeedEntry } from "@/components/jungle/jungleSampleData";

const RANK_TO_TIER: Record<string, string> = {
  all: "ALL",
  "iron-silver": "IRON-SILVER",
  "gold-plat": "GOLD-PLAT",
  "emerald-diamond": "EMERALD-DIAMOND",
  "master+": "MASTER+",
};

const VALID_TABS = new Set<JungleTab>(["tier-list", "clear-speeds", "objectives", "gank-stats", "matchups"]);
const DEFAULT_TAB: JungleTab = "tier-list";
const DEFAULT_RANK = "emerald-diamond";

function JungleStatsInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const rawTab = searchParams.get("tab") as JungleTab | null;
  const tab: JungleTab = rawTab && VALID_TABS.has(rawTab) ? rawTab : DEFAULT_TAB;

  const rawTier = searchParams.get("tier");
  const rank = rawTier && RANK_TO_TIER[rawTier] ? rawTier : DEFAULT_RANK;

  const [clearSpeeds, setClearSpeeds] = useState<ClearSpeedEntry[]>([]);
  const [source, setSource] = useState("seed");
  const [loading, setLoading] = useState(true);

  const updateURL = useCallback(
    (newTab: JungleTab, newRank: string) => {
      const params = new URLSearchParams();
      if (newTab !== DEFAULT_TAB) params.set("tab", newTab);
      if (newRank !== DEFAULT_RANK) params.set("tier", newRank);
      const qs = params.toString();
      router.replace(`/jungle-stats${qs ? `?${qs}` : ""}`, { scroll: false });
    },
    [router],
  );

  const handleTabChange = useCallback(
    (newTab: JungleTab) => updateURL(newTab, rank),
    [updateURL, rank],
  );

  const handleRankChange = useCallback(
    (newRank: string) => updateURL(tab, newRank),
    [updateURL, tab],
  );

  const fetchClearSpeeds = useCallback(async (tierKey: string) => {
    setLoading(true);
    try {
      const tier = RANK_TO_TIER[tierKey] ?? "ALL";
      const res = await fetch(`/api/jungle-clear-stats?patch=16.5&tier=${encodeURIComponent(tier)}`);
      if (res.ok) {
        const data = await res.json();
        setClearSpeeds(data.entries ?? []);
        setSource(data.source ?? "seed");
      }
    } catch {
      /* keep existing data */
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchClearSpeeds(rank);
  }, [rank, fetchClearSpeeds]);

  return (
    <JungleStatsContent
      tab={tab}
      rank={rank}
      clearSpeeds={clearSpeeds}
      clearSpeedSource={source}
      clearSpeedLoading={loading}
      onTabChange={handleTabChange}
      onRankChange={handleRankChange}
    />
  );
}

export default function JungleStatsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0E0F15]" />}>
      <JungleStatsInner />
    </Suspense>
  );
}
