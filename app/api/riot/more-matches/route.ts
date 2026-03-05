import { NextResponse } from "next/server";
import { SEASON_START_MS } from "@/lib/season";
import type { MatchDto } from "@/types/riot";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const NO_CACHE = { "Cache-Control": "no-store, max-age=0" };

function getBaseUrl(request: Request): string {
  const host = request.headers.get("host") ?? process.env.VERCEL_URL ?? "localhost:3000";
  const proto = request.headers.get("x-forwarded-proto") ?? (host.includes("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

/**
 * GET /api/riot/more-matches?puuid=&region=&queue=solo|flex&start=20&count=20
 * Returns the next page of match details for profile "Show more". Uses same match-ids + match fetch as profile bundle.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const puuid = searchParams.get("puuid");
  const region = searchParams.get("region") ?? "na1";
  const queue = searchParams.get("queue") ?? "solo";
  const start = searchParams.get("start") ?? "20";
  const count = searchParams.get("count") ?? "20";
  const queueId = queue === "flex" ? "440" : "420";

  if (!puuid) {
    return NextResponse.json({ error: "Missing puuid", status: 400 }, { status: 400, headers: NO_CACHE });
  }

  const baseUrl = getBaseUrl(request);
  const seasonStartSec = Math.floor(SEASON_START_MS / 1000);
  const matchIdsUrl = `${baseUrl}/api/riot/match-ids?puuid=${encodeURIComponent(puuid)}&region=${encodeURIComponent(region)}&start=${encodeURIComponent(start)}&count=${encodeURIComponent(count)}&queueId=${queueId}&startTime=${seasonStartSec}`;
  const matchIdsRes = await fetch(matchIdsUrl);
  if (!matchIdsRes.ok) {
    const err = await matchIdsRes.json().catch(() => ({}));
    return NextResponse.json(
      { error: (err as { error?: string }).error ?? "Match list failed", status: matchIdsRes.status },
      { status: matchIdsRes.status, headers: NO_CACHE }
    );
  }
  const { matchIds } = (await matchIdsRes.json()) as { matchIds?: string[] };
  const idList = Array.isArray(matchIds) ? matchIds : [];
  if (idList.length === 0) {
    return NextResponse.json({ matches: [] }, { headers: NO_CACHE });
  }

  const matches: MatchDto[] = [];
  const concurrency = 3;
  for (let i = 0; i < idList.length; i += concurrency) {
    const chunk = idList.slice(i, i + concurrency);
    const results = await Promise.all(
      chunk.map((matchId) =>
        fetch(
          `${baseUrl}/api/riot/match?matchId=${encodeURIComponent(matchId)}&region=${encodeURIComponent(region)}`
        ).then((r) => (r.ok ? r.json() : null))
      )
    );
    results.forEach((m) => {
      if (m) matches.push(m as MatchDto);
    });
  }

  return NextResponse.json({ matches }, { headers: NO_CACHE });
}
