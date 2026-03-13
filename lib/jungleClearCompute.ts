import type { MatchTimelineDto } from "@/lib/riot-api";
import type { MatchDto } from "@/types/riot";
import type { SupabaseClient } from "@supabase/supabase-js";

/* ── Camp name mapping for path display ── */

const CAMP_NAMES: Record<string, string> = {
  BLUE_GOLEM: "Blue",
  RED_LIZARD: "Red",
  RAPTOR: "Raptors",
  KRUG: "Krugs",
  WOLF: "Wolves",
  GROMP: "Gromp",
  RIFT_SCUTTLER: "Scuttle",
};

const CAMP_ICONS: Record<string, string> = {
  BLUE_GOLEM: "🔵",
  RED_LIZARD: "🔴",
  RAPTOR: "🐦",
  KRUG: "🪨",
  WOLF: "🐺",
  GROMP: "🐸",
  RIFT_SCUTTLER: "🦀",
};

const JUNGLE_CAMP_TYPES = new Set(Object.keys(CAMP_NAMES));

const MIN_CAMPS_FOR_CLEAR = 6;
const MAX_CLEAR_TIME_SECONDS = 300;

/* ── Types ── */

export interface JungleClearRaw {
  match_id: string;
  champion_id: number;
  puuid: string;
  clear_time_seconds: number;
  hp_after_clear: number;
  path_order: string[] | null;
  patch: string;
  rank_tier: string;
  game_timestamp: string | null;
}

/* ── Extraction ── */

export function extractJungleClearData(
  timeline: MatchTimelineDto,
  match: MatchDto,
  rankTier: string,
): JungleClearRaw[] {
  const results: JungleClearRaw[] = [];
  const patch = extractPatch(match.info.gameVersion);
  const gameTimestamp = match.info.gameEndTimestamp
    ? new Date(match.info.gameEndTimestamp).toISOString()
    : null;

  const junglers = match.info.participants.filter(
    (p) => (p.teamPosition || p.individualPosition || "").toUpperCase() === "JUNGLE",
  );

  if (!junglers.length) return results;

  const puuidToParticipantId = new Map<string, number>();
  timeline.metadata.participants.forEach((puuid, idx) => {
    puuidToParticipantId.set(puuid, idx + 1);
  });

  for (const jungler of junglers) {
    const participantId = puuidToParticipantId.get(jungler.puuid);
    if (!participantId) continue;

    const pidStr = String(participantId);
    let clearTimeSeconds: number | null = null;
    let hpAfterClear: number | null = null;

    for (const frame of timeline.info.frames) {
      const pf = frame.participantFrames[pidStr];
      if (!pf) continue;

      if (pf.jungleMinionsKilled >= MIN_CAMPS_FOR_CLEAR) {
        clearTimeSeconds = Math.round(frame.timestamp / 1000);
        if (pf.currentHealth != null && pf.maxHealth != null && pf.maxHealth > 0) {
          hpAfterClear = Math.round((pf.currentHealth / pf.maxHealth) * 100);
        }
        break;
      }
    }

    if (clearTimeSeconds == null || clearTimeSeconds > MAX_CLEAR_TIME_SECONDS) continue;

    const pathOrder = extractPathOrder(timeline, participantId);

    results.push({
      match_id: match.metadata.matchId,
      champion_id: jungler.championId ?? 0,
      puuid: jungler.puuid,
      clear_time_seconds: clearTimeSeconds,
      hp_after_clear: hpAfterClear ?? 50,
      path_order: pathOrder,
      patch,
      rank_tier: rankTier,
      game_timestamp: gameTimestamp,
    });
  }

  return results;
}

function extractPathOrder(
  timeline: MatchTimelineDto,
  participantId: number,
): string[] | null {
  const campKills: { timestamp: number; monsterType: string }[] = [];

  for (const frame of timeline.info.frames) {
    if (frame.timestamp > MAX_CLEAR_TIME_SECONDS * 1000) break;
    for (const event of frame.events) {
      if (
        event.type === "MONSTER_KILL" &&
        event.killerId === participantId &&
        event.monsterType &&
        JUNGLE_CAMP_TYPES.has(event.monsterType)
      ) {
        campKills.push({ timestamp: event.timestamp, monsterType: event.monsterType });
      }
    }
  }

  if (campKills.length < 3) return null;

  campKills.sort((a, b) => a.timestamp - b.timestamp);
  return campKills.map((c) => c.monsterType);
}

/* ── Aggregation ── */

export async function aggregateJungleClearStats(
  db: SupabaseClient,
  patch: string,
): Promise<number> {
  const { data: rawRows, error } = await db
    .from("jungle_clear_raw")
    .select("champion_id, clear_time_seconds, hp_after_clear, path_order, rank_tier")
    .eq("patch", patch);

  if (error || !rawRows?.length) return 0;

  type RawRow = {
    champion_id: number;
    clear_time_seconds: number;
    hp_after_clear: number;
    path_order: string[] | null;
    rank_tier: string;
  };

  const grouped = new Map<string, RawRow[]>();
  for (const row of rawRows as RawRow[]) {
    const key = `${row.champion_id}:${row.rank_tier}`;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(row);
  }

  const upserts: Record<string, unknown>[] = [];

  for (const [key, rows] of grouped) {
    const [championIdStr, rankTier] = key.split(":");
    const championId = Number(championIdStr);

    const clearTimes = rows.map((r) => r.clear_time_seconds).sort((a, b) => a - b);
    const hpValues = rows.map((r) => Number(r.hp_after_clear)).sort((a, b) => a - b);

    const p5 = percentile(clearTimes, 5);
    const p50 = percentile(clearTimes, 50);
    const hpP50 = percentile(hpValues, 50);

    const topPaths = computeTopPaths(rows, 3);

    upserts.push({
      champion_id: championId,
      patch,
      rank_tier: rankTier,
      games: rows.length,
      clear_time_p5: p5,
      clear_time_p50: p50,
      hp_after_clear_p50: hpP50,
      most_common_path: topPaths[0] ?? null,
      second_path: topPaths[1] ?? null,
      third_path: topPaths[2] ?? null,
      path_popularity: topPaths,
      updated_at: new Date().toISOString(),
    });
  }

  for (let i = 0; i < upserts.length; i += 200) {
    const batch = upserts.slice(i, i + 200);
    await db.from("jungle_clear_stats").upsert(batch, {
      onConflict: "champion_id,patch,rank_tier",
    });
  }

  return upserts.length;
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, Math.min(idx, sorted.length - 1))];
}

function computeTopPaths(
  rows: { path_order: string[] | null }[],
  topN: number,
): { path: string[]; icons: string; label: string; count: number; pct: number }[] {
  const pathCounts = new Map<string, { path: string[]; count: number }>();
  let total = 0;

  for (const row of rows) {
    if (!row.path_order || !Array.isArray(row.path_order) || row.path_order.length < 3) continue;
    const key = row.path_order.join("→");
    const existing = pathCounts.get(key);
    if (existing) {
      existing.count++;
    } else {
      pathCounts.set(key, { path: row.path_order, count: 1 });
    }
    total++;
  }

  if (total === 0) return [];

  return Array.from(pathCounts.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, topN)
    .map((entry) => ({
      path: entry.path,
      icons: entry.path.map((c) => CAMP_ICONS[c] ?? c).join("→"),
      label: entry.path.map((c) => CAMP_NAMES[c] ?? c).join(" → "),
      count: entry.count,
      pct: Math.round((entry.count / total) * 100),
    }));
}

/* ── Pruning ── */

export async function pruneOldRawData(
  db: SupabaseClient,
  currentPatch: string,
): Promise<number> {
  const [majorStr, minorStr] = currentPatch.split(".");
  const major = Number(majorStr);
  const minor = Number(minorStr);

  const keepPatches = new Set<string>();
  keepPatches.add(currentPatch);
  if (minor >= 2) {
    keepPatches.add(`${major}.${minor - 1}`);
    keepPatches.add(`${major}.${minor - 2}`);
  } else if (minor === 1) {
    keepPatches.add(`${major}.${minor - 1}`);
  }

  const { count, error } = await db
    .from("jungle_clear_raw")
    .delete({ count: "exact" })
    .not("patch", "in", `(${Array.from(keepPatches).join(",")})`);

  if (error) {
    console.error("[jungle-clear] prune error:", error);
    return 0;
  }
  return count ?? 0;
}

/* ── Helpers ── */

function extractPatch(gameVersion?: string): string {
  if (!gameVersion) return "unknown";
  const parts = gameVersion.split(".");
  return parts.length >= 2 ? `${parts[0]}.${parts[1]}` : "unknown";
}
