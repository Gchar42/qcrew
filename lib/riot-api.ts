import { getRoutingRegion } from "@/lib/riot-regions";
import { getCached, setCache } from "@/lib/supabase/route";
import type { MatchDto, SummonerDto } from "@/types/riot";

const key = process.env.RIOT_API_KEY;

function riotFetch(url: string): Promise<Response> {
  if (!key) return Promise.reject(new Error("RIOT_API_KEY not set"));
  return fetch(url, { headers: { "X-Riot-Token": key } });
}

export async function getAccount(
  region: string,
  gameName: string,
  tagLine: string
): Promise<{ puuid: string; gameName: string; tagLine: string } | null> {
  const cacheKey = `account:${region}:${gameName.toLowerCase()}#${tagLine.toLowerCase()}`;
  const cached = await getCached<{ puuid: string; gameName: string; tagLine: string }>(cacheKey);
  if (cached) return cached;

  const routing = getRoutingRegion(region);
  const url = `https://${routing}.api.riotgames.com/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(gameName)}/${encodeURIComponent(tagLine)}`;
  const res = await riotFetch(url);
  if (res.status === 429) throw new Error("Rate limit exceeded");
  if (!res.ok) return null;
  const data = (await res.json()) as { puuid: string; gameName: string; tagLine: string };
  await setCache(cacheKey, data);
  return data;
}

export async function getSummoner(
  region: string,
  puuid: string
): Promise<SummonerDto | null> {
  const url = `https://${region}.api.riotgames.com/lol/summoner/v4/summoners/by-puuid/${encodeURIComponent(puuid)}`;
  const res = await riotFetch(url);
  if (res.status === 429) throw new Error("Rate limit exceeded");
  if (!res.ok) return null;
  return res.json();
}

export async function getMatchIds(region: string, puuid: string, count: number): Promise<string[]> {
  const routing = getRoutingRegion(region);
  const url = `https://${routing}.api.riotgames.com/lol/match/v5/matches/by-puuid/${encodeURIComponent(puuid)}/ids?count=${count}`;
  const res = await riotFetch(url);
  if (res.status === 429) throw new Error("Rate limit exceeded");
  if (!res.ok) return [];
  return res.json();
}

export async function getMatch(
  region: string,
  matchId: string
): Promise<MatchDto | null> {
  const cacheKey = `match:${region}:${matchId}`;
  const cached = await getCached<MatchDto>(cacheKey);
  if (cached) return cached;

  const routing = getRoutingRegion(region);
  const url = `https://${routing}.api.riotgames.com/lol/match/v5/matches/${encodeURIComponent(matchId)}`;
  const res = await riotFetch(url);
  if (res.status === 429) throw new Error("Rate limit exceeded");
  if (!res.ok) return null;
  const data = (await res.json()) as MatchDto;
  await setCache(cacheKey, data);
  return data;
}
