import { getDiscordIdFromCookie } from "@/lib/discordSession";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const discordId = getDiscordIdFromCookie(request.headers.get("cookie") ?? null);
  if (!discordId) {
    return NextResponse.json({ connected: false }, { status: 200 });
  }
  const { data: user, error: userError } = await supabaseAdmin
    .from("discord_users")
    .select("discord_id, username, avatar_url, summoner_name, region, guilds_scope_at")
    .eq("discord_id", discordId)
    .single();
  if (userError || !user) {
    return NextResponse.json({ connected: false }, { status: 200 });
  }
  const { data: prefs } = await supabaseAdmin.from("notification_preferences").select("*").eq("discord_id", discordId).single();
  return NextResponse.json({
    connected: true,
    user: { discord_id: user.discord_id, username: user.username, avatar_url: user.avatar_url, summoner_name: user.summoner_name, region: user.region, has_guilds_scope: !!user.guilds_scope_at },
    preferences: prefs ?? null,
  });
}
