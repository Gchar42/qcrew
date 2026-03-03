import { createClient } from "@supabase/supabase-js";

const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

export function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

export async function getCached<T>(key: string, maxAgeMs?: number): Promise<T | null> {
  const supabase = getSupabase();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("riot_cache")
    .select("data, fetched_at")
    .eq("key", key)
    .single();
  if (error || !data) return null;
  const fetchedAt = new Date(data.fetched_at).getTime();
  const ttl = maxAgeMs ?? CACHE_TTL_MS;
  if (Date.now() - fetchedAt > ttl) return null;
  return data.data as T;
}

export async function setCache(key: string, data: unknown): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) return;
  await supabase.from("riot_cache").upsert(
    { key, data: data as Record<string, unknown>, fetched_at: new Date().toISOString() },
    { onConflict: "key" }
  );
}
