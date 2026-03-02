import { NextResponse } from "next/server";
import { getRoutingRegion } from "@/lib/riot-regions";
import { getCached, setCache } from "@/lib/supabase/route";

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
  const id = searchParams.get("matchId");
  if (!id) {
    return NextResponse.json(
      { error: "Missing matchId", status: 400 },
      { status: 400, headers: NO_CACHE }
    );
  }

  const cacheKey = `match:${region}:${id}`;
  const cached = await getCached<Record<string, unknown>>(cacheKey);
  if (cached) return NextResponse.json(cached, { headers: NO_CACHE });

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

  const data = JSON.parse(text) as Record<string, unknown>;
  await setCache(cacheKey, data);

  // Return full Riot payload unchanged; participant fields (e.g. skin) are passed through as returned.
  // Verify participant shape: log first participant keys and skin (server logs)
  const info = data.info as Record<string, unknown> | undefined;
  const participants = info?.participants as Record<string, unknown>[] | undefined;
  if (participants?.[0]) {
    const first = participants[0] as Record<string, unknown>;
    console.log(
      "[riot/match] First participant keys:",
      Object.keys(first).sort().join(", ")
    );
    console.log("[riot/match] First participant.skin:", first.skin);
  }

  return NextResponse.json(data, { headers: NO_CACHE });
}
