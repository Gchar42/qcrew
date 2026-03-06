/**
 * Favorites and recent summoners stored in localStorage (no cookies).
 * Key format: { riotId, region, label } where label is for display (e.g. "Name#Tag").
 */

export type SavedSummoner = { riotId: string; region: string; label?: string };

const FAVORITES_KEY = "statgap_favorites";
const RECENT_KEY = "statgap_recent";
const RECENT_MAX = 10;
const FAVORITES_MAX = 50;

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

function normalize(s: SavedSummoner): SavedSummoner {
  return {
    riotId: s.riotId?.trim() ?? "",
    region: (s.region?.trim() ?? "na1").toLowerCase(),
    label: s.label?.trim() || s.riotId?.trim(),
  };
}

function keyOf(s: SavedSummoner): string {
  return `${s.riotId.toLowerCase()}#${s.region}`;
}

export function getFavorites(): SavedSummoner[] {
  const list = safeJsonParse<SavedSummoner[]>(FAVORITES_KEY, []);
  return list
    .map(normalize)
    .filter((s) => s.riotId && s.region)
    .slice(0, FAVORITES_MAX);
}

export function setFavorites(list: SavedSummoner[]): void {
  const normalized = list.map(normalize).filter((s) => s.riotId && s.region).slice(0, FAVORITES_MAX);
  safeJsonSet(FAVORITES_KEY, normalized);
}

export function addFavorite(entry: SavedSummoner): void {
  const s = normalize(entry);
  if (!s.riotId || !s.region) return;
  const list = getFavorites();
  const k = keyOf(s);
  if (list.some((x) => keyOf(x) === k)) return;
  setFavorites([s, ...list]);
}

export function removeFavorite(riotId: string, region: string): void {
  const k = keyOf({ riotId, region });
  setFavorites(getFavorites().filter((x) => keyOf(x) !== k));
}

export function isFavorite(riotId: string, region: string): boolean {
  const k = keyOf({ riotId, region });
  return getFavorites().some((x) => keyOf(x) === k);
}

export function getRecent(): SavedSummoner[] {
  const list = safeJsonParse<SavedSummoner[]>(RECENT_KEY, []);
  return list
    .map(normalize)
    .filter((s) => s.riotId && s.region)
    .slice(0, RECENT_MAX);
}

export function addRecent(entry: SavedSummoner): void {
  const s = normalize(entry);
  if (!s.riotId || !s.region) return;
  const list = getRecent();
  const k = keyOf(s);
  const rest = list.filter((x) => keyOf(x) !== k);
  safeJsonSet(RECENT_KEY, [s, ...rest].slice(0, RECENT_MAX));
}
