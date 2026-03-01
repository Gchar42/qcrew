import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const key = process.env.RIOT_API_KEY;
  if (!key) {
    return NextResponse.json(
      { error: "Riot API key not configured" },
      { status: 503 }
    );
  }

  const { searchParams } = new URL(request.url);
  const region = searchParams.get("region") ?? "na1";
  const puuid = searchParams.get("puuid");
  if (!puuid) {
    return NextResponse.json(
      { error: "Missing puuid" },
      { status: 400 }
    );
  }

  const base = `https://${region}.api.riotgames.com/lol/summoner/v4/summoners`;
  const url = `${base}/by-puuid/${encodeURIComponent(puuid)}`;
  const res = await fetch(url, {
    headers: { "X-Riot-Token": key },
  });

  if (res.status === 429) {
    return NextResponse.json(
      { error: "Rate limit exceeded. Try again shortly." },
      { status: 429 }
    );
  }
  if (!res.ok) {
    const text = await res.text();
    return NextResponse.json(
      { error: text || "Summoner lookup failed" },
      { status: res.status }
    );
  }

  const data = await res.json();
  return NextResponse.json(data);
}
