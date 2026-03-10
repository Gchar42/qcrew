export const dynamic = "force-dynamic";

import { getRivalryData, getProfileCache } from "@/lib/socialCache";

/**
 * GET /api/social/rivalry?playerA=Name1%23Tag1&regionA=na1&playerB=Name2%23Tag2&regionB=na1
 * Returns head-to-head stats between two players.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const playerA = searchParams.get("playerA")?.trim();
  const regionA = searchParams.get("regionA")?.trim() ?? "na1";
  const playerB = searchParams.get("playerB")?.trim();
  const regionB = searchParams.get("regionB")?.trim() ?? "na1";

  if (!playerA || !playerB) {
    return Response.json(
      { error: "Missing playerA or playerB" },
      { status: 400 }
    );
  }

  const [rivalry, profileA, profileB] = await Promise.all([
    getRivalryData(
      { riotId: playerA, region: regionA },
      { riotId: playerB, region: regionB }
    ),
    getProfileCache(playerA, regionA),
    getProfileCache(playerB, regionB),
  ]);

  if (!rivalry || rivalry.games_together < 1) {
    return Response.json({
      insufficient: true,
      message: "Not enough shared games yet",
      profileA,
      profileB,
    });
  }

  return Response.json({
    insufficient: rivalry.games_together < 5,
    gamesTogetherTotal: rivalry.games_together,
    sameTeam: rivalry.same_team_count,
    opposing: rivalry.opposing_count,
    partnerWins: rivalry.partner_wins,
    partnerLosses: rivalry.partner_losses,
    lastGameAt: rivalry.last_game_at,
    profileA,
    profileB,
  });
}
