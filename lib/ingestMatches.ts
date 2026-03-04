/**
 * Ingest match list for a player: use match_cache and matches tables first,
 * fetch from Riot only when missing. Cap Riot detail fetches at 8 per request.
 */
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getRoutingRegion } from "@/lib/riot-regions";
import { queueToRiotQueueId } from "@/lib/riotCacheUtils";
import { riotFetchJson } from "@/lib/riotFetch";
import { matchDtoToRow } from "@/lib/matchesDb";
import type { MatchDto } from "@/types/riot";

const MATCH_LIST_COUNT = 20;
const MAX_RIOT_DETAIL_FETCHES = 8;

export type IngestResult = {
  matchPayloads: MatchDto[];
  matchIds: string[];
  needsMore: boolean;
};

/**
 * Get last 20 match ids from Riot for the given queue, then fill details from
 * match_cache or Riot. Returns match payloads in list order; needsMore if not all 20 could be filled this request.
 */
export async function ingestMatches(
  region: string,
  puuid: string,
  queue: "solo" | "flex"
): Promise<IngestResult> {
  const regionRouting = getRoutingRegion(region);
  const riotQueueId = queueToRiotQueueId(queue);

  const matchIdsUrl =
    `https://${regionRouting}.api.riotgames.com/lol/match/v5/matches/by-puuid/${encodeURIComponent(puuid)}/ids` +
    `?start=0&count=${MATCH_LIST_COUNT}&queue=${riotQueueId}`;

  let matchIdList: string[];
  try {
    matchIdList = await riotFetchJson<string[]>(matchIdsUrl, regionRouting);
  } catch {
    return { matchPayloads: [], matchIds: [], needsMore: false };
  }

  if (!Array.isArray(matchIdList) || matchIdList.length === 0) {
    return { matchPayloads: [], matchIds: [], needsMore: false };
  }

  const sb = supabaseAdmin;
  const payloadMap = new Map<string, MatchDto>();
  const needFetch: string[] = [];

  for (const matchId of matchIdList) {
    const { data: row } = await sb
      .from("match_cache")
      .select("payload")
      .eq("region", region)
      .eq("puuid", puuid)
      .eq("match_id", matchId)
      .maybeSingle();

    if (row?.payload && typeof row.payload === "object") {
      payloadMap.set(matchId, row.payload as MatchDto);
    } else {
      needFetch.push(matchId);
    }
  }

  const toFetch = needFetch.slice(0, MAX_RIOT_DETAIL_FETCHES);

  for (const matchId of toFetch) {
    const matchUrl = `https://${regionRouting}.api.riotgames.com/lol/match/v5/matches/${encodeURIComponent(matchId)}`;
    try {
      const matchDto = await riotFetchJson<MatchDto>(matchUrl, regionRouting);
      payloadMap.set(matchId, matchDto);

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
      // skip failed fetch (e.g. 429)
    }
  }

  const matchPayloads = matchIdList
    .map((id) => payloadMap.get(id))
    .filter((m): m is MatchDto => m != null);

  const needsMore = needFetch.length > MAX_RIOT_DETAIL_FETCHES;

  return {
    matchPayloads,
    matchIds: matchIdList,
    needsMore,
  };
}
