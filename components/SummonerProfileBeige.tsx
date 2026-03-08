"use client";

import Link from "next/link";
import Image from "next/image";
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import useSWR from "swr";
import { buildProfileHref } from "@/lib/routes";
import type { ProfileBundle } from "@/app/api/riot/profileBundle/route";
import { MatchDetailSlideOver } from "@/components/summoner/MatchDetailSlideOver";
import { MatchDetails } from "@/components/MatchDetails";
import ChampionStatsCard from "@/components/ChampionStatsCard";
import { ChampionFirePortrait } from "@/components/ChampionFirePortrait";
import { ChampionIcePortrait } from "@/components/ChampionIcePortrait";
import { LeagueTooltip } from "@/components/LeagueTooltip";
import {
  getChampionSquareUrl,
  getChampionSplashUrl,
  getProfileIconUrl,
  getRankEmblemUrl,
  getSummonerSpellIconUrl,
  isValidItemId,
  getItemTooltip,
  DEFAULT_DDRAGON_VERSION,
} from "@/lib/riotAssets";
import {
  getPerkIconUrl,
  getStyleIconUrlCd,
  type PerkEntry,
  type PerkStyleEntry,
} from "@/lib/runesCd";
import { computeImpactScore } from "@/lib/impactScore";
import { getMatchBadges, getBadgeCategory } from "@/lib/matchBadges";
import { getTeamVerdict, type TeamVerdictType } from "@/lib/teamVerdict";
import { numberToRankLabel, rankToNumber } from "@/lib/rankMapping";
import { computeChampionStatsFromMatches } from "@/lib/championStatsFromMatches";
import { addRecent, addFavorite, removeFavorite, isFavorite } from "@/lib/savedSummoners";
import type { AccountDto, LeagueEntryDto, SummonerDto, MatchDto } from "@/types/riot";

/** Badges allowed in performance summary (no AFK / negative). */
const PERFORMANCE_BADGE_WHITELIST = ["Main Character", "Lane Bully", "Jungle Diff"];

/** Badge name -> profile CSS class for chip styling */
function getBadgeCategoryClass(badge: string): string {
  const cat = getBadgeCategory(badge);
  return `profile-badge-chip-badge-${cat}`;
}

/** Format tier + rank (division) e.g. "Platinum 3". */
function formatRankTier(tier: string, rank: string): string {
  if (tier == null || typeof tier !== "string") return rank ? String(rank) : "Unranked";
  const t = tier.charAt(0) + tier.slice(1).toLowerCase();
  return `${t} ${rank ?? ""}`.trim() || "Unranked";
}

/** League entry shape for participant rank badges (queueType + tier/rank). */
type LeagueEntry = { queueType: string; tier?: string; rank?: string };

/** Format short badge (P3, G1, M, GM, C) from entries for the given queueType. */
function formatRankBadge(entries: LeagueEntry[] | undefined, queueType: string): string | null {
  if (!entries) return null;
  const e = entries.find((x) => x.queueType === queueType);
  if (!e?.tier) return null;

  const tier = String(e.tier).toUpperCase();
  const rank = String(e.rank ?? "").toUpperCase();

  const tierLetter: Record<string, string> = {
    IRON: "I",
    BRONZE: "B",
    SILVER: "S",
    GOLD: "G",
    PLATINUM: "P",
    EMERALD: "E",
    DIAMOND: "D",
    MASTER: "M",
    GRANDMASTER: "GM",
    CHALLENGER: "C",
  };

  const letter = tierLetter[tier];
  if (!letter) return null;

  if (tier === "MASTER" || tier === "GRANDMASTER" || tier === "CHALLENGER") return letter;

  const divNum: Record<string, string> = { I: "1", II: "2", III: "3", IV: "4" };
  const n = divNum[rank];
  return n ? `${letter}${n}` : letter;
}

/** Win rate and total games from league entry. */
function rankStats(entry: LeagueEntryDto): { gamesPlayed: number; winRatePct: number } {
  const wins = entry.wins ?? 0;
  const losses = entry.losses ?? 0;
  const gamesPlayed = wins + losses;
  const winRatePct = gamesPlayed > 0 ? Math.round((wins / gamesPlayed) * 100) : 0;
  return { gamesPlayed, winRatePct };
}

/** CSS class for tier-based rank text color (clean, premium). */
function getRankTierColorClass(tier: string): string {
  const t = tier.toUpperCase();
  if (t === "PLATINUM") return "profile-ranked-tier-platinum";
  if (t === "GOLD") return "profile-ranked-tier-gold";
  if (t === "SILVER") return "profile-ranked-tier-silver";
  if (t === "EMERALD") return "profile-ranked-tier-emerald";
  if (["DIAMOND", "MASTER", "GRANDMASTER", "CHALLENGER"].includes(t)) return "profile-ranked-tier-diamond-plus";
  if (t === "BRONZE") return "profile-ranked-tier-bronze";
  if (t === "IRON") return "profile-ranked-tier-iron";
  return "";
}

/** Build rank badge and tier per puuid for a match (for match details panel). */
function getMatchRankBadges(
  match: MatchDto,
  leagueEntriesBySummonerId: Record<string, LeagueEntry[]>,
  accountPuuid: string | undefined,
  rankedSolo: LeagueEntryDto | null,
  rankedFlex: LeagueEntryDto | null,
  targetQueueType: string
): { rankBadgesByPuuid: Record<string, string>; rankTierByPuuid: Record<string, string> } {
  const rankBadgesByPuuid: Record<string, string> = {};
  const rankTierByPuuid: Record<string, string> = {};
  const participants = match.info?.participants ?? [];
  for (const p of participants) {
    const entries: LeagueEntry[] = p.puuid === accountPuuid && (rankedSolo || rankedFlex)
      ? ([rankedSolo, rankedFlex].filter(Boolean) as LeagueEntry[])
      : (p.summonerId != null ? leagueEntriesBySummonerId[p.summonerId] ?? [] : []);
    const badge = formatRankBadge(entries, targetQueueType);
    const entry = entries.find((e) => e.queueType === targetQueueType);
    const tier = entry?.tier ?? "";
    if (badge) rankBadgesByPuuid[p.puuid] = badge;
    if (tier) rankTierByPuuid[p.puuid] = tier;
  }
  return { rankBadgesByPuuid, rankTierByPuuid };
}

const DEFAULT_REGION = "na1";

/** Platform to short display label for badge/eyebrow */
function regionDisplayLabel(region: string): string {
  const r = region.toLowerCase();
  if (r === "na1") return "NA";
  if (r.startsWith("euw")) return "EUW";
  if (r === "kr") return "KR";
  return region.toUpperCase();
}

/** Team verdict indicator icon only (symbol matches design: star, diamond, dot, triangle, X) */
function TeamVerdictIcon({ verdict }: { verdict: TeamVerdictType }) {
  const className = "profile-team-verdict-icon";
  const viewBox = "0 0 24 24";
  switch (verdict) {
    case "Carried":
      return (
        <svg className={className} viewBox={viewBox} fill="currentColor" aria-hidden>
          <polygon points="12,2 14.4,9.2 22,9.2 16,14 17.6,21.2 12,17 6.4,21.2 8,14 2,9.2 9.6,9.2" />
        </svg>
      );
    case "Solid":
      return (
        <svg className={className} viewBox={viewBox} fill="currentColor" aria-hidden>
          <path d="M12 2L22 12 12 22 2 12z" />
        </svg>
      );
    case "Neutral":
      return (
        <svg className={className} viewBox={viewBox} fill="currentColor" aria-hidden>
          <circle cx="12" cy="12" r="5" />
        </svg>
      );
    case "Deadweight":
      return (
        <svg className={className} viewBox={viewBox} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M12 5l8 14H4L12 5z" />
        </svg>
      );
    case "Anchored":
      return (
        <svg className={className} viewBox={viewBox} fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden>
          <path d="M6 6l12 12M18 6L6 18" />
        </svg>
      );
    default:
      return null;
  }
}

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
  effectiveDdragonVersion,
  highlight,
}: {
  championName: string;
  summonerName: string;
  effectiveDdragonVersion: string | null;
  highlight?: boolean;
}) {
  const squareUrl = getChampionSquareUrl(championName, effectiveDdragonVersion);
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

function profileBundleFetcher([, riotId, region, queue]: [string, string, string, string]) {
  const url = `/api/riot/profileBundle?riotId=${encodeURIComponent(riotId)}&region=${encodeURIComponent(region)}&queue=${encodeURIComponent(queue)}`;
  return fetch(url, { cache: "no-store" }).then((r) => {
    if (!r.ok) return r.json().then((body) => Promise.reject(new Error((body as { error?: string }).error ?? "Failed to load profile")));
    return r.json() as Promise<ProfileBundle>;
  });
}

export default function SummonerProfileBeige({
  riotId: riotIdProp,
  region: regionProp,
}: {
  riotId?: string | null;
  region?: string;
} = {}) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const riotIdParam = riotIdProp !== undefined && riotIdProp !== null ? riotIdProp : searchParams.get("riotId");
  const regionVal = (regionProp ?? DEFAULT_REGION) as string;
  const parsed = parseRiotIdFromQuery(riotIdParam);
  const queue = searchParams.get("queue") || "solo";
  const targetQueueType = queue === "flex" ? "RANKED_FLEX_SR" : "RANKED_SOLO_5x5";
  const queueIdForMatches = queue === "flex" ? 440 : 420;

  const swrKey =
    riotIdParam && regionVal && parsed
      ? (["profileBundle", riotIdParam, regionVal, queue] as const)
      : null;
  const { data: bundle, error: bundleError, isLoading, mutate } = useSWR(
    swrKey,
    profileBundleFetcher,
    {
      revalidateOnFocus: true,
      revalidateOnReconnect: false,
      shouldRetryOnError: false,
      dedupingInterval: 30000,
    }
  );

  const [additionalMatchesByQueue, setAdditionalMatchesByQueue] = useState<Record<string, MatchDto[]>>({});
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadMoreError, setLoadMoreError] = useState<string | null>(null);
  const [hasMoreByQueue, setHasMoreByQueue] = useState<Record<string, boolean>>({});
  const [ddragonVersion, setDdragonVersion] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState<string | null>(null);
  const [isFav, setIsFav] = useState(false);

  const account = bundle?.profile.account ?? null;
  const summoner = bundle?.profile.summoner ?? null;
  const bundleMatches = bundle?.matches ?? [];
  const displayedMatches = bundleMatches.concat(additionalMatchesByQueue[queue] ?? []);
  const effectiveDdragonVersion = bundle?.ddragonVersion ?? ddragonVersion;
  const leagueEntries = bundle
    ? ([bundle.ranked.solo, bundle.ranked.flex].filter(Boolean) as LeagueEntryDto[])
    : [];
  const leagueEntriesBySummonerId = bundle?.leagueEntriesBySummonerId ?? {};
  const leagueBySummonerId = (bundle?.leagueEntriesBySummonerId ?? {}) as Record<string, LeagueEntry[]>;
  const avgRank = bundle
    ? { label: bundle.computed.avgRankPlayedAgainst, rankedCount: bundle.computed.avgRankRankedCount }
    : { label: "Unranked", rankedCount: 0 };
  const rankError = bundle ? null : null;
  const rankLoading = isLoading;
  const loading = isLoading;
  const error = bundleError?.message ?? null;

  const [detailMatch, setDetailMatch] = useState<MatchDto | null>(null);
  const [expandedMatchId, setExpandedMatchId] = useState<string | null>(null);

  const activeQueueType = queue === "flex" ? "RANKED_FLEX_SR" : "RANKED_SOLO_5x5";

  const [perksById, setPerksById] = useState<Map<number, string>>(new Map());
  const [perkNamesById, setPerkNamesById] = useState<Map<number, string>>(new Map());
  const [perkDataById, setPerkDataById] = useState<Map<number, { name?: string; shortDesc?: string }>>(new Map());
  const [stylesById, setStylesById] = useState<Map<number, string>>(new Map());
  const [styleNamesById, setStyleNamesById] = useState<Map<number, string>>(new Map());
  const [itemDataById, setItemDataById] = useState<Record<number, { name: string; plaintext?: string }>>({});
  const [mainTab, setMainTab] = useState<"overview" | "champion-pool">("overview");
  const lastChampionStatsRefreshTrigger = useRef<Map<string, number>>(new Map());

  const championStatsFromDisplayed = useMemo(() => {
    if (!account?.puuid || displayedMatches.length === 0) return null;
    const champions = computeChampionStatsFromMatches(displayedMatches, account.puuid);
    return { champions, updatedAt: new Date().toISOString() };
  }, [displayedMatches, account?.puuid]);

  // op.gg / u.gg / blitz style: champion stats are always full-season when we have them.
  // Prefer bundle (DB full-season) for current queue; only use displayed-matches stats as fallback when bundle has no data.
  const championStatsToShow = useMemo(() => {
    const empty = { champions: [], updatedAt: "" };
    const bundleSolo = bundle?.championStats?.solo ?? empty;
    const bundleFlex = bundle?.championStats?.flex ?? empty;
    const hasSoloFromBundle = (bundleSolo.champions?.length ?? 0) > 0;
    const hasFlexFromBundle = (bundleFlex.champions?.length ?? 0) > 0;
    const solo =
      queue === "solo"
        ? hasSoloFromBundle
          ? bundleSolo
          : championStatsFromDisplayed ?? bundleSolo
        : bundleSolo;
    const flex =
      queue === "flex"
        ? hasFlexFromBundle
          ? bundleFlex
          : championStatsFromDisplayed ?? bundleFlex
        : bundleFlex;
    return { solo, flex };
  }, [queue, championStatsFromDisplayed, bundle?.championStats]);

  /** Current streak from most recent match: "win" | "loss" | null. Must be before any early return (hooks order). */
  const currentStreak = useMemo(() => {
    const puuid = account?.puuid;
    if (!puuid || displayedMatches.length === 0) return null;
    const getParticipant = (m: MatchDto) => m.info?.participants?.find((p) => p.puuid === puuid);
    const first = getParticipant(displayedMatches[0]);
    if (!first) return null;
    const isWin = first.win;
    let count = 0;
    for (const m of displayedMatches) {
      const p = getParticipant(m);
      if (!p || p.win !== isWin) break;
      count += 1;
    }
    return count >= 1 ? (isWin ? "win" : "loss") : null;
  }, [displayedMatches, account?.puuid]);

  /** Number of consecutive wins from most recent match; 0 if last was a loss or no matches. Used for fire icon (3+). */
  const winStreakCount = useMemo(() => {
    const puuid = account?.puuid;
    if (!puuid || displayedMatches.length === 0) return 0;
    const getParticipant = (m: MatchDto) => m.info?.participants?.find((p) => p.puuid === puuid);
    const first = getParticipant(displayedMatches[0]);
    if (!first || !first.win) return 0;
    let count = 0;
    for (const m of displayedMatches) {
      const p = getParticipant(m);
      if (!p || !p.win) break;
      count += 1;
    }
    return count;
  }, [displayedMatches, account?.puuid]);

  /** Badge counts for performance summary (whitelist: Main Character, Lane Bully, Jungle Diff only; no AFK/negative). Must be before any early return (hooks order). */
  const badgeCounts = useMemo(() => {
    if (!account?.puuid || displayedMatches.length === 0) return [] as Array<{ badge: string; count: number }>;
    const counts = new Map<string, number>();
    for (const m of displayedMatches) {
      const info = getMatchBadges(m).get(account.puuid);
      if (info?.badge && PERFORMANCE_BADGE_WHITELIST.includes(info.badge)) {
        counts.set(info.badge, (counts.get(info.badge) ?? 0) + 1);
      }
    }
    return [...counts.entries()]
      .map(([badge, count]) => ({ badge, count }))
      .sort((a, b) => b.count - a.count);
  }, [displayedMatches, account?.puuid]);

  /** Most common team verdict in displayed matches (for performance summary). */
  const avgTeamVerdict = useMemo((): TeamVerdictType | null => {
    if (!account?.puuid || displayedMatches.length === 0) return null;
    const counts = new Map<TeamVerdictType, number>();
    for (const m of displayedMatches) {
      const v = getTeamVerdict(m, account.puuid);
      if (v) counts.set(v.verdict, (counts.get(v.verdict) ?? 0) + 1);
    }
    let maxCount = 0;
    let mode: TeamVerdictType | null = null;
    counts.forEach((c, verdict) => {
      if (c > maxCount) {
        maxCount = c;
        mode = verdict;
      }
    });
    return mode;
  }, [displayedMatches, account?.puuid]);

  useEffect(() => {
    setAdditionalMatchesByQueue({});
    setHasMoreByQueue({});
    setLoadMoreError(null);
  }, [riotIdParam, regionVal]);

  useEffect(() => {
    if (!riotIdParam || !regionVal) return;
    setIsFav(isFavorite(riotIdParam, regionVal));
    if (account) {
      const label = `${account.gameName}#${account.tagLine}`;
      addRecent({ riotId: riotIdParam, region: regionVal, label });
    }
  }, [riotIdParam, regionVal, account?.gameName, account?.tagLine]);

  // Backfill suggestion row with profile icon so search dropdown shows the real icon next time
  useEffect(() => {
    if (!account?.puuid || !riotIdParam) return;
    const gameName = account.gameName?.trim();
    const tagLine = account.tagLine?.trim();
    if (!gameName || !tagLine) return;
    const payload = {
      riotId: riotIdParam,
      gameName,
      tagLine,
      puuid: account.puuid,
      ...(summoner?.profileIconId != null &&
        summoner.profileIconId > 0 && { profileIconId: summoner.profileIconId }),
      ...(summoner?.summonerLevel != null && {
        summonerLevel: summoner.summonerLevel,
      }),
    };
    fetch("/api/search/suggestions", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
      keepalive: true,
    }).catch(() => {});
  }, [
    account?.puuid,
    account?.gameName,
    account?.tagLine,
    riotIdParam,
    summoner?.profileIconId,
    summoner?.summonerLevel,
  ]);

  // When bundle match list actually changes (e.g. after refresh with new data), clear "Show more" buffer so pagination stays in sync
  const bundleFirstMatchId = bundle?.matches?.[0]?.metadata?.matchId ?? null;
  useEffect(() => {
    if (!bundle?.matches?.length || !queue) return;
    setAdditionalMatchesByQueue((prev) => {
      if (!prev[queue]?.length) return prev;
      const next = { ...prev };
      next[queue] = [];
      return next;
    });
  }, [queue, bundle?.matches?.length, bundleFirstMatchId]);

  const CHAMPION_STATS_STALE_MS = 5 * 60 * 1000;
  const CHAMPION_STATS_REFRESH_THROTTLE_MS = 4 * 60 * 1000;

  const handleRefreshMatchHistory = useCallback(async () => {
    if (!swrKey || isRefreshing) return;
    setRefreshError(null);
    setIsRefreshing(true);
    try {
      const [, riotId, region, q] = swrKey;
      const url = `/api/riot/profileBundle?riotId=${encodeURIComponent(riotId)}&region=${encodeURIComponent(region)}&queue=${encodeURIComponent(q)}&forceRefresh=1`;
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error((body as { error?: string }).error ?? "Refresh failed");
      }
      const data = (await res.json()) as ProfileBundle;
      await mutate(data, false);
      setAdditionalMatchesByQueue((prev) => ({ ...prev, [queue]: [] }));
    } catch (err) {
      setRefreshError(err instanceof Error ? err.message : "Refresh failed");
    } finally {
      setIsRefreshing(false);
    }
  }, [swrKey, queue, mutate, isRefreshing]);

  useEffect(() => {
    if (bundle?.ddragonVersion != null) setDdragonVersion(bundle.ddragonVersion);
  }, [bundle?.ddragonVersion]);

  useEffect(() => {
    fetch("/api/ddragon/version")
      .then((r) => r.json())
      .then((data: { version?: string }) => setDdragonVersion((prev) => prev ?? data.version ?? null))
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetch("/api/cd/perks")
      .then((r) => r.json())
      .then((data: { perks?: PerkEntry[] }) => {
        const list = data.perks ?? [];
        const iconMap = new Map<number, string>();
        const nameMap = new Map<number, string>();
        const dataMap = new Map<number, { name?: string; shortDesc?: string }>();
        list.forEach((p) => {
          iconMap.set(p.id, p.iconPath);
          if (p.name) nameMap.set(p.id, p.name);
          dataMap.set(p.id, { name: p.name, shortDesc: p.shortDesc });
        });
        setPerksById(iconMap);
        setPerkNamesById(nameMap);
        setPerkDataById(dataMap);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetch("/api/cd/perkstyles")
      .then((r) => r.json())
      .then((data: { styles?: PerkStyleEntry[] }) => {
        const list = data.styles ?? [];
        const iconMap = new Map<number, string>();
        const nameMap = new Map<number, string>();
        list.forEach((s) => {
          iconMap.set(s.id, s.iconPath);
          if (s.name) nameMap.set(s.id, s.name);
        });
        setStylesById(iconMap);
        setStyleNamesById(nameMap);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const version = ddragonVersion ?? DEFAULT_DDRAGON_VERSION;
    fetch(`/api/ddragon/items?version=${encodeURIComponent(version)}`)
      .then((r) => r.json())
      .then((data: { items?: Record<string, { name?: string; plaintext?: string }> }) => {
        const items = data.items ?? {};
        const byId: Record<number, { name: string; plaintext?: string }> = {};
        Object.entries(items).forEach(([id, entry]) => {
          const num = Number(id);
          if (!Number.isFinite(num) || num <= 0) return;
          const name = (entry?.name ?? "").trim() || `Item ${id}`;
          byId[num] = { name, plaintext: entry?.plaintext };
        });
        setItemDataById(byId);
      })
      .catch(() => {});
  }, [ddragonVersion]);

  // When champion stats are missing or stale, trigger refresh then revalidate so they update without leaving the page
  useEffect(() => {
    const puuid = bundle?.profile?.account?.puuid;
    const championStats = bundle?.championStats;
    if (!puuid || !championStats) return;
    const now = Date.now();
    const isStale = (updatedAt: string | undefined) =>
      !updatedAt || now - new Date(updatedAt).getTime() > CHAMPION_STATS_STALE_MS;
    const soloEmpty = !championStats.solo?.champions?.length;
    const flexEmpty = !championStats.flex?.champions?.length;
    const soloStale = isStale(championStats.solo?.updatedAt);
    const flexStale = isStale(championStats.flex?.updatedAt);
    const needSolo = soloEmpty || soloStale;
    const needFlex = flexEmpty || flexStale;
    if (!needSolo && !needFlex) return;
    const last = lastChampionStatsRefreshTrigger.current.get(puuid) ?? 0;
    if (now - last < CHAMPION_STATS_REFRESH_THROTTLE_MS) return;
    lastChampionStatsRefreshTrigger.current.set(puuid, now);

    const region = regionVal ?? "na1";
    const refresh = (q: "solo" | "flex") =>
      fetch("/api/champion-stats/refresh", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ puuid, queue: q, region }),
      }).catch(() => {});

    if (needSolo) refresh("solo");
    if (needFlex) refresh("flex");
    const delays = [15000, 35000, 55000, 85000, 120000];
    const timers = delays.map((ms) => setTimeout(() => mutate(), ms));
    return () => timers.forEach((t) => clearTimeout(t));
  }, [bundle?.profile?.account?.puuid, bundle?.championStats, regionVal, mutate]);

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
        <button type="button" onClick={() => mutate()} className="mt-4 underline">
          Try again
        </button>
      </div>
    );
  }

  const participant = (m: MatchDto) =>
    m.info?.participants?.find((p) => p.puuid === account.puuid);
  const wins = displayedMatches.filter((m) => participant(m)?.win).length;
  const total = displayedMatches.length;
  const winRate = total ? Math.round((wins / total) * 100) : 0;

  const matchCount = displayedMatches.length;
  const avgKdaDisplay = (() => {
    const n = displayedMatches.length || 1;
    let k = 0, d = 0, a = 0;
    displayedMatches.forEach((m) => {
      const p = participant(m);
      if (p) { k += p.kills ?? 0; d += p.deaths ?? 0; a += p.assists ?? 0; }
    });
    return `${Math.round((k / n) * 10) / 10}/${Math.round((d / n) * 10) / 10}/${Math.round((a / n) * 10) / 10}`;
  })();
  const avgDurationMin = (() => {
    const n = displayedMatches.length || 1;
    const totalSec = displayedMatches.reduce((s, m) => s + (m.info?.gameDuration ?? 0), 0);
    return totalSec / 60 / n;
  })();
  const avgCsPerMin = (() => {
    const n = displayedMatches.length || 1;
    const totalSec = displayedMatches.reduce((s, m) => s + (m.info?.gameDuration ?? 0), 0);
    let totalCs = 0;
    displayedMatches.forEach((m) => {
      const p = participant(m);
      if (p) totalCs += (p.totalMinionsKilled ?? 0) + (p.neutralMinionsKilled ?? 0);
    });
    return totalSec > 0 ? totalCs / (totalSec / 60) : 0;
  })();

  const { kdaRatio, totalK, totalD, totalA } = (() => {
    let k = 0, d = 0, a = 0;
    displayedMatches.forEach((m) => {
      const p = participant(m);
      if (p) { k += p.kills ?? 0; d += p.deaths ?? 0; a += p.assists ?? 0; }
    });
    const ratio = (k + a) / Math.max(1, d);
    return { kdaRatio: Math.round(ratio * 100) / 100, totalK: k, totalD: d, totalA: a };
  })();

  const topChampsFromRecent = (championStatsFromDisplayed?.champions ?? []).slice(0, 3);

  const mostPlayedChampion =
    queue === "solo"
      ? championStatsToShow?.solo?.champions?.[0]
      : championStatsToShow?.flex?.champions?.[0];
  const heroSplashUrl =
    mostPlayedChampion?.championName
      ? getChampionSplashUrl(mostPlayedChampion.championName)
      : null;

  const role = primaryRole(displayedMatches, account.puuid);

  const level = summoner?.summonerLevel ?? 0;

  const leagueEntry = leagueEntries?.find((e) => e.queueType === targetQueueType) ?? null;
  const leagueQueueLabel = queue === "flex" ? "Flex" : "";
  const soloEntry = leagueEntries?.find((e) => e.queueType === "RANKED_SOLO_5x5") ?? null;
  const flexEntry = leagueEntries?.find((e) => e.queueType === "RANKED_FLEX_SR") ?? null;

  const setQueueTab = (q: "solo" | "flex") => {
    if (queue === q) return;
    const params = new URLSearchParams(searchParams.toString());
    params.set("riotId", riotIdParam ?? "");
    params.set("queue", q);
    router.replace(`${pathname ?? "/summoner"}?${params.toString()}`);
  };

  const renderRankCard = (title: string, entry: LeagueEntryDto | null, loading: boolean, err: string | null) => {
    if (loading) return <div className="profile-rank-card profile-rank-card-unranked"><div className="profile-rank-card-title">{title}</div><div className="profile-rank-card-content"><span className="profile-ranked-loading">Loading…</span></div></div>;
    if (err) return <div className="profile-rank-card profile-rank-card-unranked"><div className="profile-rank-card-title">{title}</div><div className="profile-rank-card-content"><span className="profile-ranked-error">{err}</span></div></div>;
    if (!entry) return (
      <div className="profile-rank-card profile-rank-card-unranked">
        <div className="profile-rank-card-title">{title}</div>
        <div className="profile-rank-card-content">
          <span className="profile-ranked-tier-line profile-ranked-unranked">Unranked</span>
        </div>
      </div>
    );
    const { gamesPlayed, winRatePct } = rankStats(entry);
    const tier = entry.tier ?? "";
    const tierKey = tier.toLowerCase();
    const lp = entry.leaguePoints ?? 0;
    return (
      <div className={`rank-card ${tierKey}`}>
        <div className="card-inner">
          <div className="card-header">
            <span className="queue-label">{title}</span>
            <span className="season-tag">S15</span>
          </div>
          <div className="card-body">
            <div className="rank-emblem">
              <div className="emblem-icon">
                {tier ? (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      className="emblem-img"
                      src={getRankEmblemUrl(tier)}
                      alt=""
                      width={70}
                      height={70}
                      onError={(e) => {
                        e.currentTarget.style.display = "none";
                        const fallback = e.currentTarget.nextElementSibling;
                        if (fallback) (fallback as HTMLElement).style.display = "flex";
                      }}
                    />
                    <div className="emblem-img loading-placeholder" style={{ display: "none" }}>
                      {tier}
                    </div>
                  </>
                ) : null}
              </div>
              <span className="rank-name">{formatRankTier(tier, entry.rank ?? "")}</span>
            </div>
            <div className="stats-panel">
              <div className="lp-row">
                <span className="lp-value">{lp}</span>
                <span className="lp-label">LP</span>
              </div>
              <div className="lp-bar-track">
                <div className="lp-bar-fill" style={{ width: `${Math.min(100, lp)}%` }} />
              </div>
              <div className="stat-grid">
                <div className="stat-item">
                  <span className="stat-label">Win Rate</span>
                  <span className="stat-value wr">{winRatePct}%</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Games</span>
                  <span className="stat-value">{gamesPlayed}</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Record</span>
                  <span className="stat-value"><span className="win">{entry.wins}W</span><span className="sep">–</span><span className="loss">{entry.losses}L</span></span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      <section className="profile-hero">
        {heroSplashUrl && (
          <>
            <div
              className="profile-hero-splash-bg"
              style={{ backgroundImage: `url(${heroSplashUrl})` }}
              aria-hidden
            />
            <div className="profile-hero-splash-overlay" aria-hidden />
          </>
        )}
        <div className="profile-hero-left">
          <h1 className="profile-hero-name">
            {summoner?.profileIconId != null &&
              (winStreakCount >= 3 ? (
                <ChampionFirePortrait>
                  <img
                    src={getProfileIconUrl(summoner.profileIconId, effectiveDdragonVersion)}
                    alt=""
                    className="profile-match-portrait"
                    width={56}
                    height={56}
                    fetchPriority="high"
                    loading="eager"
                  />
                </ChampionFirePortrait>
              ) : currentStreak === "loss" ? (
                <ChampionIcePortrait>
                  <img
                    src={getProfileIconUrl(summoner.profileIconId, effectiveDdragonVersion)}
                    alt=""
                    className="profile-match-portrait"
                    width={56}
                    height={56}
                    fetchPriority="high"
                    loading="eager"
                  />
                </ChampionIcePortrait>
              ) : (
                <span className="profile-hero-icon-wrap">
                  <img
                    src={getProfileIconUrl(summoner.profileIconId, effectiveDdragonVersion)}
                    alt=""
                    className="profile-hero-icon"
                    width={56}
                    height={56}
                    fetchPriority="high"
                    loading="eager"
                  />
                </span>
              ))}
            <span className="profile-hero-name-block">
              <span className="profile-hero-name-text">
                {account.gameName}
                <span className="tag-part"> #{account.tagLine}</span>
              </span>
            </span>
          </h1>
          <div className="profile-hero-badges">
            <span className="profile-badge profile-badge-na">{regionDisplayLabel(regionVal)}</span>
            {role && <span className="profile-badge profile-badge-role">{role}</span>}
            <span className="profile-badge profile-badge-level">Lv.{level}</span>
            {riotIdParam && (
              <button
                type="button"
                onClick={() => {
                  if (isFav) {
                    removeFavorite(riotIdParam, regionVal);
                    setIsFav(false);
                  } else {
                    addFavorite({
                      riotId: riotIdParam,
                      region: regionVal,
                      label: account ? `${account.gameName}#${account.tagLine}` : riotIdParam,
                    });
                    setIsFav(true);
                  }
                }}
                className="profile-badge border-indigo-500/50 bg-indigo-500/15 text-indigo-300 hover:bg-indigo-500/25 cursor-pointer"
              >
                {isFav ? "★ Favorited" : "☆ Add to Favorites"}
              </button>
            )}
          </div>
        </div>
        <nav className="profile-hero-tabs" aria-label="Profile sections">
          <button type="button" className={`profile-hero-tab${mainTab === "overview" ? " profile-hero-tab-active" : ""}`} onClick={() => setMainTab("overview")}>Overview</button>
          <button type="button" className={`profile-hero-tab${mainTab === "champion-pool" ? " profile-hero-tab-active" : ""}`} onClick={() => setMainTab("champion-pool")}>Champion Pool</button>
        </nav>
      </section>

      <div className="profile-body">
        <aside className="profile-body-left">
          {renderRankCard("Ranked Solo", soloEntry, rankLoading, rankError ?? null)}
          {renderRankCard("Ranked Flex", flexEntry, rankLoading, null)}
          {championStatsToShow && (
            <ChampionStatsCard
              championStats={championStatsToShow}
              ddragonVersion={effectiveDdragonVersion}
              puuid={account.puuid}
              region={regionVal}
              onRefresh={() => mutate()}
            />
          )}
        </aside>
        <div className="profile-body-right">
      <div className="recent-matches-section">
        <div className="profile-queue-tabs">
          <button
            type="button"
            className={`profile-queue-tab${queue === "solo" ? " profile-queue-tab-active" : ""}`}
            onClick={() => setQueueTab("solo")}
          >
            Solo or Duo
          </button>
          <button
            type="button"
            className={`profile-queue-tab${queue === "flex" ? " profile-queue-tab-active" : ""}`}
            onClick={() => setQueueTab("flex")}
          >
            Flex
          </button>
        </div>
        {!displayedMatches?.length ? (
          <div className="profile-matches-empty">
            <p>No matches loaded yet</p>
            <button type="button" onClick={() => mutate()} className="mt-4 underline">
              Retry
            </button>
          </div>
        ) : (
          <>
        <div className="profile-performance-summary" aria-label="Last games performance">
          <div className="profile-performance-strip">
            <span className="profile-performance-meta">Last {total} games</span>
            <span className="profile-performance-sep" aria-hidden>·</span>
            <span className="profile-performance-wr">{winRate}%</span>
            <span className="profile-performance-wl">{wins}W – {total - wins}L</span>
            <span className="profile-performance-sep" aria-hidden>·</span>
            <span className="profile-performance-kda-num">{kdaRatio} KDA</span>
            <span className="profile-performance-kda-detail">{(totalK / Math.max(1, total)).toFixed(1)} / {(totalD / Math.max(1, total)).toFixed(1)} / {(totalA / Math.max(1, total)).toFixed(1)}</span>
            <span className="profile-performance-sep" aria-hidden>·</span>
            <span className="profile-performance-rank-label">Average enemy rank</span>
            <span className="profile-performance-rank">{avgRank.label}</span>
          </div>
          <div className="profile-performance-extra">
            {topChampsFromRecent.length > 0 && (
              <div className="profile-performance-picks">
                <span className="profile-performance-picks-label">Most played</span>
                <div className="profile-performance-picks-icons">
                  {topChampsFromRecent.map((champ) => (
                    <div key={champ.championId} className="profile-performance-pick" title={`${champ.championName} · ${champ.winRate}% · ${champ.kda.toFixed(1)} KDA`}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        className="profile-performance-pick-img"
                        src={getChampionSquareUrl(champ.championName, effectiveDdragonVersion)}
                        alt=""
                        width={24}
                        height={24}
                      />
                      <span className="profile-performance-pick-wr">{champ.winRate}%</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {(badgeCounts.length > 0 || avgTeamVerdict) && (
              <div className="profile-performance-badges-row">
                {badgeCounts.length > 0 && (
                  <div className="profile-performance-badges-wrap">
                    <div className="profile-performance-badges-list">
                      {badgeCounts.map(({ badge, count }) =>
                        badge === "Main Character" ? (
                          <span key={badge} className="profile-performance-badge-mc" title={`Main Character ×${count}`}>
                            <span className="mc-badge mc-badge-compact">
                              <svg className="mc-icon" viewBox="0 0 24 24" fill="none" aria-hidden>
                                <path d="M3 18H21V20H3V18Z" fill="#c9a356" />
                                <path d="M3 16L5 7L9.5 11L12 4L14.5 11L19 7L21 16H3Z" fill="url(#crownGoldGradPerf)" />
                                <circle cx="12" cy="5" r="1.5" fill="#f5e6b8" />
                                <defs>
                                  <linearGradient id="crownGoldGradPerf" x1="3" y1="4" x2="21" y2="18">
                                    <stop offset="0%" stopColor="#f5e6b8" />
                                    <stop offset="50%" stopColor="#c9a356" />
                                    <stop offset="100%" stopColor="#a07830" />
                                  </linearGradient>
                                </defs>
                              </svg>
                              <span className="mc-badge-compact-text">Main Character</span>
                              <span className="profile-performance-badge-count">×{count}</span>
                            </span>
                          </span>
                        ) : (
                          <span
                            key={badge}
                            className={`profile-badge-chip profile-performance-badge-chip ${getBadgeCategoryClass(badge)}`}
                            title={`${badge} ×${count}`}
                          >
                            <span className="profile-badge-chip-text">{badge}</span>
                            <span className="profile-performance-badge-count">×{count}</span>
                          </span>
                        )
                      )}
                    </div>
                  </div>
                )}
                {avgTeamVerdict && (
                  <div className="profile-performance-verdict-wrap" title={`Average team verdict: ${avgTeamVerdict}`}>
                    <span className="profile-performance-picks-label">Average team verdict</span>
                    <span className={`profile-badge-chip team-verdict-badge team-verdict-${avgTeamVerdict.toLowerCase()}`}>
                      <TeamVerdictIcon verdict={avgTeamVerdict} />
                      <span className="profile-performance-verdict-label">{avgTeamVerdict}</span>
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
        <div className="profile-matches-header">
          <div className="profile-matches-header-left">
            <h2 className="profile-matches-title">Recent Matches</h2>
            <span className="profile-matches-count">({matchCount})</span>
            <Link
              href="/team-verdict"
              className="text-sm text-zinc-500 hover:text-indigo-400 transition-colors ml-2"
            >
              What is Team Verdict?
            </Link>
            <button
              type="button"
              onClick={handleRefreshMatchHistory}
              disabled={isLoading || isRefreshing}
              className="profile-matches-refresh"
              title="Update match history"
            >
              {(isLoading || isRefreshing) && (
                <span className="profile-matches-refresh-spinner" aria-hidden />
              )}
              {isLoading || isRefreshing ? "Updating…" : "Refresh"}
            </button>
            {refreshError && (
              <span className="profile-matches-refresh-error" role="alert">
                {refreshError}
              </span>
            )}
          </div>
          <div className="profile-matches-header-stats recent-stats">
            <div className="stat-chip">
              <span className="stat-value">{avgKdaDisplay}</span>
              <span className="stat-label">KDA</span>
            </div>
            <div className="stat-chip">
              <span className="stat-value">{avgCsPerMin.toFixed(1)}</span>
              <span className="stat-label">CS/m</span>
            </div>
            <div className="stat-chip">
              <span className="stat-value">{avgDurationMin.toFixed(1)}m</span>
              <span className="stat-label">avg</span>
            </div>
            <div className="stat-chip">
              <span className="stat-value">{avgRank.label}</span>
              <span className="stat-label">
                AVG RANK{avgRank.rankedCount > 0 ? ` (${avgRank.rankedCount} ranked)` : ""}
              </span>
            </div>
          </div>
        </div>
        <div className="profile-matches-list">
        {displayedMatches.map((m, matchIndex) => {
          const p = participant(m);
          if (!p) return null;
          const isFirstRow = matchIndex === 0;
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
          const teamVerdict = account ? getTeamVerdict(m, account.puuid) : null;
          const relative = relativeTime(m.info?.gameEndTimestamp);
          const items = [p.item0, p.item1, p.item2, p.item3, p.item4, p.item5, p.item6].filter(
            (id): id is number => id != null && id > 0
          );

          const champSquareUrl = getChampionSquareUrl(
            p.championName,
            effectiveDdragonVersion
          );

          const blueFive = blue.slice(0, 5);
          const redFive = red.slice(0, 5);
          const blueRows = [...blueFive, ...Array(5 - blueFive.length).fill(null)];
          const redRows = [...redFive, ...Array(5 - redFive.length).fill(null)];
          const { impactByPuuid, bestWinningPuuid, bestLosingPuuid } = getMatchImpactHighlights(m);
          const matchId = m.metadata?.matchId ?? "";

          return (
            <div key={matchId} className="profile-match-card-wrap">
              <div
                role="button"
                tabIndex={0}
                className={`profile-match-row ${win ? "win" : "loss"}${badgeInfo?.badge === "Main Character" ? " profile-match-row-main-character" : ""}`}
                onClick={() => setExpandedMatchId((prev) => (prev === matchId ? null : matchId))}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setExpandedMatchId((prev) => (prev === matchId ? null : matchId));
                  }
                }}
              >
              {badgeInfo?.badge === "Main Character" && (
                <div className="profile-match-row-sparkles" aria-hidden>
                  <div className="sparkle" style={{ left: "0%", top: "20%", transform: "translate(-50%, -50%)", ["--dur" as string]: "2.4s", ["--delay" as string]: "0s" }} />
                  <div className="sparkle" style={{ left: "0%", top: "50%", transform: "translate(-50%, -50%)", ["--dur" as string]: "2.8s", ["--delay" as string]: "0.5s" }} />
                  <div className="sparkle" style={{ left: "0%", top: "80%", transform: "translate(-50%, -50%)", ["--dur" as string]: "2.2s", ["--delay" as string]: "1s" }} />
                  <div className="sparkle" style={{ left: "100%", top: "25%", transform: "translate(50%, -50%)", ["--dur" as string]: "2.6s", ["--delay" as string]: "0.3s" }} />
                  <div className="sparkle" style={{ left: "100%", top: "75%", transform: "translate(50%, -50%)", ["--dur" as string]: "2.3s", ["--delay" as string]: "0.8s" }} />
                  <div className="sparkle" style={{ left: "15%", top: "0%", transform: "translate(-50%, -50%)", ["--dur" as string]: "2.5s", ["--delay" as string]: "0.2s" }} />
                  <div className="sparkle" style={{ left: "50%", top: "0%", transform: "translate(-50%, -50%)", ["--dur" as string]: "2.7s", ["--delay" as string]: "0.6s" }} />
                  <div className="sparkle" style={{ left: "85%", top: "0%", transform: "translate(-50%, -50%)", ["--dur" as string]: "2.1s", ["--delay" as string]: "1.2s" }} />
                  <div className="sparkle" style={{ left: "20%", top: "100%", transform: "translate(-50%, 50%)", ["--dur" as string]: "2.9s", ["--delay" as string]: "0.4s" }} />
                  <div className="sparkle" style={{ left: "50%", top: "100%", transform: "translate(-50%, 50%)", ["--dur" as string]: "2.4s", ["--delay" as string]: "0.9s" }} />
                  <div className="sparkle" style={{ left: "80%", top: "100%", transform: "translate(-50%, 50%)", ["--dur" as string]: "2.6s", ["--delay" as string]: "0.1s" }} />
                </div>
              )}
              <div className="profile-match-left-zone">
                <div className="profile-match-left-visual">
                  <div className="profile-outcome-col">
                    <span className={`profile-outcome-pill ${win ? "win" : "loss"}`}>
                      {win ? "W" : "L"}
                    </span>
                  </div>
                  <span className={`profile-verdict-line ${win ? "win" : "loss"}`} />
                  <div className="profile-match-portrait-spells-wrap">
                    <div className="profile-match-portrait-verdict-column">
                      {teamVerdict && (
                        <LeagueTooltip title={teamVerdict.verdict} body={teamVerdict.reason}>
                          <span
                            className={`profile-badge-chip team-verdict-badge team-verdict-badge-above team-verdict-${teamVerdict.verdict.toLowerCase()}`}
                            aria-label={teamVerdict.verdict}
                          >
                            <TeamVerdictIcon verdict={teamVerdict.verdict} />
                          </span>
                        </LeagueTooltip>
                      )}
                      <div
                        className={`profile-match-portrait-wrap${badgeInfo?.badge === "Main Character" ? " profile-match-portrait-wrap-main-character" : ""}`}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={champSquareUrl}
                          alt=""
                          className="profile-match-portrait"
                          width={64}
                          height={64}
                          loading={isFirstRow ? "eager" : "lazy"}
                          fetchPriority={isFirstRow ? "high" : undefined}
                          onError={(e) => {
                            e.currentTarget.style.display = "none";
                          }}
                        />
                      </div>
                    </div>
                    <div className="profile-match-spells-runes">
                      <div className="profile-match-spells-col">
                        {[p.summoner1Id, p.summoner2Id].map((id, i) => {
                          const src = getSummonerSpellIconUrl(id, effectiveDdragonVersion);
                          if (!src) return null;
                          return (
                            <span key={i} className="profile-match-spell">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={src}
                                alt=""
                                width={24}
                                height={24}
                                loading={isFirstRow ? "eager" : "lazy"}
                                fetchPriority={isFirstRow ? "high" : undefined}
                                style={{ width: 20, height: 20, objectFit: "contain", imageRendering: "auto" }}
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
                            const keystoneData = keystoneId != null ? perkDataById.get(keystoneId) : undefined;
                            nodes.push(
                              <span key="keystone" className="profile-match-rune">
                                <LeagueTooltip
                                  title={(keystoneData?.name || (keystoneId != null ? `Rune ${keystoneId}` : "")).trim() || (keystoneId != null ? `Rune ${keystoneId}` : "Rune")}
                                  body={keystoneData?.shortDesc}
                                >
                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  <img
                                    src={keystoneSrc}
                                    alt=""
                                    width={24}
                                    height={24}
                                    loading={isFirstRow ? "eager" : "lazy"}
                                    fetchPriority={isFirstRow ? "high" : undefined}
                                    style={{ width: 20, height: 20, objectFit: "contain", imageRendering: "auto" }}
                                  />
                                </LeagueTooltip>
                              </span>
                            );
                          }
                          if (secondarySrc) {
                            const styleName = secondaryStyleId != null ? styleNamesById.get(secondaryStyleId) : undefined;
                            nodes.push(
                              <span key="secondary" className="profile-match-rune">
                                <LeagueTooltip title={(styleName || (secondaryStyleId != null ? `Style ${secondaryStyleId}` : "")).trim() || (secondaryStyleId != null ? `Style ${secondaryStyleId}` : "Style")}>
                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  <img
                                    src={secondarySrc}
                                    alt=""
                                    width={24}
                                    height={24}
                                    loading={isFirstRow ? "eager" : "lazy"}
                                    fetchPriority={isFirstRow ? "high" : undefined}
                                    style={{ width: 20, height: 20, objectFit: "contain", imageRendering: "auto" }}
                                  />
                                </LeagueTooltip>
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
                    <span className={win ? "victory-text" : "defeat-text"}>{win ? "Victory" : "Defeat"}</span>
                    {" · "}{queue} · {duration}
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
                  <div className="profile-badge-rows">
                    <div className="profile-chips-row badgeArea socialBadgeWrap">
                      {impact != null && (
                        <span className="profile-impact-chip">
                          <span className="profile-impact-chip-label">Impact</span>
                          <span className="profile-impact-chip-score">{impact.score}</span>
                        </span>
                      )}
                      {badgeInfo && (
                        badgeInfo.badge === "Main Character" ? (
                          <span className="mc-badge-wrapper" title={badgeInfo.reason}>
                            <div className="mc-badge">
                              <div className="sparkles" aria-hidden>
                                <div className="sparkle" style={{ left: "5%", top: "10%", ["--dur" as string]: "2.4s", ["--delay" as string]: "0s" }} />
                                <div className="sparkle" style={{ left: "92%", top: "15%", ["--dur" as string]: "2.8s", ["--delay" as string]: "0.6s" }} />
                                <div className="sparkle" style={{ left: "50%", top: "-8%", ["--dur" as string]: "2.1s", ["--delay" as string]: "1.2s" }} />
                                <div className="sparkle" style={{ left: "12%", top: "88%", ["--dur" as string]: "2.6s", ["--delay" as string]: "0.3s" }} />
                                <div className="sparkle" style={{ left: "82%", top: "92%", ["--dur" as string]: "2.3s", ["--delay" as string]: "0.9s" }} />
                                <div className="sparkle" style={{ left: "38%", top: "98%", ["--dur" as string]: "2.7s", ["--delay" as string]: "1.5s" }} />
                              </div>
                              <svg className="mc-icon" viewBox="0 0 24 24" fill="none" aria-hidden>
                                <path d="M3 18H21V20H3V18Z" fill="#c9a356" />
                                <path d="M3 16L5 7L9.5 11L12 4L14.5 11L19 7L21 16H3Z" fill="url(#crownGoldGradProfile)" />
                                <circle cx="12" cy="5" r="1.5" fill="#f5e6b8" />
                                <circle cx="5" cy="8" r="1" fill="#f5e6b8" opacity="0.7" />
                                <circle cx="19" cy="8" r="1" fill="#f5e6b8" opacity="0.7" />
                                <defs>
                                  <linearGradient id="crownGoldGradProfile" x1="3" y1="4" x2="21" y2="18">
                                    <stop offset="0%" stopColor="#f5e6b8" />
                                    <stop offset="40%" stopColor="#c9a356" />
                                    <stop offset="70%" stopColor="#a07830" />
                                    <stop offset="100%" stopColor="#c9a356" />
                                  </linearGradient>
                                </defs>
                              </svg>
                              <svg className="mc-star" viewBox="0 0 12 12" aria-hidden>
                                <polygon points="6,0 7.5,4.5 12,4.5 8.25,7.5 9.75,12 6,9 2.25,12 3.75,7.5 0,4.5 4.5,4.5" fill="#c9a356" />
                              </svg>
                              <span className="mc-text">Main Character</span>
                              <svg className="mc-star" viewBox="0 0 12 12" aria-hidden>
                                <polygon points="6,0 7.5,4.5 12,4.5 8.25,7.5 9.75,12 6,9 2.25,12 3.75,7.5 0,4.5 4.5,4.5" fill="#c9a356" />
                              </svg>
                            </div>
                          </span>
                        ) : (
                          <span
                            className={`profile-badge-chip socialBadge ${getBadgeCategoryClass(badgeInfo.badge)}`}
                            title={badgeInfo.reason}
                          >
                            <span className="profile-badge-chip-text socialBadgeText">
                              {badgeInfo.badge}
                            </span>
                          </span>
                        )
                      )}
                    </div>
                  </div>
                  <div className="profile-match-items-row">
                    {([p.item0, p.item1, p.item2, p.item3, p.item4, p.item5] as (number | undefined)[]).map((itemId, idx) => {
                      const timesBySlot = m.itemPurchaseTimesBySlot;
                      const timeStr = timesBySlot?.[idx] ?? null;
                      const captionText = isValidItemId(itemId) && timeStr ? timeStr : null;
                      const itemVersion = effectiveDdragonVersion ?? DEFAULT_DDRAGON_VERSION;
                      return (
                        <div key={`item-${idx}`} className="profile-match-item-tile">
                          <span className="profile-match-item">
                            {isValidItemId(itemId) ? (
                              (() => {
                                const { title, body } = getItemTooltip(itemDataById, itemId);
                                return (
                                  <LeagueTooltip title={title} body={body}>
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img
                                      src={`https://ddragon.leagueoflegends.com/cdn/${itemVersion}/img/item/${itemId}.png`}
                                      alt={`Item ${itemId}`}
                                      title={title}
                                      loading={isFirstRow ? "eager" : "lazy"}
                                      fetchPriority={isFirstRow ? "high" : undefined}
                                      decoding="async"
                                      width={22}
                                      height={22}
                                      onError={(e) => {
                                        (e.currentTarget as HTMLImageElement).style.display = "none";
                                      }}
                                    />
                                  </LeagueTooltip>
                                );
                              })()
                            ) : (
                              <div className="item-slot-empty" />
                            )}
                          </span>
                          <span className="profile-match-item-caption" style={{ fontSize: 12 }}>
                            {captionText}
                          </span>
                        </div>
                      );
                    })}
                    {isValidItemId(p.item6) ? (
                      (() => {
                        const { title, body } = getItemTooltip(itemDataById, p.item6);
                        return (
                          <span className="profile-match-item profile-match-item-trinket">
                            <LeagueTooltip title={title} body={body}>
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={`https://ddragon.leagueoflegends.com/cdn/${effectiveDdragonVersion ?? DEFAULT_DDRAGON_VERSION}/img/item/${p.item6}.png`}
                                alt={`Item ${p.item6}`}
                                title={title}
                                loading={isFirstRow ? "eager" : "lazy"}
                                fetchPriority={isFirstRow ? "high" : undefined}
                                decoding="async"
                                width={22}
                                height={22}
                                onError={(e) => {
                                  (e.currentTarget as HTMLImageElement).style.display = "none";
                                }}
                              />
                            </LeagueTooltip>
                          </span>
                        );
                      })()
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
                          effectiveDdragonVersion={effectiveDdragonVersion}
                          highlight={part.puuid === account?.puuid}
                        />
                        <span className="profile-match-team-name-line">
                          <Link
                            className="profile-match-team-name summoner-name player-link"
                            href={buildProfileHref({
                              riotId: part.riotIdGameName && part.riotIdTagline
                                ? `${part.riotIdGameName}#${part.riotIdTagline}`
                                : `${part.summonerName ?? ""}#${part.riotIdTagline ?? "NA1"}`,
                              region: regionVal,
                              queue: queue === "flex" ? "flex" : "solo",
                            })}
                            prefetch={false}
                            onClick={(e) => e.stopPropagation()}
                            title={part.riotIdGameName ?? part.summonerName}
                          >
                            {part.riotIdGameName ?? part.summonerName}
                            {(() => {
                              const entries = part.puuid === account?.puuid && (bundle?.ranked.solo || bundle?.ranked.flex)
                                ? ([bundle?.ranked.solo, bundle?.ranked.flex].filter(Boolean) as LeagueEntry[])
                                : (leagueBySummonerId[part.summonerId ?? ""] ?? []);
                              const badge = formatRankBadge(entries, activeQueueType);
                              const entry = entries.find((e) => e.queueType === activeQueueType);
                              const tierKey = (entry?.tier ?? "").toLowerCase() || (badge ? (() => {
                                const c = badge.charAt(0).toUpperCase();
                                if (c === "G") return "gold"; if (c === "S") return "silver"; if (c === "B") return "bronze";
                                if (c === "I") return "iron"; if (c === "P") return "platinum"; if (c === "E") return "emerald";
                                if (c === "D") return "diamond"; if (c === "M") return "master";
                                if (badge.startsWith("GM")) return "grandmaster"; if (c === "C") return "challenger";
                                return "unranked";
                              })() : "unranked");
                              return badge ? <span className={`rank-badge rank-badge-${tierKey}`}>{badge}</span> : null;
                            })()}
                          </Link>
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
                          effectiveDdragonVersion={effectiveDdragonVersion}
                          highlight={part.puuid === account?.puuid}
                        />
                        <span className="profile-match-team-name-line">
                          <Link
                            className="profile-match-team-name summoner-name player-link"
                            href={buildProfileHref({
                              riotId: part.riotIdGameName && part.riotIdTagline
                                ? `${part.riotIdGameName}#${part.riotIdTagline}`
                                : `${part.summonerName ?? ""}#${part.riotIdTagline ?? "NA1"}`,
                              region: regionVal,
                              queue: queue === "flex" ? "flex" : "solo",
                            })}
                            prefetch={false}
                            onClick={(e) => e.stopPropagation()}
                            title={part.riotIdGameName ?? part.summonerName}
                          >
                            {part.riotIdGameName ?? part.summonerName}
                            {(() => {
                              const entries = part.puuid === account?.puuid && (bundle?.ranked.solo || bundle?.ranked.flex)
                                ? ([bundle?.ranked.solo, bundle?.ranked.flex].filter(Boolean) as LeagueEntry[])
                                : (leagueBySummonerId[part.summonerId ?? ""] ?? []);
                              const badge = formatRankBadge(entries, activeQueueType);
                              const entry = entries.find((e) => e.queueType === activeQueueType);
                              const tierKey = (entry?.tier ?? "").toLowerCase() || (badge ? (() => {
                                const c = badge.charAt(0).toUpperCase();
                                if (c === "G") return "gold"; if (c === "S") return "silver"; if (c === "B") return "bronze";
                                if (c === "I") return "iron"; if (c === "P") return "platinum"; if (c === "E") return "emerald";
                                if (c === "D") return "diamond"; if (c === "M") return "master";
                                if (badge.startsWith("GM")) return "grandmaster"; if (c === "C") return "challenger";
                                return "unranked";
                              })() : "unranked");
                              return badge ? <span className={`rank-badge rank-badge-${tierKey}`}>{badge}</span> : null;
                            })()}
                          </Link>
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
              </div>
              {expandedMatchId === matchId ? (() => {
                const { rankBadgesByPuuid, rankTierByPuuid } = getMatchRankBadges(
                  m,
                  leagueBySummonerId,
                  account?.puuid,
                  bundle?.ranked.solo ?? null,
                  bundle?.ranked.flex ?? null,
                  activeQueueType
                );
                return (
                  <MatchDetails
                    match={m}
                    puuidOfSearchedPlayer={account.puuid}
                    region={regionVal}
                    queue={queue === "flex" ? "flex" : "solo"}
                    ddragonVersion={effectiveDdragonVersion}
                    perksById={perksById}
                    stylesById={stylesById}
                    itemDataById={itemDataById}
                    perkDataById={perkDataById}
                    styleNamesById={styleNamesById}
                    rankBadgesByPuuid={rankBadgesByPuuid}
                    rankTierByPuuid={rankTierByPuuid}
                  />
                );
              })() : null}
            </div>
          );
        })}
        {displayedMatches.length > 0 && hasMoreByQueue[queue] !== false && (
          <div className="profile-matches-show-more-wrap">
            <button
              type="button"
              className="profile-matches-show-more"
              disabled={loadingMore}
              onClick={async () => {
                if (!account?.puuid || loadingMore) return;
                setLoadMoreError(null);
                setLoadingMore(true);
                try {
                  const start = displayedMatches.length;
                  const res = await fetch(
                    `/api/riot/more-matches?puuid=${encodeURIComponent(account.puuid)}&region=${encodeURIComponent(regionVal ?? "na1")}&queue=${encodeURIComponent(queue)}&start=${start}&count=20`,
                    { cache: "no-store" }
                  );
                  let more: MatchDto[] = [];
                  if (res.ok) {
                    try {
                      const data = await res.json();
                      more = Array.isArray(data?.matches) ? data.matches : [];
                    } catch {
                      // non-json or invalid body
                    }
                  } else {
                    setLoadMoreError("Couldn't load more. Try again.");
                  }
                  setAdditionalMatchesByQueue((prev) => ({
                    ...prev,
                    [queue]: [...(prev[queue] ?? []), ...more],
                  }));
                  if (res.ok && more.length === 0) {
                    setHasMoreByQueue((prev) => ({ ...prev, [queue]: false }));
                  }
                } catch {
                  setLoadMoreError("Couldn't load more. Try again.");
                } finally {
                  setLoadingMore(false);
                }
              }}
            >
              {loadingMore ? "Loading…" : "Show more"}
            </button>
            {loadMoreError && (
              <span className="profile-matches-load-more-error" role="alert">
                {loadMoreError}
              </span>
            )}
          </div>
        )}
      </div>
        </>
        )}
      </div>
        </div>
      </div>

      {detailMatch && (
        <MatchDetailSlideOver
          match={detailMatch}
          puuid={account.puuid}
          onClose={() => setDetailMatch(null)}
          itemDataById={itemDataById}
          ddragonVersion={effectiveDdragonVersion}
        />
      )}
    </>
  );
}
