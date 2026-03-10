import { getDiscordIdFromCookie } from "@/lib/discordSession";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { NextRequest, NextResponse } from "next/server";

function getDiscordId(req: NextRequest): string | null {
  return getDiscordIdFromCookie(req.headers.get("cookie") ?? null);
}

export async function GET(request: NextRequest) {
  const discordId = getDiscordId(request);
  if (!discordId) return NextResponse.json({ error: "Not connected" }, { status: 401 });
  const { data, error } = await supabaseAdmin.from("tracked_players").select("id, summoner_name, region, added_at").eq("discord_id", discordId).order("added_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function POST(request: NextRequest) {
  const discordId = getDiscordId(request);
  if (!discordId) return NextResponse.json({ error: "Not connected" }, { status: 401 });
  const body = await request.json();
  const summonerName = String(body.summoner_name ?? "").trim();
  const region = String(body.region ?? "na1").trim();
  if (!summonerName) return NextResponse.json({ error: "summoner_name required" }, { status: 400 });
  const { data, error } = await supabaseAdmin.from("tracked_players").insert({ discord_id: discordId, summoner_name: summonerName, region }).select().single();
  if (error) {
    if (error.code === "23505") return NextResponse.json({ error: "Already tracking this player" }, { status: 409 });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data);
}

export async function DELETE(request: NextRequest) {
  const discordId = getDiscordId(request);
  if (!discordId) return NextResponse.json({ error: "Not connected" }, { status: 401 });
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  const { error } = await supabaseAdmin.from("tracked_players").delete().eq("id", id).eq("discord_id", discordId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
