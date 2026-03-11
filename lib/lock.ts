import { supabaseServer } from "./supabaseServer";

export async function tryLock(key: string, seconds: number): Promise<boolean> {
  const sb = supabaseServer();
  const now = new Date();
  const until = new Date(now.getTime() + seconds * 1000);
  const { data } = await sb.from("refresh_lock").select("*").eq("key", key).maybeSingle();
  if (data?.locked_until && new Date(data.locked_until) > now) return false;
  await sb.from("refresh_lock").upsert({ key, locked_until: until.toISOString() });
  return true;
}
