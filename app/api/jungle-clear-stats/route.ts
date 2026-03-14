import { NextRequest, NextResponse } from "next/server";
import { getCached } from "@/lib/sharedCache";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getSeedClearSpeeds } from "@/lib/jungle-clear-seed";
import { DEFAULT_DDRAGON_VERSION } from "@/lib/riotAssets";

export const dynamic = "force-dynamic";

interface PathEntry {
  icons: string;
  label: string;
  pct?: number;
  winRate?: number;
}

interface JungleClearStatsRow {
  champion_id: number;
  patch: string;
  rank_tier: string;
  games: number;
  clear_time_p5: number | null;
  clear_time_p50: number | null;
  hp_after_clear_p50: number | null;
  most_common_path: PathEntry | null;
  second_path: PathEntry | null;
  third_path: PathEntry | null;
}

type ChampionMap = Record<string, { key: string; name: string }>;

let _championMap: ChampionMap | null = null;

async function getChampionMap(): Promise<ChampionMap> {
  if (_championMap) return _championMap;
  try {
    const url = `https://ddragon.leagueoflegends.com/cdn/${DEFAULT_DDRAGON_VERSION}/data/en_US/champion.json`;
    const res = await fetch(url, { next: { revalidate: 86400 } });
    if (!res.ok) return {};
    const data = (await res.json()) as { data: Record<string, { key: string; id: string; name: string }> };
    const map: ChampionMap = {};
    for (const champ of Object.values(data.data)) {
      map[champ.key] = { key: champ.id, name: champ.name };
    }
    _championMap = map;
    return map;
  } catch {
    return {};
  }
}

function secondsToMSS(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function buildPaths(row: JungleClearStatsRow): PathEntry[] {
  const paths: PathEntry[] = [];
  if (row.most_common_path) paths.push(row.most_common_path);
  if (row.second_path) paths.push(row.second_path);
  if (row.third_path) paths.push(row.third_path);
  return paths;
}

const MIN_GAMES_FOR_REAL_DATA = 200;

function filterAndFormat(
  rows: JungleClearStatsRow[],
  championMap: ChampionMap,
  source: "live" | "database",
): ReturnType<typeof formatRow>[] {
  const filtered =
    source === "live" || source === "database"
      ? rows.filter((r) => r.games >= MIN_GAMES_FOR_REAL_DATA)
      : rows;
  return filtered.map((row) => formatRow(row, championMap));
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const patch = searchParams.get("patch") || "16.5";
  const tier = searchParams.get("tier") || "ALL";

  const championMap = await getChampionMap();

  // 1. Try Redis first (check for any cached clear stats for this patch+tier)
  const redisEntries: JungleClearStatsRow[] = [];
  try {
    // Scan known champion IDs from DB instead of Redis SCAN (Upstash REST doesn't support SCAN well)
    const { data: dbChampIds } = await supabaseAdmin
      .from("jungle_clear_stats")
      .select("champion_id")
      .eq("patch", patch)
      .eq("rank_tier", tier);

    if (dbChampIds?.length) {
      for (const { champion_id } of dbChampIds) {
        const key = `jungle:clearstats:${champion_id}:${patch}:${tier}`;
        const cached = await getCached<JungleClearStatsRow>(key);
        if (cached) redisEntries.push(cached);
      }
    }
  } catch {
    // Redis unavailable, fall through
  }

  if (redisEntries.length > 0) {
    return NextResponse.json({
      source: "live",
      patch,
      tier,
      entries: filterAndFormat(redisEntries, championMap, "live"),
    });
  }

  // 2. Fallback: query Supabase directly
  try {
    const { data: dbRows } = await supabaseAdmin
      .from("jungle_clear_stats")
      .select("*")
      .eq("patch", patch)
      .eq("rank_tier", tier)
      .order("clear_time_p5", { ascending: true });

    if (dbRows?.length) {
      return NextResponse.json({
        source: "database",
        patch,
        tier,
        entries: filterAndFormat(dbRows as JungleClearStatsRow[], championMap, "database"),
      });
    }
  } catch {
    // DB unavailable, fall through
  }

  // 3. Final fallback: seed data
  const seed = getSeedClearSpeeds();
  return NextResponse.json({
    source: "seed",
    patch,
    tier,
    entries: seed,
  });
}

function formatRow(
  row: JungleClearStatsRow,
  championMap: ChampionMap,
): {
  id: string;
  name: string;
  avgClearTime: string;
  avgClearTimeP50: string;
  avgHpAfterClear: number;
  paths: PathEntry[];
  games: number;
  source: string;
} {
  const champ = championMap[String(row.champion_id)];
  return {
    id: champ?.key ?? String(row.champion_id),
    name: champ?.name ?? `Champion ${row.champion_id}`,
    avgClearTime: row.clear_time_p5 != null ? secondsToMSS(row.clear_time_p5) : "—",
    avgClearTimeP50: row.clear_time_p50 != null ? secondsToMSS(row.clear_time_p50) : "—",
    avgHpAfterClear: row.hp_after_clear_p50 != null ? Number(row.hp_after_clear_p50) : 50,
    paths: buildPaths(row),
    games: row.games,
    source: "live",
  };
}
