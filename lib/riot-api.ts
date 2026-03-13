import { getRoutingRegion } from "@/lib/riot-regions";
import { getCached, setCache } from "@/lib/supabase/route";
import { getFakeAccount, isFakeRiotId } from "@/lib/fakeRiotData";
import type { MatchDto, SummonerDto } from "@/types/riot";

const key = process.env.RIOT_API_KEY;

function riotFetch(url: string): Promise<Response> {
  if (!key) return Promise.reject(new Error("RIOT_API_KEY not set"));
  return fetch(url, { cache: "no-store", headers: { "X-Riot-Token": key } });
}

async function throwIfNotOk(res: Response): Promise<void> {
  if (res.ok) return;
  const text = await res.text();
  let msg = text;
  try {
    const j = JSON.parse(text) as { error?: string; message?: string };
    msg = j.error ?? j.message ?? text;
  } catch {
    // use text as-is
  }
  const err = new Error(`Riot API error ${res.status} ${msg}`) as Error & {
    status?: number;
  };
  err.status = res.status;
  throw err;
}

export async function getAccount(
  region: string,
  gameName: string,
  tagLine: string
): Promise<{ puuid: string; gameName: string; tagLine: string } | null> {
  const riotId = `${gameName}#${tagLine}`;
  if (!key && isFakeRiotId(riotId)) return getFakeAccount(region, riotId);
  if (!key) return null;

  const cacheKey = `account:${region}:${gameName.toLowerCase()}#${tagLine.toLowerCase()}`;
  const cached = await getCached<{ puuid: string; gameName: string; tagLine: string }>(cacheKey);
  if (cached) return cached;

  const routing = getRoutingRegion(region);
  const url = `https://${routing}.api.riotgames.com/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(gameName)}/${encodeURIComponent(tagLine)}`;
  const res = await riotFetch(url);
  await throwIfNotOk(res);
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
  await throwIfNotOk(res);
  return res.json();
}

export async function getMatchIds(region: string, puuid: string, count: number): Promise<string[]> {
  const routing = getRoutingRegion(region);
  const url = `https://${routing}.api.riotgames.com/lol/match/v5/matches/by-puuid/${encodeURIComponent(puuid)}/ids?count=${count}`;
  const res = await riotFetch(url);
  await throwIfNotOk(res);
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
  await throwIfNotOk(res);
  const data = (await res.json()) as MatchDto;
  await setCache(cacheKey, data);
  return data;
}

export interface MatchTimelineDto {
  metadata: { matchId: string; participants: string[] };
  info: {
    frameInterval: number;
    frames: {
      timestamp: number;
      participantFrames: Record<
        string,
        {
          participantId: number;
          jungleMinionsKilled: number;
          currentGold: number;
          totalGold: number;
          position: { x: number; y: number };
          currentHealth?: number;
          maxHealth?: number;
        }
      >;
      events: {
        type: string;
        timestamp: number;
        killerId?: number;
        monsterType?: string;
        monsterSubType?: string;
        position?: { x: number; y: number };
        [k: string]: unknown;
      }[];
    }[];
  };
}

export async function getMatchTimeline(
  region: string,
  matchId: string,
): Promise<MatchTimelineDto | null> {
  const cacheKey = `timeline:${region}:${matchId}`;
  const cached = await getCached<MatchTimelineDto>(cacheKey);
  if (cached) return cached;

  const routing = getRoutingRegion(region);
  const url = `https://${routing}.api.riotgames.com/lol/match/v5/matches/${encodeURIComponent(matchId)}/timeline`;
  const res = await riotFetch(url);
  if (res.status === 404) return null;
  await throwIfNotOk(res);
  const data = (await res.json()) as MatchTimelineDto;
  await setCache(cacheKey, data);
  return data;
}
