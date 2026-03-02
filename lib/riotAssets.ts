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
