"use client";

import { useEffect, useState, useCallback } from "react";
import JungleStatsContent from "@/components/jungle/JungleStatsContent";
import type { ClearSpeedEntry } from "@/components/jungle/jungleSampleData";

const RANK_TO_TIER: Record<string, string> = {
  all: "ALL",
  "iron-silver": "IRON-SILVER",
  "gold-plat": "GOLD-PLAT",
  "emerald-diamond": "EMERALD-DIAMOND",
  "master+": "MASTER+",
};

export default function JungleStatsPage() {
  const [clearSpeeds, setClearSpeeds] = useState<ClearSpeedEntry[]>([]);
  const [source, setSource] = useState("seed");
  const [loading, setLoading] = useState(true);

  const fetchClearSpeeds = useCallback(async (rank: string) => {
    setLoading(true);
    try {
      const tier = RANK_TO_TIER[rank] ?? "ALL";
      const res = await fetch(`/api/jungle-clear-stats?patch=16.5&tier=${encodeURIComponent(tier)}`);
      if (res.ok) {
        const data = await res.json();
        setClearSpeeds(data.entries ?? []);
        setSource(data.source ?? "seed");
      }
    } catch {
      // Keep existing data on error
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchClearSpeeds("emerald-diamond");
  }, [fetchClearSpeeds]);

  return (
    <JungleStatsContent
      clearSpeeds={clearSpeeds}
      clearSpeedSource={source}
      clearSpeedLoading={loading}
      onRankChange={fetchClearSpeeds}
    />
  );
}
