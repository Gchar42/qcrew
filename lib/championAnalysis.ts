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

export type PersonalBest = {
  label: string;
  value: string;
  detail: string;
};

export type WinCondition = {
  description: string;
  winRate: number;
  games: number;
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

  masteryGrade: string;
  playstyleTitle: string;
  playstyleDescription: string;
  personalBests: PersonalBest[];
  winConditions: WinCondition[];
  oneThingCallout: { stat: string; current: number; target: number; targetRank: string; tip: string };
  betterThanPercent: { stat: string; label: string; percentile: number };
  currentWinStreak: number;
  bestWinStreak: number;
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

  return {
    games: n,
    wins,
    winRate: round((wins / n) * 100),
    avgKda: round((totalKills + totalAssists) / Math.max(1, totalDeaths)),
    avgKills: round(totalKills / n),
    avgDeaths: round(totalDeaths / n),
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
      return (p.teamPosition || p.individualPosition || "") === playerPosition;
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

function getMasteryGrade(avgPercentile: number): string {
  if (avgPercentile >= 95) return "S+";
  if (avgPercentile >= 88) return "S";
  if (avgPercentile >= 80) return "S-";
  if (avgPercentile >= 72) return "A+";
  if (avgPercentile >= 65) return "A";
  if (avgPercentile >= 58) return "A-";
  if (avgPercentile >= 52) return "B+";
  if (avgPercentile >= 46) return "B";
  if (avgPercentile >= 40) return "B-";
  if (avgPercentile >= 34) return "C+";
  if (avgPercentile >= 28) return "C";
  if (avgPercentile >= 22) return "C-";
  if (avgPercentile >= 15) return "D+";
  if (avgPercentile >= 10) return "D";
  return "D-";
}

function getPlaystyle(stats: StatsBlock, comparisons: StatComparison[]): { title: string; description: string } {
  const sorted = [...comparisons].sort((a, b) => b.percentile - a.percentile);
  const best = sorted[0];
  const worst = sorted[sorted.length - 1];

  if (best.stat === "kda" && stats.avgDeaths < 3) return { title: "The Survivor", description: "You rarely die and keep your KDA pristine — a safe, consistent threat" };
  if (best.stat === "damageShare" && stats.avgDamageShare > 25) return { title: "The Carry", description: "You deal a massive share of your team's damage — the primary win condition" };
  if (best.stat === "csPerMin" && stats.avgCsPerMin > 7) return { title: "The Lane King", description: "Your farming is elite — you build gold leads through pure laning" };
  if (best.stat === "visionScore" && stats.avgVisionScore > 25) return { title: "The Tactician", description: "Your vision game sets up everything — you see the map before the fight starts" };
  if (stats.avgKills > 8) return { title: "The Assassin", description: "You rack up kills relentlessly — opponents fear your all-ins" };
  if (stats.winRate >= 60) return { title: "The Winner", description: "No matter the game state, you find a way — your win rate speaks for itself" };
  if (stats.avgAssists > stats.avgKills * 2) return { title: "The Playmaker", description: "You create opportunities for your team — assists show your true impact" };
  if (worst.stat === "visionScore" && best.stat === "kda") return { title: "The Duelist", description: "All mechanics, less macro — you outplay opponents in 1v1s" };
  if (stats.avgDamageShare > 22) return { title: "The Teamfight Terror", description: "When teamfights break out, you're dealing the lion's share of damage" };
  return { title: "The Grinder", description: "Consistent and steady — you put in the games and keep improving" };
}

function computePersonalBests(matches: MatchDto[], puuid: string, championName: string): PersonalBest[] {
  const bests: PersonalBest[] = [];
  let bestKda = 0, bestKdaMatch = "";
  let bestKills = 0, bestKillsMatch = "";
  let bestCs = 0, bestCsMatch = "";

  for (const m of matches) {
    const p = m.info.participants.find((pp) => pp.puuid === puuid && pp.championName === championName);
    if (!p) continue;

    const kda = (p.kills + p.assists) / Math.max(1, p.deaths);
    const durationMin = Math.max(1, m.info.gameDuration / 60);
    const csPerMin = ((p.totalMinionsKilled ?? 0) + (p.neutralMinionsKilled ?? 0)) / durationMin;
    const matchLabel = p.win ? "Victory" : "Defeat";

    if (kda > bestKda) { bestKda = kda; bestKdaMatch = `${p.kills}/${p.deaths}/${p.assists} — ${matchLabel}`; }
    if (p.kills > bestKills) { bestKills = p.kills; bestKillsMatch = `${p.kills}/${p.deaths}/${p.assists} — ${matchLabel}`; }
    if (csPerMin > bestCs) { bestCs = csPerMin; bestCsMatch = `${round(csPerMin)} CS/min — ${matchLabel}`; }
  }

  if (bestKda > 0) bests.push({ label: "Best KDA Game", value: round(bestKda).toFixed(1) + " KDA", detail: bestKdaMatch });
  if (bestKills > 0) bests.push({ label: "Most Kills", value: bestKills + " kills", detail: bestKillsMatch });
  if (bestCs > 0) bests.push({ label: "Best Farming", value: round(bestCs).toFixed(1) + " CS/min", detail: bestCsMatch });

  return bests;
}

function computeStreaks(matches: MatchDto[], puuid: string, championName: string): { current: number; best: number } {
  const sorted = [...matches]
    .filter((m) => m.info.participants.some((p) => p.puuid === puuid && p.championName === championName))
    .sort((a, b) => (b.info.gameEndTimestamp ?? 0) - (a.info.gameEndTimestamp ?? 0));

  let current = 0, best = 0, streak = 0;
  let countedCurrent = false;

  for (const m of sorted) {
    const p = m.info.participants.find((pp) => pp.puuid === puuid)!;
    if (p.win) {
      streak++;
      if (!countedCurrent) current = streak;
    } else {
      if (!countedCurrent) { countedCurrent = true; current = streak; }
      best = Math.max(best, streak);
      streak = 0;
    }
  }
  best = Math.max(best, streak);
  if (!countedCurrent) current = streak;

  return { current, best };
}

function computeWinConditions(matches: MatchDto[], puuid: string, championName: string): WinCondition[] {
  const conditions: WinCondition[] = [];

  const champMatches = matches.filter((m) =>
    m.info.participants.some((p) => p.puuid === puuid && p.championName === championName)
  );

  // High CS games
  let highCsGames = 0, highCsWins = 0;
  let lowDeathGames = 0, lowDeathWins = 0;
  let highDmgGames = 0, highDmgWins = 0;

  for (const m of champMatches) {
    const p = m.info.participants.find((pp) => pp.puuid === puuid)!;
    const durationMin = Math.max(1, m.info.gameDuration / 60);
    const csPerMin = ((p.totalMinionsKilled ?? 0) + (p.neutralMinionsKilled ?? 0)) / durationMin;

    if (csPerMin >= 6.5) { highCsGames++; if (p.win) highCsWins++; }
    if (p.deaths <= 3) { lowDeathGames++; if (p.win) lowDeathWins++; }

    const teamDamage = m.info.participants
      .filter((tp) => tp.teamId === p.teamId)
      .reduce((sum, tp) => sum + (tp.totalDamageDealtToChampions ?? 0), 0);
    const dmgShare = teamDamage > 0 ? ((p.totalDamageDealtToChampions ?? 0) / teamDamage) * 100 : 20;
    if (dmgShare >= 25) { highDmgGames++; if (p.win) highDmgWins++; }
  }

  if (highCsGames >= 2) conditions.push({ description: "When you farm 6.5+ CS/min", winRate: round((highCsWins / highCsGames) * 100), games: highCsGames });
  if (lowDeathGames >= 2) conditions.push({ description: "When you die 3 or fewer times", winRate: round((lowDeathWins / lowDeathGames) * 100), games: lowDeathGames });
  if (highDmgGames >= 2) conditions.push({ description: "When you deal 25%+ team damage", winRate: round((highDmgWins / highDmgGames) * 100), games: highDmgGames });

  return conditions.sort((a, b) => b.winRate - a.winRate);
}

const TIER_TARGETS: Record<string, string> = {
  IRON: "BRONZE", BRONZE: "SILVER", SILVER: "GOLD", GOLD: "PLATINUM",
  PLATINUM: "EMERALD", EMERALD: "DIAMOND", DIAMOND: "MASTER",
  MASTER: "GRANDMASTER", GRANDMASTER: "CHALLENGER",
};

const STAT_TIPS: Record<string, string> = {
  csPerMin: "That's roughly 1 extra minion per wave — focus on not missing cannons",
  kda: "Try trading more aggressively when you have item advantage, and respect enemy cooldowns",
  visionScore: "Drop a ward every time you back, and sweep before objectives",
  damageShare: "Look for more poke in lane and position aggressively in teamfights",
  winRate: "Focus on consistent play — fewer throws, better objective calls",
};

function getOneThingCallout(
  comparisons: StatComparison[],
  tier: string
): { stat: string; current: number; target: number; targetRank: string; tip: string } {
  const nextTier = TIER_TARGETS[tier.toUpperCase()] ?? "DIAMOND";
  const nextBench = getBenchmark(nextTier);

  const gaps = comparisons
    .map((c) => {
      const benchKey = c.stat as keyof BenchmarkRow;
      const target = nextBench[benchKey] ?? 0;
      return { ...c, target, gap: target - c.playerValue };
    })
    .filter((g) => g.gap > 0)
    .sort((a, b) => {
      const aRatio = a.gap / Math.max(0.01, a.target);
      const bRatio = b.gap / Math.max(0.01, b.target);
      return bRatio - aRatio;
    });

  const biggest = gaps[0] ?? { stat: "csPerMin", playerValue: 5, target: 6, label: "CS/min" };
  const rankLabel = nextTier === "GRANDMASTER" ? "Grandmaster"
    : nextTier === "CHALLENGER" ? "Challenger"
    : nextTier.charAt(0) + nextTier.slice(1).toLowerCase();

  return {
    stat: biggest.stat,
    current: biggest.playerValue,
    target: biggest.target,
    targetRank: rankLabel,
    tip: STAT_TIPS[biggest.stat] ?? "Focus on this stat in your next 10 games",
  };
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
  const masteryGrade = getMasteryGrade(avgPercentile);

  const csChange = recentBlock.avgCsPerMin - (previousBlock.games > 0 ? previousBlock.avgCsPerMin : recentBlock.avgCsPerMin);
  const kdaChange = recentBlock.avgKda - (previousBlock.games > 0 ? previousBlock.avgKda : recentBlock.avgKda);
  const wrChange = recentBlock.winRate - (previousBlock.games > 0 ? previousBlock.winRate : recentBlock.winRate);

  const trendScore = (csChange + kdaChange * 0.5 + wrChange * 0.3) / 3;
  const trend = previousBlock.games >= 5 ? getTrend(trendScore, 0) : "plateauing";

  const allMatchups = computeMatchups(sorted, puuid, championName);
  const bestMatchups = [...allMatchups].sort((a, b) => b.winRate - a.winRate).slice(0, 3);
  const worstMatchups = [...allMatchups].sort((a, b) => a.winRate - b.winRate).slice(0, 3);

  const playstyle = getPlaystyle(overall, comparisons);
  const personalBests = computePersonalBests(matches, puuid, championName);
  const winConditions = computeWinConditions(matches, puuid, championName);
  const oneThingCallout = getOneThingCallout(comparisons, benchmarkTier);
  const streaks = computeStreaks(matches, puuid, championName);

  const bestStat = [...comparisons].sort((a, b) => b.percentile - a.percentile)[0];

  return {
    championName, riotId, region,
    tier: benchmarkTier, rank,
    overall, recentBlock, previousBlock,
    trend,
    trendDetails: { csPerMinChange: round(csChange), kdaChange: round(kdaChange), winRateChange: round(wrChange) },
    comparisons, avgPercentile, equivalentRank,
    bestMatchups, worstMatchups,
    benchmarkTier, totalGamesAnalyzed: sorted.length,
    masteryGrade,
    playstyleTitle: playstyle.title,
    playstyleDescription: playstyle.description,
    personalBests,
    winConditions,
    oneThingCallout,
    betterThanPercent: { stat: bestStat.stat, label: bestStat.label, percentile: bestStat.percentile },
    currentWinStreak: streaks.current,
    bestWinStreak: streaks.best,
  };
}

function buildComparisons(stats: StatsBlock, benchmark: BenchmarkRow, tier: string): StatComparison[] {
  const rows: StatComparison[] = [
    { stat: "csPerMin", label: "CS / min", playerValue: stats.avgCsPerMin, benchmark: benchmark.csPerMin, percentile: getPercentile(stats.avgCsPerMin, "csPerMin", tier), status: "good" },
    { stat: "kda", label: "KDA", playerValue: stats.avgKda, benchmark: benchmark.kda, percentile: getPercentile(stats.avgKda, "kda", tier), status: "good" },
    { stat: "visionScore", label: "Vision Score", playerValue: stats.avgVisionScore, benchmark: benchmark.visionScore, percentile: getPercentile(stats.avgVisionScore, "visionScore", tier), status: "good" },
    { stat: "damageShare", label: "Damage Share", playerValue: stats.avgDamageShare, benchmark: benchmark.damageShare, percentile: getPercentile(stats.avgDamageShare, "damageShare", tier), status: "good" },
    { stat: "winRate", label: "Win Rate", playerValue: stats.winRate, benchmark: benchmark.winRate, percentile: getPercentile(stats.winRate, "winRate", tier), status: "good" },
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
