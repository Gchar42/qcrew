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

  const safe = q.toLowerCase();

  const { data, error } = await client
    .from("riot_searches")
    .select("riot_id, updated_at")
    .or(`riot_id.ilike.%${safe}%,game_name.ilike.%${safe}%,tag_line.ilike.%${safe}%`)
    .order("updated_at", { ascending: false })
    .limit(8);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    suggestions: (data || []).map((x) => x.riot_id),
  });
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
