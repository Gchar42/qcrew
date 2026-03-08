/**
 * Fake Riot data for demo mode when RIOT_API_KEY is not set.
 * Use Riot ID "Demo#NA1", "TestW#NA1" (win streak), or "TestL#NA1" (loss streak) to view the site with fake stats.
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
export const FAKE_PUUID = "00000000-0000-0000-0000-000000000000";

export const TEST_W_GAME_NAME = "TestW";
export const TEST_W_TAG_LINE = "NA1";
export const TEST_W_RIOT_ID = `${TEST_W_GAME_NAME}#${TEST_W_TAG_LINE}`;
export const FAKE_PUUID_TEST_W = "00000000-0000-0000-0000-000000000001";

export const TEST_L_GAME_NAME = "TestL";
export const TEST_L_TAG_LINE = "NA1";
export const TEST_L_RIOT_ID = `${TEST_L_GAME_NAME}#${TEST_L_TAG_LINE}`;
export const FAKE_PUUID_TEST_L = "00000000-0000-0000-0000-000000000002";

export function isDemoPuuid(puuid: string): boolean {
  return (puuid ?? "").trim() === FAKE_PUUID;
}

/** True for any fake profile (Demo, TestW, TestL). */
export function isFakePuuid(puuid: string): boolean {
  const p = (puuid ?? "").trim();
  return p === FAKE_PUUID || p === FAKE_PUUID_TEST_W || p === FAKE_PUUID_TEST_L;
}

export function isDemoRiotId(riotId: string): boolean {
  const n = riotId.trim().replace(/\s+/g, " ");
  const parts = n.split("#").map((s) => s.trim().toLowerCase());
  return parts.length === 2 && parts[0] === "demo" && parts[1] === "na1";
}

/** True for any fake profile (Demo#NA1, TestW#NA1, TestL#NA1). */
export function isFakeRiotId(riotId: string): boolean {
  const n = riotId.trim().replace(/\s+/g, " ");
  const parts = n.split("#").map((s) => s.trim().toLowerCase());
  if (parts.length !== 2) return false;
  const [game, tag] = parts;
  return tag === "na1" && (game === "demo" || game === "testw" || game === "testl");
}

export function getFakeAccount(region: string, riotId?: string): AccountDto {
  const n = (riotId ?? "").trim().toLowerCase();
  if (n.includes("#")) {
    const parts = n.split("#").map((s) => s.trim().toLowerCase());
    if (parts.length === 2 && parts[1] === "na1") {
      if (parts[0] === "testw") return { puuid: FAKE_PUUID_TEST_W, gameName: TEST_W_GAME_NAME, tagLine: TEST_W_TAG_LINE };
      if (parts[0] === "testl") return { puuid: FAKE_PUUID_TEST_L, gameName: TEST_L_GAME_NAME, tagLine: TEST_L_TAG_LINE };
    }
  }
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
  recentlyPlayedWith: Array<{
    puuid: string;
    displayName: string;
    riotId: string | null;
    games: number;
    wins: number;
    primaryRole: string;
    roleCounts: Record<string, number>;
  }>;
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

/** Real item IDs (Data Dragon). 6 slots + trinket (index 6). */
const ITEM_POOL: number[][] = [
  [3157, 3089, 3020, 3111, 3026, 3036, 3340], // Zhonya, Rabadon, Frost, Mercs, GA, Runaan, trinket
  [3031, 3078, 3046, 3006, 3026, 3036, 3340], // IE, Trinity, PD, Zerker, GA, Runaan
  [3074, 3124, 3111, 3031, 3046, 3026, 3340], // Ravenous, Guinsoo, Mercs, IE, PD, GA
  [3089, 3157, 3020, 3111, 3026, 3036, 3340], // AP
  [3078, 3046, 3036, 3006, 3026, 3142, 3340], // ADC / Bruiser
  [3074, 3111, 3026, 3046, 3078, 3142, 3340], // Bruiser/tanky
  [3089, 3157, 3020, 3111, 3026, 3036, 3340], // AP
  [3031, 3036, 3046, 3006, 3026, 3074, 3340], // Crit
  [3074, 3078, 3111, 3026, 3046, 3142, 3340], // Bruiser
  [3020, 3157, 3089, 3111, 3026, 3036, 3340], // Support-style
];

/** Opponent champion names and summoner names (varied, not "Champion" / "Player2"). */
const OPPONENT_CHAMPIONS = ["Zed", "Jinx", "Thresh", "Darius", "Elise", "Orianna", "Ezreal", "Leona", "Hecarim"];
const OPPONENT_SUMMONER_NAMES = ["ShadowBlade99", "LaneKingdom", "WardBot", "TopDiff", "JungleGap", "MidOrAFK", "ADCMain", "SupportCarry", "OneTrickPony"];

/** Rank tiers for opponent badges (Iron IV through Grandmaster). */
const RANK_TIERS: Array<{ tier: string; rank: string }> = [
  { tier: "Iron", rank: "IV" }, { tier: "Bronze", rank: "II" }, { tier: "Silver", rank: "I" },
  { tier: "Gold", rank: "III" }, { tier: "Platinum", rank: "II" }, { tier: "Emerald", rank: "IV" },
  { tier: "Diamond", rank: "I" }, { tier: "Master", rank: "" }, { tier: "Grandmaster", rank: "" },
];

type PartStats = {
  kills: number; deaths: number; assists: number;
  totalDamageDealtToChampions: number; damageDealtToObjectives: number; damageDealtToTurrets: number;
  totalMinionsKilled: number; neutralMinionsKilled: number; visionScore: number;
  timeCCingOthers?: number; totalHealsOnTeammates?: number; totalDamageShieldedOnTeammates?: number;
  teamPosition: string;
};

/** Stat lines chosen so getMatchBadges yields different badge types. [0-2] = our player variants; [3-11] = others (Main Character, Team Gap, Slippery, etc.). */
const ARCHETYPE_STATS: PartStats[] = [
  { kills: 10, deaths: 3, assists: 9, totalDamageDealtToChampions: 24000, damageDealtToObjectives: 6000, damageDealtToTurrets: 3500, totalMinionsKilled: 190, neutralMinionsKilled: 12, visionScore: 42, teamPosition: "MIDDLE" }, // 0 our high
  { kills: 6, deaths: 4, assists: 8, totalDamageDealtToChampions: 15000, damageDealtToObjectives: 4000, damageDealtToTurrets: 2000, totalMinionsKilled: 165, neutralMinionsKilled: 10, visionScore: 32, teamPosition: "MIDDLE" }, // 1 our mid (Doing Your Job)
  { kills: 2, deaths: 8, assists: 5, totalDamageDealtToChampions: 7000, damageDealtToObjectives: 1500, damageDealtToTurrets: 700, totalMinionsKilled: 100, neutralMinionsKilled: 6, visionScore: 20, teamPosition: "BOTTOM" }, // 2 our low (Struggle)
  { kills: 14, deaths: 2, assists: 12, totalDamageDealtToChampions: 28000, damageDealtToObjectives: 7500, damageDealtToTurrets: 4000, totalMinionsKilled: 210, neutralMinionsKilled: 15, visionScore: 48, teamPosition: "TOP" }, // 3 Main Character
  { kills: 8, deaths: 4, assists: 10, totalDamageDealtToChampions: 18000, damageDealtToObjectives: 5000, damageDealtToTurrets: 2200, totalMinionsKilled: 175, neutralMinionsKilled: 10, visionScore: 35, teamPosition: "JUNGLE" }, // 4 Doing Your Job
  { kills: 6, deaths: 1, assists: 14, totalDamageDealtToChampions: 16500, damageDealtToObjectives: 4000, damageDealtToTurrets: 2000, totalMinionsKilled: 165, neutralMinionsKilled: 8, visionScore: 38, teamPosition: "MIDDLE" }, // 5 Slippery
  { kills: 2, deaths: 9, assists: 4, totalDamageDealtToChampions: 6500, damageDealtToObjectives: 1200, damageDealtToTurrets: 600, totalMinionsKilled: 95, neutralMinionsKilled: 5, visionScore: 18, teamPosition: "BOTTOM" }, // 6 Struggle
  { kills: 12, deaths: 3, assists: 10, totalDamageDealtToChampions: 26000, damageDealtToObjectives: 7200, damageDealtToTurrets: 3800, totalMinionsKilled: 200, neutralMinionsKilled: 14, visionScore: 45, teamPosition: "TOP" }, // 7 Team Gap
  { kills: 4, deaths: 5, assists: 3, totalDamageDealtToChampions: 11000, damageDealtToObjectives: 3500, damageDealtToTurrets: 1800, totalMinionsKilled: 255, neutralMinionsKilled: 18, visionScore: 28, teamPosition: "MIDDLE" }, // 8 PVE Merchant
  { kills: 5, deaths: 4, assists: 8, totalDamageDealtToChampions: 14000, damageDealtToObjectives: 8200, damageDealtToTurrets: 4200, totalMinionsKilled: 140, neutralMinionsKilled: 6, visionScore: 32, teamPosition: "UTILITY" }, // 9 Where It Counts
  { kills: 4, deaths: 5, assists: 6, totalDamageDealtToChampions: 10500, damageDealtToObjectives: 2800, damageDealtToTurrets: 1400, totalMinionsKilled: 148, neutralMinionsKilled: 7, visionScore: 24, teamPosition: "BOTTOM" }, // 10 Background Character
  { kills: 7, deaths: 11, assists: 5, totalDamageDealtToChampions: 16000, damageDealtToObjectives: 2000, damageDealtToTurrets: 1000, totalMinionsKilled: 130, neutralMinionsKilled: 6, visionScore: 22, teamPosition: "JUNGLE" }, // 11 Limit Testing
  { kills: 11, deaths: 3, assists: 10, totalDamageDealtToChampions: 22000, damageDealtToObjectives: 5500, damageDealtToTurrets: 2800, totalMinionsKilled: 195, neutralMinionsKilled: 12, visionScore: 42, teamPosition: "MIDDLE" }, // 12 strong teammate (impact ~72+, for Carried verdict)
];

function buildParticipant(
  stats: PartStats,
  puuid: string,
  summonerId: string,
  summonerName: string,
  championName: string,
  championId: number,
  teamId: 100 | 200,
  win: boolean,
  participantId: number,
  itemIds: number[]
): MatchDto["info"]["participants"][number] {
  const item0 = itemIds[0] ?? 0, item1 = itemIds[1] ?? 0, item2 = itemIds[2] ?? 0;
  const item3 = itemIds[3] ?? 0, item4 = itemIds[4] ?? 0, item5 = itemIds[5] ?? 0, item6 = itemIds[6] ?? 3340;
  return {
    puuid,
    summonerId,
    participantId,
    summonerName,
    championName,
    championId,
    kills: stats.kills,
    deaths: stats.deaths,
    assists: stats.assists,
    win,
    teamId,
    teamPosition: stats.teamPosition,
    individualPosition: stats.teamPosition,
    totalMinionsKilled: stats.totalMinionsKilled,
    neutralMinionsKilled: stats.neutralMinionsKilled,
    totalDamageDealtToChampions: stats.totalDamageDealtToChampions,
    damageDealtToObjectives: stats.damageDealtToObjectives,
    damageDealtToTurrets: stats.damageDealtToTurrets,
    visionScore: stats.visionScore,
    timeCCingOthers: stats.timeCCingOthers ?? 0,
    totalHealsOnTeammates: stats.totalHealsOnTeammates ?? 0,
    totalDamageShieldedOnTeammates: stats.totalDamageShieldedOnTeammates ?? 0,
    item0, item1, item2, item3, item4, item5, item6,
    riotIdGameName: summonerName,
    riotIdTagline: "NA1",
  };
}

/** "demo" = alternating wins; "win" = blue always wins (our player); "loss" = red always wins. */
export type FakeVariant = "demo" | "win" | "loss";

function getFakeVariantFromPuuid(puuid: string): FakeVariant {
  const p = (puuid ?? "").trim();
  if (p === FAKE_PUUID_TEST_W) return "win";
  if (p === FAKE_PUUID_TEST_L) return "loss";
  return "demo";
}

function getFakeVariantFromRiotId(riotId: string): FakeVariant {
  const parts = riotId.trim().split("#").map((s) => s.trim().toLowerCase());
  if (parts.length === 2 && parts[1] === "na1") {
    if (parts[0] === "testw") return "win";
    if (parts[0] === "testl") return "loss";
  }
  return "demo";
}

function buildFakeMatch(
  index: number,
  queue: "solo" | "flex",
  summonerId: string,
  leagueEntriesBySummonerId: Record<string, LeagueEntryDto[]>,
  ourPuuid: string,
  ourGameName: string,
  variant: FakeVariant
): MatchDto {
  const matchId = `NA1_${1700000000 + index}_demo`;
  const gameDuration = 1750 + (index % 400);
  const blueWins =
    variant === "win" ? true : variant === "loss" ? false : index % 2 === 0;

  const participants: MatchDto["info"]["participants"] = [];
  for (let i = 0; i < 10; i++) {
    const isBlue = i < 5;
    const win = isBlue === blueWins;
    const teamId = (isBlue ? 100 : 200) as 100 | 200;
    let archIndex: number;
    if (index === 0) {
      if (i === 0) archIndex = 3;
      else if (i < 5) archIndex = 12;
      else archIndex = 6;
    } else {
      archIndex = i === 0 ? index % 3 : 3 + ((index + i) % 9);
    }
    const stats = ARCHETYPE_STATS[archIndex] ?? ARCHETYPE_STATS[0];
    const champion = i === 0
      ? DEMO_CHAMPIONS[index % DEMO_CHAMPIONS.length]
      : { championId: 100 + i, championName: OPPONENT_CHAMPIONS[i - 1] };
    const oppSummonerId = `demo-opp-${i}`;
    const puuid = i === 0 ? ourPuuid : `fake-opp-${index}-${i}`;
    const summonerName = i === 0 ? ourGameName : OPPONENT_SUMMONER_NAMES[i - 1];
    const itemIds = ITEM_POOL[(index + i) % ITEM_POOL.length] ?? ITEM_POOL[0];
    participants.push(
      buildParticipant(
        stats,
        puuid,
        i === 0 ? summonerId : oppSummonerId,
        summonerName,
        champion.championName,
        champion.championId,
        teamId,
        win,
        i + 1,
        itemIds
      )
    );
  }

  return {
    metadata: { matchId, participants: participants.map((p) => p.puuid) },
    info: {
      gameDuration,
      gameId: 1700000000 + index,
      queueId: queue === "flex" ? 440 : 420,
      gameVersion: "14.6.0",
      participants,
    },
  };
}

function buildLeagueEntriesForOpponents(): Record<string, LeagueEntryDto[]> {
  const out: Record<string, LeagueEntryDto[]> = {};
  for (let i = 1; i <= 9; i++) {
    const sid = `demo-opp-${i}`;
    const { tier, rank } = RANK_TIERS[i - 1] ?? RANK_TIERS[0];
    const wins = 40 + i * 5;
    const losses = 45 + i * 2;
    out[sid] = [
      {
        queueType: "RANKED_SOLO_5x5",
        tier,
        rank: rank || "I",
        leaguePoints: 50 + i * 8,
        wins,
        losses,
        summonerId: sid,
        summonerName: OPPONENT_SUMMONER_NAMES[i - 1],
      },
      {
        queueType: "RANKED_FLEX_SR",
        tier: RANK_TIERS[9 - i]?.tier ?? "Silver",
        rank: RANK_TIERS[9 - i]?.rank ?? "II",
        leaguePoints: 30,
        wins: 20,
        losses: 22,
        summonerId: sid,
        summonerName: OPPONENT_SUMMONER_NAMES[i - 1],
      },
    ];
  }
  return out;
}

const INITIAL_DEMO_MATCHES = 20;

function buildFakeMatches(
  queue: "solo" | "flex",
  summonerId: string,
  leagueEntriesBySummonerId: Record<string, LeagueEntryDto[]>,
  ourPuuid: string,
  ourGameName: string,
  variant: FakeVariant
): MatchDto[] {
  const matches: MatchDto[] = [];
  for (let i = 0; i < TOTAL_DEMO_MATCHES; i++) {
    matches.push(
      buildFakeMatch(i, queue, summonerId, leagueEntriesBySummonerId, ourPuuid, ourGameName, variant)
    );
  }
  return matches;
}

/** Returns a slice of fake matches for "Show more" (indices [start, start+count)). */
export function getFakeMatchesSlice(
  region: string,
  queue: "solo" | "flex",
  start: number,
  count: number,
  puuid: string
): MatchDto[] {
  const variant = getFakeVariantFromPuuid(puuid);
  const account = getFakeAccount(region, variant === "win" ? TEST_W_RIOT_ID : variant === "loss" ? TEST_L_RIOT_ID : DEMO_RIOT_ID);
  const leagueEntriesBySummonerId = buildLeagueEntriesForOpponents();
  const summonerId = "fake-summoner-id";
  const matches: MatchDto[] = [];
  const end = Math.min(start + count, TOTAL_DEMO_MATCHES);
  for (let i = start; i < end; i++) {
    matches.push(
      buildFakeMatch(i, queue, summonerId, leagueEntriesBySummonerId, account.puuid, account.gameName, variant)
    );
  }
  return matches;
}

export function getFakeProfileBundle(
  region: string,
  queue: "solo" | "flex",
  normRiotId: string
): FakeProfileBundle {
  const account = getFakeAccount(region, normRiotId);
  const variant = getFakeVariantFromRiotId(normRiotId);
  const updatedAt = new Date().toISOString();
  const summoner: SummonerDto = {
    id: "fake-summoner-id",
    accountId: "fake-account-id",
    puuid: account.puuid,
    name: account.gameName,
    profileIconId: 29,
    summonerLevel: 127,
  };
  const soloEntry: LeagueEntryDto = {
    queueType: "RANKED_SOLO_5x5",
    tier: "Gold",
    rank: "II",
    leaguePoints: 67,
    wins: 62,
    losses: 50,
    summonerId: summoner.id,
    summonerName: account.gameName,
  };
  const flexEntry: LeagueEntryDto = {
    queueType: "RANKED_FLEX_SR",
    tier: "Silver",
    rank: "I",
    leaguePoints: 42,
    wins: 58,
    losses: 54,
    summonerId: summoner.id,
    summonerName: account.gameName,
  };

  const leagueEntriesBySummonerId = buildLeagueEntriesForOpponents();
  leagueEntriesBySummonerId[summoner.id] = [soloEntry, flexEntry];
  const allMatches = buildFakeMatches(
    queue,
    summoner.id,
    leagueEntriesBySummonerId,
    account.puuid,
    account.gameName,
    variant
  );
  const matchIds = allMatches.map((m) => m.metadata.matchId);
  const matches = allMatches.slice(0, INITIAL_DEMO_MATCHES);

  let totalK = 0, totalD = 0, totalA = 0, totalCs = 0, totalSec = 0;
  allMatches.forEach((m) => {
    const p = m.info.participants.find((x) => x.puuid === account.puuid);
    if (p) {
      totalK += p.kills ?? 0;
      totalD += p.deaths ?? 0;
      totalA += p.assists ?? 0;
      totalCs += (p.totalMinionsKilled ?? 0) + (p.neutralMinionsKilled ?? 0);
    }
    totalSec += m.info.gameDuration ?? 0;
  });
  const n = allMatches.length || 1;
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
      matchCount: allMatches.length,
      avgKda: `${avgK}/${avgD}/${avgA}`,
      csPerMin: Math.round(avgCsPerMin * 10) / 10,
      avgDuration: Math.round(avgDurationMin * 10) / 10,
      avgRankPlayedAgainst: "Silver II",
      avgRankRankedCount: 9,
    },
    leagueEntriesBySummonerId,
    championStats: {
      solo: fakeChampionStatsSlice(updatedAt),
      flex: fakeChampionStatsSlice(updatedAt),
    },
    ddragonVersion: null,
    recentlyPlayedWith: [],
  };
}
