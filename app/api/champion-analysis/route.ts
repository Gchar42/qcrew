import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type StatsBlock = {
  games: number; wins: number; winRate: number;
  avgKda: number; avgKills: number; avgDeaths: number; avgAssists: number;
  avgCsPerMin: number; avgVisionScore: number; avgDamageShare: number; avgGoldPerMin: number;
};

type StatComparison = {
  stat: string; label: string; playerValue: number; benchmark: number;
  percentile: number; status: "good" | "warning" | "bad";
};

type MatchupRecord = { opponentChampion: string; games: number; wins: number; winRate: number };
type PersonalBest = { label: string; value: string; detail: string };
type WinCondition = { description: string; winRate: number; games: number };

type AnalysisData = {
  championName: string; riotId: string; region: string; tier: string; rank: string;
  overall: StatsBlock; recentBlock: StatsBlock; previousBlock: StatsBlock;
  trend: "improving" | "plateauing" | "declining";
  trendDetails: { csPerMinChange: number; kdaChange: number; winRateChange: number };
  comparisons: StatComparison[]; avgPercentile: number; equivalentRank: string;
  bestMatchups: MatchupRecord[]; worstMatchups: MatchupRecord[];
  benchmarkTier: string; totalGamesAnalyzed: number;
  masteryGrade: string; playstyleTitle: string; playstyleDescription: string;
  personalBests: PersonalBest[]; winConditions: WinCondition[];
  oneThingCallout: { stat: string; current: number; target: number; targetRank: string; tip: string };
  betterThanPercent: { stat: string; label: string; percentile: number };
  currentWinStreak: number; bestWinStreak: number;
};

// Champion archetypes drive realistic mock data
const AP_MAGES = ["Ahri", "Syndra", "Orianna", "Lux", "Veigar", "Viktor", "Anivia", "Xerath", "Ziggs", "Brand", "Malzahar", "Annie", "Cassiopeia", "Azir", "Ryze"];
const AD_CARRIES = ["Jinx", "Caitlyn", "Vayne", "Kaisa", "Ezreal", "Jhin", "MissFortune", "Aphelios", "Xayah", "Lucian", "Draven", "Tristana", "Sivir", "Ashe", "Twitch"];
const ASSASSINS = ["Yasuo", "Yone", "Zed", "Talon", "Katarina", "Akali", "Fizz", "LeBlanc", "Qiyana", "Ekko", "Irelia", "Sylas"];
const TANKS = ["Ornn", "Maokai", "Malphite", "Sion", "Chogath", "Shen", "Nautilus", "Leona", "Braum", "TahmKench", "Zac", "Sejuani", "Amumu"];
const SUPPORTS = ["Thresh", "Lulu", "Nami", "Janna", "Soraka", "Yuumi", "Senna", "Karma", "Morgana", "Zyra", "Bard", "Rakan"];
const FIGHTERS = ["Darius", "Garen", "Jax", "Riven", "Fiora", "Camille", "Renekton", "Aatrox", "Mordekaiser", "Sett", "Wukong"];

function getArchetype(name: string): string {
  const n = name.replace(/[^a-zA-Z]/g, "");
  if (AP_MAGES.some(c => c.toLowerCase() === n.toLowerCase())) return "ap_mage";
  if (AD_CARRIES.some(c => c.toLowerCase() === n.toLowerCase())) return "ad_carry";
  if (ASSASSINS.some(c => c.toLowerCase() === n.toLowerCase())) return "assassin";
  if (TANKS.some(c => c.toLowerCase() === n.toLowerCase())) return "tank";
  if (SUPPORTS.some(c => c.toLowerCase() === n.toLowerCase())) return "support";
  if (FIGHTERS.some(c => c.toLowerCase() === n.toLowerCase())) return "fighter";
  return "ap_mage";
}

function seededRandom(seed: string): () => number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = ((h << 5) - h + seed.charCodeAt(i)) | 0;
  }
  return () => {
    h = (h * 16807 + 12345) & 0x7fffffff;
    return (h % 1000) / 1000;
  };
}

function generateMockData(champion: string, riotId: string, region: string): AnalysisData {
  const archetype = getArchetype(champion);
  const rand = seededRandom(champion + riotId);

  const baseKills = archetype === "assassin" ? 8.2 : archetype === "ad_carry" ? 7.1 : archetype === "tank" ? 3.1 : archetype === "support" ? 1.8 : archetype === "fighter" ? 6.4 : 5.5;
  const baseDeaths = archetype === "assassin" ? 5.8 : archetype === "tank" ? 4.2 : archetype === "support" ? 4.5 : 4.8;
  const baseAssists = archetype === "support" ? 14.2 : archetype === "tank" ? 9.8 : archetype === "assassin" ? 5.1 : archetype === "ad_carry" ? 6.3 : 6.8;
  const baseCsPerMin = archetype === "support" ? 1.2 : archetype === "tank" ? 6.1 : archetype === "ad_carry" ? 7.8 : archetype === "assassin" ? 7.2 : archetype === "fighter" ? 6.8 : 6.9;
  const baseVision = archetype === "support" ? 42 : archetype === "tank" ? 22 : 16;
  const baseDmgShare = archetype === "ad_carry" ? 28 : archetype === "assassin" ? 26 : archetype === "ap_mage" ? 25 : archetype === "support" ? 12 : archetype === "tank" ? 14 : 22;
  const baseGoldPerMin = archetype === "support" ? 280 : archetype === "tank" ? 340 : archetype === "ad_carry" ? 420 : 380;

  const jitter = (base: number, pct: number) => +(base * (1 + (rand() - 0.5) * pct)).toFixed(1);
  const kills = jitter(baseKills, 0.3);
  const deaths = jitter(baseDeaths, 0.3);
  const assists = jitter(baseAssists, 0.3);
  const kda = deaths > 0 ? +((kills + assists) / deaths).toFixed(2) : kills + assists;
  const csPerMin = jitter(baseCsPerMin, 0.2);
  const vision = Math.round(jitter(baseVision, 0.3));
  const dmgShare = jitter(baseDmgShare, 0.2);
  const goldPerMin = Math.round(jitter(baseGoldPerMin, 0.2));
  const games = 30 + Math.floor(rand() * 60);
  const winRate = +(48 + rand() * 12).toFixed(1);
  const wins = Math.round(games * winRate / 100);

  const overall: StatsBlock = {
    games, wins, winRate,
    avgKda: kda, avgKills: kills, avgDeaths: deaths, avgAssists: assists,
    avgCsPerMin: csPerMin, avgVisionScore: vision, avgDamageShare: dmgShare, avgGoldPerMin: goldPerMin,
  };

  const recentWinRate = +(winRate + (rand() > 0.5 ? 3 : -2)).toFixed(1);
  const recentGames = Math.min(10, games);
  const recentBlock: StatsBlock = {
    games: recentGames, wins: Math.round(recentGames * recentWinRate / 100), winRate: recentWinRate,
    avgKda: jitter(kda, 0.15), avgKills: jitter(kills, 0.15), avgDeaths: jitter(deaths, 0.15), avgAssists: jitter(assists, 0.15),
    avgCsPerMin: jitter(csPerMin, 0.1), avgVisionScore: Math.round(jitter(vision, 0.15)), avgDamageShare: jitter(dmgShare, 0.1), avgGoldPerMin: Math.round(jitter(goldPerMin, 0.1)),
  };

  const prevWinRate = +(winRate - (rand() > 0.4 ? 2 : -1)).toFixed(1);
  const prevGames = Math.min(10, games - recentGames);
  const previousBlock: StatsBlock = {
    games: prevGames > 0 ? prevGames : 10, wins: Math.round((prevGames > 0 ? prevGames : 10) * prevWinRate / 100), winRate: prevWinRate,
    avgKda: jitter(kda, 0.2), avgKills: jitter(kills, 0.2), avgDeaths: jitter(deaths, 0.2), avgAssists: jitter(assists, 0.2),
    avgCsPerMin: jitter(csPerMin, 0.15), avgVisionScore: Math.round(jitter(vision, 0.2)), avgDamageShare: jitter(dmgShare, 0.15), avgGoldPerMin: Math.round(jitter(goldPerMin, 0.15)),
  };

  const csChange = +(recentBlock.avgCsPerMin - previousBlock.avgCsPerMin).toFixed(2);
  const kdaChange = +(recentBlock.avgKda - previousBlock.avgKda).toFixed(2);
  const wrChange = +(recentBlock.winRate - previousBlock.winRate).toFixed(1);
  const trend: "improving" | "plateauing" | "declining" = wrChange > 2 ? "improving" : wrChange < -2 ? "declining" : "plateauing";

  const benchmarkTier = "GOLD";
  const goldBenchmarks: Record<string, { benchmark: number; stat: string; label: string }> = {
    kda: { benchmark: 2.8, stat: "kda", label: "KDA" },
    csPerMin: { benchmark: archetype === "support" ? 1.5 : 6.5, stat: "csPerMin", label: "CS / min" },
    visionScore: { benchmark: archetype === "support" ? 38 : 18, stat: "visionScore", label: "Vision Score" },
    damageShare: { benchmark: archetype === "support" ? 14 : 22, stat: "damageShare", label: "Damage Share" },
    winRate: { benchmark: 50, stat: "winRate", label: "Win Rate" },
    goldPerMin: { benchmark: archetype === "support" ? 300 : 370, stat: "goldPerMin", label: "Gold / min" },
  };

  const playerValues: Record<string, number> = {
    kda, csPerMin, visionScore: vision, damageShare: dmgShare, winRate, goldPerMin,
  };

  const comparisons: StatComparison[] = Object.entries(goldBenchmarks).map(([key, { benchmark, stat, label }]) => {
    const pv = playerValues[key];
    const ratio = pv / benchmark;
    const percentile = Math.min(99, Math.max(1, Math.round(ratio * 50)));
    const status: "good" | "warning" | "bad" = percentile >= 55 ? "good" : percentile >= 40 ? "warning" : "bad";
    return { stat, label, playerValue: pv, benchmark, percentile, status };
  });

  const avgPercentile = Math.round(comparisons.reduce((s, c) => s + c.percentile, 0) / comparisons.length);
  const equivalentRank = avgPercentile >= 75 ? "Platinum" : avgPercentile >= 55 ? "Gold" : avgPercentile >= 35 ? "Silver" : "Bronze";

  const matchupPool = archetype === "ap_mage"
    ? ["Zed", "Yasuo", "Syndra", "Orianna", "LeBlanc", "Fizz", "Viktor"]
    : archetype === "ad_carry"
    ? ["Jinx", "Caitlyn", "Vayne", "Ezreal", "Jhin", "MissFortune", "Draven"]
    : archetype === "assassin"
    ? ["Ahri", "Lux", "Syndra", "Orianna", "Malzahar", "Annie", "Viktor"]
    : archetype === "support"
    ? ["Thresh", "Lulu", "Nami", "Leona", "Nautilus", "Karma", "Morgana"]
    : archetype === "tank"
    ? ["Darius", "Fiora", "Vayne", "Jax", "Garen", "Camille", "Mordekaiser"]
    : ["Darius", "Garen", "Jax", "Riven", "Fiora", "Camille", "Aatrox"];

  const opponents = matchupPool.filter(c => c.toLowerCase() !== champion.toLowerCase().replace(/[^a-z]/gi, ""));
  const bestMatchups: MatchupRecord[] = opponents.slice(0, 3).map(op => ({
    opponentChampion: op, games: 3 + Math.floor(rand() * 8),
    wins: 0, winRate: +(58 + rand() * 22).toFixed(0),
  })).map(m => ({ ...m, wins: Math.round(m.games * m.winRate / 100) }));

  const worstMatchups: MatchupRecord[] = opponents.slice(3, 6).map(op => ({
    opponentChampion: op, games: 3 + Math.floor(rand() * 8),
    wins: 0, winRate: +(20 + rand() * 25).toFixed(0),
  })).map(m => ({ ...m, wins: Math.round(m.games * m.winRate / 100) }));

  const masteryGrade = avgPercentile >= 80 ? "S" : avgPercentile >= 70 ? "A+" : avgPercentile >= 60 ? "A" : avgPercentile >= 50 ? "B+" : avgPercentile >= 40 ? "B" : avgPercentile >= 30 ? "C+" : "C";

  const playstyleTitles: Record<string, string> = {
    assassin: "The Aggressive Skirmisher", ap_mage: "The Calculated Controller", ad_carry: "The Precision Marksman",
    tank: "The Frontline Anchor", support: "The Protective Enabler", fighter: "The Relentless Brawler",
  };
  const playstyleDescs: Record<string, string> = {
    assassin: "You thrive in chaotic fights, looking for picks and all-ins. Your aggression wins games when you channel it into the right targets.",
    ap_mage: "You play for spacing and ability rotations. Your teamfight positioning is a strength — keep abusing it.",
    ad_carry: "You're a DPS machine in the late game. Your laning is solid; the next level is perfecting mid-game positioning.",
    tank: "You engage fights and absorb damage so your team can follow up. Your macro awareness and TP plays define your impact.",
    support: "You enable your ADC and peel for your carries. Your vision control and roam timing decide the lane phase.",
    fighter: "You split-push and duel. You win games by creating constant side-lane pressure and forcing 1v2 responses.",
  };

  const weakestStat = comparisons.reduce((a, b) => a.percentile < b.percentile ? a : b);
  const targetBenchmark: Record<string, number> = {
    kda: 3.2, csPerMin: archetype === "support" ? 1.8 : 7.5, visionScore: archetype === "support" ? 45 : 22,
    damageShare: archetype === "support" ? 16 : 25, winRate: 52, goldPerMin: archetype === "support" ? 320 : 400,
  };

  return {
    championName: champion, riotId, region, tier: "GOLD", rank: "II",
    overall, recentBlock, previousBlock,
    trend, trendDetails: { csPerMinChange: csChange, kdaChange, winRateChange: wrChange },
    comparisons, avgPercentile, equivalentRank,
    bestMatchups, worstMatchups,
    benchmarkTier, totalGamesAnalyzed: games,
    masteryGrade,
    playstyleTitle: playstyleTitles[archetype] ?? "The Versatile Player",
    playstyleDescription: playstyleDescs[archetype] ?? "You adapt your playstyle game-to-game. Focus on consistency to climb.",
    personalBests: [
      { label: "Best KDA Game", value: `${Math.round(kills * 2.5)}/${Math.max(1, Math.round(deaths * 0.3))}/${Math.round(assists * 1.8)}`, detail: `${+(kda * 2.8).toFixed(1)} KDA — Legendary performance` },
      { label: "Most CS in 10min", value: `${Math.round(csPerMin * 11.5)}`, detail: `${+(csPerMin * 1.15).toFixed(1)} CS/min — Diamond-tier laning` },
      { label: "Highest Damage", value: `${Math.round(dmgShare * 1200 + rand() * 8000)}`, detail: `${Math.round(dmgShare * 1.4)}% damage share` },
    ],
    winConditions: [
      { description: `Games with ${csPerMin >= 7 ? "8+" : "7+"} CS/min`, winRate: Math.round(winRate + 8 + rand() * 5), games: Math.round(games * 0.35) },
      { description: `Games with 0-1 deaths pre-15`, winRate: Math.round(winRate + 12 + rand() * 6), games: Math.round(games * 0.4) },
      { description: `Games with ${archetype === "support" ? "40+ vision" : "20+ vision score"}`, winRate: Math.round(winRate + 5 + rand() * 4), games: Math.round(games * 0.3) },
    ],
    oneThingCallout: {
      stat: weakestStat.stat,
      current: weakestStat.playerValue,
      target: targetBenchmark[weakestStat.stat] ?? weakestStat.benchmark * 1.15,
      targetRank: "Platinum",
      tip: weakestStat.stat === "csPerMin"
        ? "Practice catching the two waves you miss during base timings. Use attack-move click to last-hit under tower."
        : weakestStat.stat === "visionScore"
        ? "Buy a Control Ward on every back. Sweep before objectives spawn — this alone can add 8-10 vision score per game."
        : weakestStat.stat === "kda"
        ? "Review your deaths in losses — most are from overstaying after a fight. Back 2 seconds earlier."
        : weakestStat.stat === "damageShare"
        ? "Look for poke windows before fights start. Spending mana on the wave when enemies are grouped is wasted damage."
        : "Track your gold income windows — catching side waves mid-game is the easiest way to boost gold per minute.",
    },
    betterThanPercent: {
      stat: comparisons.reduce((a, b) => a.percentile > b.percentile ? a : b).stat,
      label: comparisons.reduce((a, b) => a.percentile > b.percentile ? a : b).label,
      percentile: comparisons.reduce((a, b) => a.percentile > b.percentile ? a : b).percentile,
    },
    currentWinStreak: rand() > 0.6 ? Math.floor(rand() * 5) + 1 : 0,
    bestWinStreak: 3 + Math.floor(rand() * 6),
  };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const riotId = searchParams.get("riotId");
  const region = searchParams.get("region") ?? "na1";
  const champion = searchParams.get("champion");

  if (!riotId || !champion) {
    return NextResponse.json(
      { error: "Missing required params: riotId, champion" },
      { status: 400 },
    );
  }

  // DEV MODE: return realistic mock data based on champion archetype
  const data = generateMockData(champion, riotId, region);
  return NextResponse.json(data);
}
