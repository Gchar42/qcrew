export function getChampionSplashUrl(championName: string) {
  if (!championName) return "";
  return `https://ddragon.leagueoflegends.com/cdn/img/champion/splash/${encodeURIComponent(
    championName
  )}_0.jpg`;
}

export function getProfileIconUrl(profileIconId: number) {
  const v = "14.16.1";
  return `https://ddragon.leagueoflegends.com/cdn/${v}/img/profileicon/${profileIconId}.png`;
}

export function getItemIconUrl(itemId: number) {
  if (!itemId) return "";
  const v = "14.16.1";
  return `https://ddragon.leagueoflegends.com/cdn/${v}/img/item/${itemId}.png`;
}
