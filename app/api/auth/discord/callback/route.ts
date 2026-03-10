import { exchangeDiscordCode, fetchDiscordUser, fetchDiscordUserGuilds, discordAvatarUrl } from "@/lib/discord";
import { setDiscordSessionCookie } from "@/lib/discordSession";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const origin = request.nextUrl.origin;
  const redirectUri = `${origin}/api/auth/discord/callback`;
  const nextResponse = NextResponse.redirect(`${origin}/settings`);

  if (!code) {
    return NextResponse.redirect(`${origin}/settings?error=missing_code`);
  }

  let summonerName = "";
  let region = "";
  let next = "/settings";
  if (state) {
    try {
      const decoded = JSON.parse(Buffer.from(state, "base64url").toString());
      summonerName = decoded.summoner_name ?? "";
      region = decoded.region ?? "";
      next = decoded.next ?? "/settings";
    } catch {
      // keep defaults
    }
  }

  const redirectTo = `${origin}${next}`;
  const res = NextResponse.redirect(redirectTo);

  try {
    const tokens = await exchangeDiscordCode(code, redirectUri);
    const user = await fetchDiscordUser(tokens.access_token);
    const avatarUrl = discordAvatarUrl(user.id, user.avatar);

    await supabaseAdmin.from("discord_users").upsert(
      {
        discord_id: user.id,
        username: user.username,
        avatar_url: avatarUrl,
        summoner_name: summonerName || "Unknown",
        region: region || "na1",
      },
      { onConflict: "discord_id" }
    );

    const prefs = await supabaseAdmin.from("notification_preferences").select("discord_id").eq("discord_id", user.id).single();
    if (!prefs.data) {
      await supabaseAdmin.from("notification_preferences").insert({
        discord_id: user.id,
        notify_rank_up: true,
        notify_win_streak: true,
        weekly_digest: false,
        streak_threshold: 5,
      });
    }

    if (tokens.scope?.includes("guilds")) {
      const guilds = await fetchDiscordUserGuilds(tokens.access_token);
      await supabaseAdmin.from("discord_users").update({ guilds_scope_at: new Date().toISOString() }).eq("discord_id", user.id);
      await supabaseAdmin.from("discord_user_guilds").delete().eq("discord_id", user.id);
      if (guilds.length > 0) {
        await supabaseAdmin.from("discord_user_guilds").insert(
          guilds.map((g) => ({ discord_id: user.id, guild_id: g.id }))
        );
      }
    }

    const { name, value, options } = setDiscordSessionCookie(user.id);
    res.cookies.set(name, value, options as Record<string, unknown>);
  } catch (e) {
    console.error("Discord callback error:", e);
    return NextResponse.redirect(`${origin}/settings?error=auth`);
  }

  return res;
}
