import { getDiscordOAuthUrl } from "@/lib/discord";
import { NextRequest, NextResponse } from "next/server";

const SCOPES_IDENTIFY = "identify";
const SCOPES_GUILDS = "identify guilds";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const summonerName = searchParams.get("summoner_name")?.trim();
  const region = searchParams.get("region")?.trim();
  const addGuilds = searchParams.get("guilds") === "1";
  const origin = request.nextUrl.origin;
  const redirectUri = `${origin}/api/auth/discord/callback`;

  const stateObj = {
    summoner_name: summonerName ?? "",
    region: region ?? "",
    next: searchParams.get("next") ?? "/settings",
  };
  const state = Buffer.from(JSON.stringify(stateObj)).toString("base64url");

  const scope = addGuilds ? SCOPES_GUILDS : SCOPES_IDENTIFY;
  const url = getDiscordOAuthUrl({
    redirectUri,
    scope,
    state,
    prompt: "consent",
  });

  return NextResponse.redirect(url);
}
