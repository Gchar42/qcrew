import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { SEASON_KEY } from "@/lib/season";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const STALE_MINUTES = 30;
const NO_CACHE = { "Cache-Control": "no-store, max-age=0" };

export type ChampionStatRow = {
  championId: number;
  championName: string;
  games: number;
  wins: number;
  winRate: number;
  kills: number;
  deaths: number;
  assists: number;
  kda: number;
  avgKills: number;
  avgDeaths: number;
  avgAssists: number;
};

export type ChampionStatsResponse = {
  seasonKey: string;
  queue: "solo" | "flex";
  updatedAt: string;
  champions: ChampionStatRow[];
};

function parseChampionsJson(champions: unknown): ChampionStatRow[] {
  if (!Array.isArray(champions)) return [];
  return champions as ChampionStatRow[];
}

/** GET /api/champion-stats?puuid=...&queue=solo|flex */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const puuid = (searchParams.get("puuid") ?? "").trim();
  const queueParam = (searchParams.get("queue") ?? "solo").toLowerCase();
  const queue = queueParam === "flex" ? "flex" : "solo";

  if (!puuid) {
    return NextResponse.json(
      { error: "Missing puuid" },
      { status: 400, headers: NO_CACHE }
    );
  }

  const { data: row, error } = await supabaseAdmin
    .from("champion_aggregates")
    .select("updated_at, champions")
    .eq("puuid", puuid)
    .eq("queue", queue)
    .eq("season_key", SEASON_KEY)
    .maybeSingle();

  if (error) {
    console.error("[champion-stats] select error:", error);
    return NextResponse.json(
      { seasonKey: SEASON_KEY, queue, updatedAt: "", champions: [] },
      { status: 200, headers: NO_CACHE }
    );
  }

  const champions = row ? parseChampionsJson(row.champions) : [];
  const updatedAt = row?.updated_at ?? "";

  if (row && champions.length > 0) {
    const updatedAtDate = new Date(updatedAt).getTime();
    const staleMs = STALE_MINUTES * 60 * 1000;
    const isStale = Date.now() - updatedAtDate >= staleMs;
    if (isStale) {
      const refreshUrl = new URL("/api/champion-stats/refresh", request.url);
      fetch(refreshUrl.toString(), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ puuid, queue }),
      }).catch(() => {});
    }
    return NextResponse.json(
      {
        seasonKey: SEASON_KEY,
        queue,
        updatedAt,
        champions,
      } satisfies ChampionStatsResponse,
      { status: 200, headers: NO_CACHE }
    );
  }

  if (!row || champions.length === 0) {
    try {
      const refreshUrl = new URL("/api/champion-stats/refresh", request.url);
      const refreshRes = await fetch(refreshUrl.toString(), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ puuid, queue }),
      });
      if (refreshRes.ok) {
        const after = await supabaseAdmin
          .from("champion_aggregates")
          .select("updated_at, champions")
          .eq("puuid", puuid)
          .eq("queue", queue)
          .eq("season_key", SEASON_KEY)
          .maybeSingle();
        if (after.data) {
          const champions = parseChampionsJson(after.data.champions);
          return NextResponse.json(
            {
              seasonKey: SEASON_KEY,
              queue,
              updatedAt: after.data.updated_at ?? "",
              champions,
            } satisfies ChampionStatsResponse,
            { status: 200, headers: NO_CACHE }
          );
        }
      }
    } catch (e) {
      console.error("[champion-stats] refresh failed:", e);
    }
    return NextResponse.json(
      { seasonKey: SEASON_KEY, queue, updatedAt: "", champions: [] } satisfies ChampionStatsResponse,
      { status: 200, headers: NO_CACHE }
    );
  }

  return NextResponse.json(
    { seasonKey: SEASON_KEY, queue, updatedAt, champions },
    { status: 200, headers: NO_CACHE }
  );
}
