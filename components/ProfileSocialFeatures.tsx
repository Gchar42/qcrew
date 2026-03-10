"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { updateRecentLP } from "@/lib/savedSummoners";

type FrequentTeammate = {
  partnerRiotId: string;
  partnerRegion: string;
  gamesTogether: number;
  sameTeamCount: number;
  tier: string | null;
  rank: string | null;
  leaguePoints: number | null;
};

function tierLabel(tier: string | null, rank: string | null) {
  if (!tier) return "";
  const t = tier.toUpperCase();
  if (t === "GRANDMASTER") return "GM";
  if (t === "CHALLENGER") return "C";
  if (t === "MASTER") return "M";
  return (t.charAt(0) + t.slice(1).toLowerCase() + " " + (rank ?? "")).trim();
}

export function ProfileSocialFeatures({
  riotId,
  region,
  tier,
  rank,
  leaguePoints,
  wins,
  losses,
  profileIconId,
  summonerLevel,
}: {
  riotId: string;
  region: string;
  tier?: string;
  rank?: string;
  leaguePoints?: number;
  wins?: number;
  losses?: number;
  profileIconId?: number;
  summonerLevel?: number;
}) {
  const [viewCount, setViewCount] = useState<number | null>(null);
  const [teammates, setTeammates] = useState<FrequentTeammate[]>([]);

  useEffect(() => {
    fetch("/api/social/profile-view", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        riotId,
        region,
        tier,
        rank,
        leaguePoints,
        wins,
        losses,
        profileIconId,
        summonerLevel,
      }),
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.viewCount != null) setViewCount(d.viewCount);
      })
      .catch(() => {});

    if (leaguePoints != null) {
      updateRecentLP(riotId, region, leaguePoints, tier, rank);
    }
  }, [riotId, region, tier, rank, leaguePoints, wins, losses, profileIconId, summonerLevel]);

  useEffect(() => {
    fetch(
      `/api/social/frequent-teammates?riotId=${encodeURIComponent(riotId)}&region=${region}`
    )
      .then((r) => (r.ok ? r.json() : { teammates: [] }))
      .then((d: { teammates: FrequentTeammate[] }) =>
        setTeammates(d.teammates?.slice(0, 5) ?? [])
      )
      .catch(() => {});
  }, [riotId, region]);

  return (
    <div className="space-y-4">
      {/* View count */}
      {viewCount !== null && viewCount > 0 && (
        <div className="text-xs text-white/30">
          Viewed {viewCount} time{viewCount !== 1 ? "s" : ""} this week
        </div>
      )}

      {/* Frequent Teammates */}
      {teammates.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-2">
            Frequent Teammates
          </h3>
          <div className="space-y-1">
            {teammates.map((t) => (
              <Link
                key={t.partnerRiotId}
                href={`/summoner?riotId=${encodeURIComponent(t.partnerRiotId)}&region=${t.partnerRegion}`}
                className="flex items-center justify-between rounded-lg px-3 py-2 hover:bg-white/5 transition"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-sm text-white/80 truncate">
                    {t.partnerRiotId}
                  </span>
                  {t.tier && (
                    <span className="text-[11px] text-indigo-400 shrink-0">
                      {tierLabel(t.tier, t.rank)}
                    </span>
                  )}
                </div>
                <span className="text-xs text-white/30 shrink-0">
                  {t.gamesTogether} game{t.gamesTogether !== 1 ? "s" : ""}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
