import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { ingestMatches } from "@/lib/ingestMatches";
import { rankToNumber, numberToRankLabel } from "@/lib/rankMapping";
import type { AccountDto, SummonerDto, LeagueEntryDto, MatchDto } from "@/types/riot";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const STALE_AFTER_SEC = 120;
const NO_CACHE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
};
const NO_CACHE = { "Cache-Control": "no-store, max-age=0" };

/** Cache is valid only if it contains matches (not rank-only blobs). */
function hasUsableMatches(data: unknown): boolean {
  const matches = (data as { matches?: unknown[]; matchIds?: unknown[] })?.matches;
  if (Array.isArray(matches)) return matches.length > 0;
  return false;
}

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

type ProfileSnapshotRow = {
  region: string;
  queue: string;
  riot_id: string;
  puuid: string;
  data: ProfileBundle;
  fetched_at: string;
  stale_after_sec: number;
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
  /** True when not all match details could be filled this request (e.g. rate limited). */
  partialMatches?: boolean;
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
  console.log("PROFILE FETCH START");

  const platform = region;

  const accountRes = await fetch(
    `${baseUrl}/api/riot/account?gameName=${encodeURIComponent(parsed.gameName)}&tagLine=${encodeURIComponent(parsed.tagLine)}&region=${region}`
  );
  if (!accountRes.ok) {
    const err = await accountRes.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error ?? "Account lookup failed");
  }
  const account = (await accountRes.json()) as AccountDto;
  console.log("[profileBundle] puuid", account.puuid);

  const [summoner, leagueEntries, ingest] = await Promise.all([
    fetch(`${baseUrl}/api/riot/summoner?puuid=${encodeURIComponent(account.puuid)}&region=${region}`).then(
      async (r) => {
        if (!r.ok) throw new Error("Summoner lookup failed");
        return r.json() as Promise<SummonerDto>;
      }
    ),
    fetch(`${baseUrl}/api/riot/league?puuid=${encodeURIComponent(account.puuid)}&platform=${platform}`).then(
      async (r) => {
        if (!r.ok) return [] as LeagueEntryDto[];
        try {
          const arr = JSON.parse(await r.text()) as LeagueEntryDto[];
          return Array.isArray(arr) ? arr : [];
        } catch {
          return [] as LeagueEntryDto[];
        }
      }
    ),
    ingestMatches(region, account.puuid, queue),
  ]);

  console.log("RANK FETCH END", Date.now() - startTime);
  console.log("[profileBundle] matchIds", ingest.matchIds?.length, "matches", ingest.matchPayloads?.length, "needsMore", ingest.needsMore);

  const soloEntry = leagueEntries.find((e) => e.queueType === "RANKED_SOLO_5x5") ?? null;
  const flexEntry = leagueEntries.find((e) => e.queueType === "RANKED_FLEX_SR") ?? null;

  const matches = ingest.matchPayloads;
  const matchIdList = ingest.matchIds;
  console.log("[profileBundle] matchesBuilt", matches.length);

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
    partialMatches: ingest.needsMore,
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

  console.log("[profileBundle] riotId", riotIdParam, "queue", queue, "region", region);

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
  console.log("[profileBundle] cache hit", !!row?.data, "cache matches", (row?.data as ProfileBundle | undefined)?.matches?.length);

  if (row?.data && hasUsableMatches(row.data)) {
    const cached = row.data as ProfileBundle;
    const ageSec = (Date.now() - new Date(row.fetched_at).getTime()) / 1000;
    const stale = ageSec > (row.stale_after_sec ?? STALE_AFTER_SEC);

    if (!stale) {
      return NextResponse.json(cached, {
        headers: NO_CACHE_HEADERS,
      });
    }

    const baseUrl = getBaseUrl(request);
    refreshSnapshot(baseUrl, region, queue, normRiotId).catch(() => {});

    return NextResponse.json(cached, {
      headers: NO_CACHE_HEADERS,
    });
  }

  /* Cache miss or cache has no usable matches (rank-only blob): fetch full bundle and overwrite cache. */
  const baseUrl = getBaseUrl(request);
  let bundle: ProfileBundle;
  try {
    bundle = await fetchBundleFromRiot(baseUrl, region, queue, parsed);
  } catch (e) {
    if (row?.data && hasUsableMatches(row.data)) {
      return NextResponse.json(row.data as ProfileBundle, {
        headers: NO_CACHE_HEADERS,
      });
    }
    const message = e instanceof Error ? e.message : "Failed to load profile";
    return NextResponse.json(
      { error: message, status: 502 },
      { status: 502, headers: NO_CACHE }
    );
  }

  console.log("bundle keys", Object.keys(bundle), "matches", bundle.matches?.length);

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

  return NextResponse.json(bundle, {
    status: 200,
    headers: NO_CACHE_HEADERS,
  });
}
