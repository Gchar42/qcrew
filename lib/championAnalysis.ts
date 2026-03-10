import type { MatchDto } from "@/types/riot";
import { getBenchmark, getPercentile, getEquivalentRank, getTrend } from "./championBenchmarks";
import type { BenchmarkRow } from "./championBenchmarks";

export type MatchupRecord = {
  opponentChampion: string;
  games: number;
  wins: number;
  winRate: number;
};

export type StatsBlock = {
  games: number;
  wins: number;
  winRate: number;
  avgKda: number;
  avgKills: number;
  avgDeaths: number;
  avgAssists: number;
  avgCsPerMin: number;
  avgVisionScore: number;
  avgDamageShare: number;
  avgGoldPerMin: number;
};

export type StatComparison = {
  stat: string;
  label: string;
  playerValue: number;
  benchmark: number;
  percentile: number;
  status: "good" | "warning" | "bad";
};

export type ChampionAnalysisData = {
  championName: string;
  riotId: string;
  region: string;
  tier: string;
  rank: string;

  overall: StatsBlock;
  recentBlock: StatsBlock;
  previousBlock: StatsBlock;

  trend: "improving" | "plateauing" | "declining";
  trendDetails: {
    csPerMinChange: number;
    kdaChange: number;
    winRateChange: number;
  };

  comparisons: StatComparison[];
  avgPercentile: number;
  equivalentRank: string;

  bestMatchups: MatchupRecord[];
  worstMatchups: MatchupRecord[];

  benchmarkTier: string;
  totalGamesAnalyzed: number;
};

function computeStatsBlock(
  matches: MatchDto[],
  puuid: string,
  championName: string
): StatsBlock {
  const filtered = matches.filter((m) => {
    const p = m.info.participants.find((pp) => pp.puuid === puuid);
    return p && p.championName === championName;
  });

  if (filtered.length === 0) {
    return {
      games: 0, wins: 0, winRate: 0,
      avgKda: 0, avgKills: 0, avgDeaths: 0, avgAssists: 0,
      avgCsPerMin: 0, avgVisionScore: 0, avgDamageShare: 0, avgGoldPerMin: 0,
    };
  }

  let totalKills = 0, totalDeaths = 0, totalAssists = 0;
  let totalCsPerMin = 0, totalVisionScore = 0, totalDamageShare = 0;
  let totalGoldPerMin = 0, wins = 0;

  for (const m of filtered) {
    const p = m.info.participants.find((pp) => pp.puuid === puuid)!;
    const durationMin = Math.max(1, m.info.gameDuration / 60);

    totalKills += p.kills;
    totalDeaths += p.deaths;
    totalAssists += p.assists;
    wins += p.win ? 1 : 0;

    const cs = (p.totalMinionsKilled ?? 0) + (p.neutralMinionsKilled ?? 0);
    totalCsPerMin += cs / durationMin;
    totalVisionScore += p.visionScore ?? 0;

    const teamDamage = m.info.participants
      .filter((tp) => tp.teamId === p.teamId)
      .reduce((sum, tp) => sum + (tp.totalDamageDealtToChampions ?? 0), 0);
    const playerDamage = p.totalDamageDealtToChampions ?? 0;
    totalDamageShare += teamDamage > 0 ? (playerDamage / teamDamage) * 100 : 20;

    const totalGold = (p.kills * 300 + p.assists * 150 + cs * 20);
    totalGoldPerMin += totalGold / durationMin;
  }

  const n = filtered.length;
  const avgDeaths = totalDeaths / n;

  return {
    games: n,
    wins,
    winRate: round((wins / n) * 100),
    avgKda: round((totalKills + totalAssists) / Math.max(1, totalDeaths)),
    avgKills: round(totalKills / n),
    avgDeaths: round(avgDeaths),
    avgAssists: round(totalAssists / n),
    avgCsPerMin: round(totalCsPerMin / n),
    avgVisionScore: round(totalVisionScore / n),
    avgDamageShare: round(totalDamageShare / n),
    avgGoldPerMin: round(totalGoldPerMin / n),
  };
}

function computeMatchups(
  matches: MatchDto[],
  puuid: string,
  championName: string
): MatchupRecord[] {
  const matchupMap = new Map<string, { games: number; wins: number }>();

  for (const m of matches) {
    const player = m.info.participants.find(
      (p) => p.puuid === puuid && p.championName === championName
    );
    if (!player) continue;

    const playerPosition = player.teamPosition || player.individualPosition || "";

    const opponents = m.info.participants.filter((p) => {
      if (p.teamId === player.teamId) return false;
      if (!playerPosition) return false;
      const oppPos = p.teamPosition || p.individualPosition || "";
      return oppPos === playerPosition;
    });

    for (const opp of opponents) {
      const entry = matchupMap.get(opp.championName) ?? { games: 0, wins: 0 };
      entry.games++;
      if (player.win) entry.wins++;
      matchupMap.set(opp.championName, entry);
    }
  }

  return Array.from(matchupMap.entries())
    .filter(([, v]) => v.games >= 2)
    .map(([champion, v]) => ({
      opponentChampion: champion,
      games: v.games,
      wins: v.wins,
      winRate: round((v.wins / v.games) * 100),
    }))
    .sort((a, b) => b.games - a.games);
}

export function computeChampionAnalysis(
  matches: MatchDto[],
  puuid: string,
  championName: string,
  riotId: string,
  region: string,
  tier: string,
  rank: string
): ChampionAnalysisData {
  const champMatches = matches.filter((m) =>
    m.info.participants.some((p) => p.puuid === puuid && p.championName === championName)
  );

  const sorted = [...champMatches].sort((a, b) => {
    const tA = a.info.gameEndTimestamp ?? 0;
    const tB = b.info.gameEndTimestamp ?? 0;
    return tB - tA;
  });

  const recentMatches = sorted.slice(0, 20);
  const previousMatches = sorted.slice(20, 40);

  const overall = computeStatsBlock(sorted, puuid, championName);
  const recentBlock = computeStatsBlock(recentMatches, puuid, championName);
  const previousBlock = computeStatsBlock(previousMatches, puuid, championName);

  const benchmarkTier = tier.toUpperCase() || "GOLD";
  const benchmark = getBenchmark(benchmarkTier);

  const comparisons = buildComparisons(overall, benchmark, benchmarkTier);
  const avgPercentile = Math.round(
    comparisons.reduce((s, c) => s + c.percentile, 0) / Math.max(1, comparisons.length)
  );
  const equivalentRank = getEquivalentRank(avgPercentile);

  const csChange = recentBlock.avgCsPerMin - (previousBlock.games > 0 ? previousBlock.avgCsPerMin : recentBlock.avgCsPerMin);
  const kdaChange = recentBlock.avgKda - (previousBlock.games > 0 ? previousBlock.avgKda : recentBlock.avgKda);
  const wrChange = recentBlock.winRate - (previousBlock.games > 0 ? previousBlock.winRate : recentBlock.winRate);

  const trendScore = (csChange + kdaChange * 0.5 + wrChange * 0.3) / 3;
  const trend = previousBlock.games >= 5
    ? getTrend(trendScore, 0)
    : "plateauing";

  const allMatchups = computeMatchups(sorted, puuid, championName);
  const bestMatchups = [...allMatchups].sort((a, b) => b.winRate - a.winRate).slice(0, 3);
  const worstMatchups = [...allMatchups].sort((a, b) => a.winRate - b.winRate).slice(0, 3);

  return {
    championName,
    riotId,
    region,
    tier: benchmarkTier,
    rank,
    overall,
    recentBlock,
    previousBlock,
    trend,
    trendDetails: {
      csPerMinChange: round(csChange),
      kdaChange: round(kdaChange),
      winRateChange: round(wrChange),
    },
    comparisons,
    avgPercentile,
    equivalentRank,
    bestMatchups,
    worstMatchups,
    benchmarkTier,
    totalGamesAnalyzed: sorted.length,
  };
}

function buildComparisons(
  stats: StatsBlock,
  benchmark: BenchmarkRow,
  tier: string
): StatComparison[] {
  const rows: StatComparison[] = [
    {
      stat: "csPerMin", label: "CS / min",
      playerValue: stats.avgCsPerMin, benchmark: benchmark.csPerMin,
      percentile: getPercentile(stats.avgCsPerMin, "csPerMin", tier),
      status: "good",
    },
    {
      stat: "kda", label: "KDA",
      playerValue: stats.avgKda, benchmark: benchmark.kda,
      percentile: getPercentile(stats.avgKda, "kda", tier),
      status: "good",
    },
    {
      stat: "visionScore", label: "Vision Score",
      playerValue: stats.avgVisionScore, benchmark: benchmark.visionScore,
      percentile: getPercentile(stats.avgVisionScore, "visionScore", tier),
      status: "good",
    },
    {
      stat: "damageShare", label: "Damage Share",
      playerValue: stats.avgDamageShare, benchmark: benchmark.damageShare,
      percentile: getPercentile(stats.avgDamageShare, "damageShare", tier),
      status: "good",
    },
    {
      stat: "winRate", label: "Win Rate",
      playerValue: stats.winRate, benchmark: benchmark.winRate,
      percentile: getPercentile(stats.winRate, "winRate", tier),
      status: "good",
    },
  ];

  for (const row of rows) {
    if (row.percentile >= 60) row.status = "good";
    else if (row.percentile >= 40) row.status = "warning";
    else row.status = "bad";
  }

  return rows;
}

function round(n: number): number {
  return Math.round(n * 100) / 100;
}
