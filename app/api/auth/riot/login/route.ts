import { NextRequest, NextResponse } from "next/server";

/**
 * Riot RSO OAuth2 - Step 1: Redirect user to Riot login page.
 *
 * Required env vars:
 * - RIOT_RSO_CLIENT_ID
 * - RIOT_RSO_REDIRECT_URI (e.g. https://statgap.gg/api/auth/riot/callback)
 */
export async function GET(req: NextRequest) {
  const clientId = process.env.RIOT_RSO_CLIENT_ID;
  const redirectUri = process.env.RIOT_RSO_REDIRECT_URI;

  if (!clientId || !redirectUri) {
    return NextResponse.json(
      { error: "Riot RSO not configured. Set RIOT_RSO_CLIENT_ID and RIOT_RSO_REDIRECT_URI." },
      { status: 500 }
    );
  }

  const returnTo = req.nextUrl.searchParams.get("returnTo") ?? "/guides";

  const state = Buffer.from(JSON.stringify({ returnTo })).toString("base64url");

  const authUrl = new URL("https://auth.riotgames.com/authorize");
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("client_id", clientId);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("scope", "openid");
  authUrl.searchParams.set("state", state);

  return NextResponse.redirect(authUrl.toString());
}
