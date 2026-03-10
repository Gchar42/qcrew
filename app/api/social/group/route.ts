export const dynamic = "force-dynamic";

import { getMultipleProfileCaches, type CachedProfile } from "@/lib/socialCache";

/**
 * GET /api/social/group?players=Name1%23Tag1:na1,Name2%23Tag2:na1
 * Returns cached rank data for a group of players, sorted by LP.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const playersParam = searchParams.get("players");

  if (!playersParam) {
    return Response.json({ error: "Missing players param" }, { status: 400 });
  }

  const pairs = playersParam
    .split(",")
    .slice(0, 10)
    .map((p) => {
      const lastColon = p.lastIndexOf(":");
      if (lastColon === -1) return { riotId: decodeURIComponent(p), region: "na1" };
      return {
        riotId: decodeURIComponent(p.slice(0, lastColon)),
        region: p.slice(lastColon + 1),
      };
    })
    .filter((p) => p.riotId);

  const profiles = await getMultipleProfileCaches(pairs);

  const tierOrder: Record<string, number> = {
    CHALLENGER: 0, GRANDMASTER: 1, MASTER: 2, DIAMOND: 3,
    EMERALD: 4, PLATINUM: 5, GOLD: 6, SILVER: 7, BRONZE: 8, IRON: 9,
  };

  const sorted = [...profiles].sort((a: CachedProfile, b: CachedProfile) => {
    const ta = tierOrder[a.tier?.toUpperCase() ?? ""] ?? 99;
    const tb = tierOrder[b.tier?.toUpperCase() ?? ""] ?? 99;
    if (ta !== tb) return ta - tb;
    return (b.league_points ?? 0) - (a.league_points ?? 0);
  });

  const totalGames = sorted.reduce(
    (s: number, p: CachedProfile) => s + (p.wins ?? 0) + (p.losses ?? 0),
    0
  );
  const mostGames = sorted.length
    ? sorted.reduce((best: CachedProfile, p: CachedProfile) =>
        (p.wins ?? 0) + (p.losses ?? 0) > (best.wins ?? 0) + (best.losses ?? 0)
          ? p
          : best
      )
    : null;
  const highestLP = sorted.length
    ? sorted.reduce((best: CachedProfile, p: CachedProfile) =>
        (p.league_points ?? 0) > (best.league_points ?? 0) ? p : best
      )
    : null;

  return Response.json({
    players: sorted,
    stats: {
      totalGames,
      mostGamesPlayer: mostGames?.riot_id ?? null,
      highestLPPlayer: highestLP?.riot_id ?? null,
      playerCount: sorted.length,
    },
  });
}
