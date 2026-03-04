import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { rankToNumber, numberToRankLabel } from "@/lib/rankMapping";
import type { AccountDto, SummonerDto, LeagueEntryDto, MatchDto } from "@/types/riot";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const STALE_AFTER_SEC = 120;
const CACHE_HEADERS = {
  "Cache-Control": "public, s-maxage=30, stale-while-revalidate=120",
};
const NO_CACHE = { "Cache-Control": "no-store, max-age=0" };

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

async function fetchFromRiot(
  baseUrl: string,
  region: string,
  queue: "solo" | "flex",
  parsed: { gameName: string; tagLine: string }
): Promise<ProfileBundle> {
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

  const [summonerRes, matchIdsRes] = await Promise.all([
    fetch(`${baseUrl}/api/riot/summoner?puuid=${encodeURIComponent(account.puuid)}&region=${region}`),
    fetch(
      `${baseUrl}/api/riot/match-ids?puuid=${encodeURIComponent(account.puuid)}&region=${region}&count=20&queueId=${queueId}`
    ),
  ]);

  if (!summonerRes.ok) throw new Error("Summoner lookup failed");
  const summoner = (await summonerRes.json()) as SummonerDto;

  if (!matchIdsRes.ok) throw new Error("Match list failed");
  const { matchIds } = (await matchIdsRes.json()) as { matchIds: string[] };
  const matchIdList = (matchIds ?? []).slice(0, 20);

  const leagueRes = await fetch(
    `${baseUrl}/api/riot/league?puuid=${encodeURIComponent(account.puuid)}&platform=${platform}`
  );
  let leagueEntries: LeagueEntryDto[] = [];
  if (leagueRes.ok) {
    const raw = await leagueRes.text();
    try {
      const arr = JSON.parse(raw) as LeagueEntryDto[];
      leagueEntries = Array.isArray(arr) ? arr : [];
    } catch {
      /* ignore */
    }
  }

  const soloEntry = leagueEntries.find((e) => e.queueType === "RANKED_SOLO_5x5") ?? null;
  const flexEntry = leagueEntries.find((e) => e.queueType === "RANKED_FLEX_SR") ?? null;

  const matches: MatchDto[] = [];
  const concurrency = 3;
  for (let i = 0; i < matchIdList.length; i += concurrency) {
    const chunk = matchIdList.slice(i, i + concurrency);
    const results = await Promise.all(
      chunk.map((matchId) =>
        fetch(
          `${baseUrl}/api/riot/match?matchId=${encodeURIComponent(matchId)}&region=${region}&puuid=${encodeURIComponent(account.puuid)}&gameName=${encodeURIComponent(account.gameName)}&tagLine=${encodeURIComponent(account.tagLine)}`
        ).then((r) => (r.ok ? r.json() : null))
      )
    );
    results.forEach((m) => {
      if (m) matches.push(m as MatchDto);
    });
  }

  const summonerIds = new Set<string>();
  matches.forEach((m) =>
    m.info?.participants?.forEach((p) => {
      if (p.summonerId) summonerIds.add(p.summonerId);
    })
  );
  const idList = [...summonerIds].slice(0, 100);
  let leagueEntriesBySummonerId: Record<string, LeagueEntryDto[]> = {};
  if (idList.length > 0) {
    const batchRes = await fetch(
      `${baseUrl}/api/riot/league-batch?summonerIds=${idList.map((id) => encodeURIComponent(id)).join(",")}&platform=${platform}`
    );
    if (batchRes.ok) {
      const data = (await batchRes.json()) as { entries?: Record<string, LeagueEntryDto[]> };
      leagueEntriesBySummonerId = data.entries ?? {};
    }
  }

  const n = matches.length || 1;
  let avgKills = 0,
    avgDeaths = 0,
    avgAssists = 0,
    totalCs = 0,
    totalDurationSec = 0;
  const participant = (m: MatchDto) => m.info?.participants?.find((p) => p.puuid === account.puuid);
  matches.forEach((m) => {
    const p = participant(m);
    if (p) {
      avgKills += p.kills ?? 0;
      avgDeaths += p.deaths ?? 0;
      avgAssists += p.assists ?? 0;
      totalCs += (p.totalMinionsKilled ?? 0) + (p.neutralMinionsKilled ?? 0);
    }
    totalDurationSec += m.info?.gameDuration ?? 0;
  });
  avgKills = Math.round((avgKills / n) * 10) / 10;
  avgDeaths = Math.round((avgDeaths / n) * 10) / 10;
  avgAssists = Math.round((avgAssists / n) * 10) / 10;
  const avgDurationMin = totalDurationSec / 60 / n;
  const avgCsPerMin = totalDurationSec > 0 ? totalCs / (totalDurationSec / 60) : 0;

  const values: number[] = [];
  const targetSolo = "RANKED_SOLO_5x5";
  idList.forEach((id) => {
    const list = leagueEntriesBySummonerId[id] ?? [];
    const solo = list.find((e) => e.queueType === targetSolo && e.tier && e.rank);
    if (!solo?.tier || !solo?.rank) return;
    const numeric = rankToNumber(solo.tier, solo.rank);
    if (numeric != null && Number.isFinite(numeric)) values.push(numeric);
  });
  const avgRankPlayedAgainst =
    values.length > 0 ? numberToRankLabel(values.reduce((a, b) => a + b, 0) / values.length) : "Unranked";

  return {
    profile: { account, summoner },
    ranked: { solo: soloEntry, flex: flexEntry },
    matches,
    computed: {
      matchCount: matches.length,
      avgKda: `${avgKills}/${avgDeaths}/${avgAssists}`,
      csPerMin: Math.round(avgCsPerMin * 10) / 10,
      avgDuration: Math.round(avgDurationMin * 10) / 10,
      avgRankPlayedAgainst,
      avgRankRankedCount: values.length,
    },
    leagueEntriesBySummonerId,
  };
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

  const { data: row, error: selectError } = await supabaseAdmin
    .from("profile_snapshots")
    .select("puuid, data, fetched_at, stale_after_sec")
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

  const snapshot = row as ProfileSnapshotRow | null;
  const now = Date.now();
  const fetchedAt = snapshot?.fetched_at ? new Date(snapshot.fetched_at).getTime() : 0;
  const ageSec = (now - fetchedAt) / 1000;
  const staleSec = snapshot?.stale_after_sec ?? STALE_AFTER_SEC;
  const isFresh = ageSec <= staleSec;

  if (snapshot?.data && isFresh) {
    return NextResponse.json(snapshot.data, { status: 200, headers: CACHE_HEADERS });
  }

  if (snapshot?.data && !isFresh) {
    const baseUrl = getBaseUrl(request);
    void fetchFromRiot(baseUrl, region, queue, parsed)
      .then((bundle) =>
        supabaseAdmin.from("profile_snapshots").upsert(
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
        )
      )
      .catch((e) => console.error("[profileBundle] background refresh failed:", e));
    return NextResponse.json(snapshot.data, { status: 200, headers: CACHE_HEADERS });
  }

  const baseUrl = getBaseUrl(request);
  let bundle: ProfileBundle;
  try {
    bundle = await fetchFromRiot(baseUrl, region, queue, parsed);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to load profile";
    return NextResponse.json(
      { error: message, status: 502 },
      { status: 502, headers: NO_CACHE }
    );
  }

  const { error: upsertError } = await supabaseAdmin.from("profile_snapshots").upsert(
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

  if (upsertError) {
    console.error("[profileBundle] Supabase upsert error:", upsertError);
  }

  return NextResponse.json(bundle, { status: 200, headers: CACHE_HEADERS });
}
