const DDragonVersion = "16.5.1";

/** Default Data Dragon version for item/spell/champion assets when not fetched. Use same as spells/runes. */
export const DEFAULT_DDRAGON_VERSION = DDragonVersion;

/** Use when rendering item slots: only render an img if the value is a valid item id. */
export const isValidItemId = (v: unknown): v is number =>
  typeof v === "number" && Number.isFinite(v) && v > 0;

/** Display name (from Riot API) to Data Dragon champion key for URLs */
const CHAMPION_NAME_TO_KEY: Record<string, string> = {
  "Dr. Mundo": "DrMundo",
  "Lee Sin": "LeeSin",
  Wukong: "MonkeyKing",
  "Jarvan IV": "JarvanIV",
  "Xin Zhao": "XinZhao",
  "Master Yi": "MasterYi",
  "Miss Fortune": "MissFortune",
  "Twisted Fate": "TwistedFate",
  "Tahm Kench": "TahmKench",
  "Renata Glasc": "Renata",
  "Kai'Sa": "Kaisa",
  "Rek'Sai": "RekSai",
  "Cho'Gath": "Chogath",
  "Kha'Zix": "Khazix",
  "Vel'Koz": "Velkoz",
  "Kog'Maw": "KogMaw",
  LeBlanc: "Leblanc",
  "Nunu & Willump": "Nunu",
  "Bel'Veth": "Belveth",
};

function championDisplayNameToKey(displayName: string): string {
  const key = CHAMPION_NAME_TO_KEY[displayName];
  if (key) return key;
  return displayName
    .replace(/\s+/g, "")
    .replace(/\./g, "")
    .replace(/'/g, "")
    .replace(/&/g, "");
}

/**
 * Champion square icon URL.
 * Uses participant.championName (display name) converted to Data Dragon key.
 * version: from GET /api/ddragon/version (current Data Dragon version).
 */
export function getChampionSquareUrl(
  championName: string,
  version?: string | null
): string {
  if (!championName) return "";
  const key = championDisplayNameToKey(championName);
  const v = version || DDragonVersion;
  return `https://ddragon.leagueoflegends.com/cdn/${v}/img/champion/${key}.png`;
}

const DDRAGON_SPLASH_BASE =
  "https://ddragon.leagueoflegends.com/cdn/img/champion/splash";

/** Splash art URL for a specific skin. Use participant.championName and participant.skin. */
export function getChampionSplashUrlWithSkin(
  championName: string,
  skin: number
): string {
  if (!championName) return "";
  const key = championDisplayNameToKey(championName);
  return `${DDRAGON_SPLASH_BASE}/${key}_${skin}.jpg`;
}

export function getChampionSplashUrl(championName: string) {
  return getChampionSplashUrlWithSkin(championName, 0);
}

export function getProfileIconUrl(profileIconId: number, version?: string | null) {
  const v = version || DDragonVersion;
  return `https://ddragon.leagueoflegends.com/cdn/${v}/img/profileicon/${profileIconId}.png`;
}

export function getItemIconUrl(itemId: number) {
  if (!itemId) return "";
  return `https://ddragon.leagueoflegends.com/cdn/${DDragonVersion}/img/item/${itemId}.png`;
}

/** Summoner spell ID (from participant.summoner1Id / summoner2Id) to Data Dragon spell key */
const SUMMONER_SPELL_ID_TO_KEY: Record<number, string> = {
  1: "SummonerBoost",
  3: "SummonerExhaust",
  4: "SummonerFlash",
  6: "SummonerHaste",
  7: "SummonerHeal",
  11: "SummonerSmite",
  12: "SummonerTeleport",
  13: "SummonerMana",
  14: "SummonerDot",
  21: "SummonerBarrier",
  30: "SummonerPoroRecall",
  31: "SummonerPoroThrow",
  32: "SummonerSnowball",
  39: "SummonerSnowURFSnowball_Mark",
  54: "Summoner_UltBookPlaceholder",
  55: "Summoner_UltBookSmitePlaceholder",
  2201: "SummonerCherryHold",
  2202: "SummonerCherryFlash",
};

export function getSummonerSpellIconUrl(
  spellId: number | undefined,
  version?: string | null
): string {
  if (spellId == null) return "";
  const key = SUMMONER_SPELL_ID_TO_KEY[spellId];
  if (!key) return "";
  const v = version || DDragonVersion;
  return `https://ddragon.leagueoflegends.com/cdn/${v}/img/spell/${key}.png`;
}

/* ── Summoner spell tooltips ───────────────────────────────── */

export type SummonerSpellData = Record<number, { name: string; description: string; key: string }>;

export function getSummonerSpellTooltip(
  spellDataById: SummonerSpellData | undefined,
  spellId: number | undefined
): { title: string; body?: string; icon?: string } | null {
  if (spellId == null) return null;
  const data = spellDataById?.[spellId];
  if (!data) return null;
  const icon = getSummonerSpellIconUrl(spellId);
  return { title: data.name, body: data.description, icon };
}

/** Rank emblem from local /public/emblems/ directory. */
export function getRankEmblemUrl(tier: string): string {
  const capitalised = tier.charAt(0).toUpperCase() + tier.slice(1).toLowerCase();
  return `/emblems/${capitalised}.png`;
}

/* ── Item tooltips ──────────────────────────────────────────── */

export type ItemTooltipData = Record<number, {
  name: string;
  plaintext?: string;
  description?: string;
  gold?: number;
}>;

export function getItemTooltip(
  itemDataById: ItemTooltipData | undefined,
  itemId: number | string
): { title: string; body?: string; bodyHtml?: boolean; icon?: string } {
  const numId = typeof itemId === "string" ? parseInt(itemId, 10) : itemId;
  const id = Number.isFinite(numId) ? numId : itemId;
  const data =
    itemDataById?.[id as number] ??
    (itemDataById as Record<string, { name: string; plaintext?: string; description?: string; gold?: number }> | undefined)?.[String(itemId)];
  const title = (data?.name || `Item ${itemId}`).trim() || `Item ${itemId}`;
  const icon = typeof id === "number" && id > 0 ? getItemIconUrl(id) : undefined;

  if (data?.description) {
    let html = data.description
      .replace(/<mainText>|<\/mainText>/g, "")
      .replace(/<stats>([\s\S]*?)<\/stats>/g, '<div class="tt-stats">$1</div>')
      .replace(/<br\s*\/?>/g, "<br>")
      .replace(/<\/div>(<br>)+/g, "</div>");

    if (data.gold) {
      html += `<div class="tt-cost">Cost:<span class="tt-gold">${data.gold.toLocaleString()}</span></div>`;
    }
    return { title, body: html, bodyHtml: true, icon };
  }

  return { title, body: data?.plaintext, icon };
}
