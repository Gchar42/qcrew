import { getDiscordIdFromCookie } from "@/lib/discordSession";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { NextRequest, NextResponse } from "next/server";

/**
 * Returns "players you might know" from mutual Discord servers.
 * Only summoner name + rank; never exposes server names.
 */
export async function GET(request: NextRequest) {
  const discordId = getDiscordIdFromCookie(request.headers.get("cookie") ?? null);
  if (!discordId) return NextResponse.json({ error: "Not connected" }, { status: 401 });

  const { data: myGuilds } = await supabaseAdmin.from("discord_user_guilds").select("guild_id").eq("discord_id", discordId);
  const guildIds = (myGuilds ?? []).map((g) => g.guild_id);
  if (guildIds.length === 0) return NextResponse.json([]);

  const { data: otherUsers } = await supabaseAdmin
    .from("discord_user_guilds")
    .select("discord_id")
    .in("guild_id", guildIds)
    .neq("discord_id", discordId);
  const otherDiscordIds = [...new Set((otherUsers ?? []).map((u) => u.discord_id))];
  if (otherDiscordIds.length === 0) return NextResponse.json([]);

  const { data: users } = await supabaseAdmin.from("discord_users").select("summoner_name, region").in("discord_id", otherDiscordIds);
  const list = (users ?? []).map((u) => ({ summoner_name: u.summoner_name, region: u.region }));
  return NextResponse.json(list);
}
