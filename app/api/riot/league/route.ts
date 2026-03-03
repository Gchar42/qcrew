import { NextResponse } from "next/server";
import { cachedRiotFetch } from "@/lib/cachedRiotFetch";
import type { LeagueEntryDto } from "@/types/riot";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const NO_CACHE = { "Cache-Control": "no-store, max-age=0" };
const CDN_CACHE = "public, s-maxage=60, stale-while-revalidate=600";

/**
 * League V4 must use platform routing only. Do NOT use americas / getRoutingRegion().
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
  const platform = searchParams.get("platform") ?? searchParams.get("region") ?? "na1";
  const puuid = searchParams.get("puuid");
  const summonerId = searchParams.get("summonerId");

  let riotUrl: string;
  if (summonerId && typeof summonerId === "string" && summonerId.trim()) {
    riotUrl = `https://${platform}.api.riotgames.com/lol/league/v4/entries/by-summoner/${encodeURIComponent(summonerId.trim())}`;
  } else if (puuid && typeof puuid === "string" && puuid.trim()) {
    riotUrl = `https://${platform}.api.riotgames.com/lol/league/v4/entries/by-puuid/${encodeURIComponent(puuid.trim())}`;
  } else {
    return NextResponse.json(
      { ok: false, error: "missing puuid or summonerId", status: 400 },
      { status: 400, headers: NO_CACHE }
    );
  }
  const upstream = await cachedRiotFetch(riotUrl);
  const text = await upstream.text();

  if (!upstream.ok) {
    if (upstream.status === 403) {
      console.error("[riot/league] → 403: API key invalid or blocked.", text.slice(0, 300));
    } else if (upstream.status === 429) {
      console.error("[riot/league] → 429: Rate limited");
    }
    return NextResponse.json(
      {
        ok: false,
        status: upstream.status,
        statusText: upstream.statusText,
        riotBody: text,
        requestUrl: riotUrl,
      },
      { status: upstream.status, headers: NO_CACHE }
    );
  }

  const data = JSON.parse(text) as LeagueEntryDto[];
  const headers = new Headers();
  headers.set("Cache-Control", CDN_CACHE);
  return NextResponse.json(data, { status: 200, headers });
}
