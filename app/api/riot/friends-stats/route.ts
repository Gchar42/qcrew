import { NextResponse } from "next/server";
import { getRoutingRegion } from "@/lib/riot-regions";
import type { AccountDto, LeagueEntryDto } from "@/types/riot";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const NO_CACHE = { "Cache-Control": "no-store, max-age=0" };
const RIOT_ACCOUNT_BASE = "https://{region}.api.riotgames.com/riot/account/v1";
const RIOT_LEAGUE_BASE = "https://{platform}.api.riotgames.com/lol/league/v4/entries";
const MAX_IDS = 20;

export type FriendStatsItem = {
  riotId: string;
  puuid: string | null;
  soloEntry: LeagueEntryDto | null;
  flexEntry: LeagueEntryDto | null;
};

async function fetchAccount(
  gameName: string,
  tagLine: string,
  region: string,
  key: string
): Promise<AccountDto | null> {
  const routing = getRoutingRegion(region);
  const base = RIOT_ACCOUNT_BASE.replace("{region}", routing);
  const url = `${base}/accounts/by-riot-id/${encodeURIComponent(gameName)}/${encodeURIComponent(tagLine)}`;
  const res = await fetch(url, {
    cache: "no-store",
    headers: { "X-Riot-Token": key },
  });
  if (!res.ok) return null;
  try {
    return (await res.json()) as AccountDto;
  } catch {
    return null;
  }
}

async function fetchLeagueByPuuid(puuid: string, platform: string, key: string): Promise<LeagueEntryDto[]> {
  const base = RIOT_LEAGUE_BASE.replace("{platform}", platform);
  const url = `${base}/by-puuid/${encodeURIComponent(puuid)}`;
  const res = await fetch(url, {
    cache: "no-store",
    headers: { "X-Riot-Token": key },
  });
  if (!res.ok) return [];
  try {
    const data = (await res.json()) as unknown;
    return Array.isArray(data) ? (data as LeagueEntryDto[]) : [];
  } catch {
    return [];
  }
}

export async function GET(request: Request) {
  const key = process.env.RIOT_API_KEY;
  if (!key) {
    return NextResponse.json(
      { error: "Riot API key not configured", status: 503 },
      { status: 503, headers: NO_CACHE }
    );
  }

  const { searchParams } = new URL(request.url);
  const region = (searchParams.get("region") ?? "na1").toLowerCase();
  const riotIdsParam = searchParams.get("riotIds");
  if (!riotIdsParam?.trim()) {
    return NextResponse.json(
      { error: "Missing riotIds (comma-separated GameName#Tag)", status: 400 },
      { status: 400, headers: NO_CACHE }
    );
  }

  const riotIds = riotIdsParam
    .split(",")
    .map((s) => decodeURIComponent(s.trim()))
    .filter((s) => s.includes("#"))
    .slice(0, MAX_IDS);

  const platform = region;
  const results: FriendStatsItem[] = [];

  for (const riotId of riotIds) {
    const [gameName, tagLine] = riotId.split("#").map((s) => s.trim());
    if (!gameName || !tagLine) {
      results.push({ riotId, puuid: null, soloEntry: null, flexEntry: null });
      continue;
    }

    const account = await fetchAccount(gameName, tagLine, region, key);
    if (!account) {
      results.push({ riotId, puuid: null, soloEntry: null, flexEntry: null });
      continue;
    }

    const entries = await fetchLeagueByPuuid(account.puuid, platform, key);
    const soloEntry = entries.find((e) => e.queueType === "RANKED_SOLO_5x5") ?? null;
    const flexEntry = entries.find((e) => e.queueType === "RANKED_FLEX_SR") ?? null;

    results.push({
      riotId: `${account.gameName}#${account.tagLine}`,
      puuid: account.puuid,
      soloEntry,
      flexEntry,
    });
  }

  return NextResponse.json({ friends: results }, { headers: NO_CACHE });
}
