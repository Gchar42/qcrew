import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import type { AccountDto, SummonerDto, LeagueEntryDto, MatchDto } from "@/types/riot";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const STALE_AFTER_SEC = 120;
const CACHE_HEADERS = {
  "Cache-Control": "s-maxage=60, stale-while-revalidate=300",
};
const NO_CACHE = { "Cache-Control": "no-store, max-age=0" };

async function refreshSnapshot(
  baseUrl: string,
  region: string,
  queue: "solo" | "flex",
  normRiotId: string
): Promise<void> {
  const [gameName, tagLine] = normRiotId.split("#").map((s) => s.trim());
  if (!gameName || !tagLine) return;
  const parsed = { gameName, tagLine };
  const bundle = await fetchBundleFromRiot(baseUrl, region, queue, parsed);
  await supabaseAdmin.from("profile_snapshots").upsert(
    {
      region,
      queue,
      riot_id: normRiotId,
      puuid: bundle.profile.account.puuid,
      data: bundle as unknown as Record<string, unknown>,
      fetched_at: new Date().toISOString(),
      stale_after_sec: STALE_AFTER_SEC,
    },
    { onConflict: "region,queue,riot_id" }
  );
}

type ProfileSnapshotRow = {
  region: string;
  queue: string;
  riot_id: string;
  puuid: string;
  data: ProfileBundle;
  fetched_at: string;
  stale_after_sec: number;
};

export type ProfileBundle = {
  profile: { account: AccountDto; summoner: SummonerDto };
  ranked: { solo: LeagueEntryDto | null; flex: LeagueEntryDto | null };
  matchIds: string[];
  matches: MatchDto[];
  computed: {
    matchCount: number;
    avgKda: string;
    csPerMin: number;
    avgDuration: number;
    avgRankPlayedAgainst: string;
    avgRankRankedCount: number;
  };
  leagueEntriesBySummonerId: Record<string, LeagueEntryDto[]>;
};

function getBaseUrl(request: Request): string {
  const host = request.headers.get("host") ?? process.env.VERCEL_URL ?? "localhost:3000";
  const proto = request.headers.get("x-forwarded-proto") ?? (host.includes("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

function normalizeRiotId(riotId: string): string {
  const decoded = decodeURIComponent(riotId.trim());
  if (!decoded.includes("#")) return decoded.toLowerCase();
  const [name, tag] = decoded.split("#").map((s) => s.trim());
  return `${(name ?? "").toLowerCase()}#${(tag ?? "").toLowerCase()}`;
}

async function fetchBundleFromRiot(
  baseUrl: string,
  region: string,
  queue: "solo" | "flex",
  parsed: { gameName: string; tagLine: string }
): Promise<ProfileBundle> {
  const startTime = Date.now();
  console.log("PROFILE FETCH START");

  const queueId = queue === "flex" ? 440 : 420;
  const platform = region;

  const accountRes = await fetch(
    `${baseUrl}/api/riot/account?gameName=${encodeURIComponent(parsed.gameName)}&tagLine=${encodeURIComponent(parsed.tagLine)}&region=${region}`
  );
  if (!accountRes.ok) {
    const err = await accountRes.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error ?? "Account lookup failed");
  }
  const account = (await accountRes.json()) as AccountDto;

  const [summoner, matchIdList, leagueEntries] = await Promise.all([
    fetch(`${baseUrl}/api/riot/summoner?puuid=${encodeURIComponent(account.puuid)}&region=${region}`).then(
      async (r) => {
        if (!r.ok) throw new Error("Summoner lookup failed");
        return r.json() as Promise<SummonerDto>;
      }
    ),
    fetch(
      `${baseUrl}/api/riot/match-ids?puuid=${encodeURIComponent(account.puuid)}&region=${region}&count=20&queueId=${queueId}`
    ).then(async (r) => {
      if (!r.ok) throw new Error("Match list failed");
      const data = (await r.json()) as { matchIds: string[] };
      return (data.matchIds ?? []).slice(0, 20);
    }),
    fetch(`${baseUrl}/api/riot/league?puuid=${encodeURIComponent(account.puuid)}&platform=${platform}`).then(
      async (r) => {
        if (!r.ok) return [] as LeagueEntryDto[];
        try {
          const arr = JSON.parse(await r.text()) as LeagueEntryDto[];
          return Array.isArray(arr) ? arr : [];
        } catch {
          return [] as LeagueEntryDto[];
        }
      }
    ),
  ]);

  console.log("RANK FETCH END", Date.now() - startTime);
  console.log("MATCH LIST FETCH END", Date.now() - startTime);

  const soloEntry = leagueEntries.find((e) => e.queueType === "RANKED_SOLO_5x5") ?? null;
  const flexEntry = leagueEntries.find((e) => e.queueType === "RANKED_FLEX_SR") ?? null;

  const bundle: ProfileBundle = {
    profile: { account, summoner },
    ranked: { solo: soloEntry, flex: flexEntry },
    matchIds: matchIdList,
    matches: [],
    computed: {
      matchCount: matchIdList.length,
      avgKda: "0/0/0",
      csPerMin: 0,
      avgDuration: 0,
      avgRankPlayedAgainst: "Unranked",
      avgRankRankedCount: 0,
    },
    leagueEntriesBySummonerId: {},
  };

  console.log("PROFILE FETCH END", Date.now() - startTime);
  return bundle;
}

export async function GET(request: Request) {
  const riotApiKey = process.env.RIOT_API_KEY;
  if (!riotApiKey) {
    return NextResponse.json(
      { error: "Riot API key not configured", status: 500 },
      { status: 500, headers: NO_CACHE }
    );
  }

  const { searchParams } = new URL(request.url);
  const riotIdParam = searchParams.get("riotId");
  const region = searchParams.get("region") ?? "na1";
  const queue = (searchParams.get("queue") ?? "solo") === "flex" ? "flex" : "solo";

  if (!riotIdParam || !riotIdParam.trim()) {
    return NextResponse.json(
      { error: "Missing riotId", status: 400 },
      { status: 400, headers: NO_CACHE }
    );
  }

  const normRiotId = normalizeRiotId(riotIdParam);
  if (!normRiotId.includes("#")) {
    return NextResponse.json(
      { error: "Invalid riotId (expected GameName#Tag)", status: 400 },
      { status: 400, headers: NO_CACHE }
    );
  }

  const [gameName, tagLine] = normRiotId.split("#").map((s) => s.trim());
  if (!gameName || !tagLine) {
    return NextResponse.json(
      { error: "Invalid riotId (expected GameName#Tag)", status: 400 },
      { status: 400, headers: NO_CACHE }
    );
  }
  const parsed = { gameName, tagLine };

  const { data: snapshot, error: selectError } = await supabaseAdmin
    .from("profile_snapshots")
    .select("*")
    .eq("region", region)
    .eq("queue", queue)
    .eq("riot_id", normRiotId)
    .maybeSingle();

  if (selectError) {
    console.error("[profileBundle] Supabase select error:", selectError);
    return NextResponse.json(
      { error: "Cache lookup failed", status: 500 },
      { status: 500, headers: NO_CACHE }
    );
  }

  const row = snapshot as ProfileSnapshotRow | null;

  if (row?.data) {
    const ageSec = (Date.now() - new Date(row.fetched_at).getTime()) / 1000;
    const stale = ageSec > (row.stale_after_sec ?? STALE_AFTER_SEC);

    if (!stale) {
      return NextResponse.json(row.data, {
        headers: CACHE_HEADERS,
      });
    }

    const baseUrl = getBaseUrl(request);
    refreshSnapshot(baseUrl, region, queue, normRiotId).catch(() => {});

    return NextResponse.json(row.data, {
      headers: CACHE_HEADERS,
    });
  }

  const baseUrl = getBaseUrl(request);
  let bundle: ProfileBundle;
  try {
    bundle = await fetchBundleFromRiot(baseUrl, region, queue, parsed);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to load profile";
    return NextResponse.json(
      { error: message, status: 502 },
      { status: 502, headers: NO_CACHE }
    );
  }

  await supabaseAdmin.from("profile_snapshots").upsert(
    {
      region,
      queue,
      riot_id: normRiotId,
      puuid: bundle.profile.account.puuid,
      data: bundle as unknown as Record<string, unknown>,
      fetched_at: new Date().toISOString(),
      stale_after_sec: STALE_AFTER_SEC,
    },
    { onConflict: "region,queue,riot_id" }
  );

  return NextResponse.json(bundle, { status: 200, headers: CACHE_HEADERS });
}
