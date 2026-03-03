"use client";

import Link from "next/link";
import Image from "next/image";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { fetchJsonWithRetry, mapWithConcurrency } from "@/lib/fetchUtils";
import { MatchDetailSlideOver } from "@/components/summoner/MatchDetailSlideOver";
import {
  getChampionSplashUrl,
  getChampionSquareUrl,
  getItemIconUrl,
  getSummonerSpellIconUrl,
} from "@/lib/riotAssets";
import {
  getPerkIconUrl,
  getStyleIconUrlCd,
  type PerkEntry,
  type PerkStyleEntry,
} from "@/lib/runesCd";
import { computeImpactScore } from "@/lib/impactScore";
import { getMatchBadges, getBadgeCategory } from "@/lib/matchBadges";
import type { AccountDto, SummonerDto, MatchDto, MatchTimelineDto } from "@/types/riot";
import {
  getTimelineParticipantId,
  getItemSlotPurchaseTimes,
  getFirstPurchaseMapNoUndo,
  getFinalBuild,
} from "@/lib/matchTimeline";

/** Badge name -> profile CSS class for chip styling */
function getBadgeCategoryClass(badge: string): string {
  const cat = getBadgeCategory(badge);
  return `profile-badge-chip-badge-${cat}`;
}

const REGION = "na1";

type Participant = NonNullable<MatchDto["info"]>["participants"][number];

const POSITION_ORDER: Record<string, number> = {
  TOP: 0,
  JUNGLE: 1,
  MIDDLE: 2,
  MID: 2,
  BOTTOM: 3,
  BOT: 3,
  UTILITY: 4,
  SUPPORT: 4,
};

/** Split participants into blue (100) and red (200), ordered by role */
function getTeams(m: MatchDto): { blue: Participant[]; red: Participant[] } {
  const participants = m.info?.participants ?? [];
  const byPos = (a: Participant, b: Participant) =>
    (POSITION_ORDER[a.teamPosition ?? ""] ?? 5) -
    (POSITION_ORDER[b.teamPosition ?? ""] ?? 5);
  const blue = participants
    .filter((p) => p.teamId === 100)
    .sort(byPos);
  const red = participants
    .filter((p) => p.teamId === 200)
    .sort(byPos);
  return { blue, red };
}

/** Queue ID to short label */
function queueLabel(queueId: number | undefined): string {
  if (queueId == null) return "Custom";
  const map: Record<number, string> = {
    420: "Ranked Solo",
    440: "Ranked Flex",
    400: "Draft Pick",
    430: "Blind Pick",
    450: "ARAM",
    1020: "One for All",
  };
  return map[queueId] ?? `Queue ${queueId}`;
}

function isRankedQueue(queueId: number | undefined): boolean {
  return queueId === 420 || queueId === 440;
}

/** "14.6.xxx.xxx" -> "14.6" */
function patchFromVersion(gameVersion: string | undefined): string | null {
  if (!gameVersion) return null;
  const parts = gameVersion.split(".");
  if (parts.length >= 2) return `${parts[0]}.${parts[1]}`;
  return null;
}

/** Sort participants by position for consistent tie-break (first in render order). */
function sortByPosition(team: Participant[]): Participant[] {
  return [...team].sort(
    (a, b) =>
      (POSITION_ORDER[a.teamPosition ?? ""] ?? 5) -
      (POSITION_ORDER[b.teamPosition ?? ""] ?? 5)
  );
}

/**
 * Per-match impact highlights for the right-side player list only.
 * Gold = highest impact on winning team; Purple = highest impact on losing team.
 * Uses official match team win flag. Does not affect the main match header Impact chip.
 */
function getMatchImpactHighlights(m: MatchDto): {
  impactByPuuid: Map<string, number>;
  bestWinningPuuid: string | null;
  bestLosingPuuid: string | null;
} {
  const participants = m.info?.participants ?? [];

  const impactByPuuid = new Map<string, number>();
  for (const p of participants) {
    const result = computeImpactScore(m, p.puuid);
    impactByPuuid.set(p.puuid, result?.score ?? 0);
  }

  const winner = participants.find((p) => p.win);
  const winningTeamId = winner?.teamId;
  if (winningTeamId == null) {
    return { impactByPuuid, bestWinningPuuid: null, bestLosingPuuid: null };
  }

  const winningTeam = sortByPosition(participants.filter((p) => p.teamId === winningTeamId));
  const losingTeam = sortByPosition(participants.filter((p) => p.teamId !== winningTeamId));

  const bestIn = (team: Participant[]) => {
    if (team.length === 0) return null;
    let best = team[0];
    let bestScore = impactByPuuid.get(best.puuid) ?? 0;
    for (let i = 1; i < team.length; i++) {
      const s = impactByPuuid.get(team[i].puuid) ?? 0;
      if (s > bestScore) {
        best = team[i];
        bestScore = s;
      }
    }
    return best;
  };

  const bestWinning = bestIn(winningTeam);
  const bestLosing = bestIn(losingTeam);

  return {
    impactByPuuid,
    bestWinningPuuid: bestWinning?.puuid ?? null,
    bestLosingPuuid: bestLosing?.puuid ?? null,
  };
}

function ChampIcon({
  championName,
  summonerName,
  ddragonVersion,
  highlight,
}: {
  championName: string;
  summonerName: string;
  ddragonVersion: string | null;
  highlight?: boolean;
}) {
  const squareUrl = getChampionSquareUrl(championName, ddragonVersion);
  const [failed, setFailed] = useState(false);
  const champClass = highlight
    ? "profile-match-team-champ profile-match-team-champ-highlight"
    : "profile-match-team-champ";
  const fallbackClass = highlight
    ? "profile-match-team-champ profile-match-team-champ-fallback profile-match-team-champ-highlight"
    : "profile-match-team-champ profile-match-team-champ-fallback";
  if (failed || !squareUrl) {
    return (
      <span
        className={fallbackClass}
        title={`${summonerName} · ${championName}`}
      >
        <span className="profile-match-team-champ-placeholder" aria-hidden />
      </span>
    );
  }
  return (
    <span className={champClass} title={`${summonerName} · ${championName}`}>
      <Image
        src={squareUrl}
        alt=""
        width={24}
        height={24}
        unoptimized={false}
        onError={() => setFailed(true)}
      />
    </span>
  );
}

function parseRiotIdFromQuery(riotIdParam: string | null) {
  if (!riotIdParam || typeof riotIdParam !== "string") return null;
  try {
    const decoded = decodeURIComponent(riotIdParam.trim());
    if (!decoded.includes("#")) return null;
    const parts = decoded.split("#");
    const gameName = parts[0]?.trim();
    const tagLine = parts[1]?.trim();
    if (!gameName || !tagLine) return null;
    return { gameName, tagLine };
  } catch {
    return null;
  }
}

function formatDuration(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

/** Relative time from game end timestamp (ms) */
function relativeTime(gameEndTimestamp: number | undefined): string {
  if (gameEndTimestamp == null) return "";
  const now = Date.now();
  const diffMs = now - gameEndTimestamp;
  const diffMin = Math.floor(diffMs / 60000);
  const diffH = Math.floor(diffMin / 60);
  const diffD = Math.floor(diffH / 24);
  if (diffMin < 1) return "Just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffH < 24) return `${diffH}h ago`;
  if (diffD < 7) return `${diffD}d ago`;
  return `${Math.floor(diffD / 7)}w ago`;
}

/** Map teamPosition to display label */
function roleLabel(pos: string | undefined): string {
  if (!pos) return "—";
  const upper = pos.toUpperCase();
  if (upper === "JUNGLE") return "Jungle";
  if (upper === "TOP") return "Top";
  if (upper === "MIDDLE" || upper === "MID") return "Mid";
  if (upper === "BOTTOM" || upper === "BOT") return "Bot";
  if (upper === "UTILITY" || upper === "SUPPORT") return "Support";
  return pos;
}

/** Most frequent teamPosition in matches for the given puuid */
function primaryRole(matches: MatchDto[], puuid: string): string {
  const counts: Record<string, number> = {};
  matches.forEach((m) => {
    const p = m.info?.participants?.find((x) => x.puuid === puuid);
    const pos = p?.teamPosition ?? "";
    if (pos) counts[pos] = (counts[pos] ?? 0) + 1;
  });
  const entries = Object.entries(counts);
  if (entries.length === 0) return "";
  entries.sort((a, b) => b[1] - a[1]);
  return roleLabel(entries[0][0]);
}

function SummonerProfileContent() {
  const searchParams = useSearchParams();
  const riotIdParam = searchParams.get("riotId");
  const parsed = parseRiotIdFromQuery(riotIdParam);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [account, setAccount] = useState<AccountDto | null>(null);
  const [summoner, setSummoner] = useState<SummonerDto | null>(null);
  const [matches, setMatches] = useState<MatchDto[]>([]);
  const [detailMatch, setDetailMatch] = useState<MatchDto | null>(null);
  const [ddragonVersion, setDdragonVersion] = useState<string | null>(null);
  const [perksById, setPerksById] = useState<Map<number, string>>(new Map());
  const [stylesById, setStylesById] = useState<Map<number, string>>(new Map());
  const [timelineByMatchId, setTimelineByMatchId] = useState<
    Record<string, MatchTimelineDto | null>
  >({});
  const timelineFetchedRef = useRef<Set<string>>(new Set());
  const debugTimelineLoggedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    fetch("/api/ddragon/version")
      .then((r) => r.json())
      .then((data: { version?: string }) => setDdragonVersion(data.version ?? null))
      .catch(() => setDdragonVersion(null));
  }, []);

  useEffect(() => {
    fetch("/api/cd/perks")
      .then((r) => r.json())
      .then((data: { perks?: PerkEntry[] }) => {
        const list = data.perks ?? [];
        const map = new Map<number, string>();
        list.forEach((p) => map.set(p.id, p.iconPath));
        setPerksById(map);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetch("/api/cd/perkstyles")
      .then((r) => r.json())
      .then((data: { styles?: PerkStyleEntry[] }) => {
        const list = data.styles ?? [];
        const map = new Map<number, string>();
        list.forEach((s) => map.set(s.id, s.iconPath));
        setStylesById(map);
      })
      .catch(() => {});
  }, []);

  const fetchProfile = useCallback(async () => {
    if (!parsed) {
      setLoading(false);
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const accountRes = await fetchJsonWithRetry<AccountDto>(
        `/api/riot/account?gameName=${encodeURIComponent(parsed.gameName)}&tagLine=${encodeURIComponent(parsed.tagLine)}&region=${REGION}`,
        2
      );
      setAccount(accountRes);

      const [summonerRes, matchListRes] = await Promise.all([
        fetchJsonWithRetry<SummonerDto>(
          `/api/riot/summoner?puuid=${encodeURIComponent(accountRes.puuid)}&region=${REGION}`,
          2
        ),
        fetchJsonWithRetry<{ matchIds: string[] }>(
          `/api/riot/matches?puuid=${encodeURIComponent(accountRes.puuid)}&region=${REGION}&count=20`,
          2
        ),
      ]);
      setSummoner(summonerRes);

      const matchDetails = await mapWithConcurrency(
        matchListRes.matchIds.slice(0, 20),
        3,
        async (matchId) =>
          fetchJsonWithRetry<MatchDto>(
            `/api/riot/match?matchId=${encodeURIComponent(matchId)}&region=${REGION}`,
            3
          )
      );
      setMatches(matchDetails);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load summoner"
      );
      setAccount(null);
      setSummoner(null);
      setMatches([]);
    } finally {
      setLoading(false);
    }
  }, [parsed?.gameName, parsed?.tagLine]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  useEffect(() => {
    const firstMatchId = matches[0]?.metadata?.matchId;
    for (const m of matches) {
      const matchId = m.metadata?.matchId;
      if (!matchId || timelineFetchedRef.current.has(matchId)) continue;
      timelineFetchedRef.current.add(matchId);
      fetch(
        `/api/riot/timeline?matchId=${encodeURIComponent(matchId)}&region=${REGION}`
      )
        .then(async (res) => {
          const isFirstMatch = matchId === firstMatchId;
          if (!res.ok) {
            const text = await res.text();
            if (isFirstMatch) {
              console.log("[Timeline Step 1] fetch failed", {
                matchId,
                status: res.status,
                errorMessage: text,
              });
            }
            setTimelineByMatchId((prev) => ({ ...prev, [matchId]: null }));
            return;
          }
          const data = (await res.json()) as MatchTimelineDto;
          if (
            isFirstMatch &&
            account &&
            !debugTimelineLoggedRef.current.has(matchId)
          ) {
            debugTimelineLoggedRef.current.add(matchId);
            const match = matches.find((mm) => mm.metadata?.matchId === matchId);
            if (match) {
              const participantId = getTimelineParticipantId(
                match,
                account.puuid
              );
              const frames = data.info?.frames ?? [];
              const eventsForParticipant = frames.flatMap(
                (f) =>
                  f.events?.filter(
                    (e: { participantId?: number }) =>
                      e.participantId === participantId
                  ) ?? []
              );
              const eventCount = eventsForParticipant.length;
              const firstPurchase = eventsForParticipant.find(
                (e: { type?: string }) => e.type === "ITEM_PURCHASED"
              ) as { timestamp?: number; itemId?: number } | undefined;
              console.log("[Timeline Step 1]", {
                matchId,
                timelineFetched: true,
                framesLength: frames.length,
                eventCountForParticipant: eventCount,
                firstItemPurchaseTimestampRaw: firstPurchase?.timestamp,
                firstItemPurchaseItemId: firstPurchase?.itemId,
              });
              const participantIndex = match.info?.participants?.findIndex(
                (p) => p.puuid === account.puuid
              );
              console.log("[Timeline Step 2]", {
                selectedPuuid: account.puuid,
                participantIndex: participantIndex ?? -1,
                timelineParticipantId: participantId,
              });
              const lastFrame = frames[frames.length - 1];
              const frameKeys = lastFrame
                ? Object.keys(lastFrame.participantFrames ?? {})
                : [];
              console.log(
                "[Timeline Step 1 extra] participantFrameKeys (last frame)",
                frameKeys
              );
            }
          }
          setTimelineByMatchId((prev) => ({ ...prev, [matchId]: data }));
        })
        .catch(() => {
          if (matchId === firstMatchId) {
            console.log("[Timeline Step 1] fetch error (network)", {
              matchId,
              error: "request failed",
            });
          }
          setTimelineByMatchId((prev) => ({ ...prev, [matchId]: null }));
        });
    }
  }, [matches, account]);

  if (!riotIdParam) {
    return (
      <div className="profile-empty">
        <p>Missing Riot ID. Open a profile from search results.</p>
        <Link href="/search">Go to search</Link>
      </div>
    );
  }

  if (!parsed) {
    return (
      <div className="profile-empty">
        <p>Invalid Riot ID in URL. Use format GameName#Tag.</p>
        <Link href="/search">Go to search</Link>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="profile-loading">
        <div className="profile-loading-spinner" />
        <p className="mt-4">
          <span className="profile-loading-text">Loading profile...</span>
        </p>
      </div>
    );
  }

  if (error || !account) {
    return (
      <div className="profile-empty">
        <p>{error ?? "Failed to load summoner"}</p>
        <button type="button" onClick={fetchProfile} className="mt-4 underline">
          Try again
        </button>
      </div>
    );
  }

  const participant = (m: MatchDto) =>
    m.info?.participants?.find((p) => p.puuid === account.puuid);
  const wins = matches.filter((m) => participant(m)?.win).length;
  const total = matches.length;
  const winRate = total ? Math.round((wins / total) * 100) : 0;

  const last10 = matches.slice(0, 10);
  let avgKills = 0,
    avgDeaths = 0,
    avgAssists = 0,
    totalCs = 0,
    totalDurationSec = 0;
  last10.forEach((m) => {
    const p = participant(m);
    if (p) {
      avgKills += p.kills;
      avgDeaths += p.deaths;
      avgAssists += p.assists;
      totalCs += (p.totalMinionsKilled ?? 0) + (p.neutralMinionsKilled ?? 0);
    }
    totalDurationSec += m.info?.gameDuration ?? 0;
  });
  const n = last10.length || 1;
  avgKills = Math.round((avgKills / n) * 10) / 10;
  avgDeaths = Math.round((avgDeaths / n) * 10) / 10;
  avgAssists = Math.round((avgAssists / n) * 10) / 10;
  const avgDurationMin = totalDurationSec / 60 / n;
  const avgCsPerMin =
    totalDurationSec > 0 ? totalCs / (totalDurationSec / 60) : 0;

  const role = primaryRole(matches, account.puuid);
  const level = summoner?.summonerLevel ?? 0;

  return (
    <>
      <section className="profile-hero">
        <div className="profile-hero-left">
          <div className="profile-hero-eyebrow">
            Summoner Profile · NA
          </div>
          <h1 className="profile-hero-name">
            {account.gameName}
            <span className="tag-part"> #{account.tagLine}</span>
          </h1>
          <div className="profile-hero-badges">
            <span className="profile-badge profile-badge-na">NA</span>
            {role && (
              <span className="profile-badge profile-badge-role">{role}</span>
            )}
            <span className="profile-badge profile-badge-level">
              Lv.{level}
            </span>
          </div>
        </div>
        <div className="profile-hero-right">
          <div className="profile-winrate-number">
            {winRate}<span className="pct">%</span>
          </div>
          <div className="profile-winrate-record">
            <span className="w">{wins}W</span> <span className="l">{total - wins}L</span>
          </div>
        </div>
      </section>

      <div className="profile-win-bar-wrap">
        <div
          className="profile-win-bar-fill"
          style={{ width: `${winRate}%` }}
        />
      </div>

      <div className="profile-stats-row">
        <div className="profile-stat-cell">
          <div className="profile-stat-label">Avg KDA</div>
          <div className="profile-stat-value blue">
            {avgKills} / {avgDeaths} / {avgAssists}
          </div>
        </div>
        <div className="profile-stat-cell">
          <div className="profile-stat-label">CS / Min</div>
          <div className="profile-stat-value">{avgCsPerMin.toFixed(1)}</div>
        </div>
        <div className="profile-stat-cell">
          <div className="profile-stat-label">Avg Duration</div>
          <div className="profile-stat-value">
            {avgDurationMin.toFixed(1)}<span className="unit">m</span>
          </div>
        </div>
        <div className="profile-stat-cell">
          <div className="profile-stat-label">Rank</div>
          <div className="profile-stat-value pending">Data coming soon</div>
        </div>
      </div>

      <div className="profile-matches-header">
        <h2 className="profile-matches-title">Recent Matches</h2>
        <span className="profile-matches-winrate">
          {total > 0 && `${winRate}% win rate`}
        </span>
      </div>
      <div className="profile-matches-list">
        {matches.map((m) => {
          const p = participant(m);
          if (!p) return null;
          const win = p.win;
          const duration = formatDuration(m.info?.gameDuration ?? 0);
          const minutes = Math.max(1, (m.info?.gameDuration ?? 0) / 60);
          const cs = (p.totalMinionsKilled ?? 0) + (p.neutralMinionsKilled ?? 0);
          const csPerMin = cs / minutes;
          const { blue, red } = getTeams(m);
          const queue = queueLabel(m.info?.queueId);
          const impact = account ? computeImpactScore(m, account.puuid) : null;
          const badges = getMatchBadges(m);
          const badgeInfo = account ? badges.get(account.puuid) : null;
          const relative = relativeTime(m.info?.gameEndTimestamp);
          const items = [p.item0, p.item1, p.item2, p.item3, p.item4, p.item5, p.item6].filter(
            (id): id is number => id != null && id > 0
          );

          const portraitBaseUrl = getChampionSplashUrl(p.championName);
          const champSquareUrl = getChampionSquareUrl(
            p.championName,
            ddragonVersion
          );

          const blueFive = blue.slice(0, 5);
          const redFive = red.slice(0, 5);
          const blueRows = [...blueFive, ...Array(5 - blueFive.length).fill(null)];
          const redRows = [...redFive, ...Array(5 - redFive.length).fill(null)];
          const { impactByPuuid, bestWinningPuuid, bestLosingPuuid } = getMatchImpactHighlights(m);

          return (
            <button
              key={m.metadata?.matchId ?? ""}
              type="button"
              className={`profile-match-row ${win ? "win" : "loss"}`}
              onClick={() => setDetailMatch(m)}
            >
              <div className="profile-match-left-zone">
                <div className="profile-match-left-visual">
                  <div className="profile-outcome-col">
                    <span className={`profile-outcome-pill ${win ? "win" : "loss"}`}>
                      {win ? "W" : "L"}
                    </span>
                  </div>
                  <span className={`profile-verdict-line ${win ? "win" : "loss"}`} />
                  <div className="profile-match-portrait-spells-wrap">
                    <div className="profile-match-portrait-wrap">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={portraitBaseUrl}
                        alt=""
                        className="profile-match-portrait"
                        width={64}
                        height={64}
                        onError={(e) => {
                          const target = e.currentTarget;
                          if (target.src !== champSquareUrl) {
                            target.src = champSquareUrl;
                          } else {
                            target.style.display = "none";
                          }
                        }}
                      />
                    </div>
                    <div className="profile-match-spells-runes">
                      <div className="profile-match-spells-col">
                        {[p.summoner1Id, p.summoner2Id].map((id, i) => {
                          const src = getSummonerSpellIconUrl(id, ddragonVersion);
                          if (!src) return null;
                          return (
                            <span key={i} className="profile-match-spell">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={src}
                                alt=""
                                width={24}
                                height={24}
                                style={{ width: 24, height: 24, objectFit: "contain", imageRendering: "auto" }}
                              />
                            </span>
                          );
                        })}
                      </div>
                      <div className="profile-match-runes-col">
                        {(() => {
                          const keystoneId = p.perks?.styles?.[0]?.selections?.[0]?.perk;
                          const secondaryStyleId = p.perks?.styles?.[1]?.style;
                          const keystoneSrc = getPerkIconUrl(keystoneId, perksById);
                          const secondarySrc = getStyleIconUrlCd(secondaryStyleId, stylesById);
                          const nodes: React.ReactNode[] = [];
                          if (keystoneSrc) {
                            nodes.push(
                              <span key="keystone" className="profile-match-rune">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={keystoneSrc}
                                  alt=""
                                  width={24}
                                  height={24}
                                  style={{ width: 24, height: 24, objectFit: "contain", imageRendering: "auto" }}
                                />
                              </span>
                            );
                          }
                          if (secondarySrc) {
                            nodes.push(
                              <span key="secondary" className="profile-match-rune">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={secondarySrc}
                                  alt=""
                                  width={24}
                                  height={24}
                                  style={{ width: 24, height: 24, objectFit: "contain", imageRendering: "auto" }}
                                />
                              </span>
                            );
                          }
                          return nodes;
                        })()}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="profile-match-left-meta">
                  <div className="profile-match-line1">
                    {win ? "Victory" : "Defeat"} · {queue} · {duration}
                    {relative && ` · ${relative}`}
                  </div>
                  <div className="profile-match-line2">
                    <span className="profile-kda-inline">
                      <span className="k">{p.kills}</span> /{" "}
                      <span className="d">{p.deaths}</span> /{" "}
                      <span className="a">{p.assists}</span>
                    </span>
                    {" · "}
                    <span>{cs} CS ({csPerMin.toFixed(1)}/m)</span>
                  </div>
                  <div className="profile-chips-row badgeArea socialBadgeWrap">
                    {impact != null && (
                      <span className="profile-impact-chip">
                        <span className="profile-impact-chip-label">Impact</span>
                        <span className="profile-impact-chip-score">{impact.score}</span>
                      </span>
                    )}
                    {badgeInfo && (
                      <span
                        className={`profile-badge-chip socialBadge ${getBadgeCategoryClass(
                          badgeInfo.badge
                        )}`}
                        title={badgeInfo.reason}
                      >
                        <span className="profile-badge-chip-text socialBadgeText">
                          {badgeInfo.badge}
                        </span>
                      </span>
                    )}
                  </div>
                  <div className="profile-match-items-row">
                    {(() => {
                      const matchId = m.metadata?.matchId;
                      const timeline = matchId
                        ? timelineByMatchId[matchId]
                        : undefined;
                      const participantId = account
                        ? getTimelineParticipantId(m, account.puuid)
                        : null;
                      const isFirstMatchCard =
                        matchId === matches[0]?.metadata?.matchId;
                      const slotTimestamps: (number | null)[] =
                        timeline && participantId != null
                          ? getItemSlotPurchaseTimes(timeline, participantId)
                          : [];
                      const firstPurchaseMap =
                        timeline && participantId != null
                          ? getFirstPurchaseMapNoUndo(timeline, participantId)
                          : null;
                      const finalBuild =
                        timeline && participantId != null
                          ? getFinalBuild(timeline, participantId)
                          : [];
                      return ([p.item0, p.item1, p.item2, p.item3, p.item4, p.item5] as (number | undefined)[]).map((id, idx) => {
                        const iconUrl = id != null && id > 0 ? getItemIconUrl(id) : null;
                        const debugSlot1Only =
                          isFirstMatchCard &&
                          idx === 1 &&
                          firstPurchaseMap != null &&
                          finalBuild.length > 0;
                        const slot1Time =
                          debugSlot1Only && finalBuild[1] != null
                            ? firstPurchaseMap.get(finalBuild[1]) ?? null
                            : null;
                        const timestamp =
                          debugSlot1Only
                            ? slot1Time
                            : (slotTimestamps[idx] ?? null);
                        const captionText =
                          id != null && id > 0 && timestamp != null
                            ? formatDuration(timestamp)
                            : null;
                        return (
                          <div key={`item-${idx}`} className="profile-match-item-tile">
                            <span className="profile-match-item">
                              {iconUrl ? (
                                /* eslint-disable-next-line @next/next/no-img-element */
                                <img src={iconUrl} alt="" width={22} height={22} />
                              ) : (
                                <span className="profile-match-item-empty" aria-hidden />
                              )}
                            </span>
                            <span
                              className="profile-match-item-caption"
                              style={debugSlot1Only ? { fontSize: 12 } : undefined}
                            >
                              {captionText}
                            </span>
                          </div>
                        );
                      });
                    })()}
                    {p.item6 != null && p.item6 > 0 ? (
                      <span className="profile-match-item profile-match-item-trinket">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={getItemIconUrl(p.item6)} alt="" width={22} height={22} />
                      </span>
                    ) : null}
                  </div>
                </div>
              </div>
              <div className="profile-match-teams-block">
                <div className="profile-match-team-col" aria-label="Blue team">
                  {blueRows.map((part, i) =>
                    part ? (
                      <div
                        key={part.puuid}
                        className={`profile-match-team-row ${part.puuid === account?.puuid ? "profile-match-team-row-highlight" : ""}`}
                      >
                        <span
                          className={`profile-match-team-impact ${
                            part.puuid === bestWinningPuuid
                              ? "profile-match-team-impact-gold"
                              : part.puuid === bestLosingPuuid
                                ? "profile-match-team-impact-purple"
                                : ""
                          }`}
                        >
                          {impactByPuuid.get(part.puuid) ?? 0}
                        </span>
                        <ChampIcon
                          championName={part.championName}
                          summonerName={part.summonerName}
                          ddragonVersion={ddragonVersion}
                          highlight={part.puuid === account?.puuid}
                        />
                        <span className="profile-match-team-name" title={part.riotIdGameName ?? part.summonerName}>
                          {part.riotIdGameName ?? part.summonerName}
                        </span>
                        <span className="profile-match-team-extra" aria-hidden />
                      </div>
                    ) : (
                      <div key={`blue-placeholder-${i}`} className="profile-match-team-row profile-match-team-row-placeholder" aria-hidden>
                        <span className="profile-match-team-impact" aria-hidden />
                        <span className="profile-match-team-champ profile-match-team-champ-fallback">
                          <span className="profile-match-team-champ-placeholder" />
                        </span>
                        <span className="profile-match-team-name" />
                        <span className="profile-match-team-extra" aria-hidden />
                      </div>
                    )
                  )}
                </div>
                <div className="profile-match-team-col" aria-label="Red team">
                  {redRows.map((part, i) =>
                    part ? (
                      <div
                        key={part.puuid}
                        className={`profile-match-team-row ${part.puuid === account?.puuid ? "profile-match-team-row-highlight" : ""}`}
                      >
                        <span
                          className={`profile-match-team-impact ${
                            part.puuid === bestWinningPuuid
                              ? "profile-match-team-impact-gold"
                              : part.puuid === bestLosingPuuid
                                ? "profile-match-team-impact-purple"
                                : ""
                          }`}
                        >
                          {impactByPuuid.get(part.puuid) ?? 0}
                        </span>
                        <ChampIcon
                          championName={part.championName}
                          summonerName={part.summonerName}
                          ddragonVersion={ddragonVersion}
                          highlight={part.puuid === account?.puuid}
                        />
                        <span className="profile-match-team-name" title={part.riotIdGameName ?? part.summonerName}>
                          {part.riotIdGameName ?? part.summonerName}
                        </span>
                        <span className="profile-match-team-extra" aria-hidden />
                      </div>
                    ) : (
                      <div key={`red-placeholder-${i}`} className="profile-match-team-row profile-match-team-row-placeholder" aria-hidden>
                        <span className="profile-match-team-impact" aria-hidden />
                        <span className="profile-match-team-champ profile-match-team-champ-fallback">
                          <span className="profile-match-team-champ-placeholder" />
                        </span>
                        <span className="profile-match-team-name" />
                        <span className="profile-match-team-extra" aria-hidden />
                      </div>
                    )
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {detailMatch && (
        <MatchDetailSlideOver
          match={detailMatch}
          puuid={account.puuid}
          onClose={() => setDetailMatch(null)}
        />
      )}
    </>
  );
}

export default function SummonerPage() {
  return (
    <Suspense
      fallback={
        <div className="profile-loading">
          <div className="profile-loading-spinner" />
          <p className="mt-4">Loading...</p>
        </div>
      }
    >
      <SummonerProfileContent />
    </Suspense>
  );
}
