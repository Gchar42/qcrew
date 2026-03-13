/**
 * Dodge detection logic.
 *
 * Dodge detection is inferred, not directly available from the Riot API.
 * Method: when LP drops by exactly 3 or 5 without a new match appearing
 * in the player's match history, flag it as a probable dodge.
 *
 * Confidence levels:
 *   - "high"   — LP loss is exactly 3 or 5 (standard dodge penalties)
 *   - "medium" — LP loss is 4 (possible rounding / edge case)
 */

export type DodgeEntry = {
  id: string;
  puuid: string;
  detectedAt: string;
  lpBefore: number;
  lpAfter: number;
  lpLoss: number;
  confidence: "high" | "medium";
  patch: string;
};

const DEMO_PUUID = "00000000-0000-0000-0000-000000000000";

const SAMPLE_DODGES_DEMO: DodgeEntry[] = [
  {
    id: "demo-dodge-1",
    puuid: DEMO_PUUID,
    detectedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    lpBefore: 67,
    lpAfter: 64,
    lpLoss: 3,
    confidence: "high",
    patch: "15.5",
  },
  {
    id: "demo-dodge-2",
    puuid: DEMO_PUUID,
    detectedAt: new Date(Date.now() - 18 * 60 * 60 * 1000).toISOString(),
    lpBefore: 72,
    lpAfter: 67,
    lpLoss: 5,
    confidence: "high",
    patch: "15.5",
  },
];

export function getSampleDodges(): DodgeEntry[] {
  return SAMPLE_DODGES_DEMO;
}

/**
 * Infer whether a dodge occurred between two LP snapshots.
 * Returns a partial DodgeEntry (without id/puuid/patch) if a dodge is detected,
 * or null otherwise.
 */
export function inferDodge(
  lpBefore: number,
  lpAfter: number,
  newMatchesSinceLastCheck: number,
): Omit<DodgeEntry, "id" | "puuid" | "patch" | "detectedAt"> | null {
  if (newMatchesSinceLastCheck > 0) return null;

  const lpLoss = lpBefore - lpAfter;
  if (lpLoss <= 0) return null;

  if (lpLoss === 3 || lpLoss === 5) {
    return { lpBefore, lpAfter, lpLoss, confidence: "high" };
  }
  if (lpLoss === 4) {
    return { lpBefore, lpAfter, lpLoss, confidence: "medium" };
  }

  return null;
}

/**
 * Count dodges for a given patch from a list of dodge entries.
 */
export function countDodgesThisPatch(dodges: DodgeEntry[], patch: string): number {
  return dodges.filter((d) => d.patch === patch).length;
}

/**
 * Format a dodge entry for display in match history.
 */
export function formatDodgeForDisplay(dodge: DodgeEntry): {
  label: string;
  tooltip: string;
  time: string;
} {
  return {
    label: `Dodge — −${dodge.lpLoss} LP`,
    tooltip: `Probable dodge detected — LP dropped ${dodge.lpLoss} without a new match`,
    time: dodge.detectedAt,
  };
}
