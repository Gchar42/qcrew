/**
 * Social badges per match: one badge per player per match.
 * Main Character (unique, winning team) and Team Gap (unique, losing team);
 * all other badges are personal.
 */

import type { MatchDto } from "@/types/riot";
import { computeImpactScore, type ImpactResult } from "@/lib/impactScore";

export type BadgeInfo = { badge: string; reason: string };

/** Badge name -> Tailwind/semantic category for chip styling (gold/positive/neutral/negative) */
export function getBadgeCategory(badge: string): "gold" | "positive" | "neutral" | "negative" {
  const gold = ["Main Character", "Team Gap"];
  const positive = ["Playmaker", "Jungle Diff", "Where It Counts", "Slippery"];
  const negative = ["Limit Testing", "AFK", "Learning the Champ", "KS'er"];
  if (gold.includes(badge)) return "gold";
  if (positive.includes(badge)) return "positive";
  if (negative.includes(badge)) return "negative";
  return "neutral";
}

function getParticipantImpacts(match: MatchDto): Array<{ puuid: string; data: ImpactResult }> {
  const participants = match.info?.participants ?? [];
  const out: Array<{ puuid: string; data: ImpactResult }> = [];
  for (const p of participants) {
    const data = computeImpactScore(match, p.puuid);
    if (data) out.push({ puuid: p.puuid, data });
  }
  return out;
}

function assignMainCharacter(
  winners: Array<{ puuid: string; data: ImpactResult }>
): string | null {
  if (winners.length === 0) return null;
  const sorted = [...winners].sort((a, b) => b.data.score - a.data.score);
  const first = sorted[0];
  const secondScore = sorted[1]?.data.score ?? 0;
  if (first.data.score >= 85 && first.data.score >= secondScore + 5) {
    return first.puuid;
  }
  return null;
}

function assignTeamGap(
  losers: Array<{ puuid: string; data: ImpactResult }>
): string | null {
  if (losers.length === 0) return null;
  const sorted = [...losers].sort((a, b) => b.data.score - a.data.score);
  const first = sorted[0];
  const secondScore = sorted[1]?.data.score ?? 0;
  if (first.data.score >= 75 && first.data.score >= secondScore + 4) {
    return first.puuid;
  }
  return null;
}

function getPersonalBadge(
  data: ImpactResult,
  participant?: { teamPosition?: string }
): BadgeInfo {
  const {
    score,
    combatScore,
    macroScore,
    dpm,
    csPerMin,
    objDpm,
    turretDpm,
    takedownsPerMin,
    killsPerMin,
    deaths,
  } = data;

  const isJungle =
    (participant?.teamPosition ?? "").toUpperCase() === "JUNGLE";

  // Priority order: first match wins
  if (
    score < 25 &&
    takedownsPerMin < 0.35 &&
    dpm < 350 &&
    csPerMin < 5
  ) {
    return { badge: "AFK", reason: "Very low impact" };
  }
  if (deaths >= 9 && score < 70) {
    return { badge: "Limit Testing", reason: "9+ deaths" };
  }
  if (deaths <= 2 && score >= 70) {
    return { badge: "Slippery", reason: "2 or fewer deaths" };
  }
  if (csPerMin >= 8.5 && dpm < 550 && takedownsPerMin < 0.8) {
    return { badge: "PVE Merchant", reason: "High CS, low fighting" };
  }
  if (
    macroScore > combatScore &&
    (objDpm >= 650 || turretDpm >= 380)
  ) {
    return { badge: "Where It Counts", reason: "High objective or turret damage" };
  }
  if (killsPerMin >= 0.35 && dpm < 600 && takedownsPerMin < 0.95) {
    return { badge: "KS'er", reason: "Kills high, damage low" };
  }

  // Fallback score bands
  if (score >= 85) return { badge: "Playmaker", reason: "Impact 85+" };
  if (score >= 70) {
    return isJungle
      ? { badge: "Jungle Diff", reason: "Impact 70+" }
      : { badge: "Lane Bully", reason: "Impact 70+" };
  }
  if (score >= 55) return { badge: "Doing Your Job", reason: "Impact 55+" };
  if (score >= 40) return { badge: "Background Character", reason: "Impact 40+" };
  return { badge: "Learning the Champ", reason: "Impact under 40" };
}

/**
 * Returns a map of puuid -> { badge, reason } for all participants in the match.
 * Main Character at most one (winning team); Team Gap at most one (losing team).
 */
export function getMatchBadges(match: MatchDto): Map<string, BadgeInfo> {
  const all = getParticipantImpacts(match);
  const winners = all.filter((x) => x.data.win);
  const losers = all.filter((x) => !x.data.win);

  const mainCharacterPuuid = assignMainCharacter(winners);
  const teamGapPuuid = assignTeamGap(losers);

  const participants = match.info?.participants ?? [];
  const result = new Map<string, BadgeInfo>();
  for (const { puuid, data } of all) {
    const participant = participants.find((x) => x.puuid === puuid);
    if (puuid === mainCharacterPuuid) {
      result.set(puuid, { badge: "Main Character", reason: "Top Impact on winning team" });
    } else if (puuid === teamGapPuuid) {
      result.set(puuid, { badge: "Team Gap", reason: "Top Impact on losing team" });
    } else {
      result.set(puuid, getPersonalBadge(data, participant));
    }
  }
  return result;
}
