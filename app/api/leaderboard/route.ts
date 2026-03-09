export const dynamic = "force-dynamic";
export const revalidate = 0;

import { getRoutingRegion } from "@/lib/riot-regions";
import { getPlaceholderEntries } from "@/lib/leaderboardPlaceholder";

const VALID_TIERS = ["challenger", "grandmaster", "master"] as const;
type ValidTier = (typeof VALID_TIERS)[number];

type RawEntry = {
  summonerId: string;
  puuid?: string;
  summonerName?: string;
  leaguePoints: number;
  rank: string;
  wins: number;
  losses: number;
  veteran: boolean;
  inactive: boolean;
  freshBlood: boolean;
  hotStreak: boolean;
};

type CachedLeague = {
  entries: (RawEntry & { tier: string })[];
  expiresAt: number;
};
type CachedName = { name: string; expiresAt: number };

const leagueCache = new Map<string, CachedLeague>();
const nameCache = new Map<string, CachedName>();

const LEAGUE_TTL = 30 * 60 * 1000;
const NAME_TTL = 24 * 60 * 60 * 1000;

function buildPlaceholderResponse(
  tiers: string[],
  tierFilter: string,
  region: string,
  queue: string,
  page: number,
  pageSize: number
) {
  const all = getPlaceholderEntries(tiers);
  const start = (page - 1) * pageSize;
  const pageEntries = all.slice(start, start + pageSize);

  const entries = pageEntries.map((e, i) => {
    const total = e.wins + e.losses;
    return {
      rank: start + i + 1,
      summonerName: e.name,
      puuid: "",
      tier: e.tier,
      leaguePoints: e.lp,
      wins: e.wins,
      losses: e.losses,
      winRate: total > 0 ? Math.round((e.wins / total) * 100) : 0,
      hotStreak: e.hotStreak,
      veteran: e.veteran,
      freshBlood: e.freshBlood,
      role: e.role,
    };
  });

  return Response.json(
    {
      entries,
      total: all.length,
      page,
      pageSize,
      tierFilter,
      region,
      queue,
      source: "placeholder",
    },
    { headers: { "Cache-Control": "public, s-maxage=60" } }
  );
}

async function fetchLeagueTier(
  platform: string,
  tier: ValidTier,
  queue: string,
  apiKey: string
): Promise<(RawEntry & { tier: string })[]> {
  const url = `https://${platform}.api.riotgames.com/lol/league/v4/${tier}leagues/by-queue/${queue}`;
  const res = await fetch(url, {
    headers: { "X-Riot-Token": apiKey },
    cache: "no-store",
  });
  if (!res.ok) return [];

  const data = (await res.json()) as { tier?: string; entries?: RawEntry[] };
  const tierLabel = (data.tier ?? tier).toUpperCase();
  return (data.entries ?? []).map((e) => ({ ...e, tier: tierLabel }));
}

async function getLeagueEntries(
  platform: string,
  tiers: ValidTier[],
  queue: string,
  apiKey: string
): Promise<(RawEntry & { tier: string })[]> {
  const cacheKey = `${platform}:${queue}:${tiers.join("+")}`;
  const now = Date.now();
  const cached = leagueCache.get(cacheKey);
  if (cached && cached.expiresAt > now) return cached.entries;

  const results = await Promise.all(
    tiers.map((t) => fetchLeagueTier(platform, t, queue, apiKey))
  );
  const entries = results
    .flat()
    .sort((a, b) => b.leaguePoints - a.leaguePoints);

  leagueCache.set(cacheKey, { entries, expiresAt: now + LEAGUE_TTL });
  return entries;
}

async function resolveNames(
  puuids: string[],
  routingRegion: string,
  apiKey: string
): Promise<void> {
  const now = Date.now();
  const toResolve = puuids.filter((p) => {
    const c = nameCache.get(p);
    return !c || c.expiresAt < now;
  });
  if (toResolve.length === 0) return;

  const BATCH = 20;
  for (let i = 0; i < toResolve.length; i += BATCH) {
    const batch = toResolve.slice(i, i + BATCH);
    await Promise.allSettled(
      batch.map(async (puuid) => {
        try {
          const res = await fetch(
            `https://${routingRegion}.api.riotgames.com/riot/account/v1/accounts/by-puuid/${encodeURIComponent(puuid)}`,
            { headers: { "X-Riot-Token": apiKey }, cache: "no-store" }
          );
          if (res.ok) {
            const d = (await res.json()) as {
              gameName?: string;
              tagLine?: string;
            };
            if (d.gameName) {
              nameCache.set(puuid, {
                name: `${d.gameName}#${d.tagLine ?? ""}`,
                expiresAt: now + NAME_TTL,
              });
            }
          }
        } catch {
          /* skip failures */
        }
      })
    );
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const platform = searchParams.get("region") ?? "na1";
  const tierParam = (searchParams.get("tier") ?? "all").toLowerCase();
  const queue =
    searchParams.get("queue") === "flex"
      ? "RANKED_FLEX_SR"
      : "RANKED_SOLO_5x5";
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const pageSize = 100;

  const tiers: ValidTier[] =
    tierParam === "all"
      ? [...VALID_TIERS]
      : VALID_TIERS.includes(tierParam as ValidTier)
        ? [tierParam as ValidTier]
        : [...VALID_TIERS];

  const tierFilterLabel = tierParam.toUpperCase();
  const tierKeys = tiers as unknown as string[];

  // --- Try live Riot API first ---
  const apiKey = process.env.RIOT_API_KEY ?? "";
  if (!apiKey) {
    return buildPlaceholderResponse(
      tierKeys,
      tierFilterLabel,
      platform,
      queue,
      page,
      pageSize
    );
  }

  try {
    const allEntries = await getLeagueEntries(platform, tiers, queue, apiKey);

    if (allEntries.length === 0) {
      return buildPlaceholderResponse(
        tierKeys,
        tierFilterLabel,
        platform,
        queue,
        page,
        pageSize
      );
    }

    const start = (page - 1) * pageSize;
    const pageEntries = allEntries.slice(start, start + pageSize);

    const routingRegion = getRoutingRegion(platform);
    const puuidsToResolve = pageEntries
      .map((e) => e.puuid)
      .filter((p): p is string => !!p && !nameCache.has(p));

    if (puuidsToResolve.length > 0) {
      const resolvePromise = resolveNames(
        puuidsToResolve,
        routingRegion,
        apiKey
      );
      const timeout = new Promise((r) => setTimeout(r, 8000));
      await Promise.race([resolvePromise, timeout]);
    }

    const entries = pageEntries.map((e, i) => {
      const cached = e.puuid ? nameCache.get(e.puuid) : undefined;
      const totalGames = e.wins + e.losses;
      return {
        rank: start + i + 1,
        summonerName: cached?.name ?? e.summonerName ?? "",
        puuid: e.puuid ?? "",
        tier: e.tier,
        leaguePoints: e.leaguePoints,
        wins: e.wins,
        losses: e.losses,
        winRate:
          totalGames > 0 ? Math.round((e.wins / totalGames) * 100) : 0,
        hotStreak: e.hotStreak,
        veteran: e.veteran,
        freshBlood: e.freshBlood,
        role: "",
      };
    });

    return Response.json(
      {
        entries,
        total: allEntries.length,
        page,
        pageSize,
        tierFilter: tierFilterLabel,
        region: platform,
        queue,
      },
      {
        headers: {
          "Cache-Control":
            "public, s-maxage=300, stale-while-revalidate=600",
        },
      }
    );
  } catch {
    return buildPlaceholderResponse(
      tierKeys,
      tierFilterLabel,
      platform,
      queue,
      page,
      pageSize
    );
  }
}
