import type { MatchDto, MatchTimelineDto, MatchTimelineEvent } from "@/types/riot";

/**
 * Match participants are in order: participants[0] = participantId 1, etc.
 */
export function getTimelineParticipantId(match: MatchDto, puuid: string): number | null {
  const idx = match.info?.participants?.findIndex((p) => p.puuid === puuid);
  if (idx == null || idx < 0) return null;
  return idx + 1; // 1-based
}

/** Game time in timeline events is milliseconds from start; convert to seconds for m:ss. */
function eventTimeToSeconds(timestamp: number | undefined): number {
  if (timestamp == null || !Number.isFinite(timestamp)) return 0;
  return Math.floor(timestamp / 1000);
}

/**
 * Final item slots 0..6 for the participant from the last timeline frame.
 * participantFrames keys are "1".."10".
 */
export function getFinalBuild(
  timeline: MatchTimelineDto,
  participantId: number
): number[] {
  const frames = timeline.info?.frames;
  if (!frames?.length) return [];
  const last = frames[frames.length - 1];
  const key = String(participantId);
  const frame = last.participantFrames?.[key];
  if (!frame) return [];
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
 * Build purchase time (seconds) per itemId for the given participant from timeline events.
 * - ITEM_PURCHASED: record earliest purchase time for that itemId (only set if not yet set).
 * - ITEM_UNDO: remove the purchase for the undone item (beforeId if present, else last purchased).
 * We only use this map for items that remain in the final build; sold/destroyed items are ignored
 * by only looking up slots 0-5 from the final build.
 */
export function getPurchaseTimeMap(
  timeline: MatchTimelineDto,
  participantId: number
): Map<number, number> {
  const purchaseTime = new Map<number, number>();
  const purchaseStack: { itemId: number; timestamp: number }[] = [];
  const frames = timeline.info?.frames ?? [];

  const processEvent = (e: MatchTimelineEvent) => {
    if (e.participantId !== participantId) return;
    const timeSec = eventTimeToSeconds(e.timestamp);

    if (e.type === "ITEM_PURCHASED" && e.itemId != null && e.itemId > 0) {
      purchaseStack.push({ itemId: e.itemId, timestamp: timeSec });
      if (!purchaseTime.has(e.itemId)) {
        purchaseTime.set(e.itemId, timeSec);
      }
      return;
    }

    if (e.type === "ITEM_UNDO") {
      if (e.beforeId != null && e.beforeId > 0) {
        purchaseTime.delete(e.beforeId);
        const idx = purchaseStack.findIndex((x) => x.itemId === e.beforeId);
        if (idx !== -1) purchaseStack.splice(idx, 1);
      } else if (purchaseStack.length > 0) {
        const last = purchaseStack.pop()!;
        purchaseTime.delete(last.itemId);
      }
    }
  };

  for (const frame of frames) {
    for (const e of frame.events ?? []) {
      processEvent(e);
    }
  }

  return purchaseTime;
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
