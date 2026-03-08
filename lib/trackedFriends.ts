/**
 * Tracked friends (recently played with) stored in localStorage.
 * Same shape as SavedSummoner for consistency; optional puuid when we have it from context.
 */

export type TrackedFriend = { riotId: string; region: string; label?: string };

const TRACKED_KEY = "statgap_tracked_friends";
const TRACKED_MAX = 100;

function safeJsonParse<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as T) : fallback;
  } catch {
    return fallback;
  }
}

function safeJsonSet(key: string, value: unknown): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // quota or disabled
  }
}

function normalize(s: TrackedFriend): TrackedFriend {
  return {
    riotId: (s.riotId ?? "").trim(),
    region: (s.region ?? "na1").toLowerCase().trim(),
    label: (s.label ?? s.riotId ?? "").trim() || undefined,
  };
}

function keyOf(s: TrackedFriend): string {
  return `${(s.riotId ?? "").toLowerCase()}#${(s.region ?? "").toLowerCase()}`;
}

export function getTrackedFriends(): TrackedFriend[] {
  const list = safeJsonParse<TrackedFriend[]>(TRACKED_KEY, []);
  return list
    .map(normalize)
    .filter((s) => s.riotId && s.region)
    .slice(0, TRACKED_MAX);
}

export function setTrackedFriends(list: TrackedFriend[]): void {
  const normalized = list
    .map(normalize)
    .filter((s) => s.riotId && s.region)
    .slice(0, TRACKED_MAX);
  safeJsonSet(TRACKED_KEY, normalized);
}

export function addTrackedFriend(entry: TrackedFriend): void {
  const s = normalize(entry);
  if (!s.riotId || !s.region) return;
  const list = getTrackedFriends();
  const k = keyOf(s);
  if (list.some((x) => keyOf(x) === k)) return;
  setTrackedFriends([s, ...list]);
}

export function removeTrackedFriend(riotId: string, region: string): void {
  const k = keyOf({ riotId, region });
  setTrackedFriends(getTrackedFriends().filter((x) => keyOf(x) !== k));
}

export function isTrackedFriend(riotId: string, region: string): boolean {
  const k = keyOf({ riotId, region });
  return getTrackedFriends().some((x) => keyOf(x) === k);
}
