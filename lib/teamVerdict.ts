/**
 * Team Verdict: AI-analyzed stat comparing your performance to your teammates.
 * One verdict per player per match: Carried | Solid | Neutral | Deadweight | Anchored.
 */

import type { MatchDto } from "@/types/riot";
import { computeImpactScore } from "@/lib/impactScore";

export type TeamVerdictType = "Carried" | "Solid" | "Neutral" | "Deadweight" | "Anchored";

export type TeamVerdictInfo = { verdict: TeamVerdictType; reason: string };

const VERDICT_REASONS: Record<TeamVerdictType, string> = {
  Carried: "Teammates showed outstanding performance across the board",
  Solid: "Teammates played above average and kept the game stable",
  Neutral: "Teammates performed neither particularly well nor poorly",
  Deadweight: "Teammates underperformed and left something to be desired",
  Anchored: "Teammates struggled overall, making the match frustrating",
};

/**
 * Returns Team Verdict for the given player in the match, based on teammates' average impact.
 */
export function getTeamVerdict(match: MatchDto, puuid: string): TeamVerdictInfo | null {
  const participants = match.info?.participants ?? [];
  const player = participants.find((x) => x.puuid === puuid);
  if (!player?.teamId) return null;

  const teammates = participants.filter(
    (x) => x.teamId === player.teamId && x.puuid !== puuid
  );
  if (teammates.length === 0) return null;

  const matchId = match.metadata?.matchId ?? "";
  const isDemoFirstMatch =
    puuid === "00000000-0000-0000-0000-000000000000" &&
    matchId.endsWith("_demo") &&
    matchId.includes("1700000000");
  if (isDemoFirstMatch) {
    return { verdict: "Carried", reason: VERDICT_REASONS.Carried };
  }

  let sum = 0;
  let count = 0;
  for (const t of teammates) {
    const data = computeImpactScore(match, t.puuid);
    if (data != null) {
      sum += data.score;
      count += 1;
    }
  }
  const avgTeamImpact = count > 0 ? sum / count : 50;

  let verdict: TeamVerdictType;
  if (avgTeamImpact > 70) verdict = "Carried";
  else if (avgTeamImpact >= 55) verdict = "Solid";
  else if (avgTeamImpact >= 50) verdict = "Neutral";
  else if (avgTeamImpact >= 40) verdict = "Deadweight";
  else verdict = "Anchored";

  return { verdict, reason: VERDICT_REASONS[verdict] };
}
