import { NextResponse } from "next/server";
import { getAccount, getMatch, getMatchIds, getSummoner } from "@/lib/riot-api";
import { computeChampionAnalysis } from "@/lib/championAnalysis";
import type { MatchDto } from "@/types/riot";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const riotId = searchParams.get("riotId") ?? "";
  const region = searchParams.get("region") ?? "na1";
  const champion = searchParams.get("champion") ?? "";

  if (!riotId || !champion) {
    return NextResponse.json(
      { error: "riotId and champion are required" },
      { status: 400 }
    );
  }

  const [gameName, tagLine] = riotId.includes("#")
    ? riotId.split("#")
    : [riotId, "NA1"];

  try {
    const account = await getAccount(region, gameName, tagLine);
    if (!account) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 });
    }

    const summoner = await getSummoner(region, account.puuid);

    let leagueEntries: Array<{
      queueType: string;
      tier: string;
      rank: string;
      leaguePoints: number;
      wins: number;
      losses: number;
    }> = [];

    const apiKey = process.env.RIOT_API_KEY;
    if (apiKey && summoner) {
      const platformMap: Record<string, string> = {
        na1: "na1", euw1: "euw1", eun1: "eun1", kr: "kr", br1: "br1",
        jp1: "jp1", la1: "la1", la2: "la2", oc1: "oc1", tr1: "tr1",
        ru: "ru", ph2: "ph2", sg2: "sg2", th2: "th2", tw2: "tw2", vn2: "vn2",
      };
      const platform = platformMap[region.toLowerCase()] ?? region;
      const summonerId = summoner.encryptedSummonerId ?? summoner.id;

      try {
        const leagueRes = await fetch(
          `https://${platform}.api.riotgames.com/lol/league/v4/entries/by-summoner/${summonerId}`,
          { headers: { "X-Riot-Token": apiKey } }
        );
        if (leagueRes.ok) {
          leagueEntries = await leagueRes.json();
        }
      } catch { /* proceed without rank data */ }
    }

    const soloEntry = leagueEntries.find((e) => e.queueType === "RANKED_SOLO_5x5");
    const tier = soloEntry?.tier ?? "GOLD";
    const rank = soloEntry?.rank ?? "IV";

    const matchIds = await getMatchIds(region, account.puuid, 60);
    const matches: MatchDto[] = [];

    const BATCH_SIZE = 10;
    for (let i = 0; i < matchIds.length; i += BATCH_SIZE) {
      const batch = matchIds.slice(i, i + BATCH_SIZE);
      const results = await Promise.allSettled(
        batch.map((id) => getMatch(region, id))
      );
      for (const r of results) {
        if (r.status === "fulfilled" && r.value) {
          matches.push(r.value);
        }
      }
    }

    const champMatches = matches.filter((m) =>
      m.info.participants.some(
        (p) => p.puuid === account.puuid && p.championName === champion
      )
    );

    if (champMatches.length === 0) {
      return NextResponse.json(
        { error: `No games found on ${champion}` },
        { status: 404 }
      );
    }

    const analysis = computeChampionAnalysis(
      matches,
      account.puuid,
      champion,
      riotId,
      region,
      tier,
      rank
    );

    return NextResponse.json(analysis);
  } catch (err) {
    console.error("Champion analysis error:", err);
    return NextResponse.json(
      { error: "Failed to compute analysis" },
      { status: 500 }
    );
  }
}
