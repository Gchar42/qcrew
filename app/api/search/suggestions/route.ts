import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getAdminClient() {
  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  console.log("[search/suggestions] SUPABASE_URL present:", !!url);
  console.log("[search/suggestions] SUPABASE_SERVICE_ROLE_KEY present:", !!serviceKey);

  if (!url || !serviceKey) return null;

  return createClient(url, serviceKey, {
    auth: { persistSession: false },
  });
}

function escapeLike(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_");
}

type SearchRow = {
  riot_id?: string;
  game_name: string;
  tag_line: string;
  puuid: string;
  updated_at: string;
  profile_icon_id: number | null;
  summoner_level: number | null;
};

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") || "").trim();
  const limitParam = searchParams.get("limit");
  const pageParam = searchParams.get("page");
  const debug = searchParams.get("debug") === "1";
  const limit = Math.min(
    Math.max(parseInt(limitParam || "8", 10) || 8, 1),
    25
  );
  const page = Math.max(parseInt(pageParam || "1", 10) || 1, 1);

  if (q.length < 2) {
    return NextResponse.json({ suggestions: [], total: 0 });
  }

  const client = getAdminClient();
  if (!client) {
    return NextResponse.json(
      { error: "Supabase server env not set" },
      { status: 500 }
    );
  }

  const safe = q.toLowerCase().replace(/,/g, "");
  const escaped = escapeLike(safe);
  const containsPattern = `%${escaped}%`;
  const startsPattern = `${escaped}%`;

  const isSearchPage = limit > 8;
  const selectFields =
    "riot_id, game_name, tag_line, puuid, updated_at, profile_icon_id, summoner_level";
  const base = client.from("riot_searches").select(selectFields);

  const filterUsed = isSearchPage
    ? `game_name.ilike.${startsPattern},game_name.ilike.${containsPattern},riot_id.ilike.${containsPattern}`
    : `riot_id.ilike.${containsPattern},game_name.ilike.${containsPattern},tag_line.ilike.${containsPattern}`;

  const { data, error } = isSearchPage
    ? await base
        .or(filterUsed)
        .order("updated_at", { ascending: false })
        .limit(200)
    : await base
        .or(filterUsed)
        .order("updated_at", { ascending: false })
        .limit(32);

  if (error) {
    console.error("[search/suggestions] GET Supabase error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const rows = (data || []) as SearchRow[];
  const fullId = (r: SearchRow) =>
    r.riot_id ?? `${r.game_name}#${r.tag_line}`;
  const seen = new Set<string>();
  const deduped: SearchRow[] = [];
  for (const r of rows) {
    const id = fullId(r);
    if (seen.has(id)) continue;
    seen.add(id);
    deduped.push(r);
  }

  const sorted = deduped.sort((a, b) => {
    const aG = a.game_name.toLowerCase();
    const bG = b.game_name.toLowerCase();
    const aStarts = aG.startsWith(safe) ? 0 : 1;
    const bStarts = bG.startsWith(safe) ? 0 : 1;
    if (aStarts !== bStarts) return aStarts - bStarts;
    const aContains = aG.includes(safe) ? 0 : 1;
    const bContains = bG.includes(safe) ? 0 : 1;
    if (aContains !== bContains) return aContains - bContains;
    return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
  });

  const total = sorted.length;

  if (isSearchPage) {
    const start = (page - 1) * limit;
    const sliced = sorted.slice(start, start + limit);
    const suggestions = sliced.map((r) => ({
      riotId: fullId(r),
      gameName: r.game_name,
      tagLine: r.tag_line,
      puuid: r.puuid,
      updatedAt: r.updated_at,
      profileIconId: r.profile_icon_id ?? undefined,
      summonerLevel: r.summoner_level ?? undefined,
    }));
    const payload: Record<string, unknown> = { suggestions, total };
    if (debug) {
      payload.debug = {
        rowCount: total,
        first3: sorted.slice(0, 3).map((r) => ({
          riotId: fullId(r),
          game_name: r.game_name,
          tag_line: r.tag_line,
          updated_at: r.updated_at,
        })),
        filterUsed: isSearchPage
          ? "game_name ilike q% OR game_name ilike %q% OR riot_id ilike %q%"
          : "riot_id/game_name/tag_line ilike %q%",
      };
    }
    return NextResponse.json(payload);
  }

  const sliced = sorted.slice(0, limit);
  const suggestions = sliced.map((r) => ({
    riotId: fullId(r),
    updatedAt: r.updated_at,
  }));
  return NextResponse.json({ suggestions });
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);

  const riotId = (body?.riotId || "").trim();
  const gameName = (body?.gameName || "").trim();
  const tagLine = (body?.tagLine || "").trim();
  const puuid = (body?.puuid || "").trim();
  const profileIconId =
    body?.profileIconId != null ? Number(body.profileIconId) : null;
  const summonerLevel =
    body?.summonerLevel != null ? Number(body.summonerLevel) : null;

  if (!riotId || !gameName || !tagLine || !puuid) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const client = getAdminClient();
  if (!client) {
    return NextResponse.json(
      { error: "Supabase server env not set" },
      { status: 500 }
    );
  }

  const row: Record<string, unknown> = {
    riot_id: riotId,
    game_name: gameName,
    tag_line: tagLine,
    puuid,
    updated_at: new Date().toISOString(),
  };
  if (profileIconId != null && !Number.isNaN(profileIconId)) {
    row.profile_icon_id = profileIconId;
  }
  if (summonerLevel != null && !Number.isNaN(summonerLevel)) {
    row.summoner_level = summonerLevel;
  }

  const { error } = await client.from("riot_searches").upsert(row, {
    onConflict: "puuid",
  });

  if (error) {
    console.error("[search/suggestions] POST upsert error:", error.message);
    return NextResponse.json(
      { error: error.message, ok: false },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
