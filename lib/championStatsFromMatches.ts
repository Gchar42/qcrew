import type { MatchDto } from "@/types/riot";

export type ChampionStatRow = {
  championId: number;
  championName: string;
  games: number;
  wins: number;
  winRate: number;
  kills: number;
  deaths: number;
  assists: number;
  kda: number;
  avgKills: number;
  avgDeaths: number;
  avgAssists: number;
};

/**
 * Compute champion aggregate stats from a list of matches for one puuid.
 * Used to show champion stats instantly from the profile's already-fetched matches
 * instead of waiting for the full background refresh.
 */
export function computeChampionStatsFromMatches(
  matches: MatchDto[],
  puuid: string
): ChampionStatRow[] {
  const agg = new Map<
    number,
    { games: number; wins: number; kills: number; deaths: number; assists: number; championName: string }
  >();

  for (const dto of matches) {
    const participants = dto?.info?.participants;
    if (!participants) continue;
    const p = participants.find((x) => x.puuid === puuid);
    if (!p) continue;
    const cid = p.championId ?? 0;
    if (!cid) continue;
    const name = p.championName ?? `Champion ${cid}`;
    if (!agg.has(cid)) {
      agg.set(cid, { games: 0, wins: 0, kills: 0, deaths: 0, assists: 0, championName: name });
    }
    const c = agg.get(cid)!;
    c.games++;
    if (p.win) c.wins++;
    c.kills += p.kills ?? 0;
    c.deaths += p.deaths ?? 0;
    c.assists += p.assists ?? 0;
    if (c.championName.startsWith("Champion ")) c.championName = name;
  }

  const champions: ChampionStatRow[] = [...agg.entries()].map(([championId, c]) => {
    const winRate = c.games ? Math.round((c.wins / c.games) * 100) : 0;
    const kda = (c.kills + c.assists) / Math.max(1, c.deaths);
    return {
      championId,
      championName: c.championName,
      games: c.games,
      wins: c.wins,
      winRate,
      kills: c.kills,
      deaths: c.deaths,
      assists: c.assists,
      kda: Math.round(kda * 100) / 100,
      avgKills: Math.round((c.kills / c.games) * 100) / 100,
      avgDeaths: Math.round((c.deaths / c.games) * 100) / 100,
      avgAssists: Math.round((c.assists / c.games) * 100) / 100,
    };
  });

  champions.sort((a, b) => {
    if (b.games !== a.games) return b.games - a.games;
    if (b.winRate !== a.winRate) return b.winRate - a.winRate;
    return b.kda - a.kda;
  });

  return champions;
}
