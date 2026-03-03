import type {
  MatchDto,
  MatchTimelineDto,
  MatchTimelineEvent,
  MatchTimelineFrameParticipant,
} from "@/types/riot";

export type TimelineParticipantIdSource =
  | "timeline.metadata.participants (0-based)"
  | "match.metadata.participants (0-based)"
  | "timeline.info.participants (1-based)"
  | "match.participants.index+1 (fallback)";

/**
 * Resolve timeline participantId and which method was used.
 * Prefer timeline metadata (puuid mapping); then match participantId; then match order.
 */
export function resolveTimelineParticipantIdWithSource(
  timeline: MatchTimelineDto,
  match: MatchDto,
  puuid: string
): { pid: number | null; source: TimelineParticipantIdSource | null } {
  const fromTimelineInfo = timeline.info?.participants?.find(
    (p) => (p.puuid ?? (p as { puuid?: string }).puuid) === puuid
  );
  if (fromTimelineInfo?.participantId != null) {
    return { pid: fromTimelineInfo.participantId, source: "timeline.info.participants (1-based)" };
  }
  const timelineMetaIdx = timeline.metadata?.participants?.indexOf(puuid);
  if (typeof timelineMetaIdx === "number" && timelineMetaIdx >= 0) {
    return {
      pid: timelineMetaIdx + 1,
      source: "match.participants.index+1 (fallback)",
    };
  }
  const matchParticipant = match.info?.participants?.find((p) => p.puuid === puuid);
  if (matchParticipant?.participantId != null) {
    return { pid: matchParticipant.participantId, source: "match.participants.index+1 (fallback)" };
  }
  const matchMetaIdx = match.metadata?.participants?.indexOf(puuid);
  if (typeof matchMetaIdx === "number" && matchMetaIdx >= 0) {
    return { pid: matchMetaIdx + 1, source: "match.participants.index+1 (fallback)" };
  }
  const infoIdx = match.info?.participants?.findIndex((p) => p.puuid === puuid);
  if (infoIdx != null && infoIdx >= 0) {
    return { pid: infoIdx + 1, source: "match.participants.index+1 (fallback)" };
  }
  return { pid: null, source: null };
}

/**
 * Resolve timeline participantId (1–10) for the given puuid.
 * Prefer timeline.info.participants when present; else match metadata order; else match info participants.
 */
export function resolveTimelineParticipantId(
  timeline: MatchTimelineDto,
  match: MatchDto,
  puuid: string
): number | null {
  return resolveTimelineParticipantIdWithSource(timeline, match, puuid).pid;
}

/** @deprecated Use resolveTimelineParticipantId. Match order only. */
export function getTimelineParticipantId(match: MatchDto, puuid: string): number | null {
  const idx = match.info?.participants?.findIndex((p) => p.puuid === puuid);
  if (idx == null || idx < 0) return null;
  return idx + 1;
}

/** Event timestamp is milliseconds from game start; convert to seconds for m:ss. */
function eventTimeToSeconds(timestamp: number | undefined): number {
  if (timestamp == null || !Number.isFinite(timestamp)) return 0;
  return Math.floor(timestamp / 1000);
}

/** Format seconds as m:ss. */
function formatMss(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

/**
 * Final item slots 0..6 for the participant from the last timeline frame.
 * participantFrames keys may be "1".."10", "0".."9", or we find by frame.participantId.
 * Returns empty array when the participant frame cannot be resolved.
 */
export function getFinalBuild(
  timeline: MatchTimelineDto,
  participantId: number
): number[] {
  const frames = timeline.info?.frames;
  if (!frames?.length) return [];
  const last = frames[frames.length - 1];
  const pf = last.participantFrames ?? {};
  let frame: MatchTimelineFrameParticipant | undefined =
    pf[String(participantId)] ?? pf[String(participantId - 1)];
  if (frame == null) {
    const entry = Object.entries(pf).find(
      ([_, f]) =>
        (f.participantId ?? Number((f as { participantId?: unknown }).participantId)) ===
        participantId
    );
    if (entry != null) {
      frame = entry[1];
    }
  }
  if (frame == null) return [];
  return [
    frame.item0 ?? 0,
    frame.item1 ?? 0,
    frame.item2 ?? 0,
    frame.item3 ?? 0,
    frame.item4 ?? 0,
    frame.item5 ?? 0,
    frame.item6 ?? 0,
  ];
}

/**
 * First purchase time (seconds) per itemId for the given participant; ignores ITEM_UNDO.
 * For debug / Step 3 only.
 */
export function getFirstPurchaseMapNoUndo(
  timeline: MatchTimelineDto,
  participantId: number
): Map<number, number> {
  const map = new Map<number, number>();
  const frames = timeline.info?.frames ?? [];
  for (const frame of frames) {
    for (const e of frame.events ?? []) {
      if (e.participantId !== participantId || e.type !== "ITEM_PURCHASED") continue;
      const itemId = e.itemId ?? 0;
      if (itemId <= 0) continue;
      const timeSec = eventTimeToSeconds(e.timestamp);
      if (!map.has(itemId)) map.set(itemId, timeSec);
    }
  }
  return map;
}

/**
 * Build firstPurchaseTime map: earliest (seconds) per itemId for the selected participant.
 * Parse every frame's events in chronological order.
 * ITEM_PURCHASED: record earliest timestamp for that itemId.
 * ITEM_UNDO: remove the most recent purchase record for that itemId (beforeId or last).
 * Event participantId and timestamp: normalize (number, ms -> seconds).
 */
export function getPurchaseTimeMap(
  timeline: MatchTimelineDto,
  participantId: number
): Map<number, number> {
  const firstPurchaseTime = new Map<number, number>();
  const purchaseStack: { itemId: number; timestamp: number }[] = [];
  const frames = timeline.info?.frames ?? [];

  for (const frame of frames) {
    for (const e of frame.events ?? []) {
      const evtParticipantId = e.participantId != null ? Number(e.participantId) : undefined;
      if (evtParticipantId !== participantId) continue;

      if (e.type === "ITEM_PURCHASED" && e.itemId != null && e.itemId > 0) {
        const timeSec = eventTimeToSeconds(e.timestamp);
        purchaseStack.push({ itemId: e.itemId, timestamp: timeSec });
        if (!firstPurchaseTime.has(e.itemId)) {
          firstPurchaseTime.set(e.itemId, timeSec);
        }
        continue;
      }

      if (e.type === "ITEM_UNDO") {
        if (e.beforeId != null && e.beforeId > 0) {
          firstPurchaseTime.delete(e.beforeId);
          const idx = purchaseStack.findIndex((x) => x.itemId === e.beforeId);
          if (idx !== -1) purchaseStack.splice(idx, 1);
        } else if (purchaseStack.length > 0) {
          const last = purchaseStack.pop()!;
          firstPurchaseTime.delete(last.itemId);
        }
      }
    }
  }

  return firstPurchaseTime;
}

/**
 * Completion time (seconds) per itemId for final build only.
 * Parse timeline events in order; only record ITEM_PURCHASED when event.itemId is in finalItemSet.
 * Keep earliest valid time per itemId; ITEM_UNDO removes that item's record so next purchase counts.
 * timestampSeconds = Math.floor(timestampMs / 1000).
 */
export function getCompletionTimesForFinalItems(
  timeline: MatchTimelineDto,
  participantId: number,
  finalItemSet: Set<number>
): Map<number, number> {
  const completionTime = new Map<number, number>();
  const purchaseStack: { itemId: number; timestamp: number }[] = [];
  const frames = timeline.info?.frames ?? [];

  for (const frame of frames) {
    for (const e of frame.events ?? []) {
      const evtPid = e.participantId != null ? Number(e.participantId) : undefined;
      if (evtPid !== participantId) continue;

      if (e.type === "ITEM_PURCHASED" && e.itemId != null && e.itemId > 0 && finalItemSet.has(e.itemId)) {
        const timeSec = eventTimeToSeconds(e.timestamp);
        purchaseStack.push({ itemId: e.itemId, timestamp: timeSec });
        if (!completionTime.has(e.itemId)) {
          completionTime.set(e.itemId, timeSec);
        }
        continue;
      }

      if (e.type === "ITEM_UNDO") {
        if (e.beforeId != null && e.beforeId > 0) {
          completionTime.delete(e.beforeId);
          const idx = purchaseStack.findIndex((x) => x.itemId === e.beforeId);
          if (idx !== -1) purchaseStack.splice(idx, 1);
        } else if (purchaseStack.length > 0) {
          const last = purchaseStack.pop()!;
          completionTime.delete(last.itemId);
        }
      }
    }
  }

  return completionTime;
}

/**
 * Per-slot purchase timestamps (seconds) for item slots 0–5 only.
 * Slots with no item (0) or no recorded purchase are null.
 * Trinket (slot 6) is not included; caller should never show timestamp for trinket.
 */
export function getItemSlotPurchaseTimes(
  timeline: MatchTimelineDto,
  participantId: number
): (number | null)[] {
  const finalBuild = getFinalBuild(timeline, participantId);
  const purchaseMap = getPurchaseTimeMap(timeline, participantId);
  const out: (number | null)[] = [];
  for (let i = 0; i < 6; i++) {
    const itemId = finalBuild[i] ?? 0;
    if (itemId <= 0) {
      out.push(null);
      continue;
    }
    const t = purchaseMap.get(itemId);
    out.push(t != null ? t : null);
  }
  return out;
}

/**
 * Per-slot purchase times as formatted strings "m:ss" or null for slots 0–5 only.
 * Uses last frame item0–item5 as final build; only records completion times for those itemIds.
 * Trinket (item6) is ignored.
 */
export function getItemPurchaseTimesFormatted(
  timeline: MatchTimelineDto,
  participantId: number
): (string | null)[] {
  const finalBuild = getFinalBuild(timeline, participantId);
  const finalItemIds = (finalBuild.slice(0, 6) as number[]).filter((id) => id > 0);
  const finalItemSet = new Set(finalItemIds);
  const completionMap = getCompletionTimesForFinalItems(
    timeline,
    participantId,
    finalItemSet
  );
  const out: (string | null)[] = [];
  for (let i = 0; i < 6; i++) {
    const itemId = finalBuild[i] ?? 0;
    if (itemId <= 0) {
      out.push(null);
      continue;
    }
    const sec = completionMap.get(itemId);
    out.push(sec != null ? formatMss(sec) : null);
  }
  return out;
}

export type ItemPurchaseTimesDiagnostics = {
  matchId: string;
  totalEvents: number;
  totalItemPurchasedEvents: number;
  pid: number | null;
  pidSource: TimelineParticipantIdSource | null;
  participantPurchasedCount: number;
  participantUndoCount: number;
  firstThreeItemPurchased: Array<{
    type: string;
    timestamp?: number;
    participantId?: number;
    itemId?: number;
  }>;
};

export type DebugCounts = {
  totalEvents: number;
  totalPurchased: number;
  pid: number | null;
  pidPurchased: number;
};

const NULL_SLOTS: (string | null)[] = [null, null, null, null, null, null];

/**
 * Resolve pid from timeline.metadata.participants (indexOf(selectedPuuid) + 1).
 * Fallback to match.metadata.participants when timeline has no participants array.
 * Returns itemPurchaseTimesBySlot (completion times for final build only) and debugCounts.
 */
export function computeItemPurchaseTimesBySlotWithDiagnostics(
  timeline: MatchTimelineDto,
  match: MatchDto,
  puuid: string,
  matchId: string,
  logFirstMatchOnly: boolean
): {
  itemPurchaseTimesBySlot: (string | null)[];
  diagnostics: ItemPurchaseTimesDiagnostics;
  debugCounts: DebugCounts;
} {
  const frames = timeline.info?.frames ?? [];
  let totalEvents = 0;
  let totalPurchased = 0;
  const allItemPurchasedEvents: MatchTimelineEvent[] = [];
  for (const frame of frames) {
    const events = frame.events ?? [];
    totalEvents += events.length;
    for (const e of events) {
      if (e.type === "ITEM_PURCHASED") {
        totalPurchased += 1;
        allItemPurchasedEvents.push(e);
      }
    }
  }
  const firstThreeItemPurchased = allItemPurchasedEvents.slice(0, 3).map((e) => ({
    type: e.type,
    timestamp: e.timestamp,
    participantId: e.participantId != null ? Number(e.participantId) : undefined,
    itemId: e.itemId,
  }));

  const timelinePuuids = timeline.metadata?.participants ?? match.metadata?.participants;
  if (!timelinePuuids || !Array.isArray(timelinePuuids)) {
    const debugCounts: DebugCounts = {
      totalEvents,
      totalPurchased,
      pid: null,
      pidPurchased: 0,
    };
    const diagnostics: ItemPurchaseTimesDiagnostics = {
      matchId,
      totalEvents,
      totalItemPurchasedEvents: totalPurchased,
      pid: null,
      pidSource: null,
      participantPurchasedCount: 0,
      participantUndoCount: 0,
      firstThreeItemPurchased,
    };
    if (logFirstMatchOnly) console.log("[riot/match] timeline diagnostics (first match)", diagnostics);
    return { itemPurchaseTimesBySlot: NULL_SLOTS, diagnostics, debugCounts };
  }

  const idx = timelinePuuids.indexOf(puuid);
  if (idx === -1) {
    const debugCounts: DebugCounts = {
      totalEvents,
      totalPurchased,
      pid: null,
      pidPurchased: 0,
    };
    const diagnostics: ItemPurchaseTimesDiagnostics = {
      matchId,
      totalEvents,
      totalItemPurchasedEvents: totalPurchased,
      pid: null,
      pidSource: null,
      participantPurchasedCount: 0,
      participantUndoCount: 0,
      firstThreeItemPurchased,
    };
    if (logFirstMatchOnly) console.log("[riot/match] timeline diagnostics (first match)", diagnostics);
    return { itemPurchaseTimesBySlot: NULL_SLOTS, diagnostics, debugCounts };
  }

  const pid = idx + 1;
  const source: TimelineParticipantIdSource = "timeline.metadata.participants (0-based)";

  let pidPurchased = 0;
  for (const frame of frames) {
    const events = frame.events ?? [];
    for (const e of events) {
      if (e.type !== "ITEM_PURCHASED") continue;
      const evtPid = e.participantId != null ? Number(e.participantId) : undefined;
      if (evtPid === pid) pidPurchased += 1;
    }
  }

  const debugCounts: DebugCounts = {
    totalEvents,
    totalPurchased,
    pid,
    pidPurchased,
  };
  const diagnostics: ItemPurchaseTimesDiagnostics = {
    matchId,
    totalEvents,
    totalItemPurchasedEvents: totalPurchased,
    pid,
    pidSource: source,
    participantPurchasedCount: pidPurchased,
    participantUndoCount: 0,
    firstThreeItemPurchased,
  };
  if (logFirstMatchOnly) console.log("[riot/match] timeline diagnostics (first match)", diagnostics);

  const itemPurchaseTimesBySlot = getItemPurchaseTimesFormatted(timeline, pid);
  return { itemPurchaseTimesBySlot, diagnostics, debugCounts };
}
