import { NextResponse } from "next/server";
import { getRoutingRegion } from "@/lib/riot-regions";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const RIOT_MATCH_BASE = "https://{region}.api.riotgames.com/lol/match/v5/matches";
const NO_CACHE = { "Cache-Control": "no-store, max-age=0" };

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
  /** Optional queue id: 420 = Solo, 440 = Flex. Passed to Riot to filter match ids. */
  const queue = searchParams.get("queue");
  if (!puuid) {
    return NextResponse.json(
      { error: "Missing puuid", status: 400 },
      { status: 400, headers: NO_CACHE }
    );
  }

  const routing = getRoutingRegion(region);
  const base = RIOT_MATCH_BASE.replace("{region}", routing);
  let url = `${base}/by-puuid/${encodeURIComponent(puuid)}/ids?count=${encodeURIComponent(count)}`;
  if (queue != null && queue !== "") {
    url += `&queue=${encodeURIComponent(queue)}`;
  }
  const res = await fetch(url, {
    cache: "no-store",
    headers: { "X-Riot-Token": key },
  });

  const text = await res.text();
  if (!res.ok) {
    console.error("[riot/matches] Riot response:", res.status, res.statusText, text);
    const message = text || "Match list failed";
    return NextResponse.json(
      { error: message, status: res.status },
      { status: res.status, headers: NO_CACHE }
    );
  }

  const matchIds = JSON.parse(text) as string[];
  return NextResponse.json({ matchIds }, { headers: NO_CACHE });
}
