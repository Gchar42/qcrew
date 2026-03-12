import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type TierBenchmark = {
  kda: number;
  csPerMin: number;
  visionScore: number;
  damageShare: number;
  winRate: number;
  goldPerMin: number;
};

type TierComparison = TierBenchmark & { tier: string };

const BENCHMARKS: Record<string, TierBenchmark> = {
  IRON:        { kda: 1.6, csPerMin: 4.2, visionScore: 8,  damageShare: 20, winRate: 46, goldPerMin: 280 },
  BRONZE:      { kda: 1.9, csPerMin: 4.8, visionScore: 10, damageShare: 21, winRate: 48, goldPerMin: 300 },
  SILVER:      { kda: 2.2, csPerMin: 5.5, visionScore: 13, damageShare: 22, winRate: 49, goldPerMin: 330 },
  GOLD:        { kda: 2.8, csPerMin: 6.5, visionScore: 18, damageShare: 23, winRate: 50, goldPerMin: 370 },
  PLATINUM:    { kda: 3.1, csPerMin: 7.0, visionScore: 22, damageShare: 24, winRate: 51, goldPerMin: 395 },
  EMERALD:     { kda: 3.4, csPerMin: 7.4, visionScore: 26, damageShare: 25, winRate: 51, goldPerMin: 410 },
  DIAMOND:     { kda: 3.6, csPerMin: 7.8, visionScore: 30, damageShare: 26, winRate: 52, goldPerMin: 430 },
  MASTER:      { kda: 3.9, csPerMin: 8.2, visionScore: 34, damageShare: 27, winRate: 52, goldPerMin: 450 },
  GRANDMASTER: { kda: 4.1, csPerMin: 8.5, visionScore: 37, damageShare: 28, winRate: 53, goldPerMin: 465 },
  CHALLENGER:  { kda: 4.4, csPerMin: 8.9, visionScore: 40, damageShare: 29, winRate: 54, goldPerMin: 480 },
};

const TIER_ORDER = [
  "IRON", "BRONZE", "SILVER", "GOLD", "PLATINUM",
  "EMERALD", "DIAMOND", "MASTER", "GRANDMASTER", "CHALLENGER",
];

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const playerTier = (searchParams.get("tier") ?? "GOLD").toUpperCase();

  const playerIdx = TIER_ORDER.indexOf(playerTier);
  const startIdx = Math.max(0, playerIdx);
  const visibleTiers = TIER_ORDER.slice(startIdx, startIdx + 4);
  if (visibleTiers.length < 4) {
    const extra = TIER_ORDER.slice(Math.max(0, startIdx - (4 - visibleTiers.length)), startIdx);
    visibleTiers.unshift(...extra);
  }

  const tiers: TierComparison[] = visibleTiers.map((tier) => ({
    tier,
    ...BENCHMARKS[tier],
  }));

  return NextResponse.json({
    benchmarks: BENCHMARKS,
    tiers,
  });
}
