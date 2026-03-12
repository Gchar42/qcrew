import type {
  MatchTimelineDto,
  MatchTimelineFrame,
  MatchTimelineEvent,
} from "@/types/riot";

export interface TimelineInsights {
  goldDiff10: number;
  goldDiff15: number;
  goldDiff20: number;
  maxGoldLead: number;
  maxGoldDeficit: number;
  earlyDeaths: number;
  totalKillParticipation: number;
  objectivesSecured: string[];
  deathTimestamps: number[];
  firstItemTime: number | null;
}

function msToMinutes(ms: number): number {
  return ms / 60_000;
}

function getOpponentId(participantId: number): number {
  return participantId <= 5 ? participantId + 5 : participantId - 5;
}

function getTeamIds(participantId: number): number[] {
  if (participantId <= 5) return [1, 2, 3, 4, 5];
  return [6, 7, 8, 9, 10];
}

/**
 * Return totalGold for the given participant from a frame's participantFrames.
 * Keys may be "1".."10".
 */
function getGold(frame: MatchTimelineFrame, pid: number): number {
  const pf = frame.participantFrames?.[String(pid)];
  if (!pf) return 0;
  return (pf as Record<string, unknown>).totalGold as number ?? 0;
}

/**
 * Find the frame closest to the target minute mark.
 * Frames are typically emitted every 60 seconds (60000ms).
 */
function frameAtMinute(frames: MatchTimelineFrame[], minute: number): MatchTimelineFrame | null {
  const targetMs = minute * 60_000;
  let best: MatchTimelineFrame | null = null;
  let bestDelta = Infinity;
  for (const f of frames) {
    const ts = f.timestamp ?? 0;
    const delta = Math.abs(ts - targetMs);
    if (delta < bestDelta) {
      bestDelta = delta;
      best = f;
    }
  }
  return best;
}

function goldDiffAtMinute(
  frames: MatchTimelineFrame[],
  minute: number,
  pid: number,
  oppId: number,
): number {
  const frame = frameAtMinute(frames, minute);
  if (!frame) return 0;
  return getGold(frame, pid) - getGold(frame, oppId);
}

export function extractTimelineInsights(
  timeline: MatchTimelineDto,
  participantId: number,
): TimelineInsights {
  const frames = timeline.info?.frames ?? [];
  const oppId = getOpponentId(participantId);
  const teamIds = getTeamIds(participantId);

  const goldDiff10 = goldDiffAtMinute(frames, 10, participantId, oppId);
  const goldDiff15 = goldDiffAtMinute(frames, 15, participantId, oppId);
  const goldDiff20 = goldDiffAtMinute(frames, 20, participantId, oppId);

  let maxGoldLead = 0;
  let maxGoldDeficit = 0;
  for (const frame of frames) {
    const diff = getGold(frame, participantId) - getGold(frame, oppId);
    if (diff > maxGoldLead) maxGoldLead = diff;
    if (diff < maxGoldDeficit) maxGoldDeficit = diff;
  }

  const allEvents: MatchTimelineEvent[] = frames.flatMap((f) => f.events ?? []);

  let earlyDeaths = 0;
  const deathTimestamps: number[] = [];
  let teamKills = 0;
  let killParticipations = 0;
  const objectivesSecured: string[] = [];
  let firstItemTime: number | null = null;

  for (const e of allEvents) {
    const ts = e.timestamp ?? 0;
    const minutes = msToMinutes(ts);

    if (e.type === "CHAMPION_KILL") {
      if (e.participantId && teamIds.includes(e.participantId)) {
        teamKills++;
      }

      const victimId = (e as Record<string, unknown>).victimId as number | undefined;
      if (victimId === participantId) {
        deathTimestamps.push(Math.round(minutes * 10) / 10);
        if (minutes < 10) earlyDeaths++;
      }

      if (e.participantId === participantId) {
        killParticipations++;
      } else {
        const assistingIds = (e as Record<string, unknown>).assistingParticipantIds as number[] | undefined;
        if (assistingIds?.includes(participantId)) {
          killParticipations++;
        }
      }
    }

    if (e.type === "ELITE_MONSTER_KILL" && e.participantId && teamIds.includes(e.participantId)) {
      const monsterType = (e as Record<string, unknown>).monsterType as string | undefined;
      if (monsterType) {
        const label = monsterType.replace("_", " ");
        if (!objectivesSecured.includes(label)) objectivesSecured.push(label);
      }
    }

    if (e.type === "BUILDING_KILL" && e.participantId && teamIds.includes(e.participantId)) {
      const buildingType = (e as Record<string, unknown>).buildingType as string | undefined;
      if (buildingType && !objectivesSecured.includes(buildingType)) {
        objectivesSecured.push(buildingType);
      }
    }

    if (e.type === "ITEM_PURCHASED" && e.participantId === participantId) {
      const itemId = e.itemId ?? 0;
      // Completed items generally have IDs above 3000; skip components/consumables
      if (itemId >= 3000 && firstItemTime === null) {
        firstItemTime = Math.round(minutes * 10) / 10;
      }
    }
  }

  const totalKillParticipation =
    teamKills > 0 ? Math.round((killParticipations / teamKills) * 100) : 0;

  return {
    goldDiff10,
    goldDiff15,
    goldDiff20,
    maxGoldLead,
    maxGoldDeficit,
    earlyDeaths,
    totalKillParticipation,
    objectivesSecured,
    deathTimestamps,
    firstItemTime,
  };
}
