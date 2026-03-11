import { NextRequest, NextResponse } from "next/server";
import { getAccount, getSummoner } from "@/lib/riot-api";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { setRiotSessionCookie } from "@/lib/riotSession";

const VERIFICATION_ICONS = [
  { id: 29, name: "Poro" },
  { id: 28, name: "Blue Minion" },
  { id: 23, name: "Dog" },
  { id: 25, name: "Bunny" },
  { id: 7, name: "Rose" },
  { id: 10, name: "Skull" },
  { id: 19, name: "Sword" },
  { id: 20, name: "Star" },
];

/**
 * POST /api/auth/riot/verify - Start or check verification
 *
 * Body: { action: "start" | "check", gameName, tagLine, region? }
 *
 * "start": Looks up the account, picks a challenge icon, stores it.
 * "check": Looks up the summoner, checks if icon matches challenge.
 */
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { action, gameName, tagLine, region = "na1" } = body;

  if (!gameName || !tagLine) {
    return Response.json({ error: "Riot ID required (gameName#tagLine)" }, { status: 400 });
  }

  if (action === "start") {
    return handleStart(gameName, tagLine, region);
  } else if (action === "check") {
    return handleCheck(gameName, tagLine, region);
  }

  return Response.json({ error: "Invalid action" }, { status: 400 });
}

async function handleStart(gameName: string, tagLine: string, region: string) {
  try {
    const account = await getAccount(region, gameName, tagLine);
    if (!account) {
      return Response.json({ error: "Account not found. Check your Riot ID and try again." }, { status: 404 });
    }

    const summoner = await getSummoner(region, account.puuid);
    if (!summoner) {
      return Response.json({ error: "Summoner not found in this region." }, { status: 404 });
    }

    // Pick a random icon that's different from their current one
    const available = VERIFICATION_ICONS.filter((i) => i.id !== summoner.profileIconId);
    const challenge = available[Math.floor(Math.random() * available.length)];

    // Store challenge in Supabase
    await supabaseAdmin.from("verification_challenges").upsert(
      {
        puuid: account.puuid,
        riot_id: `${account.gameName}#${account.tagLine}`,
        region,
        challenge_icon_id: challenge.id,
        current_icon_id: summoner.profileIconId,
        created_at: new Date().toISOString(),
      },
      { onConflict: "puuid" }
    );

    return Response.json({
      success: true,
      puuid: account.puuid,
      riotId: `${account.gameName}#${account.tagLine}`,
      currentIconId: summoner.profileIconId,
      challengeIcon: challenge,
      summonerLevel: summoner.summonerLevel,
    });
  } catch (err) {
    console.error("Verify start error:", err);
    const msg = err instanceof Error ? err.message : "Failed to look up account";
    return Response.json({ error: msg }, { status: 500 });
  }
}

async function handleCheck(gameName: string, tagLine: string, region: string) {
  try {
    const account = await getAccount(region, gameName, tagLine);
    if (!account) {
      return Response.json({ error: "Account not found." }, { status: 404 });
    }

    // Get the stored challenge
    const { data: challenge } = await supabaseAdmin
      .from("verification_challenges")
      .select("*")
      .eq("puuid", account.puuid)
      .single();

    if (!challenge) {
      return Response.json({ error: "No verification in progress. Please start verification first." }, { status: 400 });
    }

    // Check if challenge is expired (15 minutes)
    const elapsed = Date.now() - new Date(challenge.created_at).getTime();
    if (elapsed > 15 * 60 * 1000) {
      await supabaseAdmin.from("verification_challenges").delete().eq("puuid", account.puuid);
      return Response.json({ error: "Verification expired. Please start again." }, { status: 410 });
    }

    // Fetch fresh summoner data (bypass cache)
    const summoner = await getSummoner(region, account.puuid);
    if (!summoner) {
      return Response.json({ error: "Could not fetch summoner data." }, { status: 500 });
    }

    if (summoner.profileIconId !== challenge.challenge_icon_id) {
      return Response.json({
        verified: false,
        currentIconId: summoner.profileIconId,
        expectedIconId: challenge.challenge_icon_id,
        message: `Your icon is still not set to the verification icon. Please change it in the League client and try again.`,
      });
    }

    // Verified! Now fetch ranked data
    const summonerId = summoner.id;
    let tier = null;
    let rank = null;
    let lp = 0;

    try {
      const rankedRes = await fetch(
        `https://${region}.api.riotgames.com/lol/league/v4/entries/by-summoner/${summonerId}`,
        { cache: "no-store", headers: { "X-Riot-Token": process.env.RIOT_API_KEY ?? "" } }
      );
      if (rankedRes.ok) {
        const entries = await rankedRes.json();
        const soloQ = entries.find((e: { queueType: string }) => e.queueType === "RANKED_SOLO_5x5");
        if (soloQ) {
          tier = soloQ.tier;
          rank = soloQ.rank;
          lp = soloQ.leaguePoints ?? 0;
        }
      }
    } catch {}

    // Upsert guide_authors
    await supabaseAdmin.from("guide_authors").upsert(
      {
        riot_puuid: account.puuid,
        riot_id: `${account.gameName}#${account.tagLine}`,
        region,
        tier,
        rank,
        lp,
        avatar_icon_id: challenge.current_icon_id,
        verified_at: new Date().toISOString(),
      },
      { onConflict: "riot_puuid" }
    );

    // Clean up challenge
    await supabaseAdmin.from("verification_challenges").delete().eq("puuid", account.puuid);

    // Set session cookie
    const cookie = setRiotSessionCookie(account.puuid);
    const response = NextResponse.json({
      verified: true,
      riotId: `${account.gameName}#${account.tagLine}`,
      tier,
      rank,
      lp,
    });
    response.cookies.set(cookie.name, cookie.value, cookie.options as Parameters<typeof response.cookies.set>[2]);

    return response;
  } catch (err) {
    console.error("Verify check error:", err);
    const msg = err instanceof Error ? err.message : "Verification failed";
    return Response.json({ error: msg }, { status: 500 });
  }
}
