import { NextResponse } from "next/server";

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
  if (!puuid) {
    return NextResponse.json(
      { error: "Missing puuid", status: 400 },
      { status: 400 }
    );
  }

  const base = `https://${region}.api.riotgames.com/lol/summoner/v4/summoners`;
  const url = `${base}/by-puuid/${encodeURIComponent(puuid)}`;
  const res = await fetch(url, {
    headers: { "X-Riot-Token": key },
  });

  const text = await res.text();
  if (!res.ok) {
    console.error("[riot/summoner] Riot response:", res.status, res.statusText, text);
    const message = text || "Summoner lookup failed";
    return NextResponse.json(
      { error: message, status: res.status },
      { status: res.status }
    );
  }

  const data = JSON.parse(text);
  return NextResponse.json(data);
}
