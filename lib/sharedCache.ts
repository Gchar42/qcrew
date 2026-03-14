/**
 * Unified cache layer — Upstash Redis only.
 *
 * Read:  Redis → HIT → return | MISS → return null (caller fetches from source)
 * Write: Redis only. Supabase is populated exclusively by the cron worker.
 *
 * ┌─────────────────────────────────────────────────────────────────────┐
 * │ Redis Key Reference (from ARCHITECTURE.md)                         │
 * ├─────────────────────────────────────────────────────────────────────┤
 * │ champion:stats:{championId}:{patch}:{tier}:{role}       7200s     │
 * │ champion:builds:{championId}:{patch}:{tier}:{role}      7200s     │
 * │ champion:itempaths:{championId}:{role}:{patch}:{tier}   7200s     │
 * │ champion:matchups:{championId}:{patch}:{tier}:{role}    7200s     │
 * │ champ:leaderboard:{championId}:{region}:{puuid}         7200s     │
 * │ tierlist:{patch}:{tier}:{role}                          7200s     │
 * │ tierlist:meta:{patch}:{tier}:{role}                     7200s     │
 * │ summoner:{region}:{riotIdLower}                         300s      │
 * │ summoner:matches:{puuid}:{page}                         120s      │
 * │ summoner:session:{puuid}:{date}                         300s      │
 * │ summoner:summary:{region}:{riotIdLower}                 300s      │
 * │ leaderboard:{region}                                    7200s     │
 * │ live:game:{encryptedSummonerId}                         30s       │
 * │ compare:{region1}:{id1}:{region2}:{id2}                120s      │
 * │ ddragon:version                                         3600s     │
 * │ ddragon:champions                                       86400s    │
 * │ ddragon:items                                           86400s    │
 * │ following:count:{region}:{riotIdLower}                  no TTL    │
 * ├─────────────────────────────────────────────────────────────────────┤
 * │ Internal keys (not in ARCHITECTURE.md)                             │
 * │ lock:profileBundle:{region}:{riotId}:{queue}            10-20s    │
 * │ rateLimit:{region}                                      varies    │
 * └─────────────────────────────────────────────────────────────────────┘
 */

/* ------------------------------------------------------------------ */
/*  Redis singleton — dynamic import to avoid build failure when       */
/*  UPSTASH_REDIS_REST_URL/TOKEN are not set (local dev, CI)           */
/* ------------------------------------------------------------------ */

const KV_URL =
  process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL;
const KV_TOKEN =
  process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN;

type RedisClient = { get: (k: string) => Promise<unknown>; set: (k: string, v: unknown, opts?: { ex?: number; nx?: boolean }) => Promise<unknown>; del: (k: string) => Promise<unknown> };
let _redis: RedisClient | null | undefined = undefined;
let _redisWarned = false;

async function loadRedis(): Promise<RedisClient | null> {
  if (!KV_URL || !KV_TOKEN) {
    if (!_redisWarned) {
      _redisWarned = true;
      if (typeof console !== "undefined") {
        console.warn("Redis not configured — using mock client");
      }
    }
    return null;
  }
  try {
    const { Redis } = await import("@upstash/redis");
    return new Redis({ url: KV_URL, token: KV_TOKEN }) as RedisClient;
  } catch {
    return null;
  }
}

async function redis(): Promise<RedisClient | null> {
  if (_redis !== undefined) return _redis;
  _redis = await loadRedis();
  return _redis;
}

/* ------------------------------------------------------------------ */
/*  In-memory fallback (local dev — no Redis available)                */
/* ------------------------------------------------------------------ */

type MemEntry = { value: unknown; expiresAt: number };
const memCache = new Map<string, MemEntry>();
const memLocks = new Map<string, number>();
const memRateLimit = new Map<string, number>();

/* ------------------------------------------------------------------ */
/*  TTL defaults                                                       */
/* ------------------------------------------------------------------ */

export const DEFAULT_TTL_SEC = 600; // 10 min
export const PROFILE_BUNDLE_TTL_SEC = 60;
export const MATCH_TTL_SEC = 7 * 24 * 60 * 60;
export const LOCK_TTL_SEC = 15;

/* ------------------------------------------------------------------ */
/*  getCached — read from Redis (or in-memory fallback)                */
/* ------------------------------------------------------------------ */

/**
 * @param key       Cache key
 * @param maxAgeMs  Ignored for Redis (TTL is set on write). Kept in the
 *                  signature for backward compat with existing callers that
 *                  pass e.g. MATCH_CACHE_TTL_MS. In-memory fallback uses it.
 */
export async function getCached<T = unknown>(
  key: string,
  maxAgeMs?: number,
): Promise<T | null> {
  const r = await redis();
  if (r) {
    try {
      const v = (await r.get(key)) as T | null;
      return v ?? null;
    } catch {
      return null;
    }
  }

  // In-memory (local dev)
  const e = memCache.get(key);
  if (!e) return null;
  if (Date.now() > e.expiresAt) {
    memCache.delete(key);
    return null;
  }
  return e.value as T;
}

/* ------------------------------------------------------------------ */
/*  setCached / setCache — write to Redis only                         */
/* ------------------------------------------------------------------ */

/**
 * @param ttlSec  TTL in seconds for Redis. Defaults to DEFAULT_TTL_SEC.
 */
export async function setCached(
  key: string,
  value: unknown,
  ttlSec?: number,
): Promise<void> {
  const effectiveTtl = ttlSec ?? DEFAULT_TTL_SEC;

  const r = await redis();
  if (r) {
    try {
      await r.set(key, value, { ex: effectiveTtl });
    } catch {
      // best-effort
    }
    return;
  }

  memCache.set(key, {
    value,
    expiresAt: Date.now() + effectiveTtl * 1000,
  });
}

/**
 * Alias matching the existing consumer convention (imported as `setCache`
 * from @/lib/supabase/route). Uses DEFAULT_TTL_SEC.
 */
export async function setCache(key: string, data: unknown): Promise<void> {
  return setCached(key, data);
}

/* ------------------------------------------------------------------ */
/*  Lock helpers (Redis-only, mem fallback)                            */
/* ------------------------------------------------------------------ */

export async function tryAcquireLock(
  lockKey: string,
  ttlSec: number,
): Promise<boolean> {
  const r = await redis();
  if (r) {
    try {
      const ok = await r.set(lockKey, "1", { nx: true, ex: ttlSec });
      return ok != null;
    } catch {
      return false;
    }
  }
  const until = memLocks.get(lockKey);
  if (until != null && Date.now() < until) return false;
  memLocks.set(lockKey, Date.now() + ttlSec * 1000);
  return true;
}

export async function releaseLock(lockKey: string): Promise<void> {
  const r = await redis();
  if (r) {
    try {
      await r.del(lockKey);
    } catch {
      // ignore
    }
    return;
  }
  memLocks.delete(lockKey);
}

/* ------------------------------------------------------------------ */
/*  Rate-limit helpers (Redis-only, mem fallback)                      */
/* ------------------------------------------------------------------ */

const RATE_LIMIT_PREFIX = "rateLimit:";

export async function getRateLimitUntil(
  region: string,
): Promise<number | null> {
  const key = RATE_LIMIT_PREFIX + region;
  const r = await redis();
  if (r) {
    try {
      const v = await r.get(key);
      if (v == null) return null;
      const ts = typeof v === "number" ? v : Number(v);
      return Number.isFinite(ts) ? ts : null;
    } catch {
      return null;
    }
  }
  return memRateLimit.get(key) ?? null;
}

export async function setRateLimitUntil(
  region: string,
  untilMs: number,
  ttlSec: number,
): Promise<void> {
  const key = RATE_LIMIT_PREFIX + region;
  const r = await redis();
  if (r) {
    try {
      await r.set(key, String(untilMs), { ex: ttlSec });
    } catch {
      // ignore
    }
    return;
  }
  memRateLimit.set(key, untilMs);
}
