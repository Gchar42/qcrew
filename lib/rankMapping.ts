/**
 * Map tier + division to a numeric value for averaging lobby rank.
 * Iron 1..Challenger 10; division IV +0, III +0.25, II +0.5, I +0.75.
 */
const TIER_ORDER: Record<string, number> = {
  IRON: 1,
  BRONZE: 2,
  SILVER: 3,
  GOLD: 4,
  PLATINUM: 5,
  EMERALD: 6,
  DIAMOND: 7,
  MASTER: 8,
  GRANDMASTER: 9,
  CHALLENGER: 10,
};

const RANK_OFFSET: Record<string, number> = {
  IV: 0,
  III: 0.25,
  II: 0.5,
  I: 0.75,
};

export function rankToNumber(tier: string, rank: string): number | null {
  const t = TIER_ORDER[tier.toUpperCase()];
  const r = RANK_OFFSET[rank?.toUpperCase() ?? ""];
  if (t == null) return null;
  const offset = rank != null && rank !== "" ? (r ?? 0) : 0;
  return t + offset;
}

/** Numeric value back to display label (e.g. 2.25 => "Bronze III"). */
export function numberToRankLabel(value: number): string {
  const tierNum = Math.floor(value);
  const frac = value - tierNum;
  const tierNames = [
    "",
    "Iron",
    "Bronze",
    "Silver",
    "Gold",
    "Platinum",
    "Emerald",
    "Diamond",
    "Master",
    "Grandmaster",
    "Challenger",
  ];
  const tier = tierNames[tierNum] ?? "Iron";
  if (tierNum >= 8) return tier; // Master+ no division
  const rankLabels = [
    [0, 0.125, "IV"],
    [0.125, 0.375, "III"],
    [0.375, 0.625, "II"],
    [0.625, 1, "I"],
  ];
  for (const [lo, hi, label] of rankLabels) {
    if (frac >= lo && frac < hi) return `${tier} ${label}`;
  }
  return `${tier} IV`;
}
