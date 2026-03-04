import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getRoutingRegion } from "@/lib/riot-regions";
import { queueToRiotQueueId } from "@/lib/riotCacheUtils";
import { rankToNumber, numberToRankLabel } from "@/lib/rankMapping";
import { tryLock } from "@/lib/lock";
import { getCached, setCached, getInFlight, setInFlight, clearInFlight } from "@/lib/serverRequestCache";
import { riotFetchJson } from "@/lib/riotFetch";
import type { AccountDto, SummonerDto, LeagueEntryDto, MatchDto } from "@/types/riot";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const FRESH_SEC = 120; // 2 minutes
const MATCH_CACHE_STALE_DAYS = 7;
const MAX_NEW_MATCH_FETCHES = 10;
const NO_CACHE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
};
const NO_CACHE = { "Cache-Control": "no-store, max-age=0" };

function hasUsableMatches(data: unknown): boolean {
  const matches = (data as { matches?: unknown[] })?.matches;
  return Array.isArray(matches) && matches.length > 0;
}

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
};

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

async function fetchBundleFromRiot(
  baseUrl: string,
  region: string,
  queue: "solo" | "flex",
  parsed: { gameName: string; tagLine: string }
): Promise<ProfileBundle> {
  const startTime = Date.now();
  const sb = supabaseAdmin;
  const platform = region;
  const regionRouting = getRoutingRegion(region);
  const riotQueueId = queueToRiotQueueId(queue);

  const accountRes = await fetch(
    `${baseUrl}/api/riot/account?gameName=${encodeURIComponent(parsed.gameName)}&tagLine=${encodeURIComponent(parsed.tagLine)}&region=${region}`
  );
  if (!accountRes.ok) {
    const err = await accountRes.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error ?? "Account lookup failed");
  }
  const account = (await accountRes.json()) as AccountDto;
  const puuid = account.puuid;

  const matchIdsUrl =
    `https://${regionRouting}.api.riotgames.com/lol/match/v5/matches/by-puuid/${encodeURIComponent(puuid)}/ids` +
    `?start=0&count=20&queue=${riotQueueId}`;
  const matchIdList = await riotFetchJson<string[]>(matchIdsUrl);

  const [summoner, leagueEntries] = await Promise.all([
    fetch(`${baseUrl}/api/riot/summoner?puuid=${encodeURIComponent(puuid)}&region=${region}`).then(async (r) => {
      if (!r.ok) throw new Error("Summoner lookup failed");
      return r.json() as Promise<SummonerDto>;
    }),
    fetch(`${baseUrl}/api/riot/league?puuid=${encodeURIComponent(puuid)}&platform=${platform}`).then(async (r) => {
      if (!r.ok) return [] as LeagueEntryDto[];
      try {
        const arr = JSON.parse(await r.text()) as LeagueEntryDto[];
        return Array.isArray(arr) ? arr : [];
      } catch {
        return [] as LeagueEntryDto[];
      }
    }),
  ]);

  const soloEntry = leagueEntries.find((e) => e.queueType === "RANKED_SOLO_5x5") ?? null;
  const flexEntry = leagueEntries.find((e) => e.queueType === "RANKED_FLEX_SR") ?? null;

  const staleCutoff = new Date(Date.now() - MATCH_CACHE_STALE_DAYS * 24 * 60 * 60 * 1000).toISOString();
  const matchIdsToUse = matchIdList.slice(0, 10);
  const matchMap = new Map<string, MatchDto>();
  const needFetch: string[] = [];

  for (const matchId of matchIdsToUse) {
    const { data: row } = await sb
      .from("match_cache")
      .select("payload, fetched_at")
      .eq("region", region)
      .eq("puuid", puuid)
      .eq("match_id", matchId)
      .maybeSingle();
    if (row?.payload && row.fetched_at >= staleCutoff) {
      matchMap.set(matchId, row.payload as MatchDto);
    } else {
      needFetch.push(matchId);
    }
  }

  const toFetch = needFetch.slice(0, MAX_NEW_MATCH_FETCHES);
  for (const matchId of toFetch) {
    const matchUrl = `https://${regionRouting}.api.riotgames.com/lol/match/v5/matches/${encodeURIComponent(matchId)}`;
    try {
      const matchDto = await riotFetchJson<MatchDto>(matchUrl);
      await sb.from("match_cache").upsert(
        {
          region,
          puuid,
          match_id: matchId,
          payload: matchDto as unknown as Record<string, unknown>,
          fetched_at: new Date().toISOString(),
        },
        { onConflict: "region,puuid,match_id" }
      );
      matchMap.set(matchId, matchDto);
    } catch {
      // skip failed match fetch
    }
  }

  const matches = matchIdsToUse.map((id) => matchMap.get(id)).filter((m): m is MatchDto => m != null);
  console.log("[profileBundle] matches", matches.length, "new fetches", toFetch.length);

  const summonerIds = new Set<string>();
  matches.forEach((m) =>
    m.info?.participants?.forEach((p) => {
      if (p.summonerId) summonerIds.add(p.summonerId);
    })
  );
  const idList = [...summonerIds].slice(0, 100);
  let leagueEntriesBySummonerId: Record<string, LeagueEntryDto[]> = {};
  if (idList.length > 0) {
    const batchRes = await fetch(
      `${baseUrl}/api/riot/league-batch?summonerIds=${idList.map((id) => encodeURIComponent(id)).join(",")}&platform=${platform}`
    );
    if (batchRes.ok) {
      const data = (await batchRes.json()) as { entries?: Record<string, LeagueEntryDto[]> };
      leagueEntriesBySummonerId = data.entries ?? {};
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
  };

  console.log("bundle keys", Object.keys(bundle), "matches", bundle.matches?.length);
  console.log("PROFILE FETCH END", Date.now() - startTime);
  return bundle;
}

export async function GET(request: Request) {
  if (!process.env.RIOT_API_KEY) {
    return NextResponse.json(
      { error: "Riot API key not configured", status: 500 },
      { status: 500, headers: NO_CACHE }
    );
  }

  const { searchParams } = new URL(request.url);
  const riotIdParam = searchParams.get("riotId");
  const region = searchParams.get("region") ?? "na1";
  const queue = (searchParams.get("queue") ?? "solo") === "flex" ? "flex" : "solo";
  const queueKey = queue;

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
  const baseUrl = getBaseUrl(request);
  const cacheKey = `profileBundle:${region}:${normRiotId}:${queue}`;

  const cached = getCached(cacheKey);
  if (cached) return Response.json(cached, { status: 200, headers: NO_CACHE_HEADERS });
  const existing = getInFlight(cacheKey);
  if (existing) {
    const data = await existing;
    return Response.json(data, { status: 200, headers: NO_CACHE_HEADERS });
  }

  let puuid: string | null = null;
  const { data: summonerRow } = await supabaseAdmin
    .from("summoner_cache")
    .select("puuid")
    .eq("region", region)
    .eq("riot_id", normRiotId)
    .maybeSingle();
  if (summonerRow?.puuid) puuid = summonerRow.puuid as string;

  if (puuid) {
    const { data: bundleRow } = await supabaseAdmin
      .from("profile_bundle_cache")
      .select("payload, fetched_at")
      .eq("region", region)
      .eq("puuid", puuid)
      .eq("queue_key", queueKey)
      .maybeSingle();

    if (bundleRow?.payload) {
      const payload = bundleRow.payload as ProfileBundle;
      const fetchedAt = new Date((bundleRow as { fetched_at: string }).fetched_at).getTime();
      const ageSec = (Date.now() - fetchedAt) / 1000;

      if (hasUsableMatches(payload)) {
        if (ageSec < FRESH_SEC) {
          return NextResponse.json(payload, { headers: NO_CACHE_HEADERS });
        }
        const lockKey = `profile_refresh:${region}:${puuid}:${queueKey}`;
        tryLock(lockKey, 120).then((ok) => {
          if (ok) {
            fetchBundleFromRiot(baseUrl, region, queue, parsed)
              .then((bundle) => {
                const p = bundle.profile.account.puuid;
                return Promise.all([
                  supabaseAdmin.from("summoner_cache").upsert(
                    { region, riot_id: normRiotId, puuid: p, payload: { puuid: p }, fetched_at: new Date().toISOString() },
                    { onConflict: "region,riot_id" }
                  ),
                  supabaseAdmin.from("profile_bundle_cache").upsert(
                    {
                      region,
                      puuid: p,
                      queue_key: queueKey,
                      payload: bundle as unknown as Record<string, unknown>,
                      fetched_at: new Date().toISOString(),
                    },
                    { onConflict: "region,puuid,queue_key" }
                  ),
                ]);
              })
              .catch(() => {});
          }
        });
        return NextResponse.json(payload, { headers: NO_CACHE_HEADERS });
      }
    }
  }

  const p = (async (): Promise<ProfileBundle> => {
    const data = await fetchBundleFromRiot(baseUrl, region, queue, parsed);
    setCached(cacheKey, data, 60_000);
    return data;
  })();
  setInFlight(cacheKey, p);

  let bundle: ProfileBundle;
  try {
    bundle = await p;
  } catch (e) {
    clearInFlight(cacheKey);
    const message = e instanceof Error ? e.message : "Failed to load profile";
    return NextResponse.json(
      { error: message, status: 502 },
      { status: 502, headers: NO_CACHE }
    );
  } finally {
    clearInFlight(cacheKey);
  }

  const puuidForUpsert = bundle.profile.account.puuid;
  await supabaseAdmin.from("summoner_cache").upsert(
    { region, riot_id: normRiotId, puuid: puuidForUpsert, payload: { puuid: puuidForUpsert }, fetched_at: new Date().toISOString() },
    { onConflict: "region,riot_id" }
  );
  await supabaseAdmin.from("profile_bundle_cache").upsert(
    {
      region,
      puuid: puuidForUpsert,
      queue_key: queueKey,
      payload: bundle as unknown as Record<string, unknown>,
      fetched_at: new Date().toISOString(),
    },
    { onConflict: "region,puuid,queue_key" }
  );

  return NextResponse.json(bundle, { status: 200, headers: NO_CACHE_HEADERS });
}
