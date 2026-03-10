import { getDiscordOAuthUrl } from "@/lib/discord";
import { getDiscordIdFromCookie } from "@/lib/discordSession";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { NextRequest, NextResponse } from "next/server";

/** GET: redirect to Discord OAuth with guilds scope. Call from /settings to add friend discovery. */
export async function GET(request: NextRequest) {
  const discordId = getDiscordIdFromCookie(request.headers.get("cookie") ?? null);
  if (!discordId) {
    return NextResponse.redirect(new URL("/settings?error=not_connected", request.url).toString());
  }
  const { data: row } = await supabaseAdmin.from("discord_users").select("summoner_name, region").eq("discord_id", discordId).single();
  const summonerName = row?.summoner_name ?? "";
  const region = row?.region ?? "na1";
  const origin = request.nextUrl.origin;
  const state = Buffer.from(JSON.stringify({ summoner_name: summonerName, region, next: "/settings" })).toString("base64url");
  const url = getDiscordOAuthUrl({
    redirectUri: `${origin}/api/auth/discord/callback`,
    scope: "identify guilds",
    state,
    prompt: "consent",
  });
  return NextResponse.redirect(url);
}
