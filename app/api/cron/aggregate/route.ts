import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { getMatch, getMatchIds, getSummoner } from "@/lib/riot-api";
import { setCached } from "@/lib/sharedCache";
import type { MatchDto, LeagueEntryDto } from "@/types/riot";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const BATCH_SIZE = 10;
const MATCHES_PER_SUMMONER = 20;
const MAX_SUMMONERS_PER_RUN = 50;
const STATS_TTL = 7200;

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type SummonerRow = {
  puuid: string;
  summoner_id: string | null;
  riot_id: string | null;
  region: string | null;
  rank_solo: string | null;
  rank_flex: string | null;
};

type ParticipantInsert = {
  match_id: string;
  puuid: string;
  champion_id: number;
  role: string;
  rank_tier: string | null;
  win: boolean;
  kills: number;
  deaths: number;
  assists: number;
  cs_total: number;
  game_duration_seconds: number;
  vision_score: number;
  items: number[];
  runes: { styles: { style: number; selections: number[] }[] } | null;
  summoner_spells: number[] | null;
  deaths_before_15: null;
  game_timestamp: string | null;
};

type StatsAccum = {
  games: number;
  wins: number;
  kills: number;
  deaths: number;
  assists: number;
  csMinSum: number;
  visionMinSum: number;
};

type ItemAccum = { games: number; wins: number };
type RuneAccum = {
  games: number;
  wins: number;
  pathId: number;
  isPrimary: boolean;
  slotIndex: number;
  runeType: string;
};

/* ------------------------------------------------------------------ */
/*  Auth                                                               */
/* ------------------------------------------------------------------ */

function authorize(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true;
  const auth = req.headers.get("authorization");
  const query = req.nextUrl.searchParams.get("secret");
  return auth === `Bearer ${secret}` || query === secret;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function extractPatch(gameVersion?: string): string {
  if (!gameVersion) return "unknown";
  const parts = gameVersion.split(".");
  return parts.length >= 2 ? `${parts[0]}.${parts[1]}` : "unknown";
}

function extractRole(p: MatchDto["info"]["participants"][0]): string {
  return (p.teamPosition || p.individualPosition || "FILL").toUpperCase();
}

function participantItems(p: MatchDto["info"]["participants"][0]): number[] {
  return [p.item0, p.item1, p.item2, p.item3, p.item4, p.item5].filter(
    (id): id is number => id != null && id > 0,
  );
}

function participantRunes(
  p: MatchDto["info"]["participants"][0],
): ParticipantInsert["runes"] {
  if (!p.perks?.styles?.length) return null;
  return {
    styles: p.perks.styles.map((s) => ({
      style: s.style,
      selections: s.selections?.map((sel) => sel.perk) ?? [],
    })),
  };
}

async function fetchLeagueEntries(
  region: string,
  summonerId: string,
): Promise<LeagueEntryDto[]> {
  const apiKey = process.env.RIOT_API_KEY;
  if (!apiKey) return [];
  const url = `https://${region}.api.riotgames.com/lol/league/v4/entries/by-summoner/${encodeURIComponent(summonerId)}`;
  try {
    const res = await fetch(url, {
      cache: "no-store",
      headers: { "X-Riot-Token": apiKey },
    });
    if (!res.ok) return [];
    return (await res.json()) as LeagueEntryDto[];
  } catch {
    return [];
  }
}

function rankLabel(tier?: string, rank?: string): string | null {
  if (!tier) return null;
  return `${tier} ${rank ?? ""}`.trim();
}

/* ------------------------------------------------------------------ */
/*  Step 3 — Process one summoner                                      */
/* ------------------------------------------------------------------ */

async function processSummoner(
  db: ReturnType<typeof supabaseServer>,
  summoner: SummonerRow,
): Promise<{ ingested: number; errors: string[] }> {
  const errors: string[] = [];
  const region = summoner.region ?? "na1";
  let ingested = 0;

  let matchIds: string[];
  try {
    matchIds = await getMatchIds(region, summoner.puuid, MATCHES_PER_SUMMONER);
  } catch (err) {
    return { ingested: 0, errors: [`matchIds: ${err}`] };
  }

  if (matchIds.length === 0) return { ingested: 0, errors: [] };

  const { data: existing } = await db
    .from("matches_v2")
    .select("match_id")
    .in("match_id", matchIds);

  const existingSet = new Set((existing ?? []).map((r) => r.match_id));
  const newMatchIds = matchIds.filter((id) => !existingSet.has(id));

  for (const matchId of newMatchIds) {
    try {
      const match = await getMatch(region, matchId);
      if (!match) continue;

      const patch = extractPatch(match.info.gameVersion);
      const queueId = match.info.queueId;
      const queueType =
        queueId === 420
          ? "RANKED_SOLO_5x5"
          : queueId === 440
            ? "RANKED_FLEX_SR"
            : String(queueId ?? "");
      const gameTimestamp = match.info.gameEndTimestamp
        ? new Date(match.info.gameEndTimestamp).toISOString()
        : null;

      await db.from("matches_v2").upsert(
        {
          match_id: matchId,
          region,
          patch,
          game_duration: match.info.gameDuration,
          game_timestamp: gameTimestamp,
          queue_type: queueType,
        },
        { onConflict: "match_id" },
      );

      const rows: ParticipantInsert[] = match.info.participants.map((p) => {
        const cs =
          (p.totalMinionsKilled ?? 0) + (p.neutralMinionsKilled ?? 0);
        return {
          match_id: matchId,
          puuid: p.puuid,
          champion_id: p.championId ?? 0,
          role: extractRole(p),
          rank_tier:
            p.puuid === summoner.puuid ? summoner.rank_solo : null,
          win: p.win,
          kills: p.kills,
          deaths: p.deaths,
          assists: p.assists,
          cs_total: cs,
          game_duration_seconds: match.info.gameDuration,
          vision_score: p.visionScore ?? 0,
          items: participantItems(p),
          runes: participantRunes(p),
          summoner_spells:
            p.summoner1Id != null && p.summoner2Id != null
              ? [p.summoner1Id, p.summoner2Id]
              : null,
          deaths_before_15: null,
          game_timestamp: gameTimestamp,
        };
      });

      const { count } = await db
        .from("match_participants")
        .select("id", { count: "exact", head: true })
        .eq("match_id", matchId);

      if (!count || count === 0) {
        await db.from("match_participants").insert(rows);
      }

      ingested++;
    } catch (err) {
      errors.push(`match ${matchId}: ${err}`);
    }
  }

  let summonerId = summoner.summoner_id;

  // Backfill summoner_id if missing (e.g., seeded from profile_cache without it)
  if (!summonerId) {
    try {
      const s = await getSummoner(region, summoner.puuid);
      if (s) {
        summonerId = s.id ?? s.encryptedSummonerId ?? null;
        if (summonerId) {
          await db
            .from("summoners")
            .update({ summoner_id: summonerId })
            .eq("puuid", summoner.puuid);
        }
      }
    } catch (err) {
      errors.push(`getSummoner: ${err}`);
    }
  }

  if (summonerId) {
    try {
      const entries = await fetchLeagueEntries(region, summonerId);
      const solo = entries.find((e) => e.queueType === "RANKED_SOLO_5x5");
      const flex = entries.find((e) => e.queueType === "RANKED_FLEX_SR");
      await db
        .from("summoners")
        .update({
          rank_solo: rankLabel(solo?.tier, solo?.rank),
          rank_flex: rankLabel(flex?.tier, flex?.rank),
          lp_solo: solo?.leaguePoints ?? null,
          lp_flex: flex?.leaguePoints ?? null,
          updated_at: new Date().toISOString(),
        })
        .eq("puuid", summoner.puuid);
    } catch (err) {
      errors.push(`rank update: ${err}`);
    }
  }

  return { ingested, errors };
}

/* ------------------------------------------------------------------ */
/*  Step 4–7 — Recompute aggregated stats                              */
/* ------------------------------------------------------------------ */

async function recomputeStats(
  db: ReturnType<typeof supabaseServer>,
  patches: string[],
): Promise<{ champRows: number; itemRows: number; runeRows: number }> {
  let champRows = 0;
  let itemRows = 0;
  let runeRows = 0;

  for (const patch of patches) {
    const { data: matchRows } = await db
      .from("matches_v2")
      .select("match_id")
      .eq("patch", patch);

    if (!matchRows?.length) continue;

    const matchIds = matchRows.map((r) => r.match_id);

    // Fetch participants in batches of 500 (Supabase .in() limit)
    const allParticipants: Record<string, unknown>[] = [];
    for (let i = 0; i < matchIds.length; i += 500) {
      const batch = matchIds.slice(i, i + 500);
      const { data } = await db
        .from("match_participants")
        .select("*")
        .in("match_id", batch);
      if (data) allParticipants.push(...data);
    }

    if (allParticipants.length === 0) continue;

    // Total games per role for pick rate calculation
    const totalGamesByRole = new Map<string, number>();
    for (const p of allParticipants) {
      const role = (p as { role: string }).role || "FILL";
      totalGamesByRole.set(role, (totalGamesByRole.get(role) ?? 0) + 1);
    }

    // --- champion_stats ---
    const champMap = new Map<string, StatsAccum>();
    for (const raw of allParticipants) {
      const p = raw as {
        champion_id: number;
        role: string;
        rank_tier: string | null;
        win: boolean;
        kills: number;
        deaths: number;
        assists: number;
        cs_total: number;
        game_duration_seconds: number;
        vision_score: number;
      };
      const tier = p.rank_tier ?? "ALL";
      const role = p.role || "FILL";
      const key = `${p.champion_id}:${tier}:${role}`;
      const acc = champMap.get(key) ?? {
        games: 0,
        wins: 0,
        kills: 0,
        deaths: 0,
        assists: 0,
        csMinSum: 0,
        visionMinSum: 0,
      };
      acc.games++;
      if (p.win) acc.wins++;
      acc.kills += p.kills;
      acc.deaths += p.deaths;
      acc.assists += p.assists;
      const mins = Math.max(1, (p.game_duration_seconds ?? 1) / 60);
      acc.csMinSum += (p.cs_total ?? 0) / mins;
      acc.visionMinSum += (p.vision_score ?? 0) / mins;
      champMap.set(key, acc);
    }

    const champUpserts = Array.from(champMap.entries()).map(([k, acc]) => {
      const [championIdStr, rankTier, role] = k.split(":");
      const totalRole = totalGamesByRole.get(role) ?? 1;
      return {
        champion_id: Number(championIdStr),
        patch,
        rank_tier: rankTier,
        role,
        games: acc.games,
        wins: acc.wins,
        avg_kills: +(acc.kills / acc.games).toFixed(2),
        avg_deaths: +(acc.deaths / acc.games).toFixed(2),
        avg_assists: +(acc.assists / acc.games).toFixed(2),
        avg_cs_per_min: +(acc.csMinSum / acc.games).toFixed(2),
        avg_vision_per_min: +(acc.visionMinSum / acc.games).toFixed(2),
        pick_rate: +(acc.games / totalRole).toFixed(4),
        ban_rate: 0,
        updated_at: new Date().toISOString(),
      };
    });

    for (let i = 0; i < champUpserts.length; i += 200) {
      const batch = champUpserts.slice(i, i + 200);
      await db.from("champion_stats").upsert(batch, {
        onConflict: "champion_id,patch,rank_tier,role",
      });
    }
    champRows += champUpserts.length;

    // --- item_slot_stats ---
    const itemMap = new Map<string, ItemAccum>();
    for (const raw of allParticipants) {
      const p = raw as {
        champion_id: number;
        role: string;
        rank_tier: string | null;
        win: boolean;
        items: number[];
      };
      const tier = p.rank_tier ?? "ALL";
      const role = p.role || "FILL";
      const items = Array.isArray(p.items) ? p.items : [];
      items.forEach((itemId, idx) => {
        if (itemId <= 0) return;
        const slotPos = idx + 1;
        const key = `${p.champion_id}:${itemId}:${slotPos}:${tier}:${role}`;
        const acc = itemMap.get(key) ?? { games: 0, wins: 0 };
        acc.games++;
        if (p.win) acc.wins++;
        itemMap.set(key, acc);
      });
    }

    const itemUpserts = Array.from(itemMap.entries()).map(([k, acc]) => {
      const [champId, itemId, slotPos, rankTier, role] = k.split(":");
      return {
        champion_id: Number(champId),
        item_id: Number(itemId),
        slot_position: Number(slotPos),
        patch,
        rank_tier: rankTier,
        role,
        games: acc.games,
        wins: acc.wins,
      };
    });

    for (let i = 0; i < itemUpserts.length; i += 200) {
      const batch = itemUpserts.slice(i, i + 200);
      await db.from("item_slot_stats").upsert(batch, {
        onConflict: "champion_id,item_id,slot_position,patch,rank_tier,role",
      });
    }
    itemRows += itemUpserts.length;

    // --- item_path_stats ---
    const pathMap = new Map<string, ItemAccum>();
    for (const raw of allParticipants) {
      const p = raw as {
        champion_id: number;
        role: string;
        rank_tier: string | null;
        win: boolean;
        items: number[];
      };
      const tier = p.rank_tier ?? "ALL";
      const role = p.role || "FILL";
      const items = (Array.isArray(p.items) ? p.items : []).filter(
        (id) => id > 0,
      );
      if (items.length >= 2) {
        const key = `${p.champion_id}:${role}:${tier}:${items[0]}:${items[1]}`;
        const acc = pathMap.get(key) ?? { games: 0, wins: 0 };
        acc.games++;
        if (p.win) acc.wins++;
        pathMap.set(key, acc);
      }
    }

    const pathUpserts = Array.from(pathMap.entries()).map(([k, acc]) => {
      const [champId, role, rankTier, first, second] = k.split(":");
      return {
        champion_id: Number(champId),
        role,
        patch,
        rank_tier: rankTier,
        first_item_id: Number(first),
        second_item_id: Number(second),
        games: acc.games,
        wins: acc.wins,
      };
    });

    for (let i = 0; i < pathUpserts.length; i += 200) {
      const batch = pathUpserts.slice(i, i + 200);
      await db.from("item_path_stats").upsert(batch, {
        onConflict:
          "champion_id,role,patch,rank_tier,first_item_id,second_item_id",
      });
    }

    // --- rune_stats ---
    const runeMap = new Map<string, RuneAccum>();
    const champGamesForRunes = new Map<string, number>();

    for (const raw of allParticipants) {
      const p = raw as {
        champion_id: number;
        role: string;
        rank_tier: string | null;
        win: boolean;
        runes: { styles: { style: number; selections: number[] }[] } | null;
      };
      if (!p.runes?.styles?.length) continue;

      const tier = p.rank_tier ?? "ALL";
      const role = p.role || "FILL";
      const champKey = `${p.champion_id}:${tier}:${role}`;
      champGamesForRunes.set(
        champKey,
        (champGamesForRunes.get(champKey) ?? 0) + 1,
      );

      const primary = p.runes.styles[0];
      const secondary = p.runes.styles[1];

      if (primary) {
        const runeTypes = [
          "keystone",
          "primary_row1",
          "primary_row2",
          "primary_row3",
        ];
        primary.selections.forEach((runeId, idx) => {
          const rt = runeTypes[idx] ?? `primary_row${idx}`;
          const key = `${p.champion_id}:${runeId}:${rt}:${tier}:${role}`;
          const acc = runeMap.get(key) ?? {
            games: 0,
            wins: 0,
            pathId: primary.style,
            isPrimary: true,
            slotIndex: idx,
            runeType: rt,
          };
          acc.games++;
          if (p.win) acc.wins++;
          runeMap.set(key, acc);
        });
      }

      if (secondary) {
        secondary.selections.forEach((runeId, idx) => {
          const rt = "secondary";
          const key = `${p.champion_id}:${runeId}:${rt}_${idx}:${tier}:${role}`;
          const acc = runeMap.get(key) ?? {
            games: 0,
            wins: 0,
            pathId: secondary.style,
            isPrimary: false,
            slotIndex: idx,
            runeType: rt,
          };
          acc.games++;
          if (p.win) acc.wins++;
          runeMap.set(key, acc);
        });
      }
    }

    const runeUpserts = Array.from(runeMap.entries()).map(([k, acc]) => {
      const parts = k.split(":");
      const championId = Number(parts[0]);
      const runeId = Number(parts[1]);
      const runeType = parts[2];
      const rankTier = parts[3];
      const role = parts[4];
      const champTotal =
        champGamesForRunes.get(`${championId}:${rankTier}:${role}`) ?? 1;
      return {
        champion_id: championId,
        rune_id: runeId,
        rune_type: runeType,
        path_id: acc.pathId,
        is_primary: acc.isPrimary,
        slot_index: acc.slotIndex,
        patch,
        rank_tier: rankTier,
        role,
        games: acc.games,
        wins: acc.wins,
        pick_rate: +(acc.games / champTotal).toFixed(4),
        win_rate: +(acc.wins / Math.max(1, acc.games)).toFixed(4),
        updated_at: new Date().toISOString(),
      };
    });

    for (let i = 0; i < runeUpserts.length; i += 200) {
      const batch = runeUpserts.slice(i, i + 200);
      await db.from("rune_stats").upsert(batch, {
        onConflict: "champion_id,rune_id,rune_type,patch,rank_tier,role",
      });
    }
    runeRows += runeUpserts.length;
  }

  return { champRows, itemRows, runeRows };
}

/* ------------------------------------------------------------------ */
/*  Step 8 — Warm Redis                                                */
/* ------------------------------------------------------------------ */

async function warmRedis(
  db: ReturnType<typeof supabaseServer>,
  patches: string[],
): Promise<number> {
  let keysWritten = 0;

  for (const patch of patches) {
    // champion:stats keys
    const { data: stats } = await db
      .from("champion_stats")
      .select("*")
      .eq("patch", patch);

    if (stats) {
      for (const row of stats) {
        const key = `champion:stats:${row.champion_id}:${patch}:${row.rank_tier}:${row.role}`;
        await setCached(key, row, STATS_TTL);
        keysWritten++;
      }
    }

    // champion:builds keys (item_slot_stats grouped by champion+patch+tier+role)
    const { data: items } = await db
      .from("item_slot_stats")
      .select("*")
      .eq("patch", patch);

    if (items) {
      const buildMap = new Map<string, typeof items>();
      for (const row of items) {
        const key = `${row.champion_id}:${patch}:${row.rank_tier}:${row.role}`;
        if (!buildMap.has(key)) buildMap.set(key, []);
        buildMap.get(key)!.push(row);
      }
      for (const [k, rows] of buildMap) {
        const [champId, p, tier, role] = k.split(":");
        const redisKey = `champion:builds:${champId}:${p}:${tier}:${role}`;
        await setCached(redisKey, rows, STATS_TTL);
        keysWritten++;
      }
    }

    // champion:itempaths keys
    const { data: paths } = await db
      .from("item_path_stats")
      .select("*")
      .eq("patch", patch);

    if (paths) {
      const pathMap = new Map<string, typeof paths>();
      for (const row of paths) {
        const key = `${row.champion_id}:${row.role}:${patch}:${row.rank_tier}`;
        if (!pathMap.has(key)) pathMap.set(key, []);
        pathMap.get(key)!.push(row);
      }
      for (const [k, rows] of pathMap) {
        const [champId, role, p, tier] = k.split(":");
        const redisKey = `champion:itempaths:${champId}:${role}:${p}:${tier}`;
        await setCached(redisKey, rows, STATS_TTL);
        keysWritten++;
      }
    }
  }

  return keysWritten;
}

/* ------------------------------------------------------------------ */
/*  Handler                                                            */
/* ------------------------------------------------------------------ */

export async function GET(req: NextRequest) {
  if (!authorize(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = supabaseServer();
  const log: string[] = [];
  let totalIngested = 0;
  const patchesSeen = new Set<string>();

  // Fetch summoners ordered by stalest first
  const { data: summoners, error: fetchErr } = await db
    .from("summoners")
    .select("puuid, summoner_id, riot_id, region, rank_solo, rank_flex")
    .order("updated_at", { ascending: true })
    .limit(MAX_SUMMONERS_PER_RUN);

  if (fetchErr || !summoners?.length) {
    return NextResponse.json({
      ok: true,
      message: "No summoners to process",
      error: fetchErr?.message,
    });
  }

  // Process in batches
  for (let i = 0; i < summoners.length; i += BATCH_SIZE) {
    const batch = summoners.slice(i, i + BATCH_SIZE);
    const results = await Promise.allSettled(
      batch.map((s) => processSummoner(db, s as SummonerRow)),
    );

    results.forEach((result, idx) => {
      const s = batch[idx];
      if (result.status === "fulfilled") {
        totalIngested += result.value.ingested;
        if (result.value.errors.length) {
          log.push(
            `${s.riot_id}: ${result.value.ingested} new, errors: ${result.value.errors.join("; ")}`,
          );
        }
      } else {
        log.push(`${s.riot_id}: FAILED ${result.reason}`);
      }
    });
  }

  // Determine patches from recently ingested matches
  const { data: recentPatches } = await db
    .from("matches_v2")
    .select("patch")
    .order("game_timestamp", { ascending: false })
    .limit(100);

  if (recentPatches) {
    for (const r of recentPatches) {
      if (r.patch && r.patch !== "unknown") patchesSeen.add(r.patch);
    }
  }

  const patches = Array.from(patchesSeen);

  // Recompute stats
  let statsResult = { champRows: 0, itemRows: 0, runeRows: 0 };
  if (patches.length > 0) {
    try {
      statsResult = await recomputeStats(db, patches);
    } catch (err) {
      log.push(`stats recompute error: ${err}`);
    }
  }

  // Warm Redis
  let redisKeys = 0;
  if (patches.length > 0) {
    try {
      redisKeys = await warmRedis(db, patches);
    } catch (err) {
      log.push(`redis warming error: ${err}`);
    }
  }

  return NextResponse.json({
    ok: true,
    summoners: summoners.length,
    matchesIngested: totalIngested,
    patches,
    stats: statsResult,
    redisKeysWarmed: redisKeys,
    log: log.length > 0 ? log : undefined,
  });
}

export async function POST(req: NextRequest) {
  return GET(req);
}
