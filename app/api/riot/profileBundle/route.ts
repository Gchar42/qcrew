import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { rankToNumber, numberToRankLabel } from "@/lib/rankMapping";
import { getCachedDdragonVersion } from "@/lib/ddragonVersion";
import { getRoutingRegion } from "@/lib/riot-regions";
import { SEASON_KEY, SEASON_START_MS } from "@/lib/season";
import type { AccountDto, SummonerDto, LeagueEntryDto, MatchDto } from "@/types/riot";
import type { ChampionStatRow } from "@/app/api/champion-stats/route";
import { refreshChampionStats } from "@/app/api/champion-stats/refresh/route";
import { computeChampionStatsFromMatches } from "@/lib/championStatsFromMatches";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const STALE_AFTER_SEC = 120;
/** If champion stats are older than this, we trigger a background refresh so they update while viewing. */
const CHAMPION_STATS_STALE_MS = 5 * 60 * 1000; // 5 min
const CACHE_HEADERS = {
  "Cache-Control": "s-maxage=60, stale-while-revalidate=300",
};
const NO_CACHE = { "Cache-Control": "no-store, max-age=0" };

async function refreshSnapshot(
  baseUrl: string,
  region: string,
  queue: "solo" | "flex",
  normRiotId: string
): Promise<void> {
  const [gameName, tagLine] = normRiotId.split("#").map((s) => s.trim());
  if (!gameName || !tagLine) return;
  const parsed = { gameName, tagLine };
  const bundle = await fetchBundleFromRiot(baseUrl, region, queue, parsed);
  await supabaseAdmin.from("profile_snapshots").upsert(
    {
      region,
      queue,
      riot_id: normRiotId,
      puuid: bundle.profile.account.puuid,
      data: bundle as unknown as Record<string, unknown>,
      fetched_at: new Date().toISOString(),
      stale_after_sec: STALE_AFTER_SEC,
    },
    { onConflict: "region,queue,riot_id" }
  );
}

/** Refresh profile and return the new bundle, or null if refresh failed. */
async function refreshSnapshotAndReturn(
  baseUrl: string,
  region: string,
  queue: "solo" | "flex",
  normRiotId: string
): Promise<ProfileBundle | null> {
  try {
    const [gameName, tagLine] = normRiotId.split("#").map((s) => s.trim());
    if (!gameName || !tagLine) return null;
    const parsed = { gameName, tagLine };
    const bundle = await fetchBundleFromRiot(baseUrl, region, queue, parsed);
    await supabaseAdmin.from("profile_snapshots").upsert(
      {
        region,
        queue,
        riot_id: normRiotId,
        puuid: bundle.profile.account.puuid,
        data: bundle as unknown as Record<string, unknown>,
        fetched_at: new Date().toISOString(),
        stale_after_sec: STALE_AFTER_SEC,
      },
      { onConflict: "region,queue,riot_id" }
    );
    return bundle;
  } catch {
    return null;
  }
}

type ProfileSnapshotRow = {
  region: string;
  queue: string;
  riot_id: string;
  puuid: string;
  data: ProfileBundle;
  fetched_at: string;
  stale_after_sec: number;
};

export type ChampionStatsSlice = {
  champions: ChampionStatRow[];
  updatedAt: string;
};

export type ProfileBundle = {
  profile: { account: AccountDto; summoner: SummonerDto };
  ranked: { solo: LeagueEntryDto | null; flex: LeagueEntryDto | null };
  matchIds: string[];
  matches: MatchDto[];
  computed: {
    matchCount: number;
    avgKda: string;
    csPerMin: number;
    avgDuration: number;
    avgRankPlayedAgainst: string;
    avgRankRankedCount: number;
  };
  leagueEntriesBySummonerId: Record<string, LeagueEntryDto[]>;
  championStats: { solo: ChampionStatsSlice; flex: ChampionStatsSlice };
  ddragonVersion: string | null;
};

function parseChampionsJson(champions: unknown): ChampionStatRow[] {
  if (!Array.isArray(champions)) return [];
  return champions as ChampionStatRow[];
}

async function fetchChampionStatsForBundle(puuid: string): Promise<{
  solo: ChampionStatsSlice;
  flex: ChampionStatsSlice;
}> {
  const empty = (): ChampionStatsSlice => ({ champions: [], updatedAt: "" });
  const [soloRes, flexRes] = await Promise.all([
    supabaseAdmin
      .from("champion_aggregates")
      .select("updated_at, champions")
      .eq("puuid", puuid)
      .eq("queue", "solo")
      .eq("season_key", SEASON_KEY)
      .maybeSingle(),
    supabaseAdmin
      .from("champion_aggregates")
      .select("updated_at, champions")
      .eq("puuid", puuid)
      .eq("queue", "flex")
      .eq("season_key", SEASON_KEY)
      .maybeSingle(),
  ]);
  return {
    solo: soloRes.data
      ? { champions: parseChampionsJson(soloRes.data.champions), updatedAt: soloRes.data.updated_at ?? "" }
      : empty(),
    flex: flexRes.data
      ? { champions: parseChampionsJson(flexRes.data.champions), updatedAt: flexRes.data.updated_at ?? "" }
      : empty(),
  };
}

/** When a profile has no champion stats or they're stale, trigger refresh so they update (empty or after new games). */
async function triggerChampionStatsRefreshIfNeeded(
  bundle: ProfileBundle,
  region: string,
  baseUrl: string
): Promise<void> {
  const cs = bundle?.championStats;
  if (!cs) return;
  const now = Date.now();
  const isStale = (updatedAt: string | undefined) =>
    !updatedAt || now - new Date(updatedAt).getTime() > CHAMPION_STATS_STALE_MS;
  const soloEmpty = !cs.solo?.champions?.length;
  const flexEmpty = !cs.flex?.champions?.length;
  const soloStale = isStale(cs.solo?.updatedAt);
  const flexStale = isStale(cs.flex?.updatedAt);
  const needSolo = soloEmpty || soloStale;
  const needFlex = flexEmpty || flexStale;
  if (!needSolo && !needFlex) return;
  const puuid = bundle.profile?.account?.puuid;
  if (!puuid) return;
  const r = region || "na1";
  const url = `${baseUrl.replace(/\/$/, "")}/api/champion-stats/refresh`;
  const body = (q: "solo" | "flex") => JSON.stringify({ puuid, queue: q, region: r });
  if (needSolo) fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: body("solo") }).catch(() => {});
  if (needFlex) fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: body("flex") }).catch(() => {});
  await new Promise((resolve) => setTimeout(resolve, 200));
}

function getBaseUrl(request: Request): string {
  const host = request.headers.get("host") ?? process.env.VERCEL_URL ?? "localhost:3000";
  const proto = request.headers.get("x-forwarded-proto") ?? (host.includes("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

function normalizeRiotId(riotId: string): string {
  const decoded = decodeURIComponent(riotId.trim());
  if (!decoded.includes("#")) return decoded.toLowerCase();
  const [name, tag] = decoded.split("#").map((s) => s.trim());
  return `${(name ?? "").toLowerCase()}#${(tag ?? "").toLowerCase()}`;
}

const RIOT_ACCOUNT_BASE = "https://{region}.api.riotgames.com/riot/account/v1";
const RIOT_MATCH_BASE = "https://{region}.api.riotgames.com/lol/match/v5/matches";

/** Summoner v4 and League v4 use platform (na1, euw1, etc.), not routing region. */
const RIOT_SUMMONER_BASE = "https://{platform}.api.riotgames.com/lol/summoner/v4/summoners";
const RIOT_LEAGUE_BASE = "https://{platform}.api.riotgames.com/lol/league/v4/entries";

/** Fetch summoner directly from Riot (no self-request) so refresh avoids timeouts. */
async function fetchSummonerFromRiot(puuid: string, platform: string): Promise<SummonerDto> {
  const key = process.env.RIOT_API_KEY;
  if (!key) throw new Error("Riot API key not configured");
  const base = RIOT_SUMMONER_BASE.replace("{platform}", platform);
  const url = `${base}/by-puuid/${encodeURIComponent(puuid)}`;
  const res = await fetch(url, { cache: "no-store", headers: { "X-Riot-Token": key } });
  const text = await res.text();
  if (!res.ok) throw new Error(text || "Summoner lookup failed");
  const data = JSON.parse(text) as Record<string, unknown>;
  return {
    id: String(data.id ?? ""),
    encryptedSummonerId: data.id != null ? String(data.id) : undefined,
    accountId: String(data.accountId ?? ""),
    puuid: String(data.puuid ?? puuid),
    name: String(data.name ?? ""),
    profileIconId: Number(data.profileIconId) || 0,
    summonerLevel: Number(data.summonerLevel) || 0,
    revisionDate: typeof data.revisionDate === "number" ? data.revisionDate : undefined,
  } as SummonerDto;
}

/** Fetch league entries directly from Riot (no self-request) so refresh gets ranks. */
async function fetchLeagueFromRiot(puuid: string, platform: string): Promise<LeagueEntryDto[]> {
  const key = process.env.RIOT_API_KEY;
  if (!key) throw new Error("Riot API key not configured");
  const base = RIOT_LEAGUE_BASE.replace("{platform}", platform);
  const url = `${base}/by-puuid/${encodeURIComponent(puuid)}`;
  const res = await fetch(url, { cache: "no-store", headers: { "X-Riot-Token": key } });
  const text = await res.text();
  if (!res.ok) return [];
  try {
    const arr = JSON.parse(text) as unknown;
    return Array.isArray(arr) ? (arr as LeagueEntryDto[]) : [];
  } catch {
    return [];
  }
}

/** Fetch one match directly from Riot (no self-request) so refresh gets match history. */
async function fetchMatchFromRiot(matchId: string, region: string): Promise<MatchDto | null> {
  const key = process.env.RIOT_API_KEY;
  if (!key) return null;
  const routing = getRoutingRegion(region);
  const base = RIOT_MATCH_BASE.replace("{region}", routing);
  const url = `${base}/${encodeURIComponent(matchId)}`;
  const res = await fetch(url, { cache: "no-store", headers: { "X-Riot-Token": key } });
  if (!res.ok) return null;
  try {
    return (await res.json()) as MatchDto;
  } catch {
    return null;
  }
}

/** Fetch match IDs directly from Riot (no cache) so refresh always gets latest list. */
async function fetchMatchIdsFromRiot(
  puuid: string,
  queueId: number,
  region: string,
  count: number = 20,
  start: number = 0
): Promise<string[]> {
  const key = process.env.RIOT_API_KEY;
  if (!key) throw new Error("Riot API key not configured");
  const routing = getRoutingRegion(region);
  const base = RIOT_MATCH_BASE.replace("{region}", routing);
  const seasonStartSec = Math.floor(SEASON_START_MS / 1000);
  const url = `${base}/by-puuid/${encodeURIComponent(puuid)}/ids?start=${start}&count=${count}&queue=${queueId}&startTime=${seasonStartSec}`;
  const res = await fetch(url, { cache: "no-store", headers: { "X-Riot-Token": key } });
  const text = await res.text();
  if (!res.ok) throw new Error(text || "Match list failed");
  const arr = JSON.parse(text) as unknown;
  return Array.isArray(arr) ? arr as string[] : [];
}

async function fetchAccountFromRiot(
  gameName: string,
  tagLine: string,
  region: string
): Promise<AccountDto> {
  const key = process.env.RIOT_API_KEY;
  if (!key) throw new Error("Riot API key not configured");
  const routing = getRoutingRegion(region);
  const base = RIOT_ACCOUNT_BASE.replace("{region}", routing);
  const url = `${base}/accounts/by-riot-id/${encodeURIComponent(gameName)}/${encodeURIComponent(tagLine)}`;
  const res = await fetch(url, { cache: "no-store", headers: { "X-Riot-Token": key } });
  const text = await res.text();
  if (!res.ok) {
    const msg = text || "Account lookup failed";
    throw new Error(msg.length > 120 ? "Account lookup failed" : msg);
  }
  return JSON.parse(text) as AccountDto;
}

/**
 * Fetch profile bundle the same way op.gg / u.gg / blitz do: one path, direct Riot API only.
 * No self-requests for account, summoner, league, match IDs, or match details.
 * Champion stats run in background (never awaited) so we stay under serverless timeout.
 */
async function fetchBundleFromRiot(
  baseUrl: string,
  region: string,
  queue: "solo" | "flex",
  parsed: { gameName: string; tagLine: string }
): Promise<ProfileBundle> {
  const startTime = Date.now();
  console.log("PROFILE FETCH START (direct Riot)");

  const queueId = queue === "flex" ? 440 : 420;
  const platform = region;

  let account: AccountDto;
  try {
    account = await fetchAccountFromRiot(parsed.gameName, parsed.tagLine, region);
  } catch (e) {
    await new Promise((r) => setTimeout(r, 800));
    try {
      account = await fetchAccountFromRiot(parsed.gameName, parsed.tagLine, region);
    } catch (e2) {
      const err = e2 instanceof Error ? e2 : new Error("Account lookup failed");
      throw err;
    }
  }

  refreshChampionStats(account.puuid, queue, region).catch(() => {});

  const matchIdListPromise = (async (): Promise<string[]> => {
    try {
      return await fetchMatchIdsFromRiot(account.puuid, queueId, region, 20, 0).then((ids) => ids.slice(0, 20));
    } catch (e) {
      await new Promise((r) => setTimeout(r, 1000));
      try {
        return await fetchMatchIdsFromRiot(account.puuid, queueId, region, 20, 0).then((ids) => ids.slice(0, 20));
      } catch {
        console.warn("[profileBundle] Match list failed after retry, returning empty:", e instanceof Error ? e.message : e);
        return [];
      }
    }
  })();

  const summonerPromise = (async (): Promise<SummonerDto> => {
    try {
      return await fetchSummonerFromRiot(account.puuid, platform);
    } catch (e) {
      await new Promise((r) => setTimeout(r, 800));
      return fetchSummonerFromRiot(account.puuid, platform);
    }
  })();

  const [summoner, matchIdList, leagueEntries] = await Promise.all([
    summonerPromise,
    matchIdListPromise,
    fetchLeagueFromRiot(account.puuid, platform),
  ]);

  console.log("RANK FETCH END", Date.now() - startTime);
  console.log("MATCH LIST FETCH END", Date.now() - startTime);

  const soloEntry = leagueEntries.find((e) => e.queueType === "RANKED_SOLO_5x5") ?? null;
  const flexEntry = leagueEntries.find((e) => e.queueType === "RANKED_FLEX_SR") ?? null;

  const matches: MatchDto[] = [];
  const concurrency = 3;
  for (let i = 0; i < matchIdList.length; i += concurrency) {
    const chunk = matchIdList.slice(i, i + concurrency);
    const results = await Promise.all(chunk.map((matchId) => fetchMatchFromRiot(matchId, region)));
    results.forEach((m) => {
      if (m) matches.push(m as MatchDto);
    });
  }

  const summonerIds = new Set<string>();
  matches.forEach((m) =>
    m.info?.participants?.forEach((p) => {
      if (p.summonerId) summonerIds.add(p.summonerId);
    })
  );
  const idList = [...summonerIds].slice(0, 100);
  let leagueEntriesBySummonerId: Record<string, LeagueEntryDto[]> = {};
  if (idList.length > 0) {
    try {
      const batchRes = await fetch(
        `${baseUrl}/api/riot/league-batch?summonerIds=${idList.map((id) => encodeURIComponent(id)).join(",")}&platform=${platform}`
      );
      if (batchRes.ok) {
        const data = (await batchRes.json()) as { entries?: Record<string, LeagueEntryDto[]> };
        leagueEntriesBySummonerId = data.entries ?? {};
      }
    } catch {
      // opponent ranks optional
    }
  }

  const n = matches.length || 1;
  let avgKills = 0,
    avgDeaths = 0,
    avgAssists = 0,
    totalCs = 0,
    totalDurationSec = 0;
  const participant = (m: MatchDto) => m.info?.participants?.find((p) => p.puuid === account.puuid);
  matches.forEach((m) => {
    const p = participant(m);
    if (p) {
      avgKills += p.kills ?? 0;
      avgDeaths += p.deaths ?? 0;
      avgAssists += p.assists ?? 0;
      totalCs += (p.totalMinionsKilled ?? 0) + (p.neutralMinionsKilled ?? 0);
    }
    totalDurationSec += m.info?.gameDuration ?? 0;
  });
  avgKills = Math.round((avgKills / n) * 10) / 10;
  avgDeaths = Math.round((avgDeaths / n) * 10) / 10;
  avgAssists = Math.round((avgAssists / n) * 10) / 10;
  const avgDurationMin = totalDurationSec / 60 / n;
  const avgCsPerMin = totalDurationSec > 0 ? totalCs / (totalDurationSec / 60) : 0;

  const values: number[] = [];
  const targetSolo = "RANKED_SOLO_5x5";
  idList.forEach((id) => {
    const list = leagueEntriesBySummonerId[id] ?? [];
    const solo = list.find((e) => e.queueType === targetSolo && e.tier && e.rank);
    if (!solo?.tier || !solo?.rank) return;
    const numeric = rankToNumber(solo.tier, solo.rank);
    if (numeric != null && Number.isFinite(numeric)) values.push(numeric);
  });
  const avgRankPlayedAgainst =
    values.length > 0 ? numberToRankLabel(values.reduce((a, b) => a + b, 0) / values.length) : "Unranked";

  const [dbChampionStats, ddragonVersion] = await Promise.all([
    fetchChampionStatsForBundle(account.puuid),
    getCachedDdragonVersion(),
  ]);
  let championStats = dbChampionStats;
  if (matches.length > 0 && account.puuid) {
    const soloEmpty = !championStats.solo?.champions?.length;
    const flexEmpty = !championStats.flex?.champions?.length;
    if (soloEmpty || flexEmpty) {
      const instant = computeChampionStatsFromMatches(matches, account.puuid);
      const slice = { champions: instant, updatedAt: new Date().toISOString() };
      if (soloEmpty) championStats = { ...championStats, solo: slice };
      if (flexEmpty) championStats = { ...championStats, flex: slice };
    }
  }

  const bundle: ProfileBundle = {
    profile: { account, summoner },
    ranked: { solo: soloEntry, flex: flexEntry },
    matchIds: matchIdList,
    matches,
    computed: {
      matchCount: matches.length,
      avgKda: `${avgKills}/${avgDeaths}/${avgAssists}`,
      csPerMin: Math.round(avgCsPerMin * 10) / 10,
      avgDuration: Math.round(avgDurationMin * 10) / 10,
      avgRankPlayedAgainst,
      avgRankRankedCount: values.length,
    },
    leagueEntriesBySummonerId,
    championStats,
    ddragonVersion,
  };

  console.log("bundle keys", Object.keys(bundle), "matches", bundle.matches?.length);
  console.log("PROFILE FETCH END", Date.now() - startTime);
  return bundle;
}

export async function GET(request: Request) {
  const riotApiKey = process.env.RIOT_API_KEY;
  if (!riotApiKey) {
    return NextResponse.json(
      { error: "Riot API key not configured", status: 500 },
      { status: 500, headers: NO_CACHE }
    );
  }

  const { searchParams } = new URL(request.url);
  const riotIdParam = searchParams.get("riotId");
  const region = searchParams.get("region") ?? "na1";
  const queue = (searchParams.get("queue") ?? "solo") === "flex" ? "flex" : "solo";

  if (!riotIdParam || !riotIdParam.trim()) {
    return NextResponse.json(
      { error: "Missing riotId", status: 400 },
      { status: 400, headers: NO_CACHE }
    );
  }

  const normRiotId = normalizeRiotId(riotIdParam);
  if (!normRiotId.includes("#")) {
    return NextResponse.json(
      { error: "Invalid riotId (expected GameName#Tag)", status: 400 },
      { status: 400, headers: NO_CACHE }
    );
  }

  const [gameName, tagLine] = normRiotId.split("#").map((s) => s.trim());
  if (!gameName || !tagLine) {
    return NextResponse.json(
      { error: "Invalid riotId (expected GameName#Tag)", status: 400 },
      { status: 400, headers: NO_CACHE }
    );
  }
  const parsed = { gameName, tagLine };
  const forceRefresh = searchParams.get("forceRefresh") === "1" || searchParams.get("forceRefresh") === "true";

  if (!forceRefresh) {
  const { data: snapshot, error: selectError } = await supabaseAdmin
    .from("profile_snapshots")
    .select("*")
    .eq("region", region)
    .eq("queue", queue)
    .eq("riot_id", normRiotId)
    .maybeSingle();

  if (selectError) {
    console.error("[profileBundle] Supabase select error:", selectError);
    return NextResponse.json(
      { error: "Cache lookup failed", status: 500 },
      { status: 500, headers: NO_CACHE }
    );
  }

  const row = snapshot as ProfileSnapshotRow | null;

  if (row?.data) {
    const cached = row.data as ProfileBundle;
    const matchIdsCount = cached.matchIds?.length ?? 0;
    const matchesCount = cached.matches?.length ?? 0;
    const cacheHasEmptyMatches = matchIdsCount > 0 && matchesCount === 0;

    if (!cacheHasEmptyMatches) {
      const ageSec = (Date.now() - new Date(row.fetched_at).getTime()) / 1000;
      const stale = ageSec > (row.stale_after_sec ?? STALE_AFTER_SEC);

      // Full-season champion stats from DB; fill from cached matches when DB empty
      const puuid = cached.profile.account.puuid;
      const cachedMatches = cached.matches ?? [];
      const [dbChampionStats, ddragonVersion] = await Promise.all([
        fetchChampionStatsForBundle(puuid),
        getCachedDdragonVersion(),
      ]);
      let championStats = dbChampionStats;
      if (cachedMatches.length > 0 && puuid) {
        const soloEmpty = !championStats.solo?.champions?.length;
        const flexEmpty = !championStats.flex?.champions?.length;
        if (soloEmpty || flexEmpty) {
          const instant = computeChampionStatsFromMatches(cachedMatches, puuid);
          const slice = { champions: instant, updatedAt: new Date().toISOString() };
          if (soloEmpty) championStats = { ...championStats, solo: slice };
          if (flexEmpty) championStats = { ...championStats, flex: slice };
        }
      }
      const bundleToReturn = { ...cached, championStats, ddragonVersion };

      const baseUrl = getBaseUrl(request);
      await triggerChampionStatsRefreshIfNeeded(bundleToReturn, region, baseUrl);

      if (!stale) {
        return NextResponse.json(bundleToReturn, {
          headers: CACHE_HEADERS,
        });
      }
      // Stale: don't return old cache; fetch fresh so user sees latest matches
      const fresh = await refreshSnapshotAndReturn(baseUrl, region, queue, normRiotId);
      if (fresh) {
        return NextResponse.json(fresh, { status: 200, headers: CACHE_HEADERS });
      }
      // Fallback: return stale cache if refresh failed (e.g. timeout)
      return NextResponse.json(bundleToReturn, {
        headers: CACHE_HEADERS,
      });
    }
    // cacheHasEmptyMatches: skip cache and fall through to fresh fetch
  }
  }

  const baseUrl = getBaseUrl(request);
  let bundle: ProfileBundle;
  try {
    bundle = await fetchBundleFromRiot(baseUrl, region, queue, parsed);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to load profile";
    return NextResponse.json(
      { error: message, status: 502 },
      { status: 502, headers: NO_CACHE }
    );
  }

  console.log("bundle keys", Object.keys(bundle), "matches", bundle.matches?.length);

  await triggerChampionStatsRefreshIfNeeded(bundle, region, baseUrl);

  await supabaseAdmin.from("profile_snapshots").upsert(
    {
      region,
      queue,
      riot_id: normRiotId,
      puuid: bundle.profile.account.puuid,
      data: bundle as unknown as Record<string, unknown>,
      fetched_at: new Date().toISOString(),
      stale_after_sec: STALE_AFTER_SEC,
    },
    { onConflict: "region,queue,riot_id" }
  );

  return NextResponse.json(bundle, { status: 200, headers: CACHE_HEADERS });
}
