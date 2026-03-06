import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getRoutingRegion } from "@/lib/riot-regions";
import { SEASON_KEY, SEASON_START_MS } from "@/lib/season";
import type { MatchDto } from "@/types/riot";
import type { ChampionStatRow } from "../route";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/** Riot returns up to 100 match IDs per request; we paginate to get all in-season. */
const MATCH_IDS_PAGE_SIZE = 100;
/** Max total match IDs to consider per queue per season (Riot caps at ~1000; we cap to keep refresh time reasonable). */
const MAX_MATCH_IDS_TOTAL = 500;
/** Max new matches to fetch and cache per refresh invocation (keeps request under serverless timeout). */
const MAX_NEW_MATCH_FETCHES = 60;
const QUEUE_SOLO = 420;
const QUEUE_FLEX = 440;
const NO_CACHE = { "Cache-Control": "no-store, max-age=0" };
/** Delay between each match fetch to avoid Riot rate limits (429). */
const DELAY_BETWEEN_MATCH_FETCHES_MS = 220;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function queueToRiotId(queue: "solo" | "flex"): number {
  return queue === "flex" ? QUEUE_FLEX : QUEUE_SOLO;
}

function buildEmptyAggregate(
  puuid: string,
  queue: string
): { puuid: string; queue: string; season_key: string; updated_at: string; champions: unknown[] } {
  return {
    puuid,
    queue,
    season_key: SEASON_KEY,
    updated_at: new Date().toISOString(),
    champions: [],
  };
}

/**
 * Refresh pipeline: fetch match ids, update match_index, cache in champion_match_cache,
 * compute champion aggregates, upsert champion_aggregates.
 */
export async function refreshChampionStats(
  puuid: string,
  queue: "solo" | "flex",
  region: string = "na1"
): Promise<{
  totalMatchIds: number;
  missingBefore: number;
  fetchedThisRun: number;
  remainingAfterApprox: number;
}> {
  const key = process.env.RIOT_API_KEY;
  if (!key) {
    return { totalMatchIds: 0, missingBefore: 0, fetchedThisRun: 0, remainingAfterApprox: 0 };
  }

  const routing = getRoutingRegion(region);
  const riotQueueId = queueToRiotId(queue);

  const seasonStartSec = Math.floor(SEASON_START_MS / 1000);
  const baseUrl =
    `https://${routing}.api.riotgames.com/lol/match/v5/matches/by-puuid/${encodeURIComponent(puuid)}/ids` +
    `?queue=${riotQueueId}&start_time=${seasonStartSec}`;

  const matchIds: string[] = [];
  for (let start = 0; start < MAX_MATCH_IDS_TOTAL; start += MATCH_IDS_PAGE_SIZE) {
    const count = Math.min(MATCH_IDS_PAGE_SIZE, MAX_MATCH_IDS_TOTAL - start);
    const url = `${baseUrl}&start=${start}&count=${count}`;
    const res = await fetch(url, {
      headers: { "X-Riot-Token": key },
      cache: "no-store",
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`Match list failed: ${res.status} ${text.slice(0, 200)}`);
    }
    const page = (await res.json()) as string[];
    if (!Array.isArray(page) || page.length === 0) break;
    matchIds.push(...page);
    if (page.length < MATCH_IDS_PAGE_SIZE) break;
  }

  if (!Array.isArray(matchIds) || matchIds.length === 0) {
    const empty = buildEmptyAggregate(puuid, queue);
    await supabaseAdmin.from("champion_aggregates").upsert(empty, {
      onConflict: "puuid,queue,season_key",
    });
    return { totalMatchIds: 0, missingBefore: 0, fetchedThisRun: 0, remainingAfterApprox: 0 };
  }

  const existing = await supabaseAdmin
    .from("match_index")
    .select("match_id")
    .eq("puuid", puuid)
    .eq("queue", queue)
    .eq("season_key", SEASON_KEY)
    .in("match_id", matchIds);

  const existingIds = new Set((existing.data ?? []).map((r) => r.match_id));
  const missing = matchIds.filter((id) => !existingIds.has(id));
  const missingBefore = missing.length;
  const toFetch = missing.slice(0, MAX_NEW_MATCH_FETCHES);
  let fetchedThisRun = 0;

  for (let i = 0; i < toFetch.length; i++) {
    const matchId = toFetch[i];
    if (i > 0) await sleep(DELAY_BETWEEN_MATCH_FETCHES_MS);
    try {
      const matchUrl = `https://${routing}.api.riotgames.com/lol/match/v5/matches/${encodeURIComponent(matchId)}`;
      let matchRes = await fetch(matchUrl, {
        headers: { "X-Riot-Token": key },
        cache: "no-store",
      });
      if (matchRes.status === 429) {
        const retryAfter = matchRes.headers.get("Retry-After");
        const waitMs = retryAfter ? Math.min(Number(retryAfter) * 1000, 10000) : 2000;
        await sleep(waitMs);
        matchRes = await fetch(matchUrl, {
          headers: { "X-Riot-Token": key },
          cache: "no-store",
        });
      }
      if (!matchRes.ok) continue;
      const dto = (await matchRes.json()) as MatchDto;
      const info = dto?.info;
      const gameStartTs =
        (info as { gameStartTimestamp?: number })?.gameStartTimestamp ??
        (info?.gameEndTimestamp ? info.gameEndTimestamp - (info.gameDuration ?? 0) * 1000 : 0);

      await supabaseAdmin.from("match_index").upsert(
        {
          puuid,
          queue,
          season_key: SEASON_KEY,
          match_id: matchId,
          game_start_ts: gameStartTs,
        },
        { onConflict: "puuid,queue,season_key,match_id" }
      );

      await supabaseAdmin.from("champion_match_cache").upsert(
        {
          match_id: matchId,
          queue,
          game_start_ts: gameStartTs,
          data: dto as unknown as Record<string, unknown>,
        },
        { onConflict: "match_id" }
      );
      fetchedThisRun++;
    } catch {
      // skip
    }
  }

  const { data: indexRows } = await supabaseAdmin
    .from("match_index")
    .select("match_id, game_start_ts")
    .eq("puuid", puuid)
    .eq("queue", queue)
    .eq("season_key", SEASON_KEY)
    .gte("game_start_ts", SEASON_START_MS)
    .order("game_start_ts", { ascending: false });

  if (!indexRows?.length) {
    const empty = buildEmptyAggregate(puuid, queue);
    await supabaseAdmin.from("champion_aggregates").upsert(empty, {
      onConflict: "puuid,queue,season_key",
    });
    return {
      totalMatchIds: matchIds.length,
      missingBefore: 0,
      fetchedThisRun: 0,
      remainingAfterApprox: matchIds.length,
    };
  }

  const matchIdsInSeason = indexRows.map((r) => r.match_id);
  const { data: cacheRows } = await supabaseAdmin
    .from("champion_match_cache")
    .select("match_id, data")
    .in("match_id", matchIdsInSeason);

  const cacheByMatchId = new Map<string | null, MatchDto>();
  for (const r of cacheRows ?? []) {
    cacheByMatchId.set(r.match_id, r.data as MatchDto);
  }

  const agg = new Map<
    number,
    { games: number; wins: number; kills: number; deaths: number; assists: number; championName: string }
  >();

  for (const matchId of matchIdsInSeason) {
    const dto = cacheByMatchId.get(matchId);
    if (!dto?.info?.participants) continue;
    const p = dto.info.participants.find((x) => x.puuid === puuid);
    if (!p) continue;
    const cid = p.championId ?? 0;
    if (!cid) continue;
    const name = p.championName ?? `Champion ${cid}`;
    if (!agg.has(cid)) {
      agg.set(cid, { games: 0, wins: 0, kills: 0, deaths: 0, assists: 0, championName: name });
    }
    const c = agg.get(cid)!;
    c.games++;
    if (p.win) c.wins++;
    c.kills += p.kills ?? 0;
    c.deaths += p.deaths ?? 0;
    c.assists += p.assists ?? 0;
    if (c.championName.startsWith("Champion ")) c.championName = name;
  }

  const champions: ChampionStatRow[] = [...agg.entries()].map(([championId, c]) => {
    const winRate = c.games ? Math.round((c.wins / c.games) * 100) : 0;
    const kda = (c.kills + c.assists) / Math.max(1, c.deaths);
    return {
      championId,
      championName: c.championName,
      games: c.games,
      wins: c.wins,
      winRate,
      kills: c.kills,
      deaths: c.deaths,
      assists: c.assists,
      kda: Math.round(kda * 100) / 100,
      avgKills: Math.round((c.kills / c.games) * 100) / 100,
      avgDeaths: Math.round((c.deaths / c.games) * 100) / 100,
      avgAssists: Math.round((c.assists / c.games) * 100) / 100,
    };
  });

  champions.sort((a, b) => {
    if (b.games !== a.games) return b.games - a.games;
    if (b.winRate !== a.winRate) return b.winRate - a.winRate;
    return b.kda - a.kda;
  });

  const updatedAt = new Date().toISOString();
  await supabaseAdmin.from("champion_aggregates").upsert(
    {
      puuid,
      queue,
      season_key: SEASON_KEY,
      updated_at: updatedAt,
      champions: champions as unknown as Record<string, unknown>[],
    },
    { onConflict: "puuid,queue,season_key" }
  );

  // Approximation: we fetched up to MAX_NEW_MATCH_FETCHES missing matches this run.
  const remainingAfterApprox = Math.max(0, missingBefore - toFetch.length);
  return {
    totalMatchIds: matchIds.length,
    missingBefore,
    fetchedThisRun,
    remainingAfterApprox,
  };
}

/** POST /api/champion-stats/refresh — body: { puuid: string, queue: "solo" | "flex", region?: string } */
export async function POST(req: Request) {
  let body: { puuid?: string; queue?: string; region?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400, headers: NO_CACHE });
  }

  const puuid = (body.puuid ?? "").trim();
  const queueParam = (body.queue ?? "solo").toString().toLowerCase();
  const queue = (queueParam === "flex" ? "flex" : "solo") as "solo" | "flex";
  const region = (body.region ?? "na1").toString().toLowerCase();

  if (!puuid) {
    return NextResponse.json({ error: "missing params", details: "puuid required" }, { status: 400, headers: NO_CACHE });
  }
  if (queue !== "solo" && queue !== "flex") {
    return NextResponse.json({ error: "missing params", details: "queue must be solo or flex" }, { status: 400, headers: NO_CACHE });
  }

  try {
    const result = await refreshChampionStats(puuid, queue, region);
    return NextResponse.json({ ok: true, ...result }, { status: 200, headers: NO_CACHE });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Refresh failed";
    const is503 = message.includes("RIOT_API_KEY");
    const is429 = message.includes("429");
    return NextResponse.json(
      { error: message },
      { status: is503 ? 503 : is429 ? 429 : 502, headers: NO_CACHE }
    );
  }
}
