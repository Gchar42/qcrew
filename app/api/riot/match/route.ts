import { NextResponse } from "next/server";
import { getRoutingRegion } from "@/lib/riot-regions";
import { getCached, setCache } from "@/lib/supabase/route";
import {
  resolveTimelineParticipantId,
  getItemPurchaseTimesFormatted,
  getFinalBuild,
  getPurchaseTimeMap,
} from "@/lib/matchTimeline";
import type { MatchDto, MatchTimelineDto } from "@/types/riot";

/** Log timeline debug only for first match and only when all times are null. */
let timelineDebugLoggedOnce = false;

export const dynamic = "force-dynamic";
export const revalidate = 0;

const RIOT_MATCH_BASE = "https://{region}.api.riotgames.com/lol/match/v5/matches";
const NO_CACHE = { "Cache-Control": "no-store, max-age=0" };

async function fetchTimelineServer(
  matchId: string,
  region: string,
  apiKey: string
): Promise<MatchTimelineDto | null> {
  const cacheKey = `timeline:${region}:${matchId}`;
  const cached = await getCached<MatchTimelineDto>(cacheKey);
  if (cached) return cached;
  const routing = getRoutingRegion(region);
  const base = RIOT_MATCH_BASE.replace("{region}", routing);
  const url = `${base}/${encodeURIComponent(matchId)}/timeline`;
  const res = await fetch(url, {
    cache: "no-store",
    headers: { "X-Riot-Token": apiKey },
  });
  if (!res.ok) return null;
  const data = (await res.json()) as MatchTimelineDto;
  await setCache(cacheKey, data);
  return data;
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
    const res = await fetch(url, {
      cache: "no-store",
      headers: { "X-Riot-Token": key },
    });
    const text = await res.text();
    if (!res.ok) {
      console.error("[riot/match] Riot response:", res.status, res.statusText, text);
      const message = text || "Match fetch failed";
      return NextResponse.json(
        { error: message, status: res.status },
        { status: res.status, headers: NO_CACHE }
      );
    }
    data = JSON.parse(text) as Record<string, unknown>;
    await setCache(cacheKey, data);
  }

  if (puuid) {
    const timeline = await fetchTimelineServer(id, region, key);
    const match = data as MatchDto;
    if (!timeline) {
      return NextResponse.json(
        { ...data, itemPurchaseTimesBySlot: [null, null, null, null, null, null] },
        { headers: NO_CACHE }
      );
    }
    let participantId = resolveTimelineParticipantId(timeline, match, puuid);
    if (participantId != null) {
      let itemPurchaseTimesBySlot = getItemPurchaseTimesFormatted(
        timeline,
        participantId
      );
      const frames = timeline.info?.frames ?? [];
      const purchasedCountFor = (pid: number) =>
        frames.reduce(
          (acc, f) =>
            acc +
            (f.events?.filter(
              (e) =>
                Number(e.participantId) === pid && e.type === "ITEM_PURCHASED"
            ).length ?? 0),
          0
        );
      if (itemPurchaseTimesBySlot.every((t) => t == null) && purchasedCountFor(participantId) === 0 && participantId >= 1) {
        const zeroBasedId = participantId - 1;
        if (purchasedCountFor(zeroBasedId) > 0) {
          participantId = zeroBasedId;
          itemPurchaseTimesBySlot = getItemPurchaseTimesFormatted(
            timeline,
            participantId
          );
        }
      }
      const hasRealTimes = itemPurchaseTimesBySlot.some((t) => t != null && t !== "");
      if (!hasRealTimes && !timelineDebugLoggedOnce) {
        timelineDebugLoggedOnce = true;
        const totalEvents = frames.reduce(
          (acc, f) => acc + (f.events?.length ?? 0),
          0
        );
        const finalBuild = getFinalBuild(timeline, participantId);
        const purchaseMap = getPurchaseTimeMap(timeline, participantId);
        console.log("[riot/match] timeline debug (first match, all null)", {
          matchId: id,
          selectedPuuid: puuid,
          timelineParticipantId: participantId,
          totalFrames: frames.length,
          totalEvents: totalEvents,
          itemPurchasedCountForParticipant: purchasedCountFor(participantId),
          finalFrameItem0To5: finalBuild.slice(0, 6),
          firstPurchaseTimeMapSize: purchaseMap.size,
        });
      }
      return NextResponse.json(
        { ...data, itemPurchaseTimesBySlot },
        { headers: NO_CACHE }
      );
    }
    return NextResponse.json(
      { ...data, itemPurchaseTimesBySlot: [null, null, null, null, null, null] },
      { headers: NO_CACHE }
    );
  }

  return NextResponse.json(data, { headers: NO_CACHE });
}
