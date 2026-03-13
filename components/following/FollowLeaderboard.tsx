"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
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
const AVG_LP_PER_WIN = 22;
const AVG_LP_PER_LOSS = 18;

type Streak = { type: "win" | "loss"; count: number };

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
  winsThisWeek: number;
  lossesThisWeek: number;
  lpChangeToday: number | null;
  streak: Streak | null;
  lastMatchTimestamp: number | null;
};

type ViewerInfo = { riotId: string; region: string } | null;

function getViewerInfo(): ViewerInfo {
  try {
    const raw = localStorage.getItem("statgap_recent");
    if (!raw) return null;
    const arr = JSON.parse(raw);
    if (Array.isArray(arr) && arr.length > 0 && arr[0].riotId && arr[0].region) {
      return { riotId: arr[0].riotId, region: arr[0].region };
    }
  } catch {
    /* ignore */
  }
  return null;
}

type MatchParticipant = {
  puuid: string;
  win: boolean;
};

type MatchEntry = {
  info: {
    queueId?: number;
    gameEndTimestamp?: number;
    participants: MatchParticipant[];
  };
  metadata: { participants?: string[] };
};

function computeStreak(
  matches: MatchEntry[],
  playerPuuid: string,
): Streak | null {
  let type: "win" | "loss" | null = null;
  let count = 0;

  for (const m of matches) {
    if (m.info?.queueId !== 420) continue;
    const me = m.info.participants?.find((p) => p.puuid === playerPuuid);
    if (!me) continue;

    if (type === null) {
      type = me.win ? "win" : "loss";
      count = 1;
    } else if ((me.win && type === "win") || (!me.win && type === "loss")) {
      count++;
    } else {
      break;
    }
  }

  if (!type) return null;
  if (type === "win" && count >= 5) return { type, count };
  if (type === "loss" && count >= 3) return { type, count };
  return null;
}

async function fetchRow(entry: FollowEntry): Promise<LeaderboardRow | null> {
  try {
    const url = `/api/riot/profileBundle?riotId=${encodeURIComponent(entry.riotId)}&region=${encodeURIComponent(entry.region)}&queue=solo`;
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return null;
    const bundle = await res.json();

    const name = `${bundle.profile.account.gameName}#${bundle.profile.account.tagLine}`;
    const solo = bundle.ranked?.solo;

    const now = Date.now();
    const oneWeekAgo = now - 7 * 24 * 60 * 60 * 1000;
    let winsThisWeek = 0;
    let lossesThisWeek = 0;
    let lastMatchTimestamp: number | null = null;

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
      if (!me) continue;

      if (lastMatchTimestamp === null || gameEnd > lastMatchTimestamp) {
        lastMatchTimestamp = gameEnd;
      }

      if (gameEnd > oneWeekAgo) {
        if (me.win) winsThisWeek++;
        else lossesThisWeek++;
      }
    }

    const streak = computeStreak(bundle.matches ?? [], playerPuuid);

    return {
      riotId: entry.riotId,
      region: entry.region,
      name,
      tier: solo?.tier ?? null,
      rank: solo?.rank ?? null,
      lp: solo?.leaguePoints ?? null,
      wins: solo?.wins ?? 0,
      losses: solo?.losses ?? 0,
      gamesThisWeek: winsThisWeek + lossesThisWeek,
      winsThisWeek,
      lossesThisWeek,
      lpChangeToday: null,
      streak,
      lastMatchTimestamp,
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

function generateTrashTalk(
  rows: LeaderboardRow[],
  viewerIdx: number,
): string | null {
  if (viewerIdx < 0 || rows.length < 2) return null;
  const viewer = rows[viewerIdx];

  if (viewerIdx === 0) {
    return "You\u2019re leading the leaderboard. Don\u2019t slip up.";
  }

  if (viewerIdx === rows.length - 1) {
    return "You\u2019re at the bottom. Everyone above you is beatable.";
  }

  const above = rows[viewerIdx - 1];
  const aboveLp = above.lp ?? 0;
  const viewerLp = viewer.lp ?? 0;
  const lpGap = aboveLp - viewerLp;

  if (lpGap === 0) {
    return `You and ${above.name} are tied. Someone has to blink first.`;
  }

  return `${above.name} is ${lpGap} LP ahead of you. Time to grind.`;
}

function activityColor(timestamp: number | null): string {
  if (!timestamp) return "#3a3a3d";
  const hours = (Date.now() - timestamp) / (1000 * 60 * 60);
  if (hours <= 2) return "#34d399";
  if (hours <= 24) return "#facc15";
  return "#3a3a3d";
}

function findMostImproved(rows: LeaderboardRow[]): number {
  let bestIdx = -1;
  let bestScore = 0;
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    if (r.gamesThisWeek === 0) continue;
    const score =
      r.winsThisWeek * AVG_LP_PER_WIN - r.lossesThisWeek * AVG_LP_PER_LOSS;
    if (score > bestScore) {
      bestScore = score;
      bestIdx = i;
    }
  }
  return bestIdx;
}

export default function FollowLeaderboard({
  follows,
}: {
  follows: FollowEntry[];
}) {
  const [rows, setRows] = useState<LeaderboardRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [viewer, setViewer] = useState<ViewerInfo>(null);

  useEffect(() => {
    setViewer(getViewerInfo());
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

  const viewerIdx = useMemo(() => {
    if (!viewer) return -1;
    return rows.findIndex(
      (r) => r.name.toLowerCase() === viewer.riotId.toLowerCase(),
    );
  }, [rows, viewer]);

  const trashTalk = useMemo(
    () => generateTrashTalk(rows, viewerIdx),
    [rows, viewerIdx],
  );

  const mostImprovedIdx = useMemo(() => findMostImproved(rows), [rows]);

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
      {trashTalk && (
        <div className="ff-lb-trashtalk">{trashTalk}</div>
      )}

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
                <th className="ff-lb-th ff-lb-col-action" />
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
                const isViewer = i === viewerIdx;
                const profileUrl = `/summoner?riotId=${encodeURIComponent(row.riotId)}&region=${encodeURIComponent(row.region)}`;
                const dotColor = activityColor(row.lastMatchTimestamp);
                const isMostImproved = i === mostImprovedIdx;

                const challengeUrl =
                  viewer && !isViewer
                    ? `/compare?p1=${encodeURIComponent(viewer.riotId)}&p2=${encodeURIComponent(row.riotId)}&r1=${encodeURIComponent(viewer.region)}&r2=${encodeURIComponent(row.region)}`
                    : null;

                return (
                  <tr
                    key={`${row.riotId}:${row.region}`}
                    className={`ff-lb-row${isViewer ? " ff-lb-row-viewer" : ""}`}
                  >
                    {/* Position */}
                    <td className="ff-lb-td ff-lb-col-pos">
                      <div className="ff-lb-pos-cell">
                        {i < 3 ? (
                          <span className="ff-lb-medal">{MEDALS[i]}</span>
                        ) : (
                          <span className="ff-lb-num">{i + 1}</span>
                        )}
                        {isMostImproved && (
                          <span
                            className="ff-lb-improved"
                            title="Most Improved"
                          >
                            ⭐
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Player */}
                    <td className="ff-lb-td ff-lb-col-player">
                      <div className="ff-lb-player-cell">
                        <span
                          className="ff-lb-activity-dot"
                          style={{ background: dotColor }}
                          title={
                            dotColor === "#34d399"
                              ? "Active now"
                              : dotColor === "#facc15"
                                ? "Played today"
                                : "Inactive"
                          }
                        />
                        <a href={profileUrl} className="ff-lb-player-link">
                          <span className="ff-lb-player-name">
                            {row.name}
                          </span>
                          <span className="ff-lb-player-region">
                            {regionLabel}
                          </span>
                        </a>
                        {row.streak && row.streak.type === "win" && (
                          <span className="ff-lb-streak ff-lb-streak-win">
                            🔥{row.streak.count}
                          </span>
                        )}
                        {row.streak && row.streak.type === "loss" && (
                          <span className="ff-lb-streak ff-lb-streak-loss">
                            💀{row.streak.count}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Rank */}
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

                    {/* WR */}
                    <td className="ff-lb-td ff-lb-col-wr">
                      <span
                        className={
                          winRate >= 50 ? "ff-wr-pos" : "ff-wr-neg"
                        }
                      >
                        {winRate}%
                      </span>
                    </td>

                    {/* Games this week */}
                    <td className="ff-lb-td ff-lb-col-games">
                      {row.gamesThisWeek > 0 ? (
                        <span>{row.gamesThisWeek}G</span>
                      ) : (
                        <span className="ff-lb-muted">—</span>
                      )}
                    </td>

                    {/* LP Today */}
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

                    {/* Challenge */}
                    <td className="ff-lb-td ff-lb-col-action">
                      {challengeUrl && (
                        <a href={challengeUrl} className="ff-lb-challenge-btn">
                          Challenge
                        </a>
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
