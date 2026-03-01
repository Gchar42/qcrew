import { NextResponse } from "next/server";
import { getRoutingRegion } from "@/lib/riot-regions";
import { getCached, setCache } from "@/lib/supabase/route";

const RIOT_ACCOUNT_BASE = "https://{region}.api.riotgames.com/riot/account/v1";

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
  const gameName = searchParams.get("gameName") ?? searchParams.get("name");
  const tagLine = searchParams.get("tagLine") ?? searchParams.get("tag");
  const riotId = searchParams.get("riotId");
  let name = gameName;
  let tag = tagLine;
  if (riotId && !name) {
    const parts = decodeURIComponent(riotId).split("#");
    name = parts[0] ?? "";
    tag = parts[1] ?? "";
  }
  if (!name || !tag) {
    return NextResponse.json(
      { error: "Missing gameName/tagLine or riotId (GameName#Tag)" },
      { status: 400 }
    );
  }

  const cacheKey = `account:${region}:${name.toLowerCase()}#${tag.toLowerCase()}`;
  const cached = await getCached<{ puuid: string; gameName: string; tagLine: string }>(cacheKey);
  if (cached) return NextResponse.json(cached);

  const routing = getRoutingRegion(region);
  const base = RIOT_ACCOUNT_BASE.replace("{region}", routing);
  const url = `${base}/accounts/by-riot-id/${encodeURIComponent(name)}/${encodeURIComponent(tag)}`;
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
      { error: text || "Account lookup failed" },
      { status: res.status }
    );
  }

  const data = (await res.json()) as { puuid: string; gameName: string; tagLine: string };
  await setCache(cacheKey, data);
  return NextResponse.json(data);
}
