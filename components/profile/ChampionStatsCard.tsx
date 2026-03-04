"use client";

import * as React from "react";
import { getChampionSquareUrl } from "@/lib/riotAssets";

type QueueKey = "solo" | "flex";
type ChampRow = {
  championId: number;
  championName: string;
  championIcon: string;
  games: number;
  wins: number;
  winRate: number;
  kda: number;
  kills: number;
  deaths: number;
  assists: number;
};

function fmt1(n: number) {
  return Math.round(n * 10) / 10;
}

export default function ChampionStatsCard(props: {
  region: string;
  puuid: string;
  ddragonVersion?: string | null;
}) {
  const { region, puuid, ddragonVersion } = props;
  const [queue, setQueue] = React.useState<QueueKey>("solo");
  const [rows, setRows] = React.useState<ChampRow[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let cancelled = false;
    async function run() {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/champion_stats?region=${encodeURIComponent(region)}&puuid=${encodeURIComponent(puuid)}&queue=${queue}`,
          { cache: "no-store" }
        );
        const json = await res.json();
        if (!cancelled) setRows(Array.isArray(json?.rows) ? json.rows : []);
      } catch {
        if (!cancelled) setRows([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    run();
    return () => {
      cancelled = true;
    };
  }, [region, puuid, queue]);

  return (
    <div className="left_card">
      <div className="left_card_header">
        <div className="left_card_title">Champion Stats</div>
        <div className="left_card_filters">
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
      </div>
      <div className="left_card_body">
        {loading ? (
          <div className="left_card_muted">Loading</div>
        ) : rows.length === 0 ? (
          <div className="left_card_muted">No ranked matches found</div>
        ) : (
          <div className="champ_list">
            {rows.slice(0, 7).map((r) => (
              <div key={r.championId} className="champ_row">
                <div className="champ_left">
                  <img
                    className="champ_icon"
                    src={getChampionSquareUrl(r.championIcon, ddragonVersion)}
                    alt={r.championName}
                  />
                  <div className="champ_meta">
                    <div className="champ_name">{r.championName}</div>
                    <div className="left_card_muted left_card_small">
                      {r.games} games
                    </div>
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
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
