/**
 * Fake Riot data for demo mode when RIOT_API_KEY is not set.
 * Use Riot ID "Demo#NA1" to view the site with fake stats.
 */

import type {
  AccountDto,
  SummonerDto,
  LeagueEntryDto,
  MatchDto,
} from "@/types/riot";

export const DEMO_GAME_NAME = "Demo";
export const DEMO_TAG_LINE = "NA1";
export const DEMO_RIOT_ID = `${DEMO_GAME_NAME}#${DEMO_TAG_LINE}`;
const FAKE_PUUID = "00000000-0000-0000-0000-000000000000";

export function isDemoRiotId(riotId: string): boolean {
  const n = riotId.trim().replace(/\s+/g, " ");
  const parts = n.split("#").map((s) => s.trim().toLowerCase());
  return parts.length === 2 && parts[0] === "demo" && parts[1] === "na1";
}

export function getFakeAccount(region: string): AccountDto {
  return {
    puuid: FAKE_PUUID,
    gameName: DEMO_GAME_NAME,
    tagLine: DEMO_TAG_LINE,
  };
}

/** Champion stat row shape used in profile bundle (matches ChampionStatRow from api). */
type FakeChampionStatRow = {
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

type FakeChampionStatsSlice = { champions: FakeChampionStatRow[]; updatedAt: string };

type FakeProfileBundle = {
  profile: { account: AccountDto; summoner: SummonerDto };
  ranked: { solo: LeagueEntryDto | null; flex: LeagueEntryDto | null };
  matchIds: string[];
  matches: MatchDto[];
  computed: {
    matchCount: number;
    avgKda: string;
    csPerMin: number;
    avgDuration: number;
    avgRankPlayedAgainst: string;
    avgRankRankedCount: number;
  };
  leagueEntriesBySummonerId: Record<string, LeagueEntryDto[]>;
  championStats: { solo: FakeChampionStatsSlice; flex: FakeChampionStatsSlice };
  ddragonVersion: string | null;
};

const DEMO_CHAMPIONS: Array<{ championId: number; championName: string }> = [
  { championId: 157, championName: "Yasuo" },
  { championId: 64, championName: "Lee Sin" },
  { championId: 103, championName: "Ahri" },
  { championId: 236, championName: "Lucian" },
  { championId: 22, championName: "Ashe" },
  { championId: 141, championName: "Kayn" },
  { championId: 78, championName: "Poppy" },
];

function fakeChampionStatsSlice(updatedAt: string): FakeChampionStatsSlice {
  const champions: FakeChampionStatRow[] = [
    { championId: 157, championName: "Yasuo", games: 28, wins: 16, winRate: 57, kills: 8, deaths: 6, assists: 9, kda: 2.83, avgKills: 8.2, avgDeaths: 5.8, avgAssists: 8.5 },
    { championId: 64, championName: "Lee Sin", games: 22, wins: 12, winRate: 55, kills: 7, deaths: 5, assists: 11, kda: 3.6, avgKills: 6.9, avgDeaths: 5.1, avgAssists: 10.2 },
    { championId: 103, championName: "Ahri", games: 18, wins: 10, winRate: 56, kills: 9, deaths: 4, assists: 8, kda: 4.25, avgKills: 8.5, avgDeaths: 4.2, avgAssists: 7.8 },
    { championId: 236, championName: "Lucian", games: 15, wins: 9, winRate: 60, kills: 10, deaths: 5, assists: 6, kda: 3.2, avgKills: 9.8, avgDeaths: 5.2, avgAssists: 6.1 },
    { championId: 22, championName: "Ashe", games: 12, wins: 6, winRate: 50, kills: 7, deaths: 6, assists: 12, kda: 3.17, avgKills: 6.5, avgDeaths: 6.2, avgAssists: 11.5 },
    { championId: 141, championName: "Kayn", games: 10, wins: 6, winRate: 60, kills: 9, deaths: 5, assists: 8, kda: 3.4, avgKills: 8.8, avgDeaths: 5.1, avgAssists: 7.9 },
    { championId: 78, championName: "Poppy", games: 5, wins: 3, winRate: 60, kills: 5, deaths: 4, assists: 10, kda: 3.75, avgKills: 5.2, avgDeaths: 4.0, avgAssists: 9.8 },
  ];
  return { champions, updatedAt };
}

const TOTAL_DEMO_MATCHES = 112;

function buildFakeMatch(
  index: number,
  queue: "solo" | "flex",
  summonerId: string,
  champion: { championId: number; championName: string },
  win: boolean,
  kda: { k: number; d: number; a: number }
): MatchDto {
  const matchId = `NA1_${1700000000 + index}_demo`;
  return {
    metadata: { matchId, participants: [FAKE_PUUID] },
    info: {
      gameDuration: 1600 + (index % 600),
      gameId: 1700000000 + index,
      queueId: queue === "flex" ? 440 : 420,
      gameVersion: "14.6.0",
      participants: [
        {
          puuid: FAKE_PUUID,
          summonerId,
          participantId: 1,
          summonerName: DEMO_GAME_NAME,
          championName: champion.championName,
          championId: champion.championId,
          kills: kda.k,
          deaths: kda.d,
          assists: kda.a,
          win,
          teamId: 100,
          totalMinionsKilled: 160 + (index % 40),
          neutralMinionsKilled: 8 + (index % 8),
        },
        ...Array.from({ length: 9 }, (_, i) => ({
          puuid: `fake-opponent-${index}-${i}`,
          summonerId: `opp-${index}-${i}`,
          participantId: i + 2,
          summonerName: `Player${i + 2}`,
          championName: "Champion",
          championId: 1,
          kills: 5,
          deaths: 6,
          assists: 4,
          win: !win,
          teamId: 200,
          totalMinionsKilled: 150,
          neutralMinionsKilled: 8,
        })),
      ] as MatchDto["info"]["participants"],
    },
  };
}

function buildFakeMatches(queue: "solo" | "flex", summonerId: string): MatchDto[] {
  const matches: MatchDto[] = [];
  for (let i = 0; i < TOTAL_DEMO_MATCHES; i++) {
    const champ = DEMO_CHAMPIONS[i % DEMO_CHAMPIONS.length];
    const win = i % 3 !== 0;
    const kda = { k: 6 + (i % 6), d: 4 + (i % 4), a: 7 + (i % 6) };
    matches.push(buildFakeMatch(i, queue, summonerId, champ, win, kda));
  }
  return matches;
}

export function getFakeProfileBundle(
  region: string,
  queue: "solo" | "flex"
): FakeProfileBundle {
  const account = getFakeAccount(region);
  const updatedAt = new Date().toISOString();
  const summoner: SummonerDto = {
    id: "fake-summoner-id",
    accountId: "fake-account-id",
    puuid: FAKE_PUUID,
    name: DEMO_GAME_NAME,
    profileIconId: 29,
    summonerLevel: 127,
  };
  const soloEntry: LeagueEntryDto | null =
    queue === "solo"
      ? {
          queueType: "RANKED_SOLO_5x5",
          tier: "Gold",
          rank: "II",
          leaguePoints: 67,
          wins: 62,
          losses: 50,
          summonerId: summoner.id,
          summonerName: DEMO_GAME_NAME,
        }
      : null;
  const flexEntry: LeagueEntryDto | null =
    queue === "flex"
      ? {
          queueType: "RANKED_FLEX_SR",
          tier: "Silver",
          rank: "I",
          leaguePoints: 42,
          wins: 58,
          losses: 54,
          summonerId: summoner.id,
          summonerName: DEMO_GAME_NAME,
        }
      : null;

  const matches = buildFakeMatches(queue, summoner.id);
  const matchIds = matches.map((m) => m.metadata.matchId);

  let totalK = 0, totalD = 0, totalA = 0, totalCs = 0, totalSec = 0;
  matches.forEach((m) => {
    const p = m.info.participants.find((x) => x.puuid === FAKE_PUUID);
    if (p) {
      totalK += p.kills ?? 0;
      totalD += p.deaths ?? 0;
      totalA += p.assists ?? 0;
      totalCs += (p.totalMinionsKilled ?? 0) + (p.neutralMinionsKilled ?? 0);
    }
    totalSec += m.info.gameDuration ?? 0;
  });
  const n = matches.length || 1;
  const avgK = Math.round((totalK / n) * 10) / 10;
  const avgD = Math.round((totalD / n) * 10) / 10;
  const avgA = Math.round((totalA / n) * 10) / 10;
  const avgDurationMin = totalSec / 60 / n;
  const avgCsPerMin = totalSec > 0 ? totalCs / (totalSec / 60) : 0;

  return {
    profile: { account, summoner },
    ranked: { solo: soloEntry, flex: flexEntry },
    matchIds,
    matches,
    computed: {
      matchCount: matches.length,
      avgKda: `${avgK}/${avgD}/${avgA}`,
      csPerMin: Math.round(avgCsPerMin * 10) / 10,
      avgDuration: Math.round(avgDurationMin * 10) / 10,
      avgRankPlayedAgainst: "Silver II",
      avgRankRankedCount: 0,
    },
    leagueEntriesBySummonerId: {},
    championStats: {
      solo: fakeChampionStatsSlice(updatedAt),
      flex: fakeChampionStatsSlice(updatedAt),
    },
    ddragonVersion: null,
  };
}
