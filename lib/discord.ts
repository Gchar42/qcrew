/**
 * Discord OAuth and API helpers. Use env: DISCORD_CLIENT_ID, DISCORD_CLIENT_SECRET, DISCORD_BOT_TOKEN.
 */

const DISCORD_API = "https://discord.com/api/v10";

export function getDiscordOAuthUrl(options: {
  redirectUri: string;
  scope: string;
  state: string;
  prompt?: "consent" | "none";
}): string {
  const clientId = process.env.DISCORD_CLIENT_ID;
  if (!clientId) throw new Error("DISCORD_CLIENT_ID is not set");
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: options.redirectUri,
    response_type: "code",
    scope: options.scope,
    state: options.state,
  });
  if (options.prompt) params.set("prompt", options.prompt);
  return `https://discord.com/api/oauth2/authorize?${params.toString()}`;
}

export async function exchangeDiscordCode(
  code: string,
  redirectUri: string
): Promise<{ access_token: string; token_type: string; scope: string }> {
  const clientId = process.env.DISCORD_CLIENT_ID;
  const clientSecret = process.env.DISCORD_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new Error("Discord OAuth env not set");
  const res = await fetch(`${DISCORD_API}/oauth2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Discord token exchange failed: ${res.status} ${err}`);
  }
  return res.json();
}

export async function fetchDiscordUser(accessToken: string): Promise<{
  id: string;
  username: string;
  avatar: string | null;
}> {
  const res = await fetch(`${DISCORD_API}/users/@me`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error(`Discord user fetch failed: ${res.status}`);
  const data = await res.json();
  return {
    id: data.id,
    username: data.username,
    avatar: data.avatar ?? null,
  };
}

export function discordAvatarUrl(userId: string, avatarHash: string | null, size = 64): string {
  if (!avatarHash) return `https://cdn.discordapp.com/embed/avatars/${parseInt(userId) % 5}.png`;
  const ext = avatarHash.startsWith("a_") ? "gif" : "png";
  return `https://cdn.discordapp.com/avatars/${userId}/${avatarHash}.${ext}?size=${size}`;
}

export async function fetchDiscordUserGuilds(accessToken: string): Promise<{ id: string; name: string }[]> {
  const res = await fetch(`${DISCORD_API}/users/@me/guilds`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error(`Discord guilds fetch failed: ${res.status}`);
  const data = await res.json();
  return Array.isArray(data) ? data.map((g: { id: string; name: string }) => ({ id: g.id, name: g.name })) : [];
}

/** Send a DM to a Discord user via bot (requires DISCORD_BOT_TOKEN). */
export async function sendDiscordDm(discordUserId: string, payload: { content?: string; embeds?: unknown[] }): Promise<void> {
  const token = process.env.DISCORD_BOT_TOKEN;
  if (!token) throw new Error("DISCORD_BOT_TOKEN is not set");
  const res = await fetch(`${DISCORD_API}/users/@me/channels`, {
    method: "POST",
    headers: {
      Authorization: `Bot ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ recipient_id: discordUserId }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Discord create DM channel failed: ${res.status} ${err}`);
  }
  const { id: channelId } = await res.json();
  const post = await fetch(`${DISCORD_API}/channels/${channelId}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bot ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  if (!post.ok) {
    const err = await post.text();
    throw new Error(`Discord send DM failed: ${post.status} ${err}`);
  }
}

/** Post to a webhook URL (e.g. server channel webhook). */
export async function postDiscordWebhook(
  webhookUrl: string,
  payload: { content?: string; embeds?: unknown[] }
): Promise<void> {
  const res = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`Webhook post failed: ${res.status}`);
}
