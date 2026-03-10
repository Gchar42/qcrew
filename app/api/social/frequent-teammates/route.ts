export const dynamic = "force-dynamic";

import { getFrequentTeammates, getProfileCache } from "@/lib/socialCache";

/**
 * GET /api/social/frequent-teammates?riotId=...&region=...
 * Returns up to 5 most frequently co-occurring teammates with rank data.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const riotId = searchParams.get("riotId")?.trim();
  const region = searchParams.get("region")?.trim() ?? "na1";

  if (!riotId) {
    return Response.json({ error: "Missing riotId" }, { status: 400 });
  }

  const teammates = await getFrequentTeammates(riotId, region, 5);

  const enriched = await Promise.all(
    teammates.map(async (t) => {
      const cached = await getProfileCache(t.partnerRiotId, t.partnerRegion);
      return {
        ...t,
        tier: cached?.tier ?? null,
        rank: cached?.rank ?? null,
        leaguePoints: cached?.league_points ?? null,
      };
    })
  );

  return Response.json({ teammates: enriched });
}
