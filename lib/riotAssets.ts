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

/** Square icon fallback; pass gameVersion e.g. "14.6.xxx" for patch-specific URL */
export function getChampionSquareUrl(
  championName: string,
  gameVersion?: string
): string {
  if (!championName) return "";
  const key = championDisplayNameToKey(championName);
  const v = gameVersion?.split(".").slice(0, 2).join(".") || DDragonVersion;
  return `https://ddragon.leagueoflegends.com/cdn/${v}/img/champion/${key}.png`;
}

export function getChampionSplashUrl(championName: string) {
  if (!championName) return "";
  const key = championDisplayNameToKey(championName);
  return `https://ddragon.leagueoflegends.com/cdn/img/champion/splash/${key}_0.jpg`;
}

export function getProfileIconUrl(profileIconId: number) {
  return `https://ddragon.leagueoflegends.com/cdn/${DDragonVersion}/img/profileicon/${profileIconId}.png`;
}

export function getItemIconUrl(itemId: number) {
  if (!itemId) return "";
  return `https://ddragon.leagueoflegends.com/cdn/${DDragonVersion}/img/item/${itemId}.png`;
}
