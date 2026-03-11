type Entry = { expiresAt: number; value: any };
type InFlight = Promise<any>;

const g = globalThis as any;

if (!g.__qcrewCache) g.__qcrewCache = new Map<string, Entry>();
if (!g.__qcrewInFlight) g.__qcrewInFlight = new Map<string, InFlight>();

export function getCached(key: string) {
  const cache: Map<string, Entry> = g.__qcrewCache;
  const hit = cache.get(key);
  if (!hit) return null;
  if (Date.now() > hit.expiresAt) {
    cache.delete(key);
    return null;
  }
  return hit.value;
}

export function setCached(key: string, value: any, ttlMs: number) {
  const cache: Map<string, Entry> = g.__qcrewCache;
  cache.set(key, { value, expiresAt: Date.now() + ttlMs });
}

export function getInFlight(key: string) {
  const inFlight: Map<string, InFlight> = g.__qcrewInFlight;
  return inFlight.get(key) || null;
}

export function setInFlight(key: string, p: InFlight) {
  const inFlight: Map<string, InFlight> = g.__qcrewInFlight;
  inFlight.set(key, p);
}

export function clearInFlight(key: string) {
  const inFlight: Map<string, InFlight> = g.__qcrewInFlight;
  inFlight.delete(key);
}
