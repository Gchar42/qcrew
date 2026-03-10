export const dynamic = "force-dynamic";

import {
  recordProfileView,
  getProfileViewCount,
  upsertProfileCache,
} from "@/lib/socialCache";

/**
 * POST /api/social/profile-view
 * Records a profile view and optionally caches rank data.
 * Body: { riotId, region, tier?, rank?, leaguePoints?, wins?, losses?, profileIconId?, summonerLevel? }
 */
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      riotId?: string;
      region?: string;
      tier?: string;
      rank?: string;
      leaguePoints?: number;
      wins?: number;
      losses?: number;
      profileIconId?: number;
      summonerLevel?: number;
    };

    const riotId = body.riotId?.trim();
    const region = body.region?.trim() ?? "na1";

    if (!riotId) {
      return Response.json({ error: "Missing riotId" }, { status: 400 });
    }

    await Promise.all([
      recordProfileView(riotId, region),
      upsertProfileCache({
        riotId,
        region,
        tier: body.tier,
        rank: body.rank,
        leaguePoints: body.leaguePoints,
        wins: body.wins,
        losses: body.losses,
        profileIconId: body.profileIconId,
        summonerLevel: body.summonerLevel,
      }),
    ]);

    const viewCount = await getProfileViewCount(riotId, region);

    return Response.json({ ok: true, viewCount });
  } catch {
    return Response.json({ error: "Failed to record view" }, { status: 500 });
  }
}

/**
 * GET /api/social/profile-view?riotId=...&region=...
 * Returns the 7-day view count.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const riotId = searchParams.get("riotId")?.trim();
  const region = searchParams.get("region")?.trim() ?? "na1";

  if (!riotId) {
    return Response.json({ error: "Missing riotId" }, { status: 400 });
  }

  const viewCount = await getProfileViewCount(riotId, region);
  return Response.json({ viewCount });
}
