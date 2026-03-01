import { NextResponse } from "next/server";
import { getRoutingRegion } from "@/lib/riot-regions";
import { getCached, setCache } from "@/lib/supabase/route";

const RIOT_MATCH_BASE = "https://{region}.api.riotgames.com/lol/match/v5/matches";

export async function GET(request: Request) {
  const key = process.env.RIOT_API_KEY;
  if (!key) {
    return NextResponse.json(
      { error: "Riot API key not configured", status: 503 },
      { status: 503 }
    );
  }

  const { searchParams } = new URL(request.url);
  const region = searchParams.get("region") ?? "na1";
  const id = searchParams.get("matchId");
  if (!id) {
    return NextResponse.json(
      { error: "Missing matchId", status: 400 },
      { status: 400 }
    );
  }

  const cacheKey = `match:${region}:${id}`;
  const cached = await getCached<Record<string, unknown>>(cacheKey);
  if (cached) return NextResponse.json(cached);

  const routing = getRoutingRegion(region);
  const base = RIOT_MATCH_BASE.replace("{region}", routing);
  const url = `${base}/${encodeURIComponent(id)}`;
  const res = await fetch(url, {
    headers: { "X-Riot-Token": key },
  });

  const text = await res.text();
  if (!res.ok) {
    console.error("[riot/match] Riot response:", res.status, res.statusText, text);
    const message = text || "Match fetch failed";
    return NextResponse.json(
      { error: message, status: res.status },
      { status: res.status }
    );
  }

  const data = JSON.parse(text) as Record<string, unknown>;
  await setCache(cacheKey, data);
  return NextResponse.json(data);
}
