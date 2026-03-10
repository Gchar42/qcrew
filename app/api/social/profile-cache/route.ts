export const dynamic = "force-dynamic";

import { getProfileCache, getMultipleProfileCaches } from "@/lib/socialCache";

/**
 * GET /api/social/profile-cache?riotId=...&region=...
 * Returns cached rank data for a single player.
 *
 * GET /api/social/profile-cache?players=Name1%23Tag1:na1,Name2%23Tag2:euw1
 * Returns cached rank data for multiple players (comma-separated riotId:region pairs).
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  const playersParam = searchParams.get("players");
  if (playersParam) {
    const pairs = playersParam.split(",").map((p) => {
      const [riotId, region] = p.split(":");
      return { riotId: decodeURIComponent(riotId ?? ""), region: region ?? "na1" };
    });
    const profiles = await getMultipleProfileCaches(pairs);
    return Response.json({ profiles });
  }

  const riotId = searchParams.get("riotId")?.trim();
  const region = searchParams.get("region")?.trim() ?? "na1";

  if (!riotId) {
    return Response.json({ error: "Missing riotId" }, { status: 400 });
  }

  const profile = await getProfileCache(riotId, region);
  return Response.json({ profile });
}
