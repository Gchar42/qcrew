export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { isFakeRiotId, FAKE_PUUID } from "@/lib/fakeRiotData";
import {
  getSampleDodges,
  type DodgeEntry,
} from "@/lib/dodgeDetection";

/**
 * GET /api/dodges?riotId=Demo%23NA1&region=na1
 *
 * Returns dodge entries for a summoner.
 * For demo accounts, returns sample data.
 * For real accounts, queries the dodges table (not yet wired up).
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const riotId = searchParams.get("riotId");
  const region = searchParams.get("region");

  if (!riotId || !region) {
    return NextResponse.json(
      { error: "Missing riotId or region" },
      { status: 400 },
    );
  }

  if (isFakeRiotId(riotId)) {
    const dodges = getSampleDodges();
    return NextResponse.json({ dodges, puuid: FAKE_PUUID });
  }

  // Real account: query dodges table when available
  const dodges: DodgeEntry[] = [];
  return NextResponse.json({ dodges, puuid: null });
}
