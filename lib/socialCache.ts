/**
 * Server-side social cache utilities.
 * Records profile views, caches rank data, and tracks co-occurrence.
 */
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function recordProfileView(riotId: string, region: string) {
  const today = new Date().toISOString().slice(0, 10);
  try {
    const { error } = await supabaseAdmin.rpc("increment_profile_view", {
      p_riot_id: riotId,
      p_region: region,
      p_view_date: today,
    });
    if (error) {
      await supabaseAdmin.from("profile_view_counts").upsert(
        { riot_id: riotId, region, view_date: today, view_count: 1 },
        { onConflict: "riot_id,region,view_date" }
      );
    }
  } catch {
    await supabaseAdmin
      .from("profile_view_counts")
      .upsert(
        { riot_id: riotId, region, view_date: today, view_count: 1 },
        { onConflict: "riot_id,region,view_date" }
      )
      .then(() => {});
  }
}

export async function getProfileViewCount(
  riotId: string,
  region: string
): Promise<number> {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);
  try {
    const { data } = await supabaseAdmin
      .from("profile_view_counts")
      .select("view_count")
      .eq("riot_id", riotId)
      .eq("region", region)
      .gte("view_date", sevenDaysAgo);
    if (!data || data.length === 0) return 0;
    return data.reduce(
      (sum: number, row: { view_count: number }) => sum + row.view_count,
      0
    );
  } catch {
    return 0;
  }
}

export type CachedProfile = {
  riot_id: string;
  region: string;
  tier: string | null;
  rank: string | null;
  league_points: number;
  wins: number;
  losses: number;
  profile_icon_id: number | null;
  summoner_level: number | null;
  last_updated: string;
};

export async function upsertProfileCache(profile: {
  riotId: string;
  region: string;
  tier?: string | null;
  rank?: string | null;
  leaguePoints?: number;
  wins?: number;
  losses?: number;
  profileIconId?: number | null;
  summonerLevel?: number | null;
}) {
  try {
    await supabaseAdmin.from("profile_cache").upsert(
      {
        riot_id: profile.riotId,
        region: profile.region,
        tier: profile.tier ?? null,
        rank: profile.rank ?? null,
        league_points: profile.leaguePoints ?? 0,
        wins: profile.wins ?? 0,
        losses: profile.losses ?? 0,
        profile_icon_id: profile.profileIconId ?? null,
        summoner_level: profile.summonerLevel ?? null,
        last_updated: new Date().toISOString(),
        last_viewed: new Date().toISOString(),
      },
      { onConflict: "riot_id,region" }
    );
  } catch {
    /* best effort */
  }
}

export async function getProfileCache(
  riotId: string,
  region: string
): Promise<CachedProfile | null> {
  try {
    const { data } = await supabaseAdmin
      .from("profile_cache")
      .select("*")
      .eq("riot_id", riotId)
      .eq("region", region)
      .maybeSingle();
    return (data as CachedProfile) ?? null;
  } catch {
    return null;
  }
}

export async function getMultipleProfileCaches(
  players: { riotId: string; region: string }[]
): Promise<CachedProfile[]> {
  if (players.length === 0) return [];
  try {
    const conditions = players.map(
      (p) => `and(riot_id.eq.${p.riotId},region.eq.${p.region})`
    );
    const { data } = await supabaseAdmin
      .from("profile_cache")
      .select("*")
      .or(conditions.join(","));
    return (data as CachedProfile[]) ?? [];
  } catch {
    return [];
  }
}

export async function upsertCooccurrence(
  subjectRiotId: string,
  subjectRegion: string,
  partners: {
    riotId: string;
    region: string;
    sameTeam: boolean;
    win: boolean;
  }[]
) {
  if (partners.length === 0) return;
  const now = new Date().toISOString();
  try {
    for (const p of partners) {
      await supabaseAdmin.from("match_cooccurrence").upsert(
        {
          subject_riot_id: subjectRiotId,
          subject_region: subjectRegion,
          partner_riot_id: p.riotId,
          partner_region: p.region,
          games_together: 1,
          same_team_count: p.sameTeam ? 1 : 0,
          opposing_count: p.sameTeam ? 0 : 1,
          partner_wins: p.win ? 1 : 0,
          partner_losses: p.win ? 0 : 1,
          last_game_at: now,
        },
        {
          onConflict:
            "subject_riot_id,subject_region,partner_riot_id,partner_region",
        }
      );
    }
  } catch {
    /* best effort */
  }
}

export async function getFrequentTeammates(
  riotId: string,
  region: string,
  limit = 5
): Promise<
  {
    partnerRiotId: string;
    partnerRegion: string;
    gamesTogether: number;
    sameTeamCount: number;
    opposingCount: number;
  }[]
> {
  try {
    const { data } = await supabaseAdmin
      .from("match_cooccurrence")
      .select("*")
      .eq("subject_riot_id", riotId)
      .eq("subject_region", region)
      .gt("same_team_count", 0)
      .order("games_together", { ascending: false })
      .limit(limit);
    if (!data) return [];
    return data.map(
      (row: {
        partner_riot_id: string;
        partner_region: string;
        games_together: number;
        same_team_count: number;
        opposing_count: number;
      }) => ({
        partnerRiotId: row.partner_riot_id,
        partnerRegion: row.partner_region,
        gamesTogether: row.games_together,
        sameTeamCount: row.same_team_count,
        opposingCount: row.opposing_count,
      })
    );
  } catch {
    return [];
  }
}

export async function getProfilesViewedSince(
  since: Date
): Promise<{ riot_id: string; region: string }[]> {
  try {
    const { data } = await supabaseAdmin
      .from("profile_cache")
      .select("riot_id, region")
      .gte("last_viewed", since.toISOString())
      .order("last_viewed", { ascending: false });
    return (data as { riot_id: string; region: string }[]) ?? [];
  } catch {
    return [];
  }
}

export async function getRivalryData(
  playerA: { riotId: string; region: string },
  playerB: { riotId: string; region: string }
) {
  try {
    const { data } = await supabaseAdmin
      .from("match_cooccurrence")
      .select("*")
      .eq("subject_riot_id", playerA.riotId)
      .eq("subject_region", playerA.region)
      .eq("partner_riot_id", playerB.riotId)
      .eq("partner_region", playerB.region)
      .maybeSingle();
    return data as {
      games_together: number;
      same_team_count: number;
      opposing_count: number;
      partner_wins: number;
      partner_losses: number;
      last_game_at: string;
    } | null;
  } catch {
    return null;
  }
}
