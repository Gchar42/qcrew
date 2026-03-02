import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getAdminClient() {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) return null;

  return createClient(url, serviceKey, {
    auth: { persistSession: false },
  });
}

function escapeLike(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_");
}

type SearchRow = {
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
  const pattern = `%${escaped}%`;

  const isSearchPage = limit > 8;
  const selectFields =
    "game_name, tag_line, puuid, updated_at, profile_icon_id, summoner_level";
  const base = client.from("riot_searches").select(selectFields);

  const { data, error } = isSearchPage
    ? await base
        .ilike("game_name", pattern)
        .order("updated_at", { ascending: false })
        .limit(200)
    : await base
        .or(
          `riot_id.ilike.${pattern},game_name.ilike.${pattern},tag_line.ilike.${pattern}`
        )
        .order("updated_at", { ascending: false })
        .limit(32);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const rows = (data || []) as SearchRow[];
  const fullId = (r: SearchRow) => `${r.game_name}#${r.tag_line}`;
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
    return NextResponse.json({ suggestions, total });
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
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
