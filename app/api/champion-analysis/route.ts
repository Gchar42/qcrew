import { NextResponse } from "next/server";
import { computeChampionAnalysis } from "@/lib/championAnalysis";
import type { ProfileBundle } from "@/app/api/riot/profileBundle/route";
import { headers } from "next/headers";

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

  try {
    const headersList = await headers();
    const host = headersList.get("host") ?? "localhost:3000";
    const protocol = host.includes("localhost") ? "http" : "https";
    const baseUrl = `${protocol}://${host}`;

    const bundleUrl = `${baseUrl}/api/riot/profileBundle?riotId=${encodeURIComponent(riotId)}&region=${encodeURIComponent(region)}&queue=solo`;
    const bundleRes = await fetch(bundleUrl, { cache: "no-store" });

    if (!bundleRes.ok) {
      const body = await bundleRes.json().catch(() => ({}));
      return NextResponse.json(
        { error: body.error || "Failed to load profile" },
        { status: bundleRes.status }
      );
    }

    const bundle: ProfileBundle = await bundleRes.json();
    const matches = bundle.matches ?? [];
    const puuid = bundle.profile?.account?.puuid;

    if (!puuid) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 });
    }

    const champMatches = matches.filter((m) =>
      m.info.participants.some(
        (p) => p.puuid === puuid && p.championName === champion
      )
    );

    if (champMatches.length === 0) {
      return NextResponse.json(
        { error: `No games found on ${champion}` },
        { status: 404 }
      );
    }

    const soloEntry = bundle.ranked?.solo;
    const tier = soloEntry?.tier ?? "GOLD";
    const rank = soloEntry?.rank ?? "IV";

    const analysis = computeChampionAnalysis(
      matches,
      puuid,
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
