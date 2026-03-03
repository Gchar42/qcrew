import { NextResponse } from "next/server";
import { getRoutingRegion } from "@/lib/riot-regions";
import { getCached, setCache } from "@/lib/supabase/route";
import { cachedRiotFetch } from "@/lib/cachedRiotFetch";
import { computeItemPurchaseTimesBySlotWithDiagnostics } from "@/lib/matchTimeline";
import type { MatchDto, MatchTimelineDto } from "@/types/riot";

/** Log timeline diagnostics for first match only. */
let timelineDiagnosticsLoggedOnce = false;

export const dynamic = "force-dynamic";
export const revalidate = 0;

const RIOT_MATCH_BASE = "https://{region}.api.riotgames.com/lol/match/v5/matches";
const NO_CACHE = { "Cache-Control": "no-store, max-age=0" };
const CDN_CACHE = "public, s-maxage=60, stale-while-revalidate=600";

async function fetchTimelineServer(
  matchId: string,
  region: string
): Promise<MatchTimelineDto | null> {
  const cacheKey = `timeline:${region}:${matchId}`;
  const cached = await getCached<MatchTimelineDto>(cacheKey);
  if (cached) return cached;
  const routing = getRoutingRegion(region);
  const base = RIOT_MATCH_BASE.replace("{region}", routing);
  const url = `${base}/${encodeURIComponent(matchId)}/timeline`;
  const res = await cachedRiotFetch(url);
  if (!res.ok) return null;
  const data = (await res.json()) as MatchTimelineDto;
  await setCache(cacheKey, data);
  return data;
}

function resolveSelectedPuuidFromMatch(
  match: MatchDto,
  gameName: string,
  tagLine: string
): string | null {
  const participants = match.info?.participants ?? [];
  const lowerGame = gameName.toLowerCase();
  const lowerTag = tagLine.toLowerCase();

  // Prefer Riot ID fields when available.
  const byRiotId = participants.find((p) => {
    const g = (p.riotIdGameName ?? p.summonerName)?.toLowerCase();
    const t = p.riotIdTagline?.toLowerCase();
    return g === lowerGame && t === lowerTag;
  });
  if (byRiotId) return byRiotId.puuid;

  // Fallback: match by summonerName only (case-insensitive).
  const bySummonerName = participants.find(
    (p) => p.summonerName?.toLowerCase() === lowerGame
  );
  return bySummonerName?.puuid ?? null;
}

export async function GET(request: Request) {
  const key = process.env.RIOT_API_KEY;
  if (!key) {
    return NextResponse.json(
      { error: "Riot API key not configured", status: 503 },
      { status: 503, headers: NO_CACHE }
    );
  }

  const { searchParams } = new URL(request.url);
  const region = searchParams.get("region") ?? "na1";
  const id = searchParams.get("matchId");
  const puuid = searchParams.get("puuid") ?? undefined;
  const gameName = searchParams.get("gameName") ?? undefined;
  const tagLine = searchParams.get("tagLine") ?? undefined;
  if (!id) {
    return NextResponse.json(
      { error: "Missing matchId", status: 400 },
      { status: 400, headers: NO_CACHE }
    );
  }

  const cacheKey = `match:${region}:${id}`;
  let data = await getCached<Record<string, unknown>>(cacheKey);
  if (!data) {
    const routing = getRoutingRegion(region);
    const base = RIOT_MATCH_BASE.replace("{region}", routing);
    const url = `${base}/${encodeURIComponent(id)}`;
    const upstream = await cachedRiotFetch(url);
    const text = await upstream.text();
    if (!upstream.ok) {
      console.error("[riot/match] Riot response:", upstream.status, upstream.statusText, text);
      const message = text || "Match fetch failed";
      return NextResponse.json(
        { error: message, status: upstream.status },
        { status: upstream.status, headers: NO_CACHE }
      );
    }
    data = JSON.parse(text) as Record<string, unknown>;
    await setCache(cacheKey, data);
  }

  // Compute item purchase times only when we know which summoner this profile is for.
  // selectedPuuid must come from the match participants, not from an external account API puuid.
  if (gameName && tagLine) {
    const timeline = await fetchTimelineServer(id, region);
    const match = data as MatchDto;
    if (!timeline) {
      return NextResponse.json(
        { ...data, itemPurchaseTimesBySlot: [null, null, null, null, null, null] },
        { headers: { "Cache-Control": CDN_CACHE } }
      );
    }
    const logFirstMatchOnly = !timelineDiagnosticsLoggedOnce;
    if (logFirstMatchOnly) timelineDiagnosticsLoggedOnce = true;

    const selectedPuuid = resolveSelectedPuuidFromMatch(match, gameName, tagLine);
    if (!selectedPuuid) {
      if (logFirstMatchOnly) {
        console.log("[riot/match] could not resolve selectedPuuid from match participants", {
          gameName,
          tagLine,
          paramPuuid: puuid,
          participantNames: match.info?.participants?.map((p) => ({
            summonerName: p.summonerName,
            riotIdGameName: p.riotIdGameName,
            riotIdTagline: p.riotIdTagline,
          })),
        });
      }
      return NextResponse.json(
        { ...data, itemPurchaseTimesBySlot: [null, null, null, null, null, null] },
        { headers: { "Cache-Control": CDN_CACHE } }
      );
    }

    const { itemPurchaseTimesBySlot } = computeItemPurchaseTimesBySlotWithDiagnostics(
      timeline,
      match,
      selectedPuuid,
      id,
      logFirstMatchOnly
    );

    return NextResponse.json(
      { ...data, itemPurchaseTimesBySlot },
      { headers: { "Cache-Control": CDN_CACHE } }
    );
  }

  return NextResponse.json(data, { headers: { "Cache-Control": CDN_CACHE } });
}
