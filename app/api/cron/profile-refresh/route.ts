export const dynamic = "force-dynamic";
export const maxDuration = 300;

import { getProfilesViewedSince, upsertProfileCache, getProfileCache } from "@/lib/socialCache";
import { getRoutingRegion } from "@/lib/riot-regions";
import { inferDodge } from "@/lib/dodgeDetection";

/**
 * GET /api/cron/profile-refresh
 * Background job: refreshes cached profiles for any summoner viewed in the last 7 days.
 * Designed to run every 2 hours via Vercel cron.
 */
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (
    process.env.CRON_SECRET &&
    authHeader !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const apiKey = process.env.RIOT_API_KEY;
  if (!apiKey) {
    return Response.json({ error: "No RIOT_API_KEY" }, { status: 500 });
  }

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const profiles = await getProfilesViewedSince(sevenDaysAgo);

  let refreshed = 0;
  let failed = 0;

  for (const profile of profiles.slice(0, 200)) {
    try {
      const { riot_id, region } = profile;
      const [gameName, tagLine] = riot_id.split("#");
      if (!gameName || !tagLine) continue;

      const routing = getRoutingRegion(region);
      const accountRes = await fetch(
        `https://${routing}.api.riotgames.com/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(gameName)}/${encodeURIComponent(tagLine)}`,
        { headers: { "X-Riot-Token": apiKey }, cache: "no-store" }
      );
      if (!accountRes.ok) { failed++; continue; }
      const account = (await accountRes.json()) as { puuid: string };

      const summonerRes = await fetch(
        `https://${region}.api.riotgames.com/lol/summoner/v4/summoners/by-puuid/${encodeURIComponent(account.puuid)}`,
        { headers: { "X-Riot-Token": apiKey }, cache: "no-store" }
      );
      if (!summonerRes.ok) { failed++; continue; }
      const summoner = (await summonerRes.json()) as {
        id: string;
        profileIconId: number;
        summonerLevel: number;
      };

      const leagueRes = await fetch(
        `https://${region}.api.riotgames.com/lol/league/v4/entries/by-summoner/${encodeURIComponent(summoner.id)}`,
        { headers: { "X-Riot-Token": apiKey }, cache: "no-store" }
      );
      if (!leagueRes.ok) { failed++; continue; }
      const entries = (await leagueRes.json()) as Array<{
        queueType: string;
        tier: string;
        rank: string;
        leaguePoints: number;
        wins: number;
        losses: number;
      }>;

      const solo = entries.find((e) => e.queueType === "RANKED_SOLO_5x5");

      // Dodge detection: compare LP before and after refresh
      if (solo) {
        try {
          const cached = await getProfileCache(riot_id, region);
          if (cached && cached.league_points > 0) {
            const oldGames = cached.wins + cached.losses;
            const newGames = solo.wins + solo.losses;
            const newMatchesSinceLastCheck = newGames - oldGames;

            const dodge = inferDodge(
              cached.league_points,
              solo.leaguePoints,
              newMatchesSinceLastCheck,
            );
            if (dodge) {
              // TODO: persist to dodges table when available
              console.log(
                `[dodge-detect] ${riot_id} (${region}): -${dodge.lpLoss} LP, confidence=${dodge.confidence}`,
              );
            }
          }
        } catch {
          /* best effort — don't block refresh */
        }
      }

      await upsertProfileCache({
        riotId: riot_id,
        region,
        tier: solo?.tier ?? null,
        rank: solo?.rank ?? null,
        leaguePoints: solo?.leaguePoints ?? 0,
        wins: solo?.wins ?? 0,
        losses: solo?.losses ?? 0,
        profileIconId: summoner.profileIconId,
        summonerLevel: summoner.summonerLevel,
      });
      refreshed++;

      await new Promise((r) => setTimeout(r, 100));
    } catch {
      failed++;
    }
  }

  return Response.json({
    ok: true,
    total: profiles.length,
    refreshed,
    failed,
  });
}
