"use client";

import * as React from "react";
import { getChampionSquareUrl } from "@/lib/riotAssets";
import type { ChampionStatRow } from "@/app/api/champion-stats/route";

type QueueKey = "solo" | "flex";

function fmt1(n: number) {
  return Math.round(n * 10) / 10;
}

export default function ChampionStatsCard(props: {
  region?: string;
  puuid: string;
  ddragonVersion?: string | null;
}) {
  const { puuid, ddragonVersion } = props;
  const [queue, setQueue] = React.useState<QueueKey>("solo");
  const [rows, setRows] = React.useState<ChampionStatRow[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    if (!puuid) {
      setRows([]);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    const url = `/api/champion_stats_season?puuid=${encodeURIComponent(puuid)}&queueKey=${queue}`;
    fetch(url)
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled && Array.isArray(data?.rows)) setRows(data.rows);
      })
      .catch(() => {
        if (!cancelled) setRows([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [puuid, queue]);

  return (
    <div className="profile-rank-card champion-stats-card">
      <div className="profile-rank-card-title">Champion Stats</div>
      <div className="profile-rank-card-content champion-stats-content">
        <div className="champion-stats-filters">
          <button
            type="button"
            className={queue === "solo" ? "pill pill_active" : "pill"}
            onClick={() => setQueue("solo")}
          >
            Ranked Solo Duo
          </button>
          <button
            type="button"
            className={queue === "flex" ? "pill pill_active" : "pill"}
            onClick={() => setQueue("flex")}
          >
            Ranked Flex
          </button>
        </div>
        {loading ? (
          <span className="profile-ranked-loading">Loading…</span>
        ) : rows.length === 0 ? (
          <span className="left_card_muted">No ranked matches found</span>
        ) : (
          <div className="champ_list">
            {rows.slice(0, 7).map((r) => (
              <div key={r.championId} className="champ_row">
                <div className="champ_left">
                  <img
                    className="champ_icon"
                    src={getChampionSquareUrl(r.championName, ddragonVersion)}
                    alt={r.championName}
                  />
                  <div className="champ_meta">
                    <div className="champ_name">{r.championName}</div>
                  </div>
                </div>
                <div className="champ_mid">
                  <div className="kda_big">{fmt1(r.kda)} KDA</div>
                  <div className="left_card_muted left_card_small">
                    {fmt1(r.kills)} / {fmt1(r.deaths)} / {fmt1(r.assists)}
                  </div>
                </div>
                <div className="champ_right">
                  <div className="wr">{Math.round(r.winRate)}%</div>
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
