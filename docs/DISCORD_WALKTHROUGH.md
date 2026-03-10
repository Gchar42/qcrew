# Discord OAuth & Notifications — Step-by-Step Setup

Follow these steps in order. You’ll need: a Supabase project, a Discord account, and (for cron) Vercel.

---

## Step 1: Apply the database migration

You need the new tables (`discord_users`, `notification_preferences`, `tracked_players`, `server_webhooks`, `discord_user_guilds`, `rank_check_snapshots`) in your Supabase project.

### Option A — Supabase CLI (if you use it)

1. Open a terminal in your project (e.g. `hwo` or `qcrew-build`).
2. Make sure you’re linked to the right project:
   ```bash
   supabase link
   ```
3. Push migrations:
   ```bash
   supabase db push
   ```

### Option B — Supabase Dashboard (no CLI)

1. Go to [https://supabase.com/dashboard](https://supabase.com/dashboard) and open your project.
2. In the left sidebar click **SQL Editor**.
3. Click **New query**.
4. Open the file `supabase/migrations/20250310000000_discord_oauth_and_notifications.sql` in your repo, copy its entire contents, and paste into the SQL Editor.
5. Click **Run** (or press Ctrl+Enter).
6. Confirm you see “Success” and no errors.

---

## Step 2: Create a Discord application and get credentials

1. Go to [https://discord.com/developers/applications](https://discord.com/developers/applications) and log in.
2. Click **New Application**.
   - Name it (e.g. “StatGap”) and accept the terms. Click **Create**.
3. In the left sidebar, open **OAuth2 → General**.
   - Copy **Application ID** → this is your `DISCORD_CLIENT_ID`.
   - Under **Client Secret**, click **Reset Secret** (or **View** if you already have one), then copy the secret → this is your `DISCORD_CLIENT_SECRET`. Store it somewhere safe; you can’t see it again without resetting.
4. Still under **OAuth2**, open **Redirects**.
   - Click **Add Redirect**.
   - Add your callback URL. Use one of these (replace with your real domain when you deploy):
     - Local: `http://localhost:3000/api/auth/discord/callback`
     - Production: `https://www.statgap.gg/api/auth/discord/callback`  
       (or `https://your-vercel-url.vercel.app/api/auth/discord/callback` for a preview URL)
   - Click **Save Changes**.
5. In the left sidebar, open **Bot**.
   - Click **Add Bot** and confirm.
   - Under the bot’s username, click **Reset Token**, copy the token → this is your `DISCORD_BOT_TOKEN`. Store it safely.
   - Under **Privileged Gateway Intents**, turn on **Message Content Intent** if you plan to read messages (optional for DMs we send; turn on if the bot will ever read content).
6. In the left sidebar, open **OAuth2 → URL Generator** (optional, for testing).
   - Scopes: check **identify** (and **guilds** if you want “Players you might know”).
   - Redirect: same URL you added above.
   - Copy the generated URL to test the OAuth flow in a browser if you want.

You now have: `DISCORD_CLIENT_ID`, `DISCORD_CLIENT_SECRET`, `DISCORD_BOT_TOKEN`.

---

## Step 3: Generate a session secret and set environment variables

1. **Session secret**  
   Generate a long random string for the Discord session cookie (e.g. 32+ characters). You can use:
   - Node: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
   - Or any password generator.  
   This is your `DISCORD_SESSION_SECRET`.

2. **Where to set variables**
   - **Local:** In your project root create or edit `.env.local` (this file is usually in `.gitignore`; never commit it).
   - **Vercel:** Project → **Settings** → **Environment Variables**.

3. **Add these variables** (use your real values):

   | Name | Value | Notes |
   |------|--------|--------|
   | `DISCORD_CLIENT_ID` | (Application ID from Step 2) | |
   | `DISCORD_CLIENT_SECRET` | (Client secret from Step 2) | |
   | `DISCORD_BOT_TOKEN` | (Bot token from Step 2) | |
   | `DISCORD_SESSION_SECRET` | (Random string from above) | At least 16 characters |

   Optional but recommended for production:

   | Name | Value | Notes |
   |------|--------|--------|
   | `CRON_SECRET` | Another long random string | Used to protect cron endpoints |
   | `NEXT_PUBLIC_SITE_URL` | `https://www.statgap.gg` | Used in webhook embeds and links |

4. **Redeploy / restart**
   - Local: restart your dev server (`npm run dev`) after changing `.env.local`.
   - Vercel: save the variables; the next deploy will pick them up.

---

## Step 4: Test the Discord connection locally

1. Start the app: `npm run dev`.
2. Open [http://localhost:3000/settings](http://localhost:3000/settings).
3. Enter a summoner name (e.g. `YourName#NA1`) and region, then click **Connect Discord**.
4. You should be sent to Discord to authorize the app. Approve it.
5. You should be redirected back to `/settings` and see your Discord account (avatar, username, linked summoner) and the notification toggles.
6. Try:
   - Toggling Rank-up DMs and Weekly digest.
   - Adding a tracked player (summoner name + region) and removing them.
   - Adding a server webhook (you’ll need a real Discord channel webhook URL from Server Settings → Integrations → Webhooks).

If anything fails, check the browser console and your terminal for errors, and double-check redirect URL and env vars (especially no extra spaces).

---

## Step 5: Add the Discord callback URL for production

1. In [Discord Developer Portal](https://discord.com/developers/applications) → your application → **OAuth2 → Redirects**.
2. Add your **production** callback URL, e.g.:
   - `https://www.statgap.gg/api/auth/discord/callback`
   - Or your Vercel production URL: `https://your-project.vercel.app/api/auth/discord/callback`.
3. Save.

After you deploy (Step 6), use the same URL you put here when testing “Connect Discord” on the live site.

---

## Step 6: Deploy and set env vars on Vercel

1. Push your code (including the new Discord and cron code) to the branch Vercel deploys from (e.g. `rescue-ui` or `main`).
2. In [Vercel Dashboard](https://vercel.com/dashboard) → your project → **Settings** → **Environment Variables**, add the same variables as in Step 3 for **Production** (and **Preview** if you want Discord login on preview URLs):
   - `DISCORD_CLIENT_ID`
   - `DISCORD_CLIENT_SECRET`
   - `DISCORD_BOT_TOKEN`
   - `DISCORD_SESSION_SECRET`
   - Optionally: `CRON_SECRET`, `NEXT_PUBLIC_SITE_URL`
3. Trigger a new deploy (e.g. **Deployments** → **…** on latest → **Redeploy**), or push a small change so a new build runs.
4. When the deploy is done, open `https://your-domain.com/settings` and run through the same “Connect Discord” test as in Step 4.

---

## Step 7: Set up cron jobs (optional)

These run the rank-up checks and the weekly digest.

1. In your project root, create or edit `vercel.json`. If the file doesn’t exist, create it with `{}` first.
2. Add a `crons` array (adjust the path if your app lives in a subdirectory):

   ```json
   {
     "crons": [
       {
         "path": "/api/cron/discord-notifications",
         "schedule": "*/15 * * * *"
       },
       {
         "path": "/api/cron/discord-weekly-digest",
         "schedule": "0 9 * * 1"
       }
     ]
   }
   ```

   - First: runs every 15 minutes (rank-up checks and future win-streak logic).
   - Second: runs every Monday at 9:00 UTC (weekly digest DMs).

3. Set `CRON_SECRET` in Vercel (Step 3 / Step 6). Vercel will send `Authorization: Bearer <CRON_SECRET>` when it calls these URLs; the code already checks for it.
4. Push and deploy. In Vercel → **Settings** → **Crons** you should see the two jobs listed.

To test the cron without waiting:
- Call the endpoint with the secret:  
  `curl -H "Authorization: Bearer YOUR_CRON_SECRET" https://your-domain.com/api/cron/discord-notifications`  
- Or use a one-off trigger in Vercel’s cron UI if available.

---

## Step 8: (Optional) Show Discord avatar on StatGap profile

To use a connected user’s Discord avatar on their profile when they’ve linked Discord:

1. Where you render the profile header (e.g. summoner profile page or component), you need: **summoner name** and **region** (same format as in the URL, e.g. `Name#NA1` and `na1`).
2. Before rendering the avatar, query the backend for Discord data. Two options:
   - **Option A — New API route:** e.g. `GET /api/discord/avatar?summoner_name=Name&region=na1` that looks up `discord_users` by `summoner_name` and `region` and returns `{ avatar_url: "..." }` or `{}`. The profile page calls this and, if `avatar_url` is present, uses it instead of the Riot profile icon.
   - **Option B — In existing profile fetch:** If you already have a “profile bundle” or user API that loads the summoner, add a lookup to `discord_users` (by summoner_name + region) and include `avatar_url` in the response when present.
3. In the UI, if `avatar_url` exists, use it for the profile image; otherwise keep using the Riot icon or default.

If you tell me which file renders the summoner header/avatar (e.g. `SummonerProfileBeige.tsx` or the rescue-ui equivalent), I can show the exact code changes for Option A or B.

---

## Quick checklist

- [ ] Migration applied in Supabase (Step 1)
- [ ] Discord application created; redirect and bot token obtained (Step 2)
- [ ] `.env.local` (and Vercel) has: `DISCORD_CLIENT_ID`, `DISCORD_CLIENT_SECRET`, `DISCORD_BOT_TOKEN`, `DISCORD_SESSION_SECRET` (Step 3)
- [ ] “Connect Discord” works on `/settings` locally (Step 4)
- [ ] Production callback URL added in Discord (Step 5)
- [ ] Env vars set on Vercel and site redeployed (Step 6)
- [ ] Optional: `vercel.json` crons added and `CRON_SECRET` set (Step 7)
- [ ] Optional: Profile avatar logic using `discord_users.avatar_url` (Step 8)

If you get stuck on a specific step (e.g. “Redirect URI doesn’t match” or “Cron not firing”), say which step and the exact error or behavior and we can fix it.
