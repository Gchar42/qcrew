# Statgap.gg Riot Match History Setup

This app uses the Riot Developer API through Next.js server routes so the Riot API key stays server-side.

## Requirements

- Node.js 18 or newer
- A Riot Developer API key (development key is fine while building)
- Vercel project with Environment Variables set (for production/preview)

## Local environment variables

Create a file named **`.env.local`** in the project root.

Add:

```env
RIOT_API_KEY=YOUR_RIOT_KEY
```

Do not commit `.env.local`.

Restart the dev server after changing env vars:

```bash
npm run dev
```

## Vercel environment variables

1. In Vercel: **Project Settings** → **Environment Variables**
2. Add:
   - **Name:** `RIOT_API_KEY`
   - **Value:** your Riot key
3. Select the environments: **Preview** and **Production**
4. Redeploy after saving.

## How match history lookup works

User enters Riot ID in the format:

```
GameName#Tag
```

**Server route flow:**

1. Riot ID → PUUID (Americas account endpoint)
2. PUUID → Summoner info (NA1 summoner endpoint)
3. PUUID → Match IDs (Americas match list endpoint)
4. Match ID → Match details (Americas match endpoint)

**Internal routes:**

| Route | Purpose |
|-------|--------|
| `/api/riot/account` | Riot ID → account (PUUID) |
| `/api/riot/summoner` | PUUID → summoner info |
| `/api/riot/matches` | PUUID → list of match IDs |
| `/api/riot/match` | Match ID → match details |

All Riot requests include header:

```
X-Riot-Token: process.env.RIOT_API_KEY
```

## Dev key constraints

- **Development keys** expire every 24 hours.
- They are **not** allowed for a public production app.

For a real launch:

1. Apply for a **Riot production key**.
2. Set `RIOT_API_KEY` in Vercel (and locally) to the production key.
