/**
 * CommunityDragon rune assets.
 * Perk icons from perks.json (by perk id); style tree icons from static map.
 */

const CD_BASE =
  "https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default";

export type PerkEntry = { id: number; iconPath: string };

/** Convert CommunityDragon iconPath to full URL */
export function perkIconPathToUrl(iconPath: string): string {
  const normalized = iconPath
    .toLowerCase()
    .replace("/lol-game-data/assets/", "");
  return `${CD_BASE}/${normalized}`;
}

/** Build perk icon URL from cached perks array (by id) */
export function getPerkIconUrl(
  perkId: number | undefined,
  perksById: Map<number, string>
): string {
  if (perkId == null) return "";
  const path = perksById.get(perkId);
  if (!path) return "";
  return perkIconPathToUrl(path);
}

/** Secondary tree style id -> CD icon path (tree icons) */
const STYLE_ICON_PATHS: Record<number, string> = {
  8000: "v1/perk-images/styles/7201_precision.png",
  8100: "v1/perk-images/styles/7200_domination.png",
  8200: "v1/perk-images/styles/7202_sorcery.png",
  8300: "v1/perk-images/styles/7203_whimsy.png",
  8400: "v1/perk-images/styles/7204_resolve.png",
};

export function getRuneStyleIconUrlCd(styleId: number | undefined): string {
  if (styleId == null) return "";
  const path = STYLE_ICON_PATHS[styleId];
  if (!path) return "";
  return `${CD_BASE}/${path}`;
}

const PERKS_CD_URL =
  "https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/perks.json";

/** Fetch perks from CommunityDragon; returns array of { id, iconPath } or null on failure */
export async function fetchPerksCd(): Promise<PerkEntry[] | null> {
  try {
    const res = await fetch(PERKS_CD_URL, { next: { revalidate: 86400 } });
    if (!res.ok) return null;
    const data = (await res.json()) as Array<{ id: number; iconPath: string }>;
    return data.map(({ id, iconPath }) => ({ id, iconPath }));
  } catch {
    return null;
  }
}
