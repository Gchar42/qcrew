# Item tooltips (Giant's Belt style – title + description)

## Where they are

| File | Role |
|------|------|
| **`components/LeagueTooltip.tsx`** | Renders the tooltip popup: golden **title**, optional separator, grey **body**. Uses `title` and `body` props; only shows body when `body` is truthy. Portals content to `document.body`. |
| **`app/globals.css`** (lines ~139–181) | Styles: `.league-tooltip`, `.league-tooltip-title` (gold), `.league-tooltip-body` (grey), separator when body exists. |
| **`lib/riotAssets.ts`** | `getItemTooltip(itemDataById, itemId)` – returns `{ title, body }` from the item data map. |
| **`app/api/ddragon/items/route.ts`** | `GET /api/ddragon/items?version=x` – fetches DDragon `item.json`, returns `{ items: { [id]: { name, plaintext } } }`. Uses `description` when `plaintext` is empty. |
| **Profile/match UIs** | Call `getItemTooltip(itemDataById, itemId)` and pass `title`/`body` into `<LeagueTooltip>`. |

## Data flow

1. **API** – Fetches `https://ddragon.leagueoflegends.com/cdn/{version}/data/en_US/item.json`, maps each item to `{ name, plaintext }` (plaintext from `plaintext` or stripped `description`).
2. **Client** – Fetches `/api/ddragon/items?version=…`, builds `itemDataById: Record<number, { name, plaintext }>`.
3. **Render** – For each item icon, `getItemTooltip(itemDataById, itemId)` → `{ title, body }` → `<LeagueTooltip title={title} body={body}>`.

## Places that show item tooltips

- **`components/SummonerProfileBeige.tsx`** – Match row items (slots 0–5) and trinket (item6) around lines 924–975.
- **`components/MatchDetails.tsx`** – Expanded match table item cells and trinket.
- **`components/summoner/MatchDetailSlideOver.tsx`** – Slide-over build section.
- **`components/summoner/MatchCard.tsx`** – Match list card item row.

## Why some items have no text

- **`itemDataById` is empty** – Items are only fetched when `ddragonVersion` is set; if the version request is slow or fails, tooltips fall back to "Item {id}" with no description.
- **Item ID not in DDragon** – Match from another patch or mode can have IDs not in the current `item.json`; lookup fails, so only fallback title.
- **Missing body** – If DDragon has no `plaintext` and no `description` for that item, `body` is undefined and only the title line appears.
