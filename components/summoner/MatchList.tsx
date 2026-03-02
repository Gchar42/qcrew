"use client";

import { MatchCard } from "./MatchCard";
import { computeImpactScore } from "@/lib/impactScore";
import { getMatchBadges } from "@/lib/matchBadges";
import type { MatchDto } from "@/types/riot";

function formatDuration(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function MatchList({
  matches,
  puuid,
  onMatchClick,
}: {
  matches: MatchDto[];
  puuid: string;
  onMatchClick: (m: MatchDto) => void;
}) {
  if (matches.length === 0) {
    return (
      <div className="glass rounded-xl p-8 text-center text-zinc-400">
        No recent matches found.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {matches.map((m) => {
        const p = m.info?.participants?.find((x) => x.puuid === puuid);
        if (!p) return null;
        const duration = formatDuration(m.info?.gameDuration ?? 0);
        const cs = (p.totalMinionsKilled ?? 0) + (p.neutralMinionsKilled ?? 0);
        const impact = computeImpactScore(m, puuid);
        const badges = getMatchBadges(m);
        const badgeInfo = badges.get(puuid);
        return (
          <MatchCard
            key={m.metadata?.matchId ?? ""}
            champion={p.championName}
            role={p.teamPosition ?? ""}
            kda={`${p.kills}/${p.deaths}/${p.assists}`}
            cs={cs}
            duration={duration}
            win={p.win}
            items={[p.item0, p.item1, p.item2, p.item3, p.item4, p.item5, p.item6].filter(
              (i): i is number => i != null && i > 0
            )}
            impactScore={impact?.score}
            badge={badgeInfo?.badge}
            badgeReason={badgeInfo?.reason}
            onClick={() => onMatchClick(m)}
          />
        );
      })}
    </div>
  );
}
