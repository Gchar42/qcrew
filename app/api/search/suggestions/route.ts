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

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") || "").trim();

  if (q.length < 2) {
    return NextResponse.json({ suggestions: [] });
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

  const { data, error } = await client
    .from("riot_searches")
    .select("game_name, tag_line, updated_at")
    .or(`riot_id.ilike.${pattern},game_name.ilike.${pattern},tag_line.ilike.${pattern}`)
    .order("updated_at", { ascending: false })
    .limit(32);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const rows = (data || []) as {
    game_name: string;
    tag_line: string;
    updated_at: string;
  }[];

  const fullId = (r: (typeof rows)[0]) => `${r.game_name}#${r.tag_line}`;
  const seen = new Set<string>();
  const deduped: (typeof rows)[0][] = [];
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

  const suggestions = sorted.slice(0, 8).map(fullId);

  return NextResponse.json({ suggestions });
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);

  const riotId = (body?.riotId || "").trim();
  const gameName = (body?.gameName || "").trim();
  const tagLine = (body?.tagLine || "").trim();
  const puuid = (body?.puuid || "").trim();

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

  const { error } = await client.from("riot_searches").upsert(
    {
      riot_id: riotId,
      game_name: gameName,
      tag_line: tagLine,
      puuid,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "puuid" }
  );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
