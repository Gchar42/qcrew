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

  const base = `https://${region}.api.riotgames.com/lol/summoner/v4/summoners`;
  const url = `${base}/by-puuid/${encodeURIComponent(puuid)}`;
  const res = await fetch(url, {
    cache: "no-store",
    headers: { "X-Riot-Token": key },
  });

  const text = await res.text();
  if (!res.ok) {
    console.error("[riot/summoner] Riot response:", res.status, res.statusText, text);
    const message = text || "Summoner lookup failed";
    return NextResponse.json(
      { error: message, status: res.status },
      { status: res.status, headers: NO_CACHE }
    );
  }

  const data = JSON.parse(text);
  console.log("[riot/summoner] Full Riot summoner-v4 response JSON:", JSON.stringify(data));

  const encryptedSummonerId = data?.id;
  if (!encryptedSummonerId) {
    console.error("[riot/summoner] encryptedSummonerId (response.id) is falsy. Full summoner response:", JSON.stringify(data));
    return NextResponse.json(
      { error: "missing encryptedSummonerId (summoner v4 response must include field id)", status: 500 },
      { status: 500, headers: NO_CACHE }
    );
  }

  return NextResponse.json(
    { ...data, encryptedSummonerId },
    { headers: NO_CACHE }
  );
}
