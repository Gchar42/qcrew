"use client";

import { useEffect, useState, useCallback } from "react";
import { getRankEmblemUrl } from "@/lib/riotAssets";
import type { FollowEntry } from "./useFollowing";

const TIER_COLORS: Record<string, string> = {
  CHALLENGER: "#F59E0B",
  GRANDMASTER: "#EF4444",
  MASTER: "#A855F7",
  DIAMOND: "#22D3EE",
  EMERALD: "#34D399",
  PLATINUM: "#2DD4BF",
  GOLD: "#FACC15",
  SILVER: "#A1A1AA",
  BRONZE: "#FB923C",
  IRON: "#78716C",
};

const TIER_ORDER: Record<string, number> = {
  CHALLENGER: 9,
  GRANDMASTER: 8,
  MASTER: 7,
  DIAMOND: 6,
  EMERALD: 5,
  PLATINUM: 4,
  GOLD: 3,
  SILVER: 2,
  BRONZE: 1,
  IRON: 0,
};

const REGION_LABELS: Record<string, string> = {
  na1: "NA",
  euw1: "EUW",
  eun1: "EUNE",
  kr: "KR",
  jp1: "JP",
  br1: "BR",
  la1: "LAN",
  la2: "LAS",
  oc1: "OCE",
  tr1: "TR",
  ru: "RU",
};

const MEDALS = ["🥇", "🥈", "🥉"];

type LeaderboardRow = {
  riotId: string;
  region: string;
  name: string;
  tier: string | null;
  rank: string | null;
  lp: number | null;
  wins: number;
  losses: number;
  gamesThisWeek: number;
  lpChangeToday: number | null;
};

function getViewerRiotId(): string | null {
  try {
    const raw = localStorage.getItem("statgap_recent");
    if (!raw) return null;
    const arr = JSON.parse(raw);
    if (Array.isArray(arr) && arr.length > 0 && arr[0].riotId) {
      return arr[0].riotId.toLowerCase();
    }
  } catch {
    /* ignore */
  }
  return null;
}

async function fetchRow(
  entry: FollowEntry,
): Promise<LeaderboardRow | null> {
  try {
    const url = `/api/riot/profileBundle?riotId=${encodeURIComponent(entry.riotId)}&region=${encodeURIComponent(entry.region)}&queue=solo`;
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return null;
    const bundle = await res.json();

    const name = `${bundle.profile.account.gameName}#${bundle.profile.account.tagLine}`;
    const solo = bundle.ranked?.solo;

    const now = Date.now();
    const oneWeekAgo = now - 7 * 24 * 60 * 60 * 1000;
    let gamesThisWeek = 0;

    let playerPuuid = "";
    for (const m of bundle.matches ?? []) {
      const pList = m.metadata?.participants ?? [];
      const participants = m.info?.participants ?? [];
      for (const p of participants) {
        if (pList.includes(p.puuid)) {
          playerPuuid = p.puuid;
          break;
        }
      }
      if (playerPuuid) break;
    }

    for (const m of bundle.matches ?? []) {
      const gameEnd = m.info?.gameEndTimestamp ?? 0;
      if (m.info?.queueId !== 420) continue;
      const me = m.info.participants?.find(
        (p: { puuid: string }) => p.puuid === playerPuuid,
      );
      if (me && gameEnd > oneWeekAgo) gamesThisWeek++;
    }

    return {
      riotId: entry.riotId,
      region: entry.region,
      name,
      tier: solo?.tier ?? null,
      rank: solo?.rank ?? null,
      lp: solo?.leaguePoints ?? null,
      wins: solo?.wins ?? 0,
      losses: solo?.losses ?? 0,
      gamesThisWeek,
      lpChangeToday: null,
    };
  } catch {
    return null;
  }
}

function sortRows(rows: LeaderboardRow[]): LeaderboardRow[] {
  return [...rows].sort((a, b) => {
    const aOrder = a.tier ? (TIER_ORDER[a.tier.toUpperCase()] ?? -1) : -1;
    const bOrder = b.tier ? (TIER_ORDER[b.tier.toUpperCase()] ?? -1) : -1;
    if (aOrder !== bOrder) return bOrder - aOrder;
    return (b.lp ?? 0) - (a.lp ?? 0);
  });
}

export default function FollowLeaderboard({
  follows,
}: {
  follows: FollowEntry[];
}) {
  const [rows, setRows] = useState<LeaderboardRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [viewerRiotId, setViewerRiotId] = useState<string | null>(null);

  useEffect(() => {
    setViewerRiotId(getViewerRiotId());
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      const results = await Promise.allSettled(follows.map(fetchRow));
      if (cancelled) return;
      const loaded: LeaderboardRow[] = [];
      for (const r of results) {
        if (r.status === "fulfilled" && r.value) loaded.push(r.value);
      }
      setRows(sortRows(loaded));
      setLoading(false);
    }
    if (follows.length > 0) load();
    else {
      setRows([]);
      setLoading(false);
    }
    return () => {
      cancelled = true;
    };
  }, [follows]);

  const handleShare = useCallback(() => {
    if (follows.length === 0) return;
    const encoded = follows
      .map((f) => `${f.region}:${encodeURIComponent(f.riotId)}`)
      .join(",");
    const url = `${window.location.origin}/following?players=${encoded}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [follows]);

  if (follows.length === 0) {
    return (
      <div className="ff-empty">
        <div className="ff-empty-icon">🏆</div>
        <h2 className="ff-empty-title">No players to rank</h2>
        <p className="ff-empty-text">
          Follow summoners in the Overview tab to see them ranked here.
        </p>
      </div>
    );
  }

  return (
    <div className="ff-lb">
      <div className="ff-lb-toolbar">
        <span className="ff-lb-count">{rows.length} players ranked</span>
        <button className="ff-share-btn" onClick={handleShare}>
          {copied ? "Copied!" : "Share Leaderboard"}
        </button>
      </div>

      {loading ? (
        <div className="ff-lb-loading">
          <span className="ff-spinner" />
          <span>Loading leaderboard...</span>
        </div>
      ) : (
        <div className="ff-lb-table-wrap">
          <table className="ff-lb-table">
            <thead>
              <tr>
                <th className="ff-lb-th ff-lb-col-pos">#</th>
                <th className="ff-lb-th ff-lb-col-player">Player</th>
                <th className="ff-lb-th ff-lb-col-rank">Rank</th>
                <th className="ff-lb-th ff-lb-col-wr">WR</th>
                <th className="ff-lb-th ff-lb-col-games">Week</th>
                <th className="ff-lb-th ff-lb-col-lp">LP Today</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => {
                const tierColor = row.tier
                  ? (TIER_COLORS[row.tier.toUpperCase()] ?? "#A1A1AA")
                  : "#A1A1AA";
                const totalGames = row.wins + row.losses;
                const winRate =
                  totalGames > 0
                    ? Math.round((row.wins / totalGames) * 100)
                    : 0;
                const rankLabel =
                  row.tier && row.rank
                    ? `${row.tier} ${row.rank}`
                    : (row.tier ?? "Unranked");
                const regionLabel =
                  REGION_LABELS[row.region.toLowerCase()] ??
                  row.region.toUpperCase();
                const isViewer =
                  viewerRiotId &&
                  row.name.toLowerCase() === viewerRiotId;
                const profileUrl = `/summoner?riotId=${encodeURIComponent(row.riotId)}&region=${encodeURIComponent(row.region)}`;

                return (
                  <tr
                    key={`${row.riotId}:${row.region}`}
                    className={`ff-lb-row${isViewer ? " ff-lb-row-viewer" : ""}`}
                  >
                    <td className="ff-lb-td ff-lb-col-pos">
                      {i < 3 ? (
                        <span className="ff-lb-medal">{MEDALS[i]}</span>
                      ) : (
                        <span className="ff-lb-num">{i + 1}</span>
                      )}
                    </td>
                    <td className="ff-lb-td ff-lb-col-player">
                      <a href={profileUrl} className="ff-lb-player-link">
                        <span className="ff-lb-player-name">{row.name}</span>
                        <span className="ff-lb-player-region">
                          {regionLabel}
                        </span>
                      </a>
                    </td>
                    <td className="ff-lb-td ff-lb-col-rank">
                      <div className="ff-lb-rank-cell">
                        {row.tier && (
                          <img
                            src={getRankEmblemUrl(row.tier)}
                            alt={row.tier}
                            className="ff-lb-rank-icon"
                            width={24}
                            height={24}
                          />
                        )}
                        <span
                          className="ff-lb-rank-text"
                          style={{ color: tierColor }}
                        >
                          {rankLabel}
                        </span>
                        {row.lp != null && (
                          <span className="ff-lb-rank-lp">{row.lp} LP</span>
                        )}
                      </div>
                    </td>
                    <td className="ff-lb-td ff-lb-col-wr">
                      <span
                        className={
                          winRate >= 50 ? "ff-wr-pos" : "ff-wr-neg"
                        }
                      >
                        {winRate}%
                      </span>
                    </td>
                    <td className="ff-lb-td ff-lb-col-games">
                      {row.gamesThisWeek > 0 ? (
                        <span>{row.gamesThisWeek}G</span>
                      ) : (
                        <span className="ff-lb-muted">—</span>
                      )}
                    </td>
                    <td className="ff-lb-td ff-lb-col-lp">
                      {row.lpChangeToday != null ? (
                        <span
                          className={
                            row.lpChangeToday > 0
                              ? "ff-lb-lp-up"
                              : row.lpChangeToday < 0
                                ? "ff-lb-lp-down"
                                : "ff-lb-muted"
                          }
                        >
                          {row.lpChangeToday > 0
                            ? `↑+${row.lpChangeToday}`
                            : row.lpChangeToday < 0
                              ? `↓${row.lpChangeToday}`
                              : "—"}
                        </span>
                      ) : (
                        <span className="ff-lb-muted">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
