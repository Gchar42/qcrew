import { NextResponse } from "next/server";
import { cachedRiotFetch } from "@/lib/cachedRiotFetch";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const NO_CACHE = { "Cache-Control": "no-store, max-age=0" };
const CDN_CACHE = "public, s-maxage=60, stale-while-revalidate=600";

/**
 * Summoner V4 uses platform only. NA: https://na1.api.riotgames.com/lol/summoner/v4/summoners/by-puuid/
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
  const upstream = await cachedRiotFetch(riotUrl);
  const text = await upstream.text();

  if (!upstream.ok) {
    return NextResponse.json(
      { error: text || "Summoner lookup failed", status: upstream.status, body: text },
      { status: upstream.status, headers: NO_CACHE }
    );
  }

  const data = JSON.parse(text);
  if (!data?.id) {
    console.warn("[riot/summoner] data.id (encryptedSummonerId) missing; returning payload anyway.", Object.keys(data));
  }

  const body = {
    puuid: data.puuid,
    ...(data.id != null && { encryptedSummonerId: data.id, id: data.id }),
    accountId: data.accountId,
    name: data.name,
    profileIconId: data.profileIconId,
    summonerLevel: data.summonerLevel,
  };
  return NextResponse.json(body, { status: 200, headers: { "Cache-Control": CDN_CACHE } });
}
