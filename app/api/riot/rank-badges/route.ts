import { NextResponse } from "next/server";
import { cachedRiotFetch } from "@/lib/cachedRiotFetch";
import type { LeagueEntryDto } from "@/types/riot";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const NO_CACHE = { "Cache-Control": "no-store, max-age=0" };
const CDN_CACHE = "public, s-maxage=3600, stale-while-revalidate=86400";

function tierToLetter(tier: string): string {
  const t = tier.toUpperCase();
  if (t === "IRON") return "I";
  if (t === "BRONZE") return "B";
  if (t === "SILVER") return "S";
  if (t === "GOLD") return "G";
  if (t === "PLATINUM") return "P";
  if (t === "EMERALD") return "E";
  if (t === "DIAMOND") return "D";
  if (t === "MASTER") return "M";
  if (t === "GRANDMASTER") return "GM";
  if (t === "CHALLENGER") return "C";
  return t.charAt(0);
}

function rankToNum(rank: string | undefined): string {
  const r = (rank ?? "").toUpperCase();
  if (r === "I") return "1";
  if (r === "II") return "2";
  if (r === "III") return "3";
  if (r === "IV") return "4";
  return "";
}

function toBadgeText(entry: LeagueEntryDto | null | undefined): string | null {
  if (!entry?.tier || !entry.rank) return null;
  const tier = tierToLetter(entry.tier);
  const div = rankToNum(entry.rank);
  if (["M", "GM", "C"].includes(tier)) return tier;
  return `${tier}${div}`;
}

export async function POST(request: Request) {
  const key = process.env.RIOT_API_KEY;
  if (!key) {
    return NextResponse.json(
      { error: "Riot API key not configured", status: 503 },
      { status: 503, headers: NO_CACHE }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body", status: 400 },
      { status: 400, headers: NO_CACHE }
    );
  }

  const { region, queueType, summonerIds } = (body ?? {}) as {
    region?: string;
    queueType?: "RANKED_SOLO_5x5" | "RANKED_FLEX_SR";
    summonerIds?: string[];
  };

  const platform = (region ?? "na1") as string;
  const targetQueue = queueType ?? "RANKED_SOLO_5x5";
  const ids = Array.isArray(summonerIds)
    ? [...new Set(summonerIds.filter((s): s is string => typeof s === "string" && s.trim().length > 0))]
    : [];

  if (ids.length === 0) {
    return NextResponse.json(
      { badges: {} },
      { status: 200, headers: { "Cache-Control": CDN_CACHE } }
    );
  }

  const badges: Record<string, string | null> = {};

  for (const summonerId of ids) {
    const url = `https://${platform}.api.riotgames.com/lol/league/v4/entries/by-summoner/${encodeURIComponent(summonerId)}`;
    const upstream = await cachedRiotFetch(url);
    const text = await upstream.text();

    let badge: string | null = null;
    if (upstream.ok) {
      try {
        const data = JSON.parse(text) as LeagueEntryDto[] | unknown;
        const list = Array.isArray(data) ? (data as LeagueEntryDto[]) : [];
        const entry = list.find((e) => e.queueType === targetQueue && e.tier && e.rank) ?? null;
        badge = toBadgeText(entry);
      } catch {
        badge = null;
      }
    }
    badges[summonerId] = badge;
  }

  return NextResponse.json(
    { badges },
    { status: 200, headers: { "Cache-Control": CDN_CACHE } }
  );
}
