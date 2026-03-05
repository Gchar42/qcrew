"use client";

import Link from "next/link";
import Image from "next/image";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import useSWR, { mutate as globalMutate } from "swr";
import { buildProfileHref } from "@/lib/routes";
import type { ProfileBundle } from "@/app/api/riot/profileBundle/route";
import { MatchDetailSlideOver } from "@/components/summoner/MatchDetailSlideOver";
import { MatchDetails } from "@/components/MatchDetails";
import ChampionStatsCard from "@/components/ChampionStatsCard";
import { LeagueTooltip } from "@/components/LeagueTooltip";
import {
  getChampionSplashUrl,
  getChampionSquareUrl,
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
import { numberToRankLabel, rankToNumber } from "@/lib/rankMapping";
import type { AccountDto, LeagueEntryDto, SummonerDto, MatchDto } from "@/types/riot";

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

const DEFAULT_REGION = "na1";

/** Platform to short display label for badge/eyebrow */
function regionDisplayLabel(region: string): string {
  const r = region.toLowerCase();
  if (r === "na1") return "NA";
  if (r.startsWith("euw")) return "EUW";
  if (r === "kr") return "KR";
  return region.toUpperCase();
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
  const regionVal = regionProp ?? DEFAULT_REGION;
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
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      shouldRetryOnError: false,
      dedupingInterval: 60000,
    }
  );

  const account = bundle?.profile.account ?? null;
  const summoner = bundle?.profile.summoner ?? null;
  const matches = bundle?.matches ?? [];
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

  const [ddragonVersion, setDdragonVersion] = useState<string | null>(null);
  const [perksById, setPerksById] = useState<Map<number, string>>(new Map());
  const [perkNamesById, setPerkNamesById] = useState<Map<number, string>>(new Map());
  const [perkDataById, setPerkDataById] = useState<Map<number, { name?: string; shortDesc?: string }>>(new Map());
  const [stylesById, setStylesById] = useState<Map<number, string>>(new Map());
  const [styleNamesById, setStyleNamesById] = useState<Map<number, string>>(new Map());
  const [itemDataById, setItemDataById] = useState<Record<number, { name: string; plaintext?: string }>>({});
  const [mainTab, setMainTab] = useState<"overview" | "champion-pool">("overview");
  const championStatsRefreshDone = useRef<Set<string>>(new Set());

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

  // When profile has no champion stats yet, trigger refresh then revalidate after it has time to complete (~50s)
  useEffect(() => {
    const puuid = bundle?.profile?.account?.puuid;
    const championStats = bundle?.championStats;
    if (!puuid || !championStats) return;
    if (championStatsRefreshDone.current.has(puuid)) return;
    const soloEmpty = !championStats.solo?.champions?.length;
    const flexEmpty = !championStats.flex?.champions?.length;
    if (!soloEmpty && !flexEmpty) return;

    championStatsRefreshDone.current.add(puuid);
    const region = regionVal ?? "na1";
    const refresh = (q: "solo" | "flex") =>
      fetch("/api/champion-stats/refresh", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ puuid, queue: q, region }),
      }).catch(() => {});

    if (soloEmpty) refresh("solo");
    if (flexEmpty) refresh("flex");
    // Refresh can take 30–60s; revalidate bundle so champion stats appear without leaving the page
    const t1 = setTimeout(() => mutate(), 50000);
    const t2 = setTimeout(() => mutate(), 90000);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
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
  const wins = matches.filter((m) => participant(m)?.win).length;
  const total = matches.length;
  const winRate = total ? Math.round((wins / total) * 100) : 0;

  const matchCount = bundle?.computed.matchCount ?? matches.length;
  const avgKdaDisplay = bundle?.computed.avgKda ?? (() => {
    const n = matches.length || 1;
    let k = 0, d = 0, a = 0;
    matches.forEach((m) => {
      const p = participant(m);
      if (p) { k += p.kills ?? 0; d += p.deaths ?? 0; a += p.assists ?? 0; }
    });
    return `${Math.round((k / n) * 10) / 10}/${Math.round((d / n) * 10) / 10}/${Math.round((a / n) * 10) / 10}`;
  })();
  const avgDurationMin = bundle?.computed.avgDuration ?? (() => {
    const n = matches.length || 1;
    const totalSec = matches.reduce((s, m) => s + (m.info?.gameDuration ?? 0), 0);
    return totalSec / 60 / n;
  })();
  const avgCsPerMin = bundle?.computed.csPerMin ?? (() => {
    const n = matches.length || 1;
    const totalSec = matches.reduce((s, m) => s + (m.info?.gameDuration ?? 0), 0);
    let totalCs = 0;
    matches.forEach((m) => {
      const p = participant(m);
      if (p) totalCs += (p.totalMinionsKilled ?? 0) + (p.neutralMinionsKilled ?? 0);
    });
    return totalSec > 0 ? totalCs / (totalSec / 60) : 0;
  })();

  const role = primaryRole(matches, account.puuid);
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
    if (loading) return <div className="profile-rank-card"><div className="profile-rank-card-title">{title}</div><div className="profile-rank-card-content"><span className="profile-ranked-loading">Loading…</span></div></div>;
    if (err) return <div className="profile-rank-card"><div className="profile-rank-card-title">{title}</div><div className="profile-rank-card-content"><span className="profile-ranked-error">{err}</span></div></div>;
    if (!entry) return (
      <div className="profile-rank-card">
        <div className="profile-rank-card-title">{title}</div>
        <div className="profile-rank-card-content">
          <span className="profile-ranked-tier-line profile-ranked-unranked">Unranked</span>
        </div>
      </div>
    );
    const { gamesPlayed, winRatePct } = rankStats(entry);
    const tier = entry.tier ?? "";
    const tierColorClass = getRankTierColorClass(tier);
    return (
      <div className="profile-rank-card">
        <div className="profile-rank-card-title">{title}</div>
        <div className="profile-rank-card-content">
          {tier && (
            <span className="profile-ranked-emblem-wrap">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={getRankEmblemUrl(tier)} alt="" className="profile-rank-card-emblem profile-ranked-emblem" width={48} height={48} />
            </span>
          )}
          <div className="profile-ranked-summary">
            <span className={`profile-rank-card-tier profile-ranked-tier-line ${tierColorClass}`.trim()}>
              {formatRankTier(tier, entry.rank ?? "")}
            </span>
            <span className="profile-rank-card-lp profile-ranked-lp">{entry.leaguePoints ?? 0} LP</span>
            <span className="profile-rank-card-wr profile-ranked-winrate">{winRatePct}% WR · {entry.wins}W - {entry.losses}L</span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      <section className="profile-hero">
        <div className="profile-hero-left">
          <h1 className="profile-hero-name">
            {summoner?.profileIconId != null && (
              <span className="profile-hero-icon-wrap">
                <img
                  src={getProfileIconUrl(summoner.profileIconId, ddragonVersion)}
                  alt=""
                  className="profile-hero-icon"
                  width={56}
                  height={56}
                />
              </span>
            )}
            <span>
              <span className="profile-hero-name-text">
                {account.gameName}
                <span className="tag-part"> #{account.tagLine}</span>
              </span>
              <span className="profile-hero-subline">{level}</span>
            </span>
          </h1>
          <div className="profile-hero-badges">
            <span className="profile-badge profile-badge-na">{regionDisplayLabel(regionVal)}</span>
            {role && <span className="profile-badge profile-badge-role">{role}</span>}
            <span className="profile-badge profile-badge-level">Lv.{level}</span>
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
          {bundle?.championStats && (
            <ChampionStatsCard
              championStats={bundle.championStats}
              ddragonVersion={ddragonVersion}
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
        {!matches?.length ? (
          <div className="profile-matches-empty">
            <p>No matches loaded yet</p>
            <button type="button" onClick={() => mutate()} className="mt-4 underline">
              Retry
            </button>
          </div>
        ) : (
          <>
        <div className="profile-matches-header">
          <div className="profile-matches-header-left">
            <h2 className="profile-matches-title">Recent Matches</h2>
            <span className="profile-matches-count">({matchCount})</span>
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
              <div className="profile-match-left-zone">
                <div className="profile-match-left-visual">
                  <div className="profile-outcome-col">
                    <span className={`profile-outcome-pill ${win ? "win" : "loss"}`}>
                      {win ? "W" : "L"}
                    </span>
                  </div>
                  <span className={`profile-verdict-line ${win ? "win" : "loss"}`} />
                  <div className="profile-match-portrait-spells-wrap">
                    <div
                      className={`profile-match-portrait-wrap${badgeInfo?.badge === "Main Character" ? " profile-match-portrait-wrap-main-character" : ""}`}
                    >
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
                                    style={{ width: 24, height: 24, objectFit: "contain", imageRendering: "auto" }}
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
                                    style={{ width: 24, height: 24, objectFit: "contain", imageRendering: "auto" }}
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
                  <div className="profile-chips-row badgeArea socialBadgeWrap">
                    {impact != null && (
                      <span className="profile-impact-chip">
                        <span className="profile-impact-chip-label">Impact</span>
                        <span className="profile-impact-chip-score">{impact.score}</span>
                      </span>
                    )}
                    {badgeInfo && (
                      badgeInfo.badge === "Main Character" ? (
                        <span className="profile-badge-chip-mc-wrap" title={badgeInfo.reason}>
                          <span className="profile-badge-chip profile-badge-chip-main-character socialBadge">
                            <span className="profile-badge-chip-mc-inner">
                              <span className="profile-badge-chip-crown" aria-hidden>
                                <svg width="14" height="16" viewBox="0 0 24 28" fill="none" xmlns="http://www.w3.org/2000/svg">
                                  <path d="M12 2l2.5 6h4L14 11l1 7-3-4-3 4 1-7-4.5-3h4L12 2z" fill="#b8860b" />
                                </svg>
                              </span>
                              <span className="profile-badge-chip-text profile-badge-chip-text-main-character">
                                MAIN CHARACTER
                              </span>
                            </span>
                          </span>
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
                  <div className="profile-match-items-row">
                    {([p.item0, p.item1, p.item2, p.item3, p.item4, p.item5] as (number | undefined)[]).map((itemId, idx) => {
                      const timesBySlot = m.itemPurchaseTimesBySlot;
                      const timeStr = timesBySlot?.[idx] ?? null;
                      const captionText = isValidItemId(itemId) && timeStr ? timeStr : null;
                      const itemVersion = ddragonVersion ?? DEFAULT_DDRAGON_VERSION;
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
                                      loading="lazy"
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
                                src={`https://ddragon.leagueoflegends.com/cdn/${ddragonVersion ?? DEFAULT_DDRAGON_VERSION}/img/item/${p.item6}.png`}
                                alt={`Item ${p.item6}`}
                                title={title}
                                loading="lazy"
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
                          ddragonVersion={ddragonVersion}
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
                            onMouseEnter={() => {
                              const riotId = part.riotIdGameName && part.riotIdTagline
                                ? `${part.riotIdGameName}#${part.riotIdTagline}`
                                : `${part.summonerName ?? ""}#${part.riotIdTagline ?? "NA1"}`;
                              if (!riotId.includes("#")) return;
                              const keySolo: [string, string, string, string] = ["profileBundle", riotId, regionVal, "solo"];
                              const keyFlex: [string, string, string, string] = ["profileBundle", riotId, regionVal, "flex"];
                              globalMutate(keySolo, () => profileBundleFetcher(keySolo));
                              globalMutate(keyFlex, () => profileBundleFetcher(keyFlex));
                            }}
                            title={part.riotIdGameName ?? part.summonerName}
                          >
                            {part.riotIdGameName ?? part.summonerName}
                            {(() => {
                              const badge = formatRankBadge(leagueBySummonerId[part.summonerId ?? ""], activeQueueType);
                              return badge ? <span className="rank-badge">{badge}</span> : null;
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
                          ddragonVersion={ddragonVersion}
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
                            onMouseEnter={() => {
                              const riotId = part.riotIdGameName && part.riotIdTagline
                                ? `${part.riotIdGameName}#${part.riotIdTagline}`
                                : `${part.summonerName ?? ""}#${part.riotIdTagline ?? "NA1"}`;
                              if (!riotId.includes("#")) return;
                              const keySolo: [string, string, string, string] = ["profileBundle", riotId, regionVal, "solo"];
                              const keyFlex: [string, string, string, string] = ["profileBundle", riotId, regionVal, "flex"];
                              globalMutate(keySolo, () => profileBundleFetcher(keySolo));
                              globalMutate(keyFlex, () => profileBundleFetcher(keyFlex));
                            }}
                            title={part.riotIdGameName ?? part.summonerName}
                          >
                            {part.riotIdGameName ?? part.summonerName}
                            {(() => {
                              const badge = formatRankBadge(leagueBySummonerId[part.summonerId ?? ""], activeQueueType);
                              return badge ? <span className="rank-badge">{badge}</span> : null;
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
              {expandedMatchId === matchId ? (
                <MatchDetails
                  match={m}
                  puuidOfSearchedPlayer={account.puuid}
                  region={regionVal}
                  queue={queue === "flex" ? "flex" : "solo"}
                  ddragonVersion={ddragonVersion}
                  perksById={perksById}
                  stylesById={stylesById}
                  itemDataById={itemDataById}
                  perkDataById={perkDataById}
                  styleNamesById={styleNamesById}
                />
              ) : null}
            </div>
          );
        })}
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
          ddragonVersion={ddragonVersion}
        />
      )}
    </>
  );
}
