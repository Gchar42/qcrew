# StatGap.gg — Cursor Prompts
> Each section below is a complete, self-contained prompt. Copy the entire block and paste it into Cursor.
> Always have ARCHITECTURE.md open in Cursor when running these prompts.
> One prompt per session. Do not combine.

---

## HOW TO USE

1. Open `ARCHITECTURE.md` in Cursor (drag into context or use @ARCHITECTURE.md)
2. Copy the full prompt block for the feature you want to build
3. Paste into Cursor Agent mode
4. Do not modify the prompt — it is written to be precise enough for Cursor to execute without clarification

---

---
# PROMPT 01 — Foundation Setup
---

```
@ARCHITECTURE.md

Set up the StatGap.gg project foundation. Do the following in order:

1. Install dependencies:
   npm install @supabase/supabase-js @upstash/redis axios date-fns

2. Create /lib/supabase.ts with:
   - Public client (uses NEXT_PUBLIC_ keys, safe for browser)
   - Admin client (uses SERVICE_ROLE_KEY, server-only, never expose to browser)

3. Create /lib/redis.ts with:
   - Redis client using @upstash/redis
   - getCached<T>(key, fallback, ttlSeconds) helper: checks Redis first, falls back to provided async function, repopulates Redis on miss

4. Create /lib/riot-api.ts with:
   - Rate limiter: token bucket at 80 req/sec max (below 100/sec production limit)
   - Retry logic: exponential backoff on 429 and 500 errors, max 3 retries
   - Regional routing helper: given a region string (na1, euw1, kr, etc.), return correct platform URL and regional URL (americas/europe/asia/sea)
   - Implement these methods:
     - getAccountByRiotId(gameName, tagLine, region)
     - getSummonerByPuuid(puuid, platform)
     - getLeagueEntries(summonerId, platform)
     - getMatchIds(puuid, region, count, queueId)
     - getMatch(matchId, region)
     - getActiveGame(summonerId, platform)

5. Create /lib/data-dragon.ts with:
   - getCurrentPatch(): fetches latest version from ddragon, caches in Redis 1h
   - getChampions(): fetches champion list, caches 24h
   - getItems(): fetches item list, caches 24h
   - All assets should reference your own CDN path, not proxy ddragon at runtime

All files must be TypeScript. Use the environment variables exactly as defined in ARCHITECTURE.md. Do not create any pages or UI yet.
```

---
# PROMPT 02 — Database Schema
---

```
@ARCHITECTURE.md

Create the Supabase database schema for StatGap.gg.

Create a file /supabase/schema.sql containing all CREATE TABLE and CREATE INDEX statements exactly as defined in the Database Tables section of ARCHITECTURE.md.

Tables to create:
- matches
- match_participants (with all indexes)
- champion_stats
- item_slot_stats
- item_path_stats (with index)
- rune_stats
- summoners (with index)
- summoner_sessions (with index)
- champion_leaderboard (with index)

After creating the file, also create /supabase/README.md explaining:
- How to run the schema (paste into Supabase SQL editor)
- Which connection URL to use for migrations vs serverless functions (direct port 5432 for migrations, pooling port 6543 for app)
- Never use the direct URL from Vercel serverless functions
```

---
# PROMPT 03 — Background Cron Worker
---

```
@ARCHITECTURE.md

Build the background aggregation cron worker at /app/api/cron/aggregate/route.ts.

This is the most critical piece of the architecture. It runs every 2 hours via Vercel Cron and is responsible for:
1. Fetching new matches from Riot API
2. Processing and storing them in Supabase
3. Recomputing aggregated stats
4. Warming the Redis cache

Implement this flow:
1. Verify CRON_SECRET header to prevent unauthorized calls
2. Fetch list of tracked summoners from Supabase (summoners table, ordered by updated_at ASC — process stalest first)
3. For each summoner (process in batches of 10 to stay within rate limits):
   a. Call getMatchIds() for last 20 ranked matches
   b. Skip match_ids already in matches table
   c. For new matches: call getMatch(), extract participant data, insert into match_participants
   d. Update summoner rank/LP from getLeagueEntries()
4. After match processing, recompute champion_stats:
   - GROUP BY champion_id + role + rank_tier + patch
   - Calculate: games, wins, win_rate, pick_rate, ban_rate, avg KDA, avg CS/min, avg vision/min
   - Upsert into champion_stats
5. Recompute item_slot_stats:
   - Parse items JSONB from match_participants
   - Filter out components (non-legendary items) — only count completed legendaries
   - Track purchase order (slot_position 1 = first legendary completed)
   - Upsert into item_slot_stats
6. Recompute item_path_stats:
   - For each game: record (first_item_id, second_item_id) pair
   - Group and aggregate win rates
   - Upsert into item_path_stats
7. Recompute rune_stats:
   - Parse runes JSONB
   - For each rune: track path_id, is_primary, slot_index, rune_type
   - Calculate pick_rate as (games with this rune) / (total games for champion+role+patch+tier)
   - Upsert into rune_stats
8. Warm Redis: after each champion's stats are recomputed, write to Redis using keys from ARCHITECTURE.md with TTL 7200

Also create /vercel.json with cron configuration:
{
  "crons": [{
    "path": "/api/cron/aggregate",
    "schedule": "0 */2 * * *"
  }]
}

The worker must handle errors gracefully — a failure on one summoner must not abort the entire job. Log errors but continue processing.
```

---
# PROMPT 04 — Champion Page
---

```
@ARCHITECTURE.md

Build the champion page at /app/champions/[championName]/page.tsx.

Use generateStaticParams to pre-render all champion pages at build time. All data must come from Redis — never query Supabase during page render.

PAGE STRUCTURE (top to bottom):

1. Champion header
   - Champion name, title, role
   - Splash art as background (blurred, darkened)
   - Role tabs: Top / Jungle / Mid / ADC / Support — each tab shows game count. Default to highest-game-count role.

2. Stats bar
   - Win Rate · Pick Rate · Ban Rate · GAMES: [count]
   - The game count is a trust signal — always visible

3. Rank filter (sticky, always visible)
   - Buttons: All | Iron–Silver | Gold–Plat | Emerald–Diamond | Master+
   - Default: Emerald–Diamond
   - Changing rank updates ALL stats on the page instantly from Redis — no spinner, no page reload

4. Data freshness line
   - "Based on [X] games · Patch [X] · Updated [X] hours ago"

5. Build tab (default active tab)

   LEFT COLUMN:

   a. Full Rune Page Layout
      - Show the actual rune grid layout as it appears in the LoL client
      - PRIMARY PATH header with path icon
      - Keystone row: show ALL keystone options for this path, each with pick rate % underneath
      - Row 1, Row 2, Row 3: show ALL rune options, each with pick rate %
      - Most popular rune in each row: full opacity with colored border matching path color
      - Less popular runes: 40% opacity, greyed
      - SECONDARY PATH: show secondary path name + the 2 rows selected, with pick rates
      - SHARDS: Offense / Flex / Defense — each shard option with pick rate %
      - Hover tooltip on each rune: "[Rune Name] — [pick rate]% pick rate · [win rate]% win rate · [X] games"

   b. Build Switcher
      - Tabs above the rune section: [ Most Popular ] [ Highest Win Rate ] [ + other clusters if ≥500 games ]
      - Each tab shows its win rate and pick rate in the tab label
      - Switching tabs updates runes + items simultaneously

   c. Summoner Spells
      - Two spell icons + win rate for most popular combination

   d. Toughest Matchups
      - Top 5 counters: champion icon + name + win rate against

   RIGHT COLUMN:

   a. Skill Priority
      - Q / W / E / R order with level-up sequence

   b. Starting Items
      - Item icons + win rate

   c. Core Build (items 1–4)
      - Each item shows: icon + name + win rate labeled as "54.2% as 1st item", "53.1% as 2nd item" etc.
      - Tooltip: "Win rate calculated when built in this position — more accurate than overall win rate"

   d. Item Path Comparison
      - Section header: "First Item Win Rates"
      - Table: item icon | item name | WR | games | diff vs most popular
      - Sort by games desc (most popular first)
      - Win rate delta: green if better than most popular, red if worse
      - ⚠ badge on items with <500 games
      - Hide items with <200 games
      - Clicking a row expands it to show "Then built 2nd:" sub-table with same format

   e. Situational Items (4th/5th/6th options)
      - Item option panels grouped by slot
      - ⚠ badge if <500 games
      - Hide and show "Not enough data yet" if <200 games

Data flow:
- All stats served from Redis key: champion:stats:{championId}:{patch}:{tier}:{role}
- Builds from: champion:builds:{championId}:{patch}:{tier}:{role}
- Item paths from: champion:itempaths:{championId}:{role}:{patch}:{tier}
- Rank filter change: fetch new Redis key client-side, update all stats with no page reload
- Use React Server Components for initial render, client component only for rank filter interactivity
```

---
# PROMPT 05 — Tier List Page
---

```
@ARCHITECTURE.md

Build the tier list page at /app/tier-list/page.tsx.

All data from Redis. Target <500ms load.

PAGE STRUCTURE:

1. Role tabs
   All | Top | Jungle | Mid | ADC | Support

2. Rank filter row (below role tabs)
   All Ranks | Iron–Silver | Gold–Plat | Emerald–Diamond | Master+
   Default: Emerald–Diamond
   Changing rank or role updates tiers instantly from Redis

3. Data freshness bar
   "Based on [X] games · Patch [X] · Updated [X] hours ago"

4. Tier rows: S / A / B / C / D / F
   - Champion icons displayed in each tier
   - On hover: floating tooltip card showing:
     - Champion name
     - Win Rate | Pick Rate | Ban Rate
     - Games analyzed (⚠ if under 500)
     - Patch trend: ↑ improved / → stable / ↓ dropped vs previous patch

Data from Redis key: tierlist:{patch}:{tier}:{role}
Meta (games count, updated_at) from: tierlist:meta:{patch}:{tier}:{role}
```

---
# PROMPT 06 — Summoner Profile Page
---

```
@ARCHITECTURE.md

Build the summoner profile page at /app/summoners/[region]/[riotId]/page.tsx.

Loading strategy: immediately serve Redis cached version, trigger background revalidation in parallel. Never block render on fresh data.

PAGE STRUCTURE:

LEFT COLUMN (3 stacked cards):

1. Ranked Solo card
   - Rank icon + tier + division + LP
   - Win rate + W/L record this season
   - LADDER RANK line: "🏆 NA · Ladder Rank 106,816 (top 11.59%)"
   - Ladder rank pulled from Redis key: leaderboard:{region} — player's position in sorted list

2. Ranked Flex card
   - Same structure as Solo card with its own ladder rank

3. Session Health card (see PROMPT 08 for full spec)
   - Placeholder for now if not yet built: show empty card with "Session data loading"

MAIN AREA — Tab navigation: Overview | Champion Pool

OVERVIEW TAB:
- Match history: last 20 games, each row showing: champion icon, KDA, CS, vision, win/loss, game duration, time ago
- Summary row above match list: avg KDA · avg CS/min · avg vision · overall WR last 20

CHAMPION POOL TAB:
- Grid of champion cards (one per champion played this season, min 3 games)
- Each card: champion splash, name, games, WR, KDA, W/L record, "MAIN" badge if highest games
- Patch health tag at bottom of each card:
  - Green "Patch X.X ↑ 52.1% WR" if champion WR >51% at player's rank this patch
  - Yellow "→" if 49–51%
  - Red "↓" if <49%

All data from Redis key: summoner:{region}:{riotIdLower}
```

---
# PROMPT 07 — Per-Champion Analysis Page
---

```
@ARCHITECTURE.md

Build the per-champion analysis page at /app/summoners/[region]/[riotId]/[champion]/page.tsx.

This is StatGap's strongest page. Every section should feel like a personal coach, not a stats dump.

PAGE HEADER:
- Champion name + role + "Mastery Grade" badge (A+, S-, etc. derived from performance vs rank average)
- Champion Ladder Rank badge: "Ranked #2,847 on Ahri in NA · Top 3% · Top 0.8% Globally"
  - Only show if player has 20+ games on this champion
  - Pull from Redis: champ:leaderboard:{championId}:{region}:{puuid}
  - Show both regional and global

SECTION 1 — Win Conditions (3 stat tiles)
- Each tile: a condition + win rate when met
- Example: "8+ CS/min → 62% WR" / "0–1 deaths pre-15 → 69% WR" / "First tower → 71% WR"
- Computed from player's own match history on this champion

SECTION 2 — Your #1 Focus to Climb
Algorithm (compute this server-side):
  For each metric [deaths_before_15 (weight 0.35), cs_per_min (0.30), vision_per_min (0.20), kda (0.15)]:
    player_avg = average from player's last 20 ranked games on this champion
    rank_avg = from champion_stats for this champion + role + player's rank tier
    deviation = (rank_avg - player_avg) / rank_avg
    weighted_gap = deviation × weight
  Surface the metric with the highest weighted_gap.

Output in plain English:
- Deaths: "Your deaths before 15 min average 2.1 — [Champion] mains at [Rank] average 0.9. This is your highest-impact stat to fix."
- CS: "Your CS/min is 4.2 — players your rank average 6.5. Closing this gap is worth an estimated 5% win rate."
- Vision: "Your vision score averages 12 — [Rank] averages 28. Warding more is your fastest path to improvement."

SECTION 3 — Stats vs Rank Benchmark (table)
| Stat | You | Gold Avg | Gap |
Each row: KDA, CS/min, Vision/min, Deaths pre-15, Avg game length
Gap column: colored red/green, plain English label ("Above average" / "-1.4 below average")

SECTION 4 — Progression Tracker (2×3 grid of charts)
Chart 1: Win Rate over last 30 games (rolling 10-game average line)
Chart 2: CS/min over last 30 games
Chart 3: KDA over last 30 games
Chart 4: Vision score over last 30 games
Chart 5: Win Rate by Time of Day
  - 4 bars: Morning (6am–12pm) / Afternoon (12pm–6pm) / Evening (6pm–11pm) / Late Night (11pm–6am)
  - Highest bar green, lowest bar red
  - Auto-generated sentence: "You win [X]% of games in the evening. Your lowest win rate is late night ([X]%)."
  - Timezone: use browser's Intl.DateTimeFormat().resolvedOptions().timeZone — no extra API calls

SECTION 5 — Matchup Advisor
- Quick-pick row: 5 most common enemy champions at player's rank in this role, shown as clickable icons above the text input. Label: "Common picks at your rank:"
- Clicking an icon auto-populates and runs the analysis
- Text input: "Enter an enemy champion..."
- Output: plain English matchup analysis (laning phase, power spikes, items that help, how to win)

SECTION 6 — Rank-Up Roadmap
Table: what the player needs to improve to reach the next rank tier
| Metric | Current | Next Rank Avg | What to Do |
Each row has a one-line plain English action item.

SECTION 7 — AI Coach paragraph
One paragraph summarizing the player's playstyle on this champion and their single highest-leverage improvement. Keep it factual and specific — reference their actual numbers.
```

---
# PROMPT 08 — Session Health Card
---

```
@ARCHITECTURE.md

Build the Session Health card component at /components/summoner/SessionHealthCard.tsx and wire it into the summoner profile page left column (below Ranked Flex card).

SESSION GROUPING LOGIC:
- Load player's match history sorted by game_timestamp desc
- Group into sessions: games within 4 hours of each other = same session. Gap of 4+ hours = new session.
- Focus on the most recent session (today or last played)

CARD STATES — render exactly one based on current session:

POSITIVE (net positive or <2 consecutive losses):
  Green left border accent
  "Today's Session — [X]W [Y]L — you're playing well. Keep it up."

NEUTRAL (even record, no streak):
  Grey border
  "Today's Session — [X]W [Y]L — even session."

WARNING (2–3 consecutive losses at end of session):
  Yellow border
  "3-Game Loss Streak — Your win rate after 3 consecutive losses drops ~12%. A short break often helps."

STRONG WARNING (4+ consecutive losses):
  Red border
  "4-Game Loss Streak — Data shows performance drops significantly here. Stepping away and returning fresh is the best play."

CHAMPION SWITCHING (if player switched champions 3+ times during a loss streak):
  Add a second line below the main state message:
  "You've switched champions [X] times this session. Sticking to one champion during loss streaks correlates with better recovery."

TONE RULES — strictly enforce:
- Always factual. Never preachy.
- Frame everything as data observation, not judgment or advice-giving
- Never say "you should" — say "data shows" or "correlates with"
- If no games today: show "No games today yet."

DATA SOURCE:
- Read from summoner_sessions table (or compute from summoner match history in Redis)
- Cache result in Redis: summoner:session:{puuid}:{date} TTL 300s
```

---
# PROMPT 09 — Ladder Rank System
---

```
@ARCHITECTURE.md

Build the ladder rank system. This shows a player's absolute position in their region and globally.

DISPLAY LOCATIONS (3 places):
1. Ranked Solo card on summoner profile: "🏆 NA · Ladder Rank 106,816 (top 11.59%)"
2. Ranked Flex card: same for flex queue
3. Per-champion analysis page header: "Ranked #2,847 on Ahri in NA · Top 3% · Top 0.8% Globally"

REGIONAL LEADERBOARD (for summoner overall rank):
1. Add a cron step in the aggregate worker (PROMPT 03) that runs after match processing:
   - Fetch Challenger, Grandmaster, and Master tier players from Riot API for RANKED_SOLO_5x5
   - For all other tiers: estimate rank order by assigning each player a sort score:
     tier_weight (Challenger=9, GM=8, Master=7, Diamond=6, Emerald=5, Platinum=4, Gold=3, Silver=2, Bronze=1, Iron=0)
     sort_score = (tier_weight × 10000) + (division_weight × 1000) + LP
     division_weight: I=4, II=3, III=2, IV=1
   - Rank all summoners in summoners table by sort_score DESC per region
   - Store sorted list in Redis: leaderboard:{region} as a sorted set (ZADD)
   - TTL: 7200s

2. When displaying a summoner's rank:
   - Get their position: ZREVRANK leaderboard:{region} {summonerId}
   - Get total: ZCARD leaderboard:{region}
   - Percentile: (rank_position / total) × 100, display as "top X%"
   - Always say "top X%" not "bottom X%"
   - If player is unranked: hide the ladder rank line entirely

CHAMPION LEADERBOARD (for per-champion rank):
1. Add to cron worker: after rune_stats recomputation, compute champion_leaderboard:
   - For each champion+region combination:
     - Find all summoners with 20+ ranked games on that champion (from match_participants)
     - Score = win_rate weighted by games: score = wins / (wins + losses) where games >= 20
     - Rank by score DESC
     - Insert/update champion_leaderboard table
   - Also compute global rank (region = 'global') across all regions
   - Cache in Redis: champ:leaderboard:{championId}:{region}:{puuid} TTL 7200s

2. Display rules:
   - Only show if player has 20+ games on champion
   - Show: "#2,847 in NA · #18,203 Globally · Top 3% in NA"
   - If not on leaderboard: "Play 20+ ranked games on [Champion] to appear on the leaderboard"
   - Make rank number a link to future /leaderboard/[champion] page (stub page OK for now)
```

---
# PROMPT 10 — Shareable OG Card
---

```
@ARCHITECTURE.md

Build the shareable stat card at /app/api/og/[region]/[riotId]/route.tsx using @vercel/og.

This generates a static image when someone clicks "Share Profile". The URL itself is the shareable link.

CARD DESIGN (1200×630px, dark background):
- Top left: StatGap.gg logo + "statgap.gg" wordmark
- Background: blurred champion splash art (player's most played champion this patch)
- Overlay: dark gradient so text is readable

Card sections:
- Player name (large, white) + region tag
- Current rank: rank icon + "Gold II · 67 LP"
- Ladder position: "Ladder Rank 106,816 · Top 11.59% in NA"
- Best champion this patch: icon + name + "XX% WR in YY games"
- Standout stat: auto-select whichever is most impressive: CS/min percentile, vision percentile, or win rate. Display as "Top 8% CS/min in NA"
- Bottom right: "statgap.gg" watermark

Data source: summoner:summary:{region}:{riotIdLower} Redis key (lightweight card data, TTL 300s)

The image regenerates fresh on every request — no caching at the route level. Twitter will cache it after first share (acceptable — it's a snapshot).

Also add a "Share Profile" button to the summoner profile page that:
1. Copies the OG image URL to clipboard
2. Shows a "Copied!" toast for 2 seconds
3. Also shows Twitter/X share button that opens: https://twitter.com/intent/tweet?url=[profileUrl]&text=Check+my+stats+on+StatGap.gg
```

---
# PROMPT 11 — Twitch Panel Widget
---

```
@ARCHITECTURE.md

Build the live Twitch panel widget at /app/widget/[region]/[riotId]/page.tsx.

This is a standalone page designed to be embedded as a Twitch panel iframe. Streamers add it via Edit Panels → Add Text/Image Panel → enter the widget URL.

CRITICAL REQUIREMENTS:
- Page must set response header: X-Frame-Options: ALLOWALL (add to next.config.js headers)
- Dark background: #0e0e10 (matches Twitch UI)
- Width: 320px max (Twitch panel width)
- Must load in <500ms — serve entirely from Redis
- Auto-refreshes every 5 minutes via setInterval on client side

WIDGET CONTENT (top to bottom):
1. Player name + region (small, muted)
2. Rank icon + "Gold II · 67 LP" (large, prominent)
3. Ladder position: "Rank 106,816 · Top 11.59% in NA"
4. Divider line
5. "This Week" section:
   - Win rate: "57% WR" + W/L record "14W 9L"
   - Most played champion: icon + name + WR
6. Last session result: "Last session: 4W 2L ↑" (green if net positive, red if net negative)
7. Bottom: StatGap.gg logo (small, right-aligned) — always visible, free marketing

STYLING:
- Font: system-ui or Inter
- Rank colors: match LoL rank tier colors (Gold = #C89B3C, Platinum = #0BC4B4, etc.)
- No hover states needed — this is viewed on stream, not interacted with
- No scrollbar

DATA SOURCE: summoner:summary:{region}:{riotIdLower} Redis key — same lightweight payload used by OG card.

Also add a "Get Twitch Widget" button on the summoner profile page that:
1. Shows the widget URL: statgap.gg/widget/[region]/[riotId]
2. Copies URL to clipboard on click
3. Shows instructions: "Paste this URL into your Twitch panel as an external link"
```

---
# PROMPT 12 — Following Feed (Social)
---

```
@ARCHITECTURE.md

Build the following/social feed system. No accounts, no login required.

ARCHITECTURE — three pieces:

PIECE 1: Follow button on summoner profiles
- Add a "Follow" button to every summoner profile page header
- On click: read existing follows from localStorage key "statgap:follows"
- Add {region, riotId, riotIdDisplay} to the array and save back to localStorage
- Button toggles to "Following ✓" with option to unfollow
- Max 50 follows (show message if limit reached)

PIECE 2: Following feed page at /app/following/page.tsx
- Client-side only page (reads localStorage on mount)
- If no follows: show empty state — "Follow players to track their progress here. Search for a summoner and click Follow."
- If follows exist: show feed of player cards + shareable URL button

FEED CARD per followed player (data from /api/summoner/[region]/[riotId]/summary):
- Player name + rank + LP
- LP change indicator: ↑ +23 LP today (green) / ↓ -41 LP today (red) — compare current LP to cached LP from 24h ago
- Today's record: "4W 2L today"
- This week's record: "14W 9L this week"  
- Most played champion icon + name this week
- Last active: "2 hours ago" (from most recent match timestamp)
- "Compare →" button linking to /compare/[region]/[riotId1]/[region]/[riotId2] with the viewer's own summoner

Load all cards in parallel (Promise.all). Show loading skeleton per card while fetching.

PIECE 3: Shareable feed URL
- "Share My Feed" button generates URL: statgap.gg/following?players=NA1:Faker,EUW1:Caps,KR:Faker
- The ?players= query param encodes the follow list
- When page loads with ?players= param, it reads from URL instead of localStorage
- This makes the feed bookmarkable and shareable without any account

API ROUTE needed:
Create /app/api/summoner/[region]/[riotId]/summary/route.ts
Returns lightweight JSON from Redis (summoner:summary:{region}:{riotIdLower}):
{
  riotId: string,
  region: string,
  rank: string,
  lp: number,
  lpChangeTodayEstimate: number,
  winsToday: number,
  lossesToday: number,
  winsThisWeek: number,
  lossesThisWeek: number,
  topChampionId: number,
  topChampionWinRate: number,
  lastMatchTimestamp: string
}
Must respond in <50ms — served entirely from Redis, no Supabase query.
```

---
# PROMPT 13 — Comparison Page
---

```
@ARCHITECTURE.md

Build the player comparison page at /app/compare/[region1]/[riotId1]/[region2]/[riotId2]/page.tsx.

URL format: statgap.gg/compare/NA1/Faker%23NA1/NA1/YourName%23NA1

This is the viral mechanic. Players generate this link vs streamers or rivals and share it. Design it to be screenshot-able.

PAGE LAYOUT — two columns (Player A left, Player B right):

HEADER ROW:
- Both players: name + rank icon + tier + LP side by side
- Auto-generated verdict (one line, centered between columns):
  Examples:
  "Faker has a higher win rate but you average more CS/min and better vision control."
  "You're climbing faster this week — 14W 9L vs their 8W 12L."
  "Nearly identical stats — the main gap is deaths before 15 minutes."
  Always factual, never insulting. Frame differences as gaps not failures.
  Algorithm: find the 1–2 stats where the difference is largest, write a template sentence.

STATS TABLE (this patch — last 20 ranked games):
| Stat | Player A | Player B |
| Win Rate | 57.3% ✓ | 51.2% |
| KDA | 4.2 ✓ | 3.1 |
| CS/min | 7.8 ✓ | 6.4 |
| Vision/min | 1.4 ✓ | 0.9 |
| Avg deaths pre-15 | 0.8 ✓ | 1.4 |
| Avg game length | 28m | 31m |
Highlight the better stat in each row with a green ✓ for the leading player.

LP HISTORY CHART:
- Line chart, last 20 games plotted for both players on same axes
- Player A: blue line, Player B: orange line
- Y axis: cumulative LP change (0 = start of window)
- Shows who's climbing vs stuck

CHAMPION OVERLAP:
- Shared champions: icons of champions both players have played this patch
- Each player's top 3 champions: icon + name + WR this patch

HEAD-TO-HEAD RECORD:
- Search both players' match history for games where both PUUIDs appear
- If found: "You've played against [name] 3 times. Record: 1W 2L."
- If not found: omit section entirely — do not show "0 games found"

SHARE BUTTON:
- Copies comparison URL to clipboard
- Twitter/X share: "Check out my comparison vs [Player B name] on StatGap.gg"

DATA SOURCE:
- Both summoners from Redis: summoner:{region}:{riotIdLower}
- Comparison data cached: compare:{region1}:{id1}:{region2}:{id2} TTL 120s
- Head-to-head: query match_participants for PUUID overlap (Supabase query OK here — infrequent)

API route: /app/api/compare/[region1]/[riotId1]/[region2]/[riotId2]/route.ts
```

---

---
# PROMPT 14 — Champion Builds Tab (Slot-Accurate Items + Full Rune Grid)
---

```
@ARCHITECTURE.md

Add a 'Builds' tab to the existing champion page. Do not modify any existing tabs. Only touch files inside /app/champions/ and /components/champion/.

The Builds tab has two sections side by side:

LEFT COLUMN — Full Rune Page Layout:
- Show the actual rune grid as it appears in the LoL client
- PRIMARY PATH header with path icon and name
- Keystone row: ALL keystone options for this path, each with pick rate % underneath
- Row 1, Row 2, Row 3: ALL rune options per row with pick rate %
- Most popular rune in each row: full opacity, colored border matching path color
- Less popular runes: 40% opacity, greyed out
- SECONDARY PATH: path name + 2 selected rows with pick rates
- SHARDS: Offense / Flex / Defense rows, each option with pick rate %
- Hover tooltip: "[Rune Name] — [pick rate]% pick rate · [win rate]% WR · [X] games"

RIGHT COLUMN — Item Path Comparison:
- Section header: "First Item Win Rates"
- Table columns: item icon | item name | WR | pick rate | games | diff vs most popular
- WR labeled as "54.2% as 1st item" under each item name
- Sort by games desc (most popular first)
- Win rate delta column: green if better than most popular, red if worse (e.g. -2.4%)
- ⚠ badge if games < 500
- Hide rows with < 200 games
- Clicking a first item row EXPANDS it to show second item breakdown:
  "Then built 2nd:" sub-table with same columns
  Shows which second item performs best after this first item

BUILD SWITCHER above both columns:
- Tabs: [ Most Popular ] [ Highest Win Rate ]
- Each tab shows its WR and pick rate in the label
- Switching tabs updates both runes and items simultaneously

RANK FILTER sticky below champion header:
- All | Iron-Silver | Gold-Plat | Emerald-Diamond | Master+
- Default: Emerald-Diamond
- Updates all stats instantly, no spinner

DATA FRESHNESS LINE below rank filter:
"Based on [X] games · Patch [X] · Updated [X] hours ago"

Use existing champion data for now. Show — for any data not yet available. Do not touch any other files.
```

---
# PROMPT 15 — Rune Trees Reference Page
---

```
@ARCHITECTURE.md

Build a standalone Rune Trees page at /app/runes/page.tsx. Only touch files inside /app/runes/ and /components/runes/.

This page shows ALL 5 rune trees simultaneously, displayed side by side in a horizontal scrollable row.

Each rune tree column shows:
- Tree name and icon at the top (Precision, Domination, Sorcery, Resolve, Inspiration)
- Tree's accent color as a top border
- Keystone row: all 3 keystones with pick rate % and win rate % underneath each
- Row 1, Row 2, Row 3: all runes in each row with pick rate % and win rate %
- Stat shards section at the bottom with pick rates

Each individual rune shows:
- Rune icon (full opacity if most popular in its row, 40% if not)
- Rune name on hover tooltip
- Pick rate % below icon (e.g. "67%")
- Win rate % below pick rate in smaller muted text (e.g. "52.3% WR")
- Hover tooltip: full rune name + description + pick rate + win rate + games analyzed

FILTER ROW at top of page:
- Champion search/select: filter all pick rates and win rates to a specific champion
- Role filter: All / Top / Jungle / Mid / ADC / Support  
- Rank filter: All | Iron-Silver | Gold-Plat | Emerald-Diamond | Master+
- When no champion selected: show aggregate pick rates across all champions

PAGE HEADER:
"Rune Trees — Pick rates and win rates for every rune, every patch."
Data freshness line: "Patch [X] · Based on [X] games · Updated [X] hours ago"

Use sample/placeholder data for now (show — where real data unavailable).
Add 'Runes' link to the main navigation.
Do not touch any other files.
```

---
# PROMPT 16 — Champion Pool: Time + Day Win Rate Breakdowns
---

```
@ARCHITECTURE.md

Add win rate breakdown sections to the Champion Pool tab on the summoner profile page. Only touch files inside /app/summoner/ (or wherever the summoner profile lives) and /components/summoner/.

Add these three new sections below the existing champion pool cards:

SECTION 1 — Win Rate by Time of Day (bar chart)
- 4 bars: Morning (6am-12pm) / Afternoon (12pm-6pm) / Evening (6pm-11pm) / Late Night (11pm-6am)
- Highest bar: green. Lowest bar: red. Others: muted blue/grey.
- Auto-generated sentence: "You win [X]% of games in the evening. Your lowest win rate is late night ([X]%)."
- Timezone: use browser's Intl.DateTimeFormat().resolvedOptions().timeZone
- Computed from game_timestamp on existing match data

SECTION 2 — Win Rate by Day of Week (bar chart)
- 7 bars: Mon / Tue / Wed / Thu / Fri / Sat / Sun
- Same color treatment: highest green, lowest red
- Auto-generated sentence: "Your best day is Saturday ([X]% WR). Avoid ranked on Tuesdays ([X]% WR)."

SECTION 3 — Win Rate by Champion (this patch)
- Table: champion icon | champion name | WR this patch | games this patch | WR all time | trend (↑↓→)
- Sort by games this patch desc
- Highlight row green if WR > 52%, red if WR < 48%
- Trend: compare WR this patch vs WR last patch. ↑ if improved >2%, ↓ if dropped >2%, → if stable

All three sections use existing match_participants data — no new API calls needed.
Use sample data for Demo#NA1, TestW#NA1, TestL#NA1 for now.
Do not touch any other files.
```

---
# PROMPT 17 — Objective Win Rates (Timeline API)
---

```
@ARCHITECTURE.md

Add an Objectives section to the per-champion analysis page. Only touch files inside the per-champion analysis page and /components/summoner/.

This section shows the player's win rate when specific early-game objectives are achieved on this champion.

OBJECTIVES TO TRACK (pull from Riot Timeline API: GET /lol/match/v5/matches/{matchId}/timeline):
- First Blood (participant gets or assists first kill)
- First Tower (team destroys first tower)
- First Dragon (team gets first dragon)
- Dragon type breakdown: Infernal / Ocean / Cloud / Mountain / Chemtech / Hextech — win rate per type
- Grubs (Voidgrub — team gets first grubs)
- First Baron
- First Rift Herald

DISPLAY FORMAT — card grid (2 columns):
Each objective card shows:
- Objective icon or emoji
- Objective name
- "When achieved: [X]% WR ([Y] games)"
- "When not achieved: [X]% WR ([Y] games)"  
- Delta: green if achieving it helps significantly (>5% diff), grey if minimal impact
- ⚠ if fewer than 20 games in sample

AUTO-GENERATED INSIGHT below the grid:
Plain English sentence about the most impactful objective:
"Getting first dragon increases your win rate by 18% on this champion — prioritize it every game."
Or: "First blood has minimal impact on your win rate on this champion — don't take unnecessary risks for it."

DATA PIPELINE:
- Add getMatchTimeline(matchId, region) to lib/riot-api.ts
- Parse timeline frames for BUILDING_KILL, CHAMPION_KILL (first blood), ELITE_MONSTER_KILL events
- Store objective outcomes per match_participant in a new JSONB column: objectives JSONB on match_participants table
- Schema: { firstBlood: boolean, firstTower: boolean, firstDragon: boolean, dragonType: string, grubs: boolean, firstBaron: boolean, firstHerald: boolean }
- Add to cron worker: fetch timeline for each new match, extract and store objective data

Use sample data for Demo#NA1 for now showing placeholder percentages.
Do not touch any other files.
```

---
# PROMPT 18 — LP Gain/Loss on Match History + LP Graph
---

```
@ARCHITECTURE.md

Add LP tracking to the summoner profile page. Only touch files inside the summoner profile page location and /components/summoner/.

PART 1 — LP gain/loss on each match history card:
- Below the champion icon on each match row, show estimated LP change
- Green "+18 LP" for wins, red "-20 LP" for losses
- LP values: use snapshot diff between this match and previous match from profile_snapshots table
- If no snapshot available: estimate using standard LP values:
  Win: +18 to +28 LP depending on rank tier (higher tiers gain less)
  Loss: -18 to -22 LP
  Show estimated values with a ~ prefix: "~+21 LP"
- Promotion games: show "PROMO" badge instead of LP number
- Demotion games: show "DEMOTED" badge in red

PART 2 — LP History Graph:
- Location: below the Recently Played With section on the summoner profile left column
- Title: "LP History"
- Time range selector tabs: 24h | 7d | 14d | 30d | 90d
- Default: 7d
- Line chart showing LP trajectory over selected period
- Y axis: LP on a linear scale (convert rank+division+LP to absolute score:
  Challenger=90000+LP, GM=80000+LP, Master=70000+LP,
  Diamond I=6400+LP, Diamond II=5800+LP... etc down to Iron IV=0+LP)
- X axis: date/time
- Each data point = a match played. Dot on hover shows: date, result W/L, LP change, champion played
- Line color: green if trending up over period, red if trending down, grey if flat
- Data source: profile_snapshots table (already exists in codebase) — each snapshot has rank+LP
- If fewer than 3 data points in selected range: show "Not enough data for this time range"

PART 3 — LP snapshot on profile update:
- When a summoner profile is refreshed (manual or cron), save a snapshot to profile_snapshots:
  { puuid, riot_id, region, rank_solo, lp_solo, rank_flex, lp_flex, snapshot_at }
- This is likely already partially implemented — check existing profile_snapshots table and extend if needed

Use sample data for Demo#NA1 showing a realistic LP graph over 7 days.
Do not touch any other files.
```

---
# PROMPT 19 — Champion Page: Builds Tab Cleanup
---

```
@ARCHITECTURE.md

This prompt cleans up the champion page builds tab specifically. Only touch files inside /app/champions/ and /components/champion/.

The builds tab currently exists but needs these specific fixes:

1. RUNE GRID — show ALL rune options in each slot, not just the most popular one. Every keystone, every row 1/2/3 rune, every secondary option must be visible. Most popular = full opacity. Others = 40% opacity with pick rate % shown underneath.

2. ITEM SLOT LABELS — every item in the core build must be labeled with its slot: "54.2% as 1st item" not just "54.2%". This label appears below the win rate on each item.

3. ITEM PATH TABLE — the expandable first→second item table must work correctly:
   - Click first item row → expands to show second item options with their win rates
   - Each second item shows: icon, name, "X% as 2nd item after [first item]", games
   - Collapse on second click

4. LOW SAMPLE WARNINGS — any item or rune with fewer than 500 games: show yellow ⚠
   Any item with fewer than 200 games: hide entirely, show "Not enough data"

5. DATA FRESHNESS — the line "Based on X games · Patch X · Updated X hours ago" must be visible and accurate

Do not add any new features. Only fix these 5 specific things. Do not touch any other files.
```

---

## BUILD ORDER

Run prompts in this order. Each one depends on the previous.

| # | Prompt | Depends on |
|---|---|---|
| 01 | Foundation Setup | — |
| 02 | Database Schema | — |
| 03 | Background Cron Worker | 01, 02 |
| 04 | Champion Page | 01, 02, 03 |
| 05 | Tier List Page | 01, 02, 03 |
| 06 | Summoner Profile Page | 01, 02, 03 |
| 07 | Per-Champion Analysis | 06 |
| 08 | Session Health Card | 06 |
| 09 | Ladder Rank System | 03, 06 |
| 10 | Shareable OG Card | 06 |
| 11 | Twitch Panel Widget | 06 |
| 12 | Following Feed | 06 |
| 13 | Comparison Page | 06, 12 |
| 14 | Champion Builds Tab | 04 |
| 15 | Rune Trees Reference Page | 02, 03 |
| 16 | Champion Pool Time/Day Breakdowns | 06 |
| 17 | Objective Win Rates (Timeline API) | 07 |
| 18 | LP Gain/Loss + LP Graph | 06 |
| 19 | Champion Page Builds Cleanup | 14 |
