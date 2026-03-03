import { NextResponse } from "next/server";
import { getCached, setCache } from "@/lib/supabase/route";
import type { LeagueEntryDto } from "@/types/riot";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const NO_CACHE = { "Cache-Control": "no-store, max-age=0" };
const LEAGUE_CACHE_TTL_MS = 12 * 60 * 60 * 1000; // 12 hours
const MAX_SUMMONER_IDS = 100;

export async function GET(request: Request) {
  const key = process.env.RIOT_API_KEY;
  if (!key) {
    return NextResponse.json(
      { error: "Riot API key not configured", status: 503 },
      { status: 503, headers: NO_CACHE }
    );
  }

  const { searchParams } = new URL(request.url);
  const platform = searchParams.get("platform") ?? searchParams.get("region") ?? "na1";
  const summonerIdsParam = searchParams.get("summonerIds");
  if (!summonerIdsParam) {
    return NextResponse.json(
      { error: "Missing summonerIds", status: 400 },
      { status: 400, headers: NO_CACHE }
    );
  }

  const rawIds = summonerIdsParam.split(",").map((s) => s.trim()).filter(Boolean);
  const uniqueIds = [...new Set(rawIds)].slice(0, MAX_SUMMONER_IDS);

  const entries: Record<string, { tier: string; rank: string } | null> = {};

  for (const summonerId of uniqueIds) {
    const cacheKey = `leagueEntry:${summonerId}`;
    const cached = await getCached<{ tier: string; rank: string } | null>(
      cacheKey,
      LEAGUE_CACHE_TTL_MS
    );
    if (cached !== undefined && cached !== null) {
      entries[summonerId] = cached;
      continue;
    }

    const url = `https://${platform}.api.riotgames.com/lol/league/v4/entries/by-summoner/${encodeURIComponent(summonerId)}`;
    const res = await fetch(url, {
      cache: "no-store",
      headers: { "X-Riot-Token": key },
    });
    const text = await res.text();

    if (!res.ok) {
      entries[summonerId] = null;
      continue;
    }

    let data: LeagueEntryDto[];
    try {
      data = JSON.parse(text) as LeagueEntryDto[];
    } catch {
      entries[summonerId] = null;
      continue;
    }

    const solo = Array.isArray(data)
      ? data.find((e) => e.queueType === "RANKED_SOLO_5x5" && e.tier && e.rank)
      : null;
    const value: { tier: string; rank: string } | null =
      solo != null ? { tier: solo.tier, rank: solo.rank } : null;
    entries[summonerId] = value;
    await setCache(cacheKey, value);
  }

  return NextResponse.json({ entries }, { headers: NO_CACHE });
}
