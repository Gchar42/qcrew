import { NextResponse } from "next/server";
import { getRoutingRegion } from "@/lib/riot-regions";

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
  const puuid = searchParams.get("puuid");
  const count = searchParams.get("count") ?? "20";
  if (!puuid) {
    return NextResponse.json(
      { error: "Missing puuid", status: 400 },
      { status: 400 }
    );
  }

  const routing = getRoutingRegion(region);
  const base = RIOT_MATCH_BASE.replace("{region}", routing);
  const url = `${base}/by-puuid/${encodeURIComponent(puuid)}/ids?count=${encodeURIComponent(count)}`;
  const res = await fetch(url, {
    headers: { "X-Riot-Token": key },
  });

  const text = await res.text();
  if (!res.ok) {
    console.error("[riot/matches] Riot response:", res.status, res.statusText, text);
    const message = text || "Match list failed";
    return NextResponse.json(
      { error: message, status: res.status },
      { status: res.status }
    );
  }

  const matchIds = JSON.parse(text) as string[];
  return NextResponse.json({ matchIds });
}
