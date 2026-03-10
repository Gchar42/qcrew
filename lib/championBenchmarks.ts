type BenchmarkRow = {
  kda: number;
  csPerMin: number;
  visionScore: number;
  damageShare: number;
  winRate: number;
  goldPerMin: number;
};

const TIER_BENCHMARKS: Record<string, BenchmarkRow> = {
  IRON: { kda: 1.6, csPerMin: 4.0, visionScore: 8, damageShare: 19.5, winRate: 45, goldPerMin: 280 },
  BRONZE: { kda: 1.9, csPerMin: 4.5, visionScore: 10, damageShare: 19.8, winRate: 47, goldPerMin: 300 },
  SILVER: { kda: 2.1, csPerMin: 5.0, visionScore: 12, damageShare: 20.0, winRate: 49, goldPerMin: 320 },
  GOLD: { kda: 2.4, csPerMin: 5.5, visionScore: 15, damageShare: 20.2, winRate: 50, goldPerMin: 340 },
  PLATINUM: { kda: 2.7, csPerMin: 6.0, visionScore: 18, damageShare: 20.5, winRate: 50, goldPerMin: 360 },
  EMERALD: { kda: 3.0, csPerMin: 6.5, visionScore: 22, damageShare: 20.8, winRate: 50, goldPerMin: 380 },
  DIAMOND: { kda: 3.3, csPerMin: 7.0, visionScore: 26, damageShare: 21.0, winRate: 51, goldPerMin: 400 },
  MASTER: { kda: 3.6, csPerMin: 7.5, visionScore: 30, damageShare: 21.5, winRate: 52, goldPerMin: 420 },
  GRANDMASTER: { kda: 3.8, csPerMin: 7.8, visionScore: 32, damageShare: 22.0, winRate: 53, goldPerMin: 440 },
  CHALLENGER: { kda: 4.0, csPerMin: 8.0, visionScore: 35, damageShare: 22.5, winRate: 55, goldPerMin: 460 },
};

const TIER_ORDER = [
  "IRON", "BRONZE", "SILVER", "GOLD", "PLATINUM",
  "EMERALD", "DIAMOND", "MASTER", "GRANDMASTER", "CHALLENGER",
];

export function getBenchmark(tier: string): BenchmarkRow {
  return TIER_BENCHMARKS[tier.toUpperCase()] ?? TIER_BENCHMARKS.GOLD;
}

export function getPercentile(value: number, stat: keyof BenchmarkRow, tier: string): number {
  const benchmarks = TIER_ORDER.map((t) => TIER_BENCHMARKS[t][stat]);
  const tierBench = getBenchmark(tier)[stat];

  if (value >= benchmarks[benchmarks.length - 1]) return 99;
  if (value <= benchmarks[0]) return 1;

  const ratio = tierBench > 0 ? value / tierBench : 1;
  const percentile = Math.min(99, Math.max(1, Math.round(ratio * 50)));
  return percentile;
}

export function getEquivalentRank(avgPercentile: number): string {
  if (avgPercentile >= 95) return "Challenger";
  if (avgPercentile >= 90) return "Grandmaster";
  if (avgPercentile >= 80) return "Master";
  if (avgPercentile >= 70) return "Diamond";
  if (avgPercentile >= 60) return "Emerald";
  if (avgPercentile >= 50) return "Platinum";
  if (avgPercentile >= 40) return "Gold";
  if (avgPercentile >= 30) return "Silver";
  if (avgPercentile >= 20) return "Bronze";
  return "Iron";
}

export function getTrend(recent: number, previous: number): "improving" | "plateauing" | "declining" {
  if (previous === 0) return "plateauing";
  const change = ((recent - previous) / Math.abs(previous)) * 100;
  if (change > 5) return "improving";
  if (change < -5) return "declining";
  return "plateauing";
}

export { TIER_BENCHMARKS, TIER_ORDER };
export type { BenchmarkRow };
