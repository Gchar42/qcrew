"use client";

import * as React from "react";
import Link from "next/link";
import { getChampionSquareUrl } from "@/lib/riotAssets";
import type { ChampionStatsSlice } from "@/app/api/riot/profileBundle/route";

type QueueKey = "solo" | "flex";

export default function ChampionStatsCard(props: {
  championStats: { solo: ChampionStatsSlice; flex: ChampionStatsSlice };
  ddragonVersion?: string | null;
  puuid?: string | null;
  region?: string | null;
  riotId?: string | null;
  onRefresh?: () => void;
}) {
  const { championStats, ddragonVersion, puuid, region, riotId, onRefresh } = props;
  const [queue, setQueue] = React.useState<QueueKey>("solo");
  const [refreshing, setRefreshing] = React.useState(false);
  const refreshRunIdRef = React.useRef(0);

  const slice = championStats[queue];
  const champions = slice?.champions ?? [];
  const top7 = champions.slice(0, 6);

  const handleRefresh = React.useCallback(() => {
    if (!puuid || !onRefresh) return;
    setRefreshing(true);
    const r = region ?? "na1";
    // Refresh only the currently selected queue, in small chunks, and poll until caught up (op.gg style).
    const runId = ++refreshRunIdRef.current;
    const run = async (attempt: number) => {
      if (refreshRunIdRef.current !== runId) return;
      try {
        const res = await fetch("/api/champion-stats/refresh", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ puuid, queue, region: r }),
        });
        const body = (await res.json().catch(() => ({}))) as {
          ok?: boolean;
          remainingAfterApprox?: number;
          error?: string;
        };
        // Always refetch the bundle after each chunk so UI updates as cache fills.
        onRefresh();
        const remaining = body?.remainingAfterApprox ?? 0;
        if (res.ok && remaining > 0 && attempt < 10) {
          setTimeout(() => run(attempt + 1), 2500);
          return;
        }
      } catch {
        // ignore
      } finally {
        if (refreshRunIdRef.current === runId) setRefreshing(false);
      }
    };
    run(0);
  }, [puuid, region, onRefresh, queue]);

  return (
    <div className="profile-rank-card champion-stats-card">
      <div className="profile-rank-card-title">
        Champion Stats
        {puuid && onRefresh && (
          <button
            type="button"
            className={`champion-stats-refresh-btn${refreshing ? " champion-stats-refresh-btn--loading" : ""}`}
            onClick={handleRefresh}
            disabled={refreshing}
            title="Refresh champion stats (runs in chunks; may take a minute)"
          >
            {refreshing ? (
              <>
                <span className="champion-stats-refresh-spinner" aria-hidden />
                <span>Updating…</span>
              </>
            ) : (
              "Refresh"
            )}
          </button>
        )}
      </div>
      <div className="profile-rank-card-content champion-stats-content">
        <div className="champion-stats-filters">
          <button
            type="button"
            className={queue === "solo" ? "profile-queue-tab profile-queue-tab-active" : "profile-queue-tab"}
            onClick={() => setQueue("solo")}
          >
            Ranked Solo Duo
          </button>
          <button
            type="button"
            className={queue === "flex" ? "profile-queue-tab profile-queue-tab-active" : "profile-queue-tab"}
            onClick={() => setQueue("flex")}
          >
            Ranked Flex
          </button>
        </div>
        {top7.length === 0 ? (
          <span className="profile-ranked-unranked left_card_muted">
            No ranked matches found for this season yet. Stats are calculated in the background—click Refresh in about a minute or wait for auto-update.
          </span>
        ) : (
          <div className="champ_list">
            {top7.map((r, i) => {
              const isTop5 = i < 5 && riotId;
              const analysisHref = isTop5
                ? `/profile/${encodeURIComponent(riotId)}/champion/${encodeURIComponent(r.championName)}`
                : undefined;

              const row = (
                <div className={`champ_row${isTop5 ? " champ_row--linked" : ""}`}>
                  <div className="champ_left">
                    <img
                      className="champ_icon"
                      src={getChampionSquareUrl(r.championName, ddragonVersion)}
                      alt=""
                      width={32}
                      height={32}
                      loading={i < 3 ? "eager" : "lazy"}
                      fetchPriority={i === 0 ? "high" : undefined}
                    />
                    <div className="champ_meta">
                      <div className="champ_name">{r.championName}</div>
                    </div>
                  </div>
                  <div className="champ_mid">
                    <div className="kda_big">{r.kda.toFixed(2)} KDA</div>
                    <div className="left_card_muted left_card_small">
                      {r.avgKills.toFixed(1)} / {r.avgDeaths.toFixed(1)} / {r.avgAssists.toFixed(1)}
                    </div>
                  </div>
                  <div className="champ_right">
                    <div className="wr">{r.winRate}%</div>
                    <div className="left_card_muted left_card_small">
                      {r.games} games
                    </div>
                  </div>
                  {isTop5 && (
                    <div className="champ_analysis_indicator" title="AI Analysis available">
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  )}
                </div>
              );

              return isTop5 ? (
                <Link key={r.championId} href={analysisHref!} className="champ_row_link">
                  {row}
                </Link>
              ) : (
                <div key={r.championId}>{row}</div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
