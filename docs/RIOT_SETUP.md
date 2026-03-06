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

## Personal key rate limits

If you're using a **personal** key (e.g. while building or before production approval), Riot limits it by design:

| Limit | Value |
|-------|--------|
| **Per second** | 20 requests per 1 second |
| **Per 2 minutes** | 100 requests per 2 minutes |

So a single uncached profile load (account + summoner + match list + ~15 match details + league) can use most of the 1-second bucket, and a few profile loads or one champion-stats refresh can hit the 2-minute cap. The app is built to reduce calls (cache-first, no hover prefetch, chunked refresh) so it's usable on a personal key, but 429s are still possible. Switching to a **production** key gives much higher limits (see below).

## Production key rate limits

Riot’s **production** key has much higher limits than the development key. Limits are **per region**:

| Limit | Value |
|-------|--------|
| **Short window** | 500 requests per 10 seconds |
| **Long window** | 30,000 requests per 10 minutes |

So you get roughly 50 req/s and 50 req/s sustained (10 min) per region. Other regions have separate buckets.

### How this app stays under the limit

- **Cache-first:** Profile data is stored in `profile_snapshots`. We serve from cache when possible and refresh in the background when stale, so most page loads don’t call Riot.
- **No hover prefetch:** We do not prefetch profile bundles on mouse-over; that would multiply requests and cause 429s.
- **429 handling:** All Riot calls in the profile bundle use a single retry after waiting for `Retry-After` (or 3s).
- **Champion stats:** Refreshes run in small chunks (e.g. 60 matches per request) with delays; the UI polls until caught up instead of one huge blocking request.
- **Single queue on refresh:** Champion-stats refresh runs for the current queue only, not solo and flex at once, to avoid doubling load.

## Review gate (show Riot without going public)

To show your site to Riot for production-key verification without making it “public,” you can put the site behind a password:

1. **Set an env var** (e.g. in Vercel or `.env.local`):
   ```env
   REVIEW_GATE_PASSWORD=your-secret-password
   ```
2. **Deploy.** All routes except `/review-login` and `/api/review-login` will redirect to `/review-login` until the user enters the correct password (stored in a cookie for 7 days).
3. **Share with Riot:** Send them the site URL and the password. In your application, you can say: *“The app is behind a review gate for verification. URL: … Password: …”*
4. **When approved:** Remove `REVIEW_GATE_PASSWORD` from env (or leave it unset) and redeploy so the site is public with your production key.

If `REVIEW_GATE_PASSWORD` is not set, the review gate is off and the site behaves as before.
