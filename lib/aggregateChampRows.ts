/**
 * Pure aggregation of champion stats from match list. Used by API and client; no Riot calls.
 */
const SOLO = 420;
const FLEX = 440;

export type ChampRow = {
  championId: number;
  championName: string;
  championIcon: string;
  games: number;
  wins: number;
  winRate: number;
  kda: number;
  kills: number;
  deaths: number;
  assists: number;
};

export function aggregateChampRows(
  matches: unknown[],
  puuid: string,
  queue: string
): ChampRow[] {
  const agg = new Map<
    number,
    {
      championId: number;
      championName: string;
      games: number;
      wins: number;
      kills: number;
      deaths: number;
      assists: number;
    }
  >();

  for (const match of matches) {
    if (!match || typeof match !== "object") continue;
    const info = (match as { info?: { queueId?: number; participants?: unknown[] } }).info;
    if (!info?.participants || !Array.isArray(info.participants)) continue;
    if (queue === "solo" && info.queueId !== SOLO) continue;
    if (queue === "flex" && info.queueId !== FLEX) continue;

    const me = info.participants.find((p: unknown) => (p as { puuid?: string })?.puuid === puuid) as
      | { championId?: number; championName?: string; win?: boolean; kills?: number; deaths?: number; assists?: number }
      | undefined;
    if (!me) continue;

    const champ = Number(me.championId ?? 0);
    if (!champ) continue;
    const championName =
      typeof me.championName === "string" ? me.championName : `Champion ${champ}`;

    if (!agg.has(champ)) {
      agg.set(champ, {
        championId: champ,
        championName,
        games: 0,
        wins: 0,
        kills: 0,
        deaths: 0,
        assists: 0,
      });
    }
    const c = agg.get(champ)!;
    if (!c.championName || c.championName.startsWith("Champion ")) c.championName = championName;
    c.games++;
    if (me.win) c.wins++;
    c.kills += Number(me.kills ?? 0);
    c.deaths += Number(me.deaths ?? 0);
    c.assists += Number(me.assists ?? 0);
  }

  const rows: ChampRow[] = [...agg.values()].map((c) => {
    const kda = (c.kills + c.assists) / Math.max(1, c.deaths);
    const winRate = c.games ? (c.wins / c.games) * 100 : 0;
    return {
      championId: c.championId,
      championName: c.championName,
      championIcon: c.championName,
      games: c.games,
      wins: c.wins,
      winRate,
      kda,
      kills: c.kills / c.games,
      deaths: c.deaths / c.games,
      assists: c.assists / c.games,
    };
  });
  rows.sort((a, b) => b.games - a.games);
  return rows;
}
