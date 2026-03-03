const DDragonVersion = "14.16.1";

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
  "Kog'Maw": "Kogmaw",
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

/** Loading screen portrait (preferred for match row) */
export function getChampionLoadingUrl(championName: string): string {
  if (!championName) return "";
  const key = championDisplayNameToKey(championName);
  return `https://ddragon.leagueoflegends.com/cdn/img/champion/loading/${key}_0.jpg`;
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

export function getProfileIconUrl(profileIconId: number) {
  return `https://ddragon.leagueoflegends.com/cdn/${DDragonVersion}/img/profileicon/${profileIconId}.png`;
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

/** Rune style ID (8000 Precision, 8100 Domination, etc.) to Data Dragon perk style icon path */
const RUNE_STYLE_ICON: Record<number, string> = {
  8000: "perk-images/Styles/7201_Precision.png",
  8100: "perk-images/Styles/7200_Domination.png",
  8200: "perk-images/Styles/7202_Sorcery.png",
  8300: "perk-images/Styles/7203_Whimsy.png",
  8400: "perk-images/Styles/7204_Resolve.png",
};

export function getRuneStyleIconUrl(
  styleId: number | undefined,
  version?: string | null
): string {
  if (styleId == null) return "";
  const path = RUNE_STYLE_ICON[styleId];
  if (!path) return "";
  const v = version || DDragonVersion;
  return `https://ddragon.leagueoflegends.com/cdn/${v}/img/${path}`;
}

/** Ranked tier emblem (CommunityDragon). tier e.g. "EMERALD", "PLATINUM". */
export function getRankEmblemUrl(tier: string): string {
  const key = tier.toLowerCase();
  return `https://raw.communitydragon.org/latest/plugins/rcp-fe-lol-static-assets/global/default/ranked-emblem/emblem-${key}.png`;
}
