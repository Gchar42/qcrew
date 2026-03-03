import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const NO_CACHE = { "Cache-Control": "no-store, max-age=0" };

/**
 * Routing rules (lock this in):
 * - americas: riot/account/v1, lol/match/v5
 * - platform (na1, euw1, kr): lol/summoner/v4, lol/league/v4, lol/champion-mastery/v4
 * Summoner V4 uses platform only. Do NOT reuse routing value from account-v1 or match-v5.
 * NA: platform = "na1". URL must start with https://na1.api.riotgames.com/lol/summoner/v4/summoners/by-puuid/
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

  const riotUrl = `https://${platform}.api.riotgames.com/lol/summoner/v4/summoners/by-puuid/${encodeURIComponent(puuid)}`;
  console.log("[riot/summoner] exactUrl", riotUrl);
  const res = await fetch(riotUrl, {
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
    console.warn("[riot/summoner] data.id (encryptedSummonerId) missing; returning payload anyway so profile can load. Rank will use puuid.", keys);
  }

  return NextResponse.json(
    {
      puuid: data.puuid,
      ...(data.id != null && { encryptedSummonerId: data.id, id: data.id }),
      accountId: data.accountId,
      name: data.name,
      profileIconId: data.profileIconId,
      summonerLevel: data.summonerLevel,
    },
    { headers: NO_CACHE }
  );
}
