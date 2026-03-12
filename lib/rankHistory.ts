/**
 * Rank history: store and fetch past season ranks for profile display.
 * Upsert when we fetch a profile from Riot; fetch when building the bundle.
 * Ready for plug-and-play when Riot API key is available.
 */

import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { SEASON_KEY } from "@/lib/season";

export type PastRankEntry = { season: string; tier: string; rank?: string };

/** Derive short season label from SEASON_KEY (e.g. "2026_s1" -> "S26", "2025_s2" -> "S25-2"). */
export function seasonKeyToDisplay(seasonKey: string): string {
  const m = seasonKey.match(/^(\d{4})_s(\d)$/);
  if (!m) return seasonKey;
  const year = m[1].slice(2);
  const split = m[2];
  return split === "1" ? `S${year}` : `S${year}-${split}`;
}

const CURRENT_SEASON_DISPLAY = seasonKeyToDisplay(SEASON_KEY);

/** Upsert current rank into rank_history. Call after fetching profile from Riot. */
export async function upsertRankHistory(
  puuid: string,
  region: string,
  queue: "solo" | "flex",
  tier: string,
  rank: string | undefined
): Promise<void> {
  if (!puuid || !tier) return;
  try {
    await supabaseAdmin.from("rank_history").upsert(
      {
        puuid,
        region,
        queue,
        season: CURRENT_SEASON_DISPLAY,
        tier,
        rank: rank ?? null,
        recorded_at: new Date().toISOString(),
      },
      { onConflict: "puuid,region,queue,season" }
    );
  } catch (err) {
    console.error("[rankHistory] upsert error:", err);
  }
}

/** Fetch past ranks for a player, ordered by season ascending (earliest first). */
export async function getPastRanks(
  puuid: string,
  region: string,
  queue: "solo" | "flex",
  limit = 15
): Promise<PastRankEntry[]> {
  if (!puuid) return [];
  try {
    const { data, error } = await supabaseAdmin
      .from("rank_history")
      .select("season, tier, rank")
      .eq("puuid", puuid)
      .eq("region", region)
      .eq("queue", queue)
      .order("season", { ascending: true })
      .limit(limit);

    if (error) {
      console.error("[rankHistory] fetch error:", error);
      return [];
    }

    return (data ?? []).map((r) => ({
      season: r.season,
      tier: r.tier,
      rank: r.rank ?? undefined,
    }));
  } catch (err) {
    console.error("[rankHistory] fetch error:", err);
    return [];
  }
}
