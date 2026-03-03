import { NextResponse } from "next/server";
import { cachedRiotFetch } from "@/lib/cachedRiotFetch";
import type { LeagueEntryDto } from "@/types/riot";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const NO_CACHE = { "Cache-Control": "no-store, max-age=0" };
const CDN_CACHE = "public, s-maxage=3600, stale-while-revalidate=86400";
const BADGE_TTL_MS = 12 * 60 * 60 * 1000; // 12 hours

type CacheEntry = { value: string | null; expiresAt: number };

// In-memory cache keyed by `${platform}:${queueType}:${summonerId}`
const badgeCache = new Map<string, CacheEntry>();

function tierAbbrev(tier: string): string {
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

function divisionNumber(rank: string | undefined): string {
  const r = (rank ?? "").toUpperCase();
  if (r === "I") return "1";
  if (r === "II") return "2";
  if (r === "III") return "3";
  if (r === "IV") return "4";
  return "";
}

function toBadge(entry: LeagueEntryDto | null | undefined): string | null {
  if (!entry?.tier || !entry.rank) return null;
  const t = tierAbbrev(entry.tier);
  const d = divisionNumber(entry.rank);
  return `${t}${d}`;
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

  const { region, queue, summonerIds } = (body ?? {}) as {
    region?: string;
    queue?: "solo" | "flex" | string;
    summonerIds?: string[];
  };

  const platform = (region ?? "na1") as string;
  const ids = Array.isArray(summonerIds)
    ? summonerIds.filter((s) => typeof s === "string" && s.trim().length > 0)
    : [];

  if (ids.length === 0) {
    return NextResponse.json(
      { badges: {} },
      { status: 200, headers: { "Cache-Control": CDN_CACHE } }
    );
  }

  const targetQueueType =
    queue === "flex" ? "RANKED_FLEX_SR" : "RANKED_SOLO_5x5";

  const now = Date.now();
  const badges: Record<string, string | null> = {};
  const toFetch: string[] = [];

  for (const rawId of new Set(ids)) {
    const summonerId = rawId.trim();
    const cacheKey = `${platform}:${targetQueueType}:${summonerId}`;
    const cached = badgeCache.get(cacheKey);
    if (cached && cached.expiresAt > now) {
      badges[summonerId] = cached.value;
    } else {
      toFetch.push(summonerId);
    }
  }

  for (const summonerId of toFetch) {
    const riotUrl = `https://${platform}.api.riotgames.com/lol/league/v4/entries/by-summoner/${encodeURIComponent(
      summonerId
    )}`;
    const upstream = await cachedRiotFetch(riotUrl);
    const text = await upstream.text();

    let badge: string | null = null;

    if (upstream.ok) {
      try {
        const data = JSON.parse(text) as LeagueEntryDto[] | unknown;
        const list = Array.isArray(data) ? (data as LeagueEntryDto[]) : [];
        const entry =
          list.find(
            (e) => e.queueType === targetQueueType && e.tier && e.rank
          ) ?? null;
        badge = toBadge(entry);
      } catch {
        badge = null;
      }
    } else {
      badge = null;
    }

    const cacheKey = `${platform}:${targetQueueType}:${summonerId}`;
    badgeCache.set(cacheKey, { value: badge, expiresAt: now + BADGE_TTL_MS });
    badges[summonerId] = badge;
  }

  return NextResponse.json(
    { badges },
    { status: 200, headers: { "Cache-Control": CDN_CACHE } }
  );
}

