import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const NO_CACHE = { "Cache-Control": "no-store, max-age=0" };

/**
 * Summoner-v4 is platform-routed (e.g. na1), not americas.
 * Response includes: id (encryptedSummonerId), accountId, puuid, name, profileIconId, summonerLevel.
 * Use response.id for League V4 entries by-summoner. Do not use puuid or accountId for league.
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
  const region = searchParams.get("region") ?? "na1";
  const puuid = searchParams.get("puuid");
  if (!puuid) {
    return NextResponse.json(
      { error: "Missing puuid", status: 400 },
      { status: 400, headers: NO_CACHE }
    );
  }

  // GET https://na1.api.riotgames.com/lol/summoner/v4/summoners/by-puuid/{puuid}
  const base = `https://${region}.api.riotgames.com/lol/summoner/v4/summoners`;
  const url = `${base}/by-puuid/${encodeURIComponent(puuid)}`;
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
