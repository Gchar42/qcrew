/**
 * Shared cache and lock for Vercel serverless (works across instances).
 * Uses Vercel KV / Upstash Redis when KV_REST_API_URL is set; otherwise in-memory fallback for local dev.
 *
 * Keys:
 *   profileBundle:{region}:{riotId}:{queue}  TTL 60s
 *   match:{routing}:{matchId}                 TTL 7 days
 *   lock:profileBundle:{region}:{riotId}:{queue}  TTL 10-20s
 *   rateLimit:{region}                        until timestamp (seconds)
 */

import { Redis } from "@upstash/redis";

const KV_URL = process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL;
const KV_TOKEN = process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN;

function redis(): Redis | null {
  if (!KV_URL || !KV_TOKEN) return null;
  return new Redis({ url: KV_URL, token: KV_TOKEN });
}

// In-memory fallback (per-instance, for local dev)
type MemEntry = { value: unknown; expiresAt: number };
const memCache = new Map<string, MemEntry>();
const memLocks = new Map<string, number>();
const memRateLimit = new Map<string, number>();

export const PROFILE_BUNDLE_TTL_SEC = 60;
export const MATCH_TTL_SEC = 7 * 24 * 60 * 60; // 7 days
export const LOCK_TTL_SEC = 15;

export async function getCached(key: string): Promise<unknown | null> {
  const r = redis();
  if (r) {
    try {
      const v = await r.get(key);
      return v ?? null;
    } catch {
      return null;
    }
  }
  const e = memCache.get(key);
  if (!e) return null;
  if (Date.now() > e.expiresAt) {
    memCache.delete(key);
    return null;
  }
  return e.value;
}

export async function setCached(key: string, value: unknown, ttlSec: number): Promise<void> {
  const r = redis();
  if (r) {
    try {
      await r.set(key, value, { ex: ttlSec });
    } catch {
      // ignore
    }
    return;
  }
  memCache.set(key, { value, expiresAt: Date.now() + ttlSec * 1000 });
}

export async function tryAcquireLock(lockKey: string, ttlSec: number): Promise<boolean> {
  const r = redis();
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
  const r = redis();
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

const RATE_LIMIT_PREFIX = "rateLimit:";

export async function getRateLimitUntil(region: string): Promise<number | null> {
  const key = RATE_LIMIT_PREFIX + region;
  const r = redis();
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
  const until = memRateLimit.get(key);
  return until ?? null;
}

export async function setRateLimitUntil(region: string, untilMs: number, ttlSec: number): Promise<void> {
  const key = RATE_LIMIT_PREFIX + region;
  const r = redis();
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
