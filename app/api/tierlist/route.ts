import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { SEASON_START_MS } from "@/lib/season";
import type { MatchDto } from "@/types/riot";
import { PUBLIC_PLACEHOLDER_BY_ROLE, type PublicPlaceholderChamp } from "@/lib/tierlistPublicPlaceholder";
import type { ScrapedChamp } from "@/lib/scrapeMetaSrc";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type RoleKey = "top" | "jungle" | "mid" | "adc" | "support";
type TierKey = "S" | "A" | "B" | "C" | "D" | "F";

type ChampStats = {
  championId: number;
  championName: string;
  games: number;
  wins: number;
  winRate: number;
  pickRate: number;
  score: number;
};

type TierlistResponse = {
  updatedAt: string;
  matchCount: number;
  source?: "cache" | "public-placeholder";
  roles: Record<RoleKey, Record<TierKey, ChampStats[]>>;
};

const NO_CACHE = { "Cache-Control": "no-store, max-age=0" };
const MAX_MATCH_ROWS = 2500;

function emptyRoleBuckets(): Record<TierKey, ChampStats[]> {
  return { S: [], A: [], B: [], C: [], D: [], F: [] };
}

function normalizeRole(raw?: string): RoleKey | null {
  const v = (raw ?? "").toUpperCase();
  if (v === "TOP") return "top";
  if (v === "JUNGLE") return "jungle";
  if (v === "MIDDLE" || v === "MID") return "mid";
  if (v === "BOTTOM" || v === "ADC") return "adc";
  if (v === "UTILITY" || v === "SUPPORT") return "support";
  return null;
}

function tierByRank(index: number, total: number): TierKey {
  if (total <= 0) return "F";
  const p = ((index + 1) / total) * 100;
  if (p <= 10) return "S";
  if (p <= 30) return "A";
  if (p <= 55) return "B";
  if (p <= 75) return "C";
  if (p <= 90) return "D";
  return "F";
}

/** GET /api/tierlist - global role tierlist (Silver–Grandmaster aggregate) */
export async function GET() {
  const { data, error } = await supabaseAdmin
    .from("champion_match_cache")
    .select("data, game_start_ts, queue")
    .in("queue", ["solo", "flex"])
    .gte("game_start_ts", SEASON_START_MS)
    .order("game_start_ts", { ascending: false })
    .limit(MAX_MATCH_ROWS);

  if (error) {
    return NextResponse.json(
      { updatedAt: new Date().toISOString(), matchCount: 0, roles: {
        top: emptyRoleBuckets(), jungle: emptyRoleBuckets(), mid: emptyRoleBuckets(), adc: emptyRoleBuckets(), support: emptyRoleBuckets(),
      } } satisfies TierlistResponse,
      { status: 200, headers: NO_CACHE }
    );
  }

  const roleChampionAgg = new Map<RoleKey, Map<number, { championId: number; championName: string; games: number; wins: number }>>();
  const roleGames = new Map<RoleKey, number>();
  (["top", "jungle", "mid", "adc", "support"] as RoleKey[]).forEach((r) => {
    roleChampionAgg.set(r, new Map());
    roleGames.set(r, 0);
  });

  for (const row of data ?? []) {
    const dto = row.data as MatchDto;
    const participants = dto?.info?.participants ?? [];
    for (const p of participants) {
      const role = normalizeRole(p.teamPosition ?? p.individualPosition);
      if (!role) continue;
      const championId = p.championId ?? 0;
      if (!championId) continue;
      const championName = p.championName ?? `Champion ${championId}`;
      const byChamp = roleChampionAgg.get(role)!;
      const cur = byChamp.get(championId) ?? {
        championId,
        championName,
        games: 0,
        wins: 0,
      };
      cur.games += 1;
      if (p.win) cur.wins += 1;
      if (cur.championName.startsWith("Champion ")) cur.championName = championName;
      byChamp.set(championId, cur);
      roleGames.set(role, (roleGames.get(role) ?? 0) + 1);
    }
  }

  const roles: Record<RoleKey, Record<TierKey, ChampStats[]>> = {
    top: emptyRoleBuckets(),
    jungle: emptyRoleBuckets(),
    mid: emptyRoleBuckets(),
    adc: emptyRoleBuckets(),
    support: emptyRoleBuckets(),
  };

  const sparseData = (data ?? []).length < 200;
  if (sparseData) {
    const placeholderResult = await buildPlaceholderResponse((data ?? []).length);
    return NextResponse.json(placeholderResult, { status: 200, headers: NO_CACHE });
  }

  (Object.keys(roles) as RoleKey[]).forEach((role) => {
    const totalRoleGames = Math.max(1, roleGames.get(role) ?? 0);
    const champs: ChampStats[] = [...(roleChampionAgg.get(role)?.values() ?? [])].map((c) => {
      const winRate = c.games ? (c.wins / c.games) * 100 : 0;
      const pickRate = (c.games / totalRoleGames) * 100;
      const score = winRate * 0.78 + pickRate * 0.22;
      return {
        championId: c.championId,
        championName: c.championName,
        games: c.games,
        wins: c.wins,
        winRate: Math.round(winRate * 10) / 10,
        pickRate: Math.round(pickRate * 10) / 10,
        score: Math.round(score * 100) / 100,
      };
    });

    champs.sort((a, b) => b.score - a.score || b.games - a.games || b.winRate - a.winRate);

    champs.forEach((c, idx) => {
      const tier = c.games < 6 ? "F" : tierByRank(idx, champs.length);
      roles[role][tier].push(c);
    });
  });

  return NextResponse.json(
    {
      updatedAt: new Date().toISOString(),
      matchCount: (data ?? []).length,
      source: "cache",
      roles,
    } satisfies TierlistResponse,
    { status: 200, headers: NO_CACHE }
  );
}

/**
 * When local match cache is sparse, try the most recent DB snapshot
 * from the weekly MetaSRC scrape (Silver–Grandmaster aggregate).
 * Falls back to the hardcoded placeholder if no snapshot exists yet.
 */
async function buildPlaceholderResponse(matchCount: number): Promise<TierlistResponse> {
  // 1) Try latest DB snapshot (written by /api/cron/tierlist-refresh)
  const { data: snap } = await supabaseAdmin
    .from("tierlist_snapshots")
    .select("scraped_at, data")
    .order("scraped_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (snap?.data) {
    const scraped = snap.data as Record<RoleKey, ScrapedChamp[]>;
    const rolesFromSnap: Record<RoleKey, Record<TierKey, ChampStats[]>> = {
      top: emptyRoleBuckets(),
      jungle: emptyRoleBuckets(),
      mid: emptyRoleBuckets(),
      adc: emptyRoleBuckets(),
      support: emptyRoleBuckets(),
    };

    (Object.keys(rolesFromSnap) as RoleKey[]).forEach((role) => {
      const champs = (scraped[role] ?? []).slice().sort((a, b) => b.score - a.score);
      champs.forEach((c, idx) => {
        const tier = tierByRank(idx, champs.length);
        rolesFromSnap[role][tier].push({
          championId: 0,
          championName: c.championName,
          games: 0,
          wins: 0,
          winRate: c.winRate,
          pickRate: c.pickRate,
          score: c.score,
        });
      });
    });

    return {
      updatedAt: snap.scraped_at,
      matchCount,
      source: "public-placeholder",
      roles: rolesFromSnap,
    };
  }

  // 2) Fallback to hardcoded placeholder
  const placeholderRoles: Record<RoleKey, Record<TierKey, ChampStats[]>> = {
    top: emptyRoleBuckets(),
    jungle: emptyRoleBuckets(),
    mid: emptyRoleBuckets(),
    adc: emptyRoleBuckets(),
    support: emptyRoleBuckets(),
  };

  (Object.keys(PUBLIC_PLACEHOLDER_BY_ROLE) as RoleKey[]).forEach((role) => {
    const champs: PublicPlaceholderChamp[] = PUBLIC_PLACEHOLDER_BY_ROLE[role].slice().sort((a, b) => b.score - a.score);
    champs.forEach((c, idx) => {
      const tier = tierByRank(idx, champs.length);
      placeholderRoles[role][tier].push(c);
    });
  });

  return {
    updatedAt: new Date().toISOString(),
    matchCount,
    source: "public-placeholder",
    roles: placeholderRoles,
  };
}

