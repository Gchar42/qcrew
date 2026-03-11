import { NextRequest, NextResponse } from "next/server";
import { setRiotSessionCookie } from "@/lib/riotSession";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

/**
 * Riot RSO OAuth2 - Step 2: Handle callback, exchange code for token,
 * fetch PUUID, look up ranked data, and upsert guide_authors.
 */
export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const stateParam = req.nextUrl.searchParams.get("state");

  let returnTo = "/guides";
  if (stateParam) {
    try {
      const parsed = JSON.parse(Buffer.from(stateParam, "base64url").toString());
      returnTo = parsed.returnTo ?? "/guides";
    } catch {}
  }

  if (!code) {
    return NextResponse.redirect(new URL(returnTo, req.url));
  }

  const clientId = process.env.RIOT_RSO_CLIENT_ID;
  const clientSecret = process.env.RIOT_RSO_CLIENT_SECRET;
  const redirectUri = process.env.RIOT_RSO_REDIRECT_URI;

  if (!clientId || !clientSecret || !redirectUri) {
    return NextResponse.redirect(new URL("/guides?error=config", req.url));
  }

  try {
    // Exchange code for access token
    const tokenRes = await fetch("https://auth.riotgames.com/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri,
      }),
    });

    if (!tokenRes.ok) {
      console.error("Riot token exchange failed:", await tokenRes.text());
      return NextResponse.redirect(new URL("/guides?error=auth", req.url));
    }

    const tokenData = await tokenRes.json();
    const accessToken = tokenData.access_token;

    // Get account info (PUUID, gameName, tagLine)
    const accountRes = await fetch("https://americas.api.riotgames.com/riot/account/v1/accounts/me", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!accountRes.ok) {
      return NextResponse.redirect(new URL("/guides?error=account", req.url));
    }

    const account = await accountRes.json();
    const { puuid, gameName, tagLine } = account;
    const riotId = `${gameName}#${tagLine}`;

    // Fetch summoner data for region NA1
    const summonerRes = await fetch(
      `https://na1.api.riotgames.com/lol/summoner/v4/summoners/by-puuid/${puuid}`,
      { headers: { "X-Riot-Token": process.env.RIOT_API_KEY ?? "" } }
    );

    let avatarIconId = 0;
    if (summonerRes.ok) {
      const summoner = await summonerRes.json();
      avatarIconId = summoner.profileIconId ?? 0;
    }

    // Fetch ranked data
    let tier = null;
    let rank = null;
    let lp = 0;
    if (summonerRes.ok) {
      const summonerData = await summonerRes.json().catch(() => null);
      const summonerId = summonerData?.id;
      if (summonerId) {
        const rankedRes = await fetch(
          `https://na1.api.riotgames.com/lol/league/v4/entries/by-summoner/${summonerId}`,
          { headers: { "X-Riot-Token": process.env.RIOT_API_KEY ?? "" } }
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
      }
    }

    // Upsert guide_authors
    await supabaseAdmin
      .from("guide_authors")
      .upsert(
        {
          riot_puuid: puuid,
          riot_id: riotId,
          region: "na1",
          tier,
          rank,
          lp,
          avatar_icon_id: avatarIconId,
          verified_at: new Date().toISOString(),
        },
        { onConflict: "riot_puuid" }
      );

    // Set session cookie
    const cookie = setRiotSessionCookie(puuid);
    const response = NextResponse.redirect(new URL(returnTo, req.url));
    response.cookies.set(cookie.name, cookie.value, cookie.options as Parameters<typeof response.cookies.set>[2]);

    return response;
  } catch (err) {
    console.error("Riot RSO callback error:", err);
    return NextResponse.redirect(new URL("/guides?error=unknown", req.url));
  }
}
