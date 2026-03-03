import { NextResponse } from "next/server";
import type { LeagueEntryDto } from "@/types/riot";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const NO_CACHE = { "Cache-Control": "no-store, max-age=0" };

/**
 * League-v4 is platform-routed (e.g. na1.api.riotgames.com), NOT americas.
 * Americas is only for account-v1 and match-v5.
 */
export async function GET(request: Request) {
  const key = process.env.RIOT_API_KEY;
  console.log("[riot/league] RIOT_API_KEY exists:", !!key);
  if (!key) {
    return NextResponse.json(
      { error: "Riot API key not configured", status: 503 },
      { status: 503, headers: NO_CACHE }
    );
  }

  const { searchParams } = new URL(request.url);
  const region = searchParams.get("region") ?? "na1";
  const summonerId = searchParams.get("summonerId");
  if (!summonerId) {
    return NextResponse.json(
      { error: "Missing summonerId", status: 400 },
      { status: 400, headers: NO_CACHE }
    );
  }

  // Validation: League V4 requires encryptedSummonerId (summoner v4 field "id"), not puuid, not account id.
  console.log("[riot/league] Before Riot call:", {
    region,
    summonerIdLength: summonerId.length,
    summonerIdFirst6: summonerId.slice(0, 6),
    xRiotTokenHeader: "present",
  });

  const url = `https://${region}.api.riotgames.com/lol/league/v4/entries/by-summoner/${encodeURIComponent(summonerId)}`;
  const res = await fetch(url, {
    cache: "no-store",
    headers: { "X-Riot-Token": key },
  });

  const text = await res.text();
  const bodySnippet = text.slice(0, 500);
  console.log("[riot/league] League V4 response:", {
    requestUrl: url,
    status: res.status,
    statusText: res.statusText,
    bodySnippet,
  });

  if (!res.ok) {
    if (res.status === 403) {
      console.error("[riot/league] → 403: API key invalid, expired, or blocked");
    } else if (res.status === 429) {
      console.error("[riot/league] → 429: Rate limited");
    } else if (res.status === 404) {
      console.error("[riot/league] → 404: Wrong encryptedSummonerId or wrong route");
    }
    return NextResponse.json(
      {
        ok: false,
        status: res.status,
        statusText: res.statusText,
        riotBody: text,
        requestUrl: url,
      },
      { status: res.status, headers: NO_CACHE }
    );
  }

  const data = JSON.parse(text) as LeagueEntryDto[];
  return NextResponse.json(data, { headers: NO_CACHE });
}
