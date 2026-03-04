import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getRoutingRegion } from "@/lib/riot-regions";
import { queueToRiotQueueId } from "@/lib/riotCacheUtils";
import { rankToNumber, numberToRankLabel } from "@/lib/rankMapping";
import { tryLock } from "@/lib/lock";
import {
  getCached as getSharedCached,
  setCached as setSharedCached,
  tryAcquireLock,
  releaseLock,
  PROFILE_BUNDLE_TTL_SEC,
  LOCK_TTL_SEC,
} from "@/lib/sharedCache";
import { riotFetchJson, RiotRateLimitError } from "@/lib/riotFetch";
import { matchDtoToRow, type MatchRow } from "@/lib/matchesDb";
import type { AccountDto, SummonerDto, LeagueEntryDto, MatchDto } from "@/types/riot";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const FRESH_SEC = 120; // 2 minutes
const MAX_NEW_MATCH_FETCHES = 5; // cap Riot match-detail calls per request
const MATCH_LIST_COUNT = 20;
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
  matches: MatchRow[];
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
    `?start=0&count=${MATCH_LIST_COUNT}&queue=${riotQueueId}`;
  const matchIdList = await riotFetchJson<string[]>(matchIdsUrl, regionRouting);

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

  // Match ingestion: check matches table for each id; fetch from Riot only if missing, then INSERT
  const needFetch: string[] = [];
  for (const matchId of matchIdList) {
    const { data: existing } = await sb
      .from("matches")
      .select("match_id")
      .eq("match_id", matchId)
      .eq("puuid", puuid)
      .maybeSingle();
    if (!existing) needFetch.push(matchId);
  }

  const toFetch = needFetch.slice(0, MAX_NEW_MATCH_FETCHES);
  for (const matchId of toFetch) {
    const matchUrl = `https://${regionRouting}.api.riotgames.com/lol/match/v5/matches/${encodeURIComponent(matchId)}`;
    try {
      const matchDto = await riotFetchJson<MatchDto>(matchUrl, regionRouting);
      const row = matchDtoToRow(matchId, matchDto, puuid);
      if (row) {
        await sb.from("matches").upsert(
          {
            match_id: row.match_id,
            puuid: row.puuid,
            queue_id: row.queue_id,
            champion_id: row.champion_id,
            kills: row.kills,
            deaths: row.deaths,
            assists: row.assists,
            win: row.win,
            cs: row.cs,
            damage: row.damage,
            game_duration: row.game_duration,
            game_creation: row.game_creation,
            champion_name: row.champion_name,
          },
          { onConflict: "match_id,puuid" }
        );
      }
    } catch {
      // skip failed match fetch
    }
  }

  // Load match rows from DB in list order (last 20 from Riot)
  const { data: rows } = await sb
    .from("matches")
    .select("*")
    .eq("puuid", puuid)
    .in("match_id", matchIdList);

  const rowMap = new Map<string, MatchRow>();
  (rows ?? []).forEach((r) => rowMap.set(r.match_id, r as MatchRow));
  const matches = matchIdList.map((id) => rowMap.get(id)).filter((m): m is MatchRow => m != null);
  console.log("[profileBundle] matches", matches.length, "new fetches", toFetch.length);

  const n = matches.length || 1;
  const avgKills = Math.round((matches.reduce((a, m) => a + m.kills, 0) / n) * 10) / 10;
  const avgDeaths = Math.round((matches.reduce((a, m) => a + m.deaths, 0) / n) * 10) / 10;
  const avgAssists = Math.round((matches.reduce((a, m) => a + m.assists, 0) / n) * 10) / 10;
  const totalCs = matches.reduce((a, m) => a + m.cs, 0);
  const totalDurationSec = matches.reduce((a, m) => a + m.game_duration, 0);
  const avgDurationMin = totalDurationSec / 60 / n;
  const avgCsPerMin = totalDurationSec > 0 ? totalCs / (totalDurationSec / 60) : 0;

  const leagueEntriesBySummonerId: Record<string, LeagueEntryDto[]> = {};
  const avgRankPlayedAgainst = "Unranked";

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
      avgRankRankedCount: 0,
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
  const lockKey = `lock:profileBundle:${region}:${normRiotId}:${queue}`;

  const cached = await getSharedCached(cacheKey);
  if (cached) return Response.json(cached, { status: 200, headers: NO_CACHE_HEADERS });

  const lockAcquired = await tryAcquireLock(lockKey, LOCK_TTL_SEC);
  if (!lockAcquired) {
    const stale = await getSharedCached(cacheKey);
    if (stale) return Response.json(stale, { status: 200, headers: NO_CACHE_HEADERS });
    return NextResponse.json(
      { error: "Profile busy; retry shortly", status: 202, retryAfter: 1 },
      { status: 202, headers: { "Retry-After": "1", ...NO_CACHE } }
    );
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
    const profileCacheKey = `profile:${puuid}:${queue}`;
    const profileCached = await getSharedCached(profileCacheKey);
    if (profileCached) return Response.json(profileCached, { status: 200, headers: NO_CACHE_HEADERS });
  }

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
          await setSharedCached(`profile:${puuid}:${queue}`, payload, PROFILE_BUNDLE_TTL_SEC);
          return NextResponse.json(payload, { headers: NO_CACHE_HEADERS });
        }
        const refreshLockKey = `profile_refresh:${region}:${puuid}:${queueKey}`;
        tryLock(refreshLockKey, 120).then((ok) => {
          if (ok) {
            fetchBundleFromRiot(baseUrl, region, queue, parsed)
              .then(async (bundle) => {
                const p = bundle.profile.account.puuid;
                await setSharedCached(cacheKey, bundle, PROFILE_BUNDLE_TTL_SEC);
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
        await setSharedCached(`profile:${puuid}:${queue}`, payload, PROFILE_BUNDLE_TTL_SEC);
        return NextResponse.json(payload, { headers: NO_CACHE_HEADERS });
      }
    }
  }

  let bundle: ProfileBundle;
  try {
    bundle = await fetchBundleFromRiot(baseUrl, region, queue, parsed);
    await setSharedCached(cacheKey, bundle, PROFILE_BUNDLE_TTL_SEC);
    await setSharedCached(`profile:${bundle.profile.account.puuid}:${queue}`, bundle, PROFILE_BUNDLE_TTL_SEC);
  } catch (e) {
    await releaseLock(lockKey);
    if (e instanceof RiotRateLimitError) {
      const retrySec = Math.ceil(e.retryAfterMs / 1000);
      return NextResponse.json(
        { error: "Rate limited; retry soon", status: 503, retryAfter: retrySec },
        { status: 503, headers: { "Retry-After": String(retrySec), ...NO_CACHE } }
      );
    }
    const message = e instanceof Error ? e.message : "Failed to load profile";
    return NextResponse.json(
      { error: message, status: 502 },
      { status: 502, headers: NO_CACHE }
    );
  }

  await releaseLock(lockKey);

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
