import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { getSummoner } from "@/lib/riot-api";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * POST /api/cron/seed-summoners
 *
 * One-time helper to populate the `summoners` table from existing
 * `profile_cache` (has riot_id + region + rank) joined with
 * `riot_searches` (has puuid). Also fetches summoner_id from Riot
 * for each player so the aggregate cron can look up league entries.
 *
 * Auth: CRON_SECRET (Bearer header or ?secret= query param).
 */
export async function POST(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get("authorization");
    const query = req.nextUrl.searchParams.get("secret");
    if (auth !== `Bearer ${secret}` && query !== secret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const db = supabaseServer();

  // 1. Get all profile_cache entries (riot_id, region, rank info)
  const { data: profiles, error: profileErr } = await db
    .from("profile_cache")
    .select(
      "riot_id, region, tier, rank, league_points, profile_icon_id, summoner_level",
    )
    .order("last_viewed", { ascending: false })
    .limit(500);

  if (profileErr || !profiles?.length) {
    return NextResponse.json({
      ok: true,
      message: "No profiles found in profile_cache",
      error: profileErr?.message,
    });
  }

  // 2. Get all riot_searches entries (puuid by riot_id)
  const riotIds = profiles.map((p) => p.riot_id);
  const { data: searches } = await db
    .from("riot_searches")
    .select("puuid, riot_id")
    .in("riot_id", riotIds);

  const puuidByRiotId = new Map<string, string>();
  if (searches) {
    for (const s of searches) {
      puuidByRiotId.set(s.riot_id, s.puuid);
    }
  }

  let seeded = 0;
  let skipped = 0;
  let apiCalls = 0;
  const errors: string[] = [];

  for (const profile of profiles) {
    const puuid = puuidByRiotId.get(profile.riot_id);
    if (!puuid) {
      skipped++;
      continue;
    }

    // Check if already in summoners
    const { data: existing } = await db
      .from("summoners")
      .select("puuid")
      .eq("puuid", puuid)
      .single();

    if (existing) {
      skipped++;
      continue;
    }

    // Fetch summoner_id from Riot (needed for league entry lookups)
    let summonerId: string | null = null;
    try {
      const summoner = await getSummoner(profile.region, puuid);
      if (summoner) {
        summonerId = summoner.id ?? summoner.encryptedSummonerId ?? null;
      }
      apiCalls++;
    } catch (err) {
      errors.push(`getSummoner ${profile.riot_id}: ${err}`);
    }

    const rankSolo =
      profile.tier && profile.rank
        ? `${profile.tier} ${profile.rank}`
        : null;

    const { error: insertErr } = await db.from("summoners").upsert(
      {
        puuid,
        summoner_id: summonerId,
        riot_id: profile.riot_id,
        region: profile.region,
        profile_icon_id: profile.profile_icon_id,
        summoner_level: profile.summoner_level,
        rank_solo: rankSolo,
        rank_flex: null,
        lp_solo: profile.league_points,
        lp_flex: null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "puuid" },
    );

    if (insertErr) {
      errors.push(`insert ${profile.riot_id}: ${insertErr.message}`);
    } else {
      seeded++;
    }

    // Rate limit: 50ms between Riot API calls
    if (apiCalls > 0) {
      await new Promise((r) => setTimeout(r, 50));
    }
  }

  return NextResponse.json({
    ok: true,
    profilesFound: profiles.length,
    seeded,
    skipped,
    apiCalls,
    errors: errors.length > 0 ? errors : undefined,
  });
}

export async function GET(req: NextRequest) {
  return POST(req);
}
