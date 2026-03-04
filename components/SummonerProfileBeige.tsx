"use client";

import Link from "next/link";
import Image from "next/image";
import { Suspense, useCallback, useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { fetchJsonWithRetry, mapWithConcurrency } from "@/lib/fetchUtils";
import { MatchDetailSlideOver } from "@/components/summoner/MatchDetailSlideOver";
import { MatchDetails } from "@/components/MatchDetails";
import {
  getChampionSplashUrl,
  getChampionSquareUrl,
  getProfileIconUrl,
  getRankEmblemUrl,
  getSummonerSpellIconUrl,
  isValidItemId,
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

const PROFILE_CACHE_MAX = 10;
type ProfileCacheEntry = {
  account: AccountDto;
  summoner: SummonerDto;
  leagueEntries: LeagueEntryDto[] | null;
  matches: MatchDto[];
};
const profileCache = new Map<string, ProfileCacheEntry>();

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
  const queue = searchParams.get("queue") ?? "solo";
  const targetQueueType = queue === "flex" ? "RANKED_FLEX_SR" : "RANKED_SOLO_5x5";
  const queueIdForMatches = queue === "flex" ? 440 : 420;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [account, setAccount] = useState<AccountDto | null>(null);
  const [summoner, setSummoner] = useState<SummonerDto | null>(null);
  const [matches, setMatches] = useState<MatchDto[]>([]);
  const [detailMatch, setDetailMatch] = useState<MatchDto | null>(null);
  const [expandedMatchId, setExpandedMatchId] = useState<string | null>(null);
  const [leagueEntries, setLeagueEntries] = useState<LeagueEntryDto[] | null>(null);
  const [leagueEntriesBySummonerId, setLeagueEntriesBySummonerId] = useState<
    Record<string, LeagueEntryDto[]>
  >({});
  const [leagueBySummonerId, setLeagueBySummonerId] = useState<Record<string, LeagueEntry[]>>({});
  const [rankError, setRankError] = useState<string | null>(null);
  const [rankLoading, setRankLoading] = useState(false);
  const [avgRank, setAvgRank] = useState<{ label: string; rankedCount: number }>({ label: "Unranked", rankedCount: 0 });

  const activeQueueType = queue === "flex" ? "RANKED_FLEX_SR" : "RANKED_SOLO_5x5";

  const [ddragonVersion, setDdragonVersion] = useState<string | null>(null);
  const [perksById, setPerksById] = useState<Map<number, string>>(new Map());
  const [stylesById, setStylesById] = useState<Map<number, string>>(new Map());
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
    const cacheKey = `${riotIdParam ?? ""}|${queue}`;
    const cached = profileCache.get(cacheKey);
    if (cached) {
      setAccount(cached.account);
      setSummoner(cached.summoner);
      setLeagueEntries(cached.leagueEntries);
      setMatches(cached.matches);
      setRankError(null);
      setRankLoading(false);
      setLoading(false);
      setError(null);
    } else {
      setLoading(true);
      setError(null);
    }
    let leagueEntriesFromFetch: LeagueEntryDto[] | null = null;
    try {
      const accountRes = await fetchJsonWithRetry<AccountDto>(
        `/api/riot/account?gameName=${encodeURIComponent(parsed.gameName)}&tagLine=${encodeURIComponent(parsed.tagLine)}&region=${regionVal}`,
        2
      );
      setAccount(accountRes);

      const [summonerRes, matchListRes] = await Promise.all([
        fetchJsonWithRetry<SummonerDto>(
          `/api/riot/summoner?puuid=${encodeURIComponent(accountRes.puuid)}&region=${regionVal}`,
          2
        ),
        fetchJsonWithRetry<{ matchIds: string[] }>(
          `/api/riot/match-ids?puuid=${encodeURIComponent(accountRes.puuid)}&region=${regionVal}&count=20&queueId=${queueIdForMatches}`,
          2
        ),
      ]);
      setSummoner(summonerRes);

      setRankLoading(true);
      const leagueUrl = `/api/riot/league?puuid=${encodeURIComponent(accountRes.puuid)}&platform=${regionVal}`;
      const leagueRes = await fetch(leagueUrl);
      const leagueBody = await leagueRes.text();
      if (!leagueRes.ok) {
        let errPayload: { requestUrl?: string; riotBody?: string } | null = null;
        try {
          errPayload = JSON.parse(leagueBody) as { requestUrl?: string; riotBody?: string };
        } catch {
          /* use leagueUrl and leagueBody below */
        }
        const requestUrl = errPayload?.requestUrl ?? leagueUrl;
        const riotBodySnippet = (errPayload?.riotBody ?? leagueBody).slice(0, 500);
        console.error("[riot/league] Rank fetch failed — League request URL, status, Riot response body:", {
          requestUrl,
          status: leagueRes.status,
          statusText: leagueRes.statusText,
          riotBody: riotBodySnippet,
        });
        setRankError(`Rank unavailable (${leagueRes.status})`);
        setLeagueEntries(null);
      } else {
        let entries: LeagueEntryDto[] | null = null;
        try {
          entries = JSON.parse(leagueBody) as LeagueEntryDto[];
        } catch {
          console.error("[riot/league] Rank response not JSON", {
            url: leagueUrl,
            status: leagueRes.status,
            body: leagueBody,
          });
          setRankError(`Rank unavailable (${leagueRes.status})`);
          setLeagueEntries(null);
        }
        if (entries !== null && !Array.isArray(entries)) {
          console.error("[riot/league] Rank response not an array", {
            url: leagueUrl,
            status: leagueRes.status,
            body: leagueBody,
          });
          setRankError(`Rank unavailable (${leagueRes.status})`);
          setLeagueEntries(null);
        } else if (entries !== null) {
          setRankError(null);
          setLeagueEntries(entries);
          leagueEntriesFromFetch = entries;
        }
      }
      setRankLoading(false);

      const matchDetails = await mapWithConcurrency(
        matchListRes.matchIds.slice(0, 20),
        3,
        async (matchId) =>
          fetchJsonWithRetry<MatchDto>(
            `/api/riot/match?matchId=${encodeURIComponent(matchId)}&region=${regionVal}&puuid=${encodeURIComponent(
              accountRes.puuid
            )}&gameName=${encodeURIComponent(accountRes.gameName)}&tagLine=${encodeURIComponent(
              accountRes.tagLine
            )}`,
            3
          )
      );
      setMatches(matchDetails);
      profileCache.set(cacheKey, {
        account: accountRes,
        summoner: summonerRes,
        leagueEntries: leagueEntriesFromFetch ?? null,
        matches: matchDetails,
      });
      if (profileCache.size > PROFILE_CACHE_MAX) {
        const firstKey = profileCache.keys().next().value;
        if (firstKey != null) profileCache.delete(firstKey);
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load summoner"
      );
      setAccount(null);
      setSummoner(null);
      setMatches([]);
      setLeagueEntries(null);
      setRankError(null);
      setRankLoading(false);
      setAvgRank({ label: "Unranked", rankedCount: 0 });
    } finally {
      setLoading(false);
    }
  }, [parsed?.gameName, parsed?.tagLine, regionVal, queue, queueIdForMatches, riotIdParam]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  useEffect(() => {
    if (matches.length === 0) {
      setAvgRank({ label: "Unranked", rankedCount: 0 });
      return;
    }
    const summonerIds = new Set<string>();
    matches.forEach((m) =>
      m.info?.participants?.forEach((p) => {
        if (p.summonerId) summonerIds.add(p.summonerId);
      })
    );
    const idList = [...summonerIds].slice(0, 100);
    if (idList.length === 0) {
      setAvgRank({ label: "Unranked", rankedCount: 0 });
      return;
    }
    const platform = regionVal ?? "na1";
    fetch(
      `/api/riot/league-batch?summonerIds=${idList.map((id) => encodeURIComponent(id)).join(",")}&platform=${encodeURIComponent(platform)}`
    )
      .then((res) => (res.ok ? res.json() : { entries: {} }))
      .then((data: { entries?: Record<string, LeagueEntryDto[]> }) => {
        const entries = data.entries ?? {};
        setLeagueEntriesBySummonerId(entries);
        const values: number[] = [];
        const targetSolo = "RANKED_SOLO_5x5";
        idList.forEach((id) => {
          const list = entries[id] ?? [];
          const solo = list.find((e) => e.queueType === targetSolo && e.tier && e.rank);
          if (!solo?.tier || !solo?.rank) return;
          const numeric = rankToNumber(solo.tier, solo.rank);
          if (numeric != null && Number.isFinite(numeric)) values.push(numeric);
        });
        let label: string;
        if (values.length > 0) {
          const avg = values.reduce((a, b) => a + b, 0) / values.length;
          label = numberToRankLabel(avg);
        } else {
          label = "Unranked";
        }
        setAvgRank({ label, rankedCount: values.length });
      })
      .catch(() => setAvgRank({ label: "Unranked", rankedCount: 0 }));
  }, [matches, regionVal]);

  // Fetch league entries for first 3 matches only; keyed by summonerId. Do not clear when switching tabs.
  useEffect(() => {
    if (matches.length === 0) return;
    const ids = Array.from(
      new Set(
        matches
          .slice(0, 3)
          .flatMap((m) =>
            (m.info?.participants ?? []).map((p) => p.summonerId).filter(Boolean)
          )
      )
    ) as string[];
    const missing = ids.filter((id) => leagueBySummonerId[id] === undefined);
    if (missing.length === 0) return;

    const concurrency = 6;
    const nextMap: Record<string, LeagueEntry[]> = {};
    let index = 0;
    async function runPool(): Promise<void> {
      while (index < missing.length) {
        const current = index++;
        const summonerId = missing[current];
        try {
          const res = await fetch(
            `/api/riot/league?summonerId=${encodeURIComponent(summonerId)}&region=${regionVal}`
          );
          const data = await res.json();
          nextMap[summonerId] = Array.isArray(data) ? (data as LeagueEntry[]) : [];
        } catch {
          nextMap[summonerId] = [];
        }
      }
    }
    Promise.all(Array.from({ length: concurrency }, () => runPool())).then(() => {
      if (Object.keys(nextMap).length > 0) {
        setLeagueBySummonerId((prev) => ({ ...prev, ...nextMap }));
      }
    });
  }, [matches, regionVal, leagueBySummonerId]);

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

  const matchCount = matches?.length ?? 0;
  const n = matchCount || 1;
  let avgKills = 0,
    avgDeaths = 0,
    avgAssists = 0,
    totalCs = 0,
    totalDurationSec = 0;
  matches.forEach((m) => {
    const p = participant(m);
    if (p) {
      avgKills += p.kills;
      avgDeaths += p.deaths;
      avgAssists += p.assists;
      totalCs += (p.totalMinionsKilled ?? 0) + (p.neutralMinionsKilled ?? 0);
    }
    totalDurationSec += m.info?.gameDuration ?? 0;
  });
  avgKills = Math.round((avgKills / n) * 10) / 10;
  avgDeaths = Math.round((avgDeaths / n) * 10) / 10;
  avgAssists = Math.round((avgAssists / n) * 10) / 10;
  const avgDurationMin = totalDurationSec / 60 / n;
  const avgCsPerMin =
    totalDurationSec > 0 ? totalCs / (totalDurationSec / 60) : 0;

  const role = primaryRole(matches, account.puuid);
  const level = summoner?.summonerLevel ?? 0;

  const leagueEntry = leagueEntries?.find((e) => e.queueType === targetQueueType) ?? null;
  const leagueQueueLabel = queue === "flex" ? "Flex" : "";
  const soloEntry = leagueEntries?.find((e) => e.queueType === "RANKED_SOLO_5x5") ?? null;
  const flexEntry = leagueEntries?.find((e) => e.queueType === "RANKED_FLEX_SR") ?? null;

  const [mainTab, setMainTab] = useState<"overview" | "champion-pool" | "lp-history">("overview");

  const setQueueTab = (q: "solo" | "flex") => {
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
          <button type="button" className={`profile-hero-tab${mainTab === "lp-history" ? " profile-hero-tab-active" : ""}`} onClick={() => setMainTab("lp-history")}>LP History</button>
        </nav>
      </section>

      <div className="profile-body">
        <aside className="profile-body-left">
          {renderRankCard("Ranked Solo", soloEntry, rankLoading, rankError ?? null)}
          <div className="profile-lp-history">
            <div className="profile-lp-history-title">LP History</div>
            <div style={{ height: 80, background: "var(--surface3)", borderRadius: 6 }} aria-hidden />
            <a href="#" className="profile-lp-history-link" onClick={(e) => e.preventDefault()}>VIEW FULL HISTORY</a>
          </div>
          {renderRankCard("Ranked Flex", flexEntry, rankLoading, null)}
          <div className="profile-rank-card">
            <div className="profile-rank-card-title">ARAM</div>
            <div className="profile-rank-card-content">
              <span className="profile-ranked-tier-line profile-ranked-unranked">0 Games</span>
            </div>
          </div>
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
        <div className="profile-matches-header">
          <div className="profile-matches-header-left">
            <h2 className="profile-matches-title">Recent Matches</h2>
            <span className="profile-matches-count">({matchCount})</span>
          </div>
          <div className="profile-matches-header-stats recent-stats">
            <div className="stat-chip">
              <span className="stat-value">{avgKills}/{avgDeaths}/{avgAssists}</span>
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
                              /* eslint-disable-next-line @next/next/no-img-element */
                              <img
                                src={`https://ddragon.leagueoflegends.com/cdn/${itemVersion}/img/item/${itemId}.png`}
                                alt={`Item ${itemId}`}
                                loading="lazy"
                                decoding="async"
                                width={22}
                                height={22}
                                onError={(e) => {
                                  (e.currentTarget as HTMLImageElement).style.display = "none";
                                }}
                              />
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
                      <span className="profile-match-item profile-match-item-trinket">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={`https://ddragon.leagueoflegends.com/cdn/${ddragonVersion ?? DEFAULT_DDRAGON_VERSION}/img/item/${p.item6}.png`}
                          alt={`Item ${p.item6}`}
                          loading="lazy"
                          decoding="async"
                          width={22}
                          height={22}
                          onError={(e) => {
                            (e.currentTarget as HTMLImageElement).style.display = "none";
                          }}
                        />
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
                        <span className="profile-match-team-name-line">
                          <span className="profile-match-team-name summoner-name" title={part.riotIdGameName ?? part.summonerName}>
                            {part.riotIdGameName ?? part.summonerName}
                            {(() => {
                              const badge = formatRankBadge(leagueBySummonerId[part.summonerId ?? ""], activeQueueType);
                              return badge ? <span className="rank-badge">{badge}</span> : null;
                            })()}
                          </span>
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
                          <span className="profile-match-team-name summoner-name" title={part.riotIdGameName ?? part.summonerName}>
                            {part.riotIdGameName ?? part.summonerName}
                            {(() => {
                              const badge = formatRankBadge(leagueBySummonerId[part.summonerId ?? ""], activeQueueType);
                              return badge ? <span className="rank-badge">{badge}</span> : null;
                            })()}
                          </span>
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
                  queue={queue === "flex" ? "flex" : "solo"}
                  ddragonVersion={ddragonVersion}
                  perksById={perksById}
                  stylesById={stylesById}
                />
              ) : null}
            </div>
          );
        })}
      </div>

      </div>
        </div>
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
