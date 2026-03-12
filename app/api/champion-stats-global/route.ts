import { NextResponse } from "next/server";
import {
  getStatData,
  STAT_CATEGORIES,
  STAT_GROUPS,
  formatGames,
  RANK_OPTIONS,
  REGION_OPTIONS,
  PERIOD_OPTIONS,
} from "@/lib/championStatsGlobal";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const statId = searchParams.get("stat") ?? "fullClearTime";
  const rank = searchParams.get("rank") ?? "Emerald+";
  const region = searchParams.get("region") ?? "ALL";
  const period = searchParams.get("period") ?? "30 days";

  const category = STAT_CATEGORIES.find((c) => c.id === statId);
  if (!category) {
    return NextResponse.json({ error: "Unknown stat" }, { status: 400 });
  }

  const entries = getStatData(statId);

  return NextResponse.json({
    stat: statId,
    category,
    groups: STAT_GROUPS,
    categories: STAT_CATEGORIES,
    entries: entries.map((e, i) => ({
      ...e,
      rank: i + 1,
      gamesFormatted: formatGames(e.games),
    })),
    source: "placeholder",
    filters: { rank, region, period },
    filterOptions: {
      ranks: RANK_OPTIONS,
      regions: REGION_OPTIONS,
      periods: PERIOD_OPTIONS,
    },
  });
}
