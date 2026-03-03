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

export type BuildItemPurchaseTimesResult = {
  itemPurchaseTimesBySlot: (string | null)[];
  purchaseMapSize: number;
  finalBuildItemIds: number[];
  itemPurchasedCountForPid: number;
};

/**
 * Phase A: Build purchaseMap for participant (earliest time per itemId; ITEM_UNDO removes by beforeId).
 * Phase B: Map final build slots 0..5 to purchaseMap; return 6 formatted "m:ss" or null.
 * participantFrames key: try pid and pid-1 for last frame.
 */
export function buildItemPurchaseTimesBySlot(
  timeline: MatchTimelineDto,
  pid: number
): BuildItemPurchaseTimesResult {
  const frames = timeline.info?.frames ?? [];

  const purchaseMap = new Map<number, number>();
  let itemPurchasedCountForPid = 0;
  for (const frame of frames) {
    for (const e of frame.events ?? []) {
      const evtPid = e.participantId != null ? Number(e.participantId) : undefined;
      if (evtPid !== pid) continue;
      if (e.type === "ITEM_PURCHASED" && e.itemId != null && e.itemId > 0) {
        itemPurchasedCountForPid += 1;
        const timeSec = eventTimeToSeconds(e.timestamp);
        if (!purchaseMap.has(e.itemId)) purchaseMap.set(e.itemId, timeSec);
        continue;
      }
      if (e.type === "ITEM_UNDO" && e.beforeId != null && e.beforeId > 0) {
        purchaseMap.delete(e.beforeId);
      }
    }
  }

  const last = frames[frames.length - 1];
  const pf = last?.participantFrames ?? {};
  const frame = pf[String(pid)] ?? pf[String(pid - 1)];
  const finalBuildItemIds: number[] = [
    frame?.item0 ?? 0,
    frame?.item1 ?? 0,
    frame?.item2 ?? 0,
    frame?.item3 ?? 0,
    frame?.item4 ?? 0,
    frame?.item5 ?? 0,
  ];

  const out: (string | null)[] = [];
  for (let i = 0; i < 6; i++) {
    const itemId = finalBuildItemIds[i] ?? 0;
    const time = purchaseMap.get(itemId);
    if (itemId > 0 && time != null) {
      out.push(formatMss(time));
    } else {
      out.push(null);
    }
  }
  return {
    itemPurchaseTimesBySlot: out,
    purchaseMapSize: purchaseMap.size,
    finalBuildItemIds,
    itemPurchasedCountForPid,
  };
}

/**
 * Per-slot purchase times as formatted strings "m:ss" or null for slots 0–5 only.
 * Trinket (item6) is ignored.
 */
export function getItemPurchaseTimesFormatted(
  timeline: MatchTimelineDto,
  participantId: number
): (string | null)[] {
  return buildItemPurchaseTimesBySlot(timeline, participantId).itemPurchaseTimesBySlot;
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

export type TimelineDiagnostics = {
  totalFrames: number;
  totalEvents: number;
  totalPurchased: number;
  /** purchasedByPid[i] = count of ITEM_PURCHASED for participantId i (indices 0..10, use 1..10). */
  purchasedByPid: number[];
  /** First match only: puuid we are resolving (from request). */
  selectedPuuid?: string;
  /** First match only: timeline.metadata.participants (pid = indexOf(selectedPuuid)+1). No fallback to match. */
  timelineParticipants?: string[];
  /** First match only: pid from timeline.metadata.participants only, or null if not found. */
  computedPid?: number | null;
};

/**
 * Compute raw timeline counts and per-participant purchase counts (no pid mapping).
 * purchasedByPid[1..10] = count of ITEM_PURCHASED where event.participantId === 1..10.
 */
function computeTimelineDiagnostics(timeline: MatchTimelineDto): TimelineDiagnostics {
  const frames = timeline.info?.frames ?? [];
  const totalFrames = frames.length;
  let totalEvents = 0;
  let totalPurchased = 0;
  const purchasedByPid = new Array<number>(11).fill(0); // indices 0..10, use 1..10

  for (const frame of frames) {
    const events = frame.events ?? [];
    totalEvents += events.length;
    for (const e of events) {
      if (e.type === "ITEM_PURCHASED") {
        totalPurchased += 1;
        const pid = e.participantId != null ? Number(e.participantId) : 0;
        if (pid >= 1 && pid <= 10) {
          purchasedByPid[pid] += 1;
        }
      }
    }
  }
  return { totalFrames, totalEvents, totalPurchased, purchasedByPid };
}

/** Augment base timeline diagnostics with pid-mapping fields for first-match DEBUG DIAG. */
function withPidMapping(
  base: { totalFrames: number; totalEvents: number; totalPurchased: number; purchasedByPid: number[] },
  selectedPuuid: string,
  timeline: MatchTimelineDto,
  computedPid: number | null
): TimelineDiagnostics {
  return {
    ...base,
    selectedPuuid,
    timelineParticipants: timeline.metadata?.participants ?? [],
    computedPid,
  };
}

/**
 * Resolve pid ONLY from timeline.metadata.participants: pid = indexOf(selectedPuuid) + 1.
 * If not found, do NOT fall back; return null.
 */
function resolvePidFromTimelineMetadata(
  timeline: MatchTimelineDto,
  selectedPuuid: string
): number | null {
  const participants = timeline.metadata?.participants;
  if (!participants || !Array.isArray(participants)) return null;
  const idx = participants.indexOf(selectedPuuid);
  if (idx === -1) return null;
  return idx + 1;
}

/**
 * First match only: compute raw timelineDiagnostics (totalFrames, totalEvents, totalPurchased, purchasedByPid).
 * Resolve pid ONLY from timeline.metadata.participants; if not found, return null timestamps and log.
 * When pid valid, build item purchase times. Return timelineDiagnostics for first match so UI can show DEBUG DIAG.
 */
export function computeItemPurchaseTimesBySlotWithDiagnostics(
  timeline: MatchTimelineDto,
  _match: MatchDto,
  puuid: string,
  matchId: string,
  logFirstMatchOnly: boolean
): {
  itemPurchaseTimesBySlot: (string | null)[];
  diagnostics: ItemPurchaseTimesDiagnostics;
  debugCounts: DebugCounts;
  timelineDiagnostics?: TimelineDiagnostics;
} {
  const timelineDiagnostics = computeTimelineDiagnostics(timeline);

  if (logFirstMatchOnly) {
    console.log("[riot/match] timeline diagnostics (first match)", {
      matchId,
      ...timelineDiagnostics,
    });
  }

  const pid = resolvePidFromTimelineMetadata(timeline, puuid);
  const fullDiagnostics = logFirstMatchOnly
    ? withPidMapping(timelineDiagnostics, puuid, timeline, pid)
    : undefined;

  if (pid == null) {
    if (logFirstMatchOnly) {
      console.log("[riot/match] selectedPuuid was not found in timeline.metadata.participants");
    }
    const debugCounts: DebugCounts = {
      totalEvents: timelineDiagnostics.totalEvents,
      totalPurchased: timelineDiagnostics.totalPurchased,
      pid: null,
      pidPurchased: 0,
    };
    const diagnostics: ItemPurchaseTimesDiagnostics = {
      matchId,
      totalEvents: timelineDiagnostics.totalEvents,
      totalItemPurchasedEvents: timelineDiagnostics.totalPurchased,
      pid: null,
      pidSource: null,
      participantPurchasedCount: 0,
      participantUndoCount: 0,
      firstThreeItemPurchased: [],
    };
    return {
      itemPurchaseTimesBySlot: NULL_SLOTS,
      diagnostics,
      debugCounts,
      timelineDiagnostics: fullDiagnostics,
    };
  }

  const result = buildItemPurchaseTimesBySlot(timeline, pid);
  const { itemPurchaseTimesBySlot, purchaseMapSize, finalBuildItemIds, itemPurchasedCountForPid } =
    result;

  const debugCounts: DebugCounts = {
    totalEvents: timelineDiagnostics.totalEvents,
    totalPurchased: timelineDiagnostics.totalPurchased,
    pid,
    pidPurchased: itemPurchasedCountForPid,
  };
  const diagnostics: ItemPurchaseTimesDiagnostics = {
    matchId,
    totalEvents: timelineDiagnostics.totalEvents,
    totalItemPurchasedEvents: timelineDiagnostics.totalPurchased,
    pid,
    pidSource: null,
    participantPurchasedCount: itemPurchasedCountForPid,
    participantUndoCount: 0,
    firstThreeItemPurchased: [],
  };

  if (logFirstMatchOnly) {
    console.log("[riot/match] timeline validation (first match)", {
      matchId,
      pid,
      itemPurchasedCountForPid,
      finalBuildItemIds0To5: finalBuildItemIds,
      purchaseMapSize,
      itemPurchaseTimesBySlot,
    });
  }

  return {
    itemPurchaseTimesBySlot,
    diagnostics,
    debugCounts,
    timelineDiagnostics: fullDiagnostics,
  };
}
