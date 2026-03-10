# Discord OAuth & Notifications Setup

## Environment variables

Add these to your environment (e.g. Vercel project settings or `.env.local`). **Do not commit secrets.**

| Variable | Description |
|----------|-------------|
| `DISCORD_CLIENT_ID` | Discord Application (OAuth2) Client ID |
| `DISCORD_CLIENT_SECRET` | Discord Application Client Secret |
| `DISCORD_BOT_TOKEN` | Bot token (for sending DMs and optional bot features) |
| `DISCORD_SESSION_SECRET` | Random string (32+ chars) to sign the Discord session cookie |
| `CRON_SECRET` | Optional; if set, cron routes require `Authorization: Bearer <CRON_SECRET>` |

## Discord Developer Portal

1. Create an application at https://discord.com/developers/applications
2. **OAuth2 → Redirects:** Add `https://your-domain.com/api/auth/discord/callback`
3. **OAuth2 → Scopes:** Use `identify` for first connect; optional `guilds` for “Players you might know”
4. **Bot:** Create a bot, copy the token → `DISCORD_BOT_TOKEN`. Enable “Message Content Intent” if needed for DMs.

## Database

Run the Supabase migration:

```bash
supabase db push
# or apply supabase/migrations/20250310000000_discord_oauth_and_notifications.sql manually
```

## Cron (Vercel)

1. Set `CRON_SECRET` in Vercel.
2. In `vercel.json`, add:

```json
{
  "crons": [
    { "path": "/api/cron/discord-notifications", "schedule": "*/15 * * * *" },
    { "path": "/api/cron/discord-weekly-digest", "schedule": "0 9 * * 1" }
  ]
}
```

- **discord-notifications:** Runs every 15 minutes; checks tracked players for rank-up and sends DMs + webhooks.
- **discord-weekly-digest:** Runs Monday 9:00 UTC; sends weekly digest DMs to users who have it enabled.

Vercel will call these with `Authorization: Bearer <CRON_SECRET>` when configured.

## Win-streak notifications

The rank-up flow is implemented. Win-streak DMs (e.g. “🔥 SummonerName is on a 5-game win streak!”) require fetching recent match history per tracked summoner. The `notification_preferences.streak_threshold` and `notify_win_streak` are stored and can be used to extend `lib/discordNotifications.ts` with a `checkWinStreaksAndNotify()` that:

1. For each tracked (summoner, region), fetch last N match IDs and then match details.
2. Count consecutive wins from the most recent game.
3. For each watcher with `notify_win_streak` and `streak_threshold <= current_streak`, send DM and post to server webhooks.

## Using Discord avatar on profile

To show a connected user’s Discord avatar on their StatGap profile:

- Query `discord_users` by `summoner_name` and `region` (normalize to the same format as profile, e.g. `Name#NA1`).
- If a row exists, use `avatar_url`; otherwise use the default Riot profile icon.
