import { NextResponse } from "next/server";
import { getRoutingRegion } from "@/lib/riot-regions";
import { cachedRiotFetch } from "@/lib/cachedRiotFetch";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const NO_CACHE = { "Cache-Control": "no-store, max-age=0" };
const CDN_CACHE = "public, s-maxage=60, stale-while-revalidate=600";

/** Match v5 uses routing region (americas, europe, asia, sea). */
const RIOT_MATCH_BASE = "https://{region}.api.riotgames.com/lol/match/v5/matches";

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
  const puuid = searchParams.get("puuid");
  const count = searchParams.get("count") ?? "20";
  const start = searchParams.get("start") ?? "0";
  /** 420 = Solo or Duo, 440 = Flex */
  const queueId = searchParams.get("queueId") ?? "420";
  if (!puuid) {
    return NextResponse.json(
      { error: "Missing puuid", status: 400 },
      { status: 400, headers: NO_CACHE }
    );
  }

  const routing = getRoutingRegion(region);
  const base = RIOT_MATCH_BASE.replace("{region}", routing);
  const riotUrl = `${base}/by-puuid/${encodeURIComponent(puuid)}/ids?start=${encodeURIComponent(start)}&count=${encodeURIComponent(count)}&queue=${encodeURIComponent(queueId)}`;

  const upstream = await cachedRiotFetch(riotUrl);
  const text = await upstream.text();

  if (!upstream.ok) {
    console.error("[riot/match-ids] Riot response:", upstream.status, upstream.statusText, text.slice(0, 200));
    return NextResponse.json(
      { error: text || "Match list failed", status: upstream.status },
      { status: upstream.status, headers: NO_CACHE }
    );
  }

  const matchIds = JSON.parse(text) as string[];
  return NextResponse.json(
    { matchIds },
    { status: 200, headers: { "Cache-Control": CDN_CACHE } }
  );
}
