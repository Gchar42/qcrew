import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const NO_CACHE = { "Cache-Control": "no-store, max-age=0" };

/**
 * Summoner-v4 uses platform routing only (e.g. na1). Do NOT use americas.api.riotgames.com or getRoutingRegion (those are for account-v1 and match-v5).
 * Exact endpoint: https://na1.api.riotgames.com/lol/summoner/v4/summoners/by-puuid/{puuid}
 * Response includes: id (encryptedSummonerId), accountId, puuid, name, profileIconId, summonerLevel.
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
  const platform = searchParams.get("region") ?? "na1";
  const puuid = searchParams.get("puuid");
  if (!puuid) {
    return NextResponse.json(
      { error: "Missing puuid", status: 400 },
      { status: 400, headers: NO_CACHE }
    );
  }

  const url = `https://${platform}.api.riotgames.com/lol/summoner/v4/summoners/by-puuid/${encodeURIComponent(puuid)}`;
  console.log("[riot/summoner] Exact Riot URL being called:", url);
  const res = await fetch(url, {
    cache: "no-store",
    headers: { "X-Riot-Token": key },
  });

  const text = await res.text();
  const bodySnippet = text.slice(0, 500);
  console.log("[riot/summoner] Riot response:", {
    status: res.status,
    statusText: res.statusText,
    bodySnippet,
  });

  if (!res.ok) {
    return NextResponse.json(
      { error: text || "Summoner lookup failed", status: res.status, body: text },
      { status: res.status, headers: NO_CACHE }
    );
  }

  const data = JSON.parse(text);
  const keys = Object.keys(data);
  console.log("[riot/summoner] Riot response keys:", keys);
  console.log("[riot/summoner] data.id exists:", "id" in data && data.id != null);

  if (!data?.id) {
    console.error("[riot/summoner] data.id (encryptedSummonerId) is missing on 200 response. Keys:", keys);
    return NextResponse.json(
      { error: "missing encryptedSummonerId (summoner v4 response must include field id)", status: 502, keys },
      { status: 502, headers: NO_CACHE }
    );
  }

  return NextResponse.json(
    {
      puuid: data.puuid,
      encryptedSummonerId: data.id,
      id: data.id,
      accountId: data.accountId,
      name: data.name,
      profileIconId: data.profileIconId,
      summonerLevel: data.summonerLevel,
    },
    { headers: NO_CACHE }
  );
}
