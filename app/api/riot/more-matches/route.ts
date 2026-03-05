import { NextResponse } from "next/server";
import { getRoutingRegion } from "@/lib/riot-regions";
import { cachedRiotFetch } from "@/lib/cachedRiotFetch";
import { SEASON_START_MS } from "@/lib/season";
import type { MatchDto } from "@/types/riot";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const NO_CACHE = { "Cache-Control": "no-store, max-age=0" };
const RIOT_MATCH_BASE = "https://{region}.api.riotgames.com/lol/match/v5/matches";

/**
 * GET /api/riot/more-matches?puuid=&region=&queue=solo|flex&start=20&count=20
 * Returns the next page of match details for profile "Show more". Calls Riot directly for IDs to avoid self-fetch issues on Vercel.
 */
export async function GET(request: Request) {
  const key = process.env.RIOT_API_KEY;
  if (!key) {
    return NextResponse.json(
      { error: "Riot API key not configured", status: 503 },
      { status: 503, headers: NO_CACHE }
    );
  }

  const { searchParams } = new URL(request.url);
  const puuid = searchParams.get("puuid");
  const region = searchParams.get("region") ?? "na1";
  const queue = searchParams.get("queue") ?? "solo";
  const start = searchParams.get("start") ?? "20";
  const count = searchParams.get("count") ?? "20";
  const queueId = queue === "flex" ? "440" : "420";

  if (!puuid) {
    return NextResponse.json({ error: "Missing puuid", status: 400 }, { status: 400, headers: NO_CACHE });
  }

  const routing = getRoutingRegion(region);
  const base = RIOT_MATCH_BASE.replace("{region}", routing);
  const seasonStartSec = Math.floor(SEASON_START_MS / 1000);
  const riotIdsUrl = `${base}/by-puuid/${encodeURIComponent(puuid)}/ids?start=${encodeURIComponent(start)}&count=${encodeURIComponent(count)}&queue=${encodeURIComponent(queueId)}&startTime=${seasonStartSec}`;

  const idsRes = await cachedRiotFetch(riotIdsUrl);
  const idsText = await idsRes.text();
  if (!idsRes.ok) {
    console.error("[more-matches] Riot IDs response:", idsRes.status, idsText.slice(0, 200));
    return NextResponse.json(
      { error: idsText || "Match list failed", status: idsRes.status },
      { status: idsRes.status, headers: NO_CACHE }
    );
  }
  let idList: string[] = [];
  try {
    idList = JSON.parse(idsText) as string[];
    if (!Array.isArray(idList)) idList = [];
  } catch {
    idList = [];
  }
  if (idList.length === 0) {
    return NextResponse.json({ matches: [] }, { headers: NO_CACHE });
  }

  const matches: MatchDto[] = [];
  const concurrency = 3;
  for (let i = 0; i < idList.length; i += concurrency) {
    const chunk = idList.slice(i, i + concurrency);
    const results = await Promise.all(
      chunk.map(async (matchId) => {
        const matchUrl = `${base}/${encodeURIComponent(matchId)}`;
        const r = await cachedRiotFetch(matchUrl);
        if (!r.ok) return null;
        const text = await r.text();
        try {
          return JSON.parse(text) as MatchDto;
        } catch {
          return null;
        }
      })
    );
    results.forEach((m) => {
      if (m) matches.push(m as MatchDto);
    });
  }

  return NextResponse.json({ matches }, { headers: NO_CACHE });
}
