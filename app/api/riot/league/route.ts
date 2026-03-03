import { NextResponse } from "next/server";
import type { LeagueEntryDto } from "@/types/riot";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const NO_CACHE = { "Cache-Control": "no-store, max-age=0" };

/**
 * League V4 must use platform routing only. For NA, host must be https://na1.api.riotgames.com.
 * Do NOT use americas.api.riotgames.com or getRoutingRegion(); those are for account-v1 and match-v5 only.
 */
export async function GET(request: Request) {
  const key = process.env.RIOT_API_KEY;
  const origin = request.headers.get("origin") ?? null;
  const host = request.headers.get("host") ?? null;
  console.log("[riot/league] On every request:", {
    riotApiKeyExists: !!key,
    riotApiKeyFirst5: key ? key.slice(0, 5) : "(none)",
    requestOrigin: origin,
    requestHost: host,
  });
  if (!key) {
    return NextResponse.json(
      { error: "Riot API key not configured", status: 503 },
      { status: 503, headers: NO_CACHE }
    );
  }

  const { searchParams } = new URL(request.url);
  // Platform only (e.g. na1 for NA). Never use americas or routing region.
  const platform = searchParams.get("region") ?? "na1";
  const encryptedSummonerId = searchParams.get("summonerId");
  if (!encryptedSummonerId) {
    return NextResponse.json(
      { error: "Missing summonerId", status: 400 },
      { status: 400, headers: NO_CACHE }
    );
  }

  // League V4 requires encryptedSummonerId (summoner v4 field "id"), not puuid, not account id.
  console.log("[riot/league] Before Riot call:", {
    platform,
    summonerIdLength: encryptedSummonerId.length,
    summonerIdFirst6: encryptedSummonerId.slice(0, 6),
    xRiotTokenHeader: "present",
  });

  const url = `https://${platform}.api.riotgames.com/lol/league/v4/entries/by-summoner/${encodeURIComponent(encryptedSummonerId)}`;
  console.log("[riot/league] Exact Riot URL being called:", url);
  // Riot expects "X-Riot-Token" only. Do NOT use Authorization: Bearer.
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
      console.error("[riot/league] → 403: API key invalid, expired, or blocked. Riot response body:", text);
      if (/production|forbidden/i.test(text)) {
        console.error("[riot/league] → 403 body mentions production/forbidden → fix: use a production-approved API key.");
      }
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
