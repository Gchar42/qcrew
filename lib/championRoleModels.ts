import { TIER_BENCHMARKS } from "./championBenchmarks";

export type TierComparison = {
  tier: string;
  kda: number;
  csPerMin: number;
  visionScore: number;
  damageShare: number;
  winRate: number;
  goldPerMin: number;
};

const TIER_ORDER = [
  "IRON", "BRONZE", "SILVER", "GOLD", "PLATINUM",
  "EMERALD", "DIAMOND", "MASTER", "GRANDMASTER", "CHALLENGER",
];

function tierIndex(tier: string): number {
  return TIER_ORDER.indexOf(tier.toUpperCase());
}

export function getTierComparisons(
  playerTier: string,
  count: number = 3
): TierComparison[] {
  const idx = tierIndex(playerTier.toUpperCase());
  const result: TierComparison[] = [];

  for (let i = idx + 1; i < TIER_ORDER.length && result.length < count; i++) {
    const tier = TIER_ORDER[i];
    const bench = TIER_BENCHMARKS[tier];
    if (!bench) continue;

    result.push({
      tier,
      kda: bench.kda,
      csPerMin: bench.csPerMin,
      visionScore: bench.visionScore,
      damageShare: bench.damageShare,
      winRate: bench.winRate,
      goldPerMin: bench.goldPerMin,
    });
  }

  return result;
}

export function tierDisplayName(tier: string): string {
  const t = tier.toUpperCase();
  if (t === "GRANDMASTER") return "Grandmaster";
  if (t === "CHALLENGER") return "Challenger";
  if (t === "MASTER") return "Master";
  return t.charAt(0) + t.slice(1).toLowerCase();
}

export { TIER_ORDER };
