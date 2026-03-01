import { NextResponse } from "next/server";
import { getRoutingRegion } from "@/lib/riot-regions";
import { getCached, setCache } from "@/lib/supabase/route";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const RIOT_ACCOUNT_BASE = "https://{region}.api.riotgames.com/riot/account/v1";
const NO_CACHE = { "Cache-Control": "no-store, max-age=0" };

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
      { error: "Missing gameName/tagLine or riotId (GameName#Tag)", status: 400 },
      { status: 400, headers: NO_CACHE }
    );
  }

  const cacheKey = `account:${region}:${name.toLowerCase()}#${tag.toLowerCase()}`;
  const cached = await getCached<{ puuid: string; gameName: string; tagLine: string }>(cacheKey);
  if (cached) return NextResponse.json(cached, { headers: NO_CACHE });

  const routing = getRoutingRegion(region);
  const base = RIOT_ACCOUNT_BASE.replace("{region}", routing);
  const url = `${base}/accounts/by-riot-id/${encodeURIComponent(name)}/${encodeURIComponent(tag)}`;
  const res = await fetch(url, {
    cache: "no-store",
    headers: { "X-Riot-Token": key },
  });

  const text = await res.text();
  if (!res.ok) {
    console.error("[riot/account] Riot response:", res.status, res.statusText, text);
    const message = text || "Account lookup failed";
    return NextResponse.json(
      { error: message, status: res.status },
      { status: res.status, headers: NO_CACHE }
    );
  }

  const data = JSON.parse(text) as { puuid: string; gameName: string; tagLine: string };
  await setCache(cacheKey, data);
  return NextResponse.json(data, { headers: NO_CACHE });
}
