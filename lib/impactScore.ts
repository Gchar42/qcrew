/**
 * Per-match Impact Score (0–100).
 * No win bonus; normalized per minute; supports combat and macro; 100 is rare.
 */

import type { MatchDto } from "@/types/riot";

type Participant = NonNullable<MatchDto["info"]>["participants"][number];

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/** norm(value, cap) = clamp(value / cap, 0, 1) */
function norm(value: number, cap: number): number {
  if (cap <= 0) return 0;
  return clamp(value / cap, 0, 1);
}

function getPosition(p: Participant): string {
  return (p.teamPosition ?? p.individualPosition ?? "").toUpperCase();
}

export type ImpactResult = {
  score: number;
  combatScore: number;
  macroScore: number;
  efficiencyModifier: number;
};

/**
 * Compute Impact Score for the participant identified by puuid in the given match.
 * Uses match v5 participant fields (missing defaults to 0).
 */
export function computeImpactScore(match: MatchDto, puuid: string): ImpactResult | null {
  const p = match.info?.participants?.find((x) => x.puuid === puuid);
  if (!p) return null;

  const gameDurationSec = match.info?.gameDuration ?? 0;
  const minutes = Math.max(1, gameDurationSec / 60);

  const kills = p.kills ?? 0;
  const deaths = p.deaths ?? 0;
  const assists = p.assists ?? 0;
  const totalDamageDealtToChampions = p.totalDamageDealtToChampions ?? 0;
  const damageDealtToObjectives = p.damageDealtToObjectives ?? 0;
  const damageDealtToTurrets = p.damageDealtToTurrets ?? 0;
  const totalMinionsKilled = p.totalMinionsKilled ?? 0;
  const neutralMinionsKilled = p.neutralMinionsKilled ?? 0;
  const visionScore = p.visionScore ?? 0;
  const timeCCingOthers = p.timeCCingOthers ?? 0;
  const totalHealsOnTeammates = p.totalHealsOnTeammates ?? 0;
  const totalDamageShieldedOnTeammates = p.totalDamageShieldedOnTeammates ?? 0;

  const kda = (kills + assists) / Math.max(1, deaths);
  const kpProxy = (kills + assists) / minutes;
  const dpm = totalDamageDealtToChampions / minutes;
  const csPerMin = (totalMinionsKilled + neutralMinionsKilled) / minutes;
  const objDpm = damageDealtToObjectives / minutes;
  const turretDpm = damageDealtToTurrets / minutes;
  const visionPm = visionScore / minutes;
  const ccPm = timeCCingOthers / minutes;
  const utilityPm = (totalHealsOnTeammates + totalDamageShieldedOnTeammates) / minutes;

  const role = getPosition(p);

  // ---- CombatScore (0–100) ----
  let combatKdaWeight = 30;
  let combatKpWeight = 25;
  let combatDpmWeight = 35;
  let combatCcWeight = 10;
  let combatUtilityWeight = 0;

  let csCap = 9.5;
  let objDpmCap = 800;
  let turretCap = 450;
  let visionWeight = 15;
  let objDpmWeight = 30;
  let turretWeight = 20;
  let csWeight = 35;

  if (role === "UTILITY" || role === "SUPPORT") {
    combatDpmWeight = 20; // reduce from 35; add utility 15 so sum stays 100
    combatUtilityWeight = 15;
    visionWeight = 18; // +20% in MacroScore
    csWeight = 32;
    turretWeight = 20;
    objDpmWeight = 30;
  } else if (role === "JUNGLE") {
    csCap = 8.5;
    objDpmCap = 700;
  } else if (role === "TOP") {
    turretWeight = 22; // +10% within MacroScore
    objDpmWeight = 28;
    csWeight = 35;
    visionWeight = 15;
  }

  const combatKda = norm(Math.min(kda, 10), 6);
  const combatKp = norm(kpProxy, 1.1);
  const combatDpm = norm(dpm, 900);
  const combatCc = norm(ccPm, 6);
  const combatUtility = norm(utilityPm, 800);

  const combatScore = clamp(
    (combatKdaWeight / 100) * combatKda +
      (combatKpWeight / 100) * combatKp +
      (combatDpmWeight / 100) * combatDpm +
      (combatCcWeight / 100) * combatCc +
      (combatUtilityWeight / 100) * combatUtility,
    0,
    1
  ) * 100;

  // ---- MacroScore (0–100) ----
  const macroCs = norm(csPerMin, csCap);
  const macroObj = norm(objDpm, objDpmCap);
  const macroTurret = norm(turretDpm, turretCap);
  const macroVision = norm(visionPm, 2.2);

  const macroScore = clamp(
    (csWeight / 100) * macroCs +
      (objDpmWeight / 100) * macroObj +
      (turretWeight / 100) * macroTurret +
      (visionWeight / 100) * macroVision,
    0,
    1
  ) * 100;

  // ---- Efficiency modifier (death penalty) ----
  const assistPm = assists / minutes;
  const contributionIndex = clamp(
    0.8 * norm(assistPm, 0.8) +
      0.8 * norm(visionPm, 2.2) +
      0.6 * norm(ccPm, 6) +
      0.6 * norm(dpm, 900) +
      0.8 * norm(utilityPm, 800),
    0,
    3
  );
  const deathsPm = deaths / minutes;
  const baseDeathPenalty = norm(deathsPm, 0.35);
  const mitigation = clamp(contributionIndex / 3, 0, 1);
  const effectivePenalty = baseDeathPenalty * (1 - 0.7 * mitigation);
  const efficiencyModifier = clamp(1.05 - 0.6 * effectivePenalty, 0.65, 1.05);

  // ---- Final score ----
  const baseImpact = Math.max(combatScore, macroScore) / 100;
  let rawScore = baseImpact * efficiencyModifier * 100;

  const eliteMarkers = [
    csPerMin >= 9,
    dpm >= 850,
    objDpm >= 700,
    turretDpm >= 420,
    visionPm >= 2.0,
    kpProxy >= 1.0,
  ];
  const eliteCount = eliteMarkers.filter(Boolean).length;

  const canBe100 =
    rawScore >= 99.3 &&
    combatScore >= 92 &&
    macroScore >= 85 &&
    deaths <= 1 &&
    eliteCount >= 2;

  const score = canBe100
    ? 100
    : Math.floor(clamp(rawScore, 0, 99));

  return {
    score,
    combatScore: Math.round(combatScore * 10) / 10,
    macroScore: Math.round(macroScore * 10) / 10,
    efficiencyModifier: Math.round(efficiencyModifier * 1000) / 1000,
  };
}
