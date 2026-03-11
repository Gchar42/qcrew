import { NextRequest } from "next/server";
import { getRiotPuuidFromCookie } from "@/lib/riotSession";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

/**
 * Returns the current Riot RSO session (author info) if authenticated.
 */
export async function GET(req: NextRequest) {
  const cookie = req.headers.get("cookie");
  const puuid = getRiotPuuidFromCookie(cookie);

  if (!puuid) {
    return Response.json({ authenticated: false });
  }

  const { data: author } = await supabaseAdmin
    .from("guide_authors")
    .select("*")
    .eq("riot_puuid", puuid)
    .single();

  if (!author) {
    return Response.json({ authenticated: false });
  }

  return Response.json({
    authenticated: true,
    author: {
      id: author.id,
      riotId: author.riot_id,
      region: author.region,
      tier: author.tier,
      rank: author.rank,
      lp: author.lp,
      mainChampion: author.main_champion,
      playRate: author.play_rate,
      championRank: author.champion_rank,
      avatarIconId: author.avatar_icon_id,
    },
  });
}
