"use client";

import * as React from "react";
import { getChampionSquareUrl } from "@/lib/riotAssets";
import type { ChampionStatsSlice } from "@/app/api/riot/profileBundle/route";

type QueueKey = "solo" | "flex";

export default function ChampionStatsCard(props: {
  championStats: { solo: ChampionStatsSlice; flex: ChampionStatsSlice };
  ddragonVersion?: string | null;
  puuid?: string | null;
  region?: string | null;
  onRefresh?: () => void;
}) {
  const { championStats, ddragonVersion, puuid, region, onRefresh } = props;
  const [queue, setQueue] = React.useState<QueueKey>("solo");
  const [refreshing, setRefreshing] = React.useState(false);

  const slice = championStats[queue];
  const champions = slice?.champions ?? [];
  const top7 = champions.slice(0, 7);

  const handleRefresh = React.useCallback(() => {
    if (!puuid || !onRefresh) return;
    setRefreshing(true);
    const r = region ?? "na1";
    // Fire refresh for both queues; don't await (can take 45+ s and timeout). Refetch bundle after a short delay.
    fetch("/api/champion-stats/refresh", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ puuid, queue: "solo", region: r }),
    }).catch(() => {});
    fetch("/api/champion-stats/refresh", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ puuid, queue: "flex", region: r }),
    }).catch(() => {});

    const delayMs = 8000;
    setTimeout(() => {
      onRefresh();
      setRefreshing(false);
    }, delayMs);
  }, [puuid, region, onRefresh]);

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
            title="Refresh champion stats (up to 60 games)"
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
            No ranked matches found for this season yet.
          </span>
        ) : (
          <div className="champ_list">
            {top7.map((r) => (
              <div key={r.championId} className="champ_row">
                <div className="champ_left">
                  <img
                    className="champ_icon"
                    src={getChampionSquareUrl(r.championName, ddragonVersion)}
                    alt=""
                    width={32}
                    height={32}
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
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
