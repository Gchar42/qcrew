import { getDiscordIdFromCookie } from "@/lib/discordSession";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { NextRequest, NextResponse } from "next/server";

function getDiscordId(req: NextRequest): string | null {
  return getDiscordIdFromCookie(req.headers.get("cookie") ?? null);
}

export async function GET(request: NextRequest) {
  const discordId = getDiscordId(request);
  if (!discordId) return NextResponse.json({ error: "Not connected" }, { status: 401 });
  const { data, error } = await supabaseAdmin.from("server_webhooks").select("id, guild_id, channel_webhook_url, summoner_names_to_track, created_at").eq("added_by_discord_id", discordId).order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function POST(request: NextRequest) {
  const discordId = getDiscordId(request);
  if (!discordId) return NextResponse.json({ error: "Not connected" }, { status: 401 });
  const body = await request.json();
  const guildId = String(body.guild_id ?? "").trim();
  const channelWebhookUrl = String(body.channel_webhook_url ?? "").trim();
  const summonerNames = Array.isArray(body.summoner_names_to_track) ? body.summoner_names_to_track.map((s: unknown) => String(s).trim()).filter(Boolean) : [];
  if (!guildId || !channelWebhookUrl) return NextResponse.json({ error: "guild_id and channel_webhook_url required" }, { status: 400 });
  if (!/^https:\/\/discord\.com\/api\/webhooks\/\d+\/.+/.test(channelWebhookUrl)) return NextResponse.json({ error: "Invalid webhook URL" }, { status: 400 });
  const { data, error } = await supabaseAdmin.from("server_webhooks").insert({ guild_id: guildId, channel_webhook_url: channelWebhookUrl, summoner_names_to_track: summonerNames, added_by_discord_id: discordId }).select().single();
  if (error) {
    if (error.code === "23505") return NextResponse.json({ error: "This webhook is already added for this server" }, { status: 409 });
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
  const { error } = await supabaseAdmin.from("server_webhooks").delete().eq("id", id).eq("added_by_discord_id", discordId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function PATCH(request: NextRequest) {
  const discordId = getDiscordId(request);
  if (!discordId) return NextResponse.json({ error: "Not connected" }, { status: 401 });
  const body = await request.json();
  const id = body.id;
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  const updates: Record<string, unknown> = {};
  if (Array.isArray(body.summoner_names_to_track)) updates.summoner_names_to_track = body.summoner_names_to_track.map((s: unknown) => String(s).trim()).filter(Boolean);
  if (Object.keys(updates).length === 0) return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  const { data, error } = await supabaseAdmin.from("server_webhooks").update(updates).eq("id", id).eq("added_by_discord_id", discordId).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
