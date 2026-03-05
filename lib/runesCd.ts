/**
 * CommunityDragon rune assets.
 * Perk icons from perks.json (by perk id); style tree icons from static map.
 */

const CD_BASE =
  "https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default";

export type PerkEntry = { id: number; iconPath: string; name?: string; shortDesc?: string };

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

export type PerkStyleEntry = { id: number; iconPath: string; name?: string };

/** Build secondary tree style icon URL from cached perkstyles (id -> iconPath) */
export function getStyleIconUrlCd(
  styleId: number | undefined,
  stylesById: Map<number, string>
): string {
  if (styleId == null) return "";
  const path = stylesById.get(styleId);
  if (!path) return "";
  return perkIconPathToUrl(path);
}

const PERKS_CD_URL =
  "https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/perks.json";

const PERKSTYLES_CD_URL =
  "https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/perkstyles.json";

/** Fetch perks from CommunityDragon; returns array of { id, iconPath, name?, shortDesc? } or null on failure */
export async function fetchPerksCd(): Promise<PerkEntry[] | null> {
  try {
    const res = await fetch(PERKS_CD_URL, { next: { revalidate: 86400 } });
    if (!res.ok) return null;
    const data = (await res.json()) as Array<{
      id: number;
      iconPath: string;
      name?: string;
      shortDesc?: string;
    }>;
    return data.map(({ id, iconPath, name, shortDesc }) => ({
      id,
      iconPath,
      name,
      shortDesc,
    }));
  } catch {
    return null;
  }
}

/** Fetch perk styles (tree icons) from CommunityDragon; returns array of { id, iconPath, name? } or null on failure */
export async function fetchPerkStylesCd(): Promise<PerkStyleEntry[] | null> {
  try {
    const res = await fetch(PERKSTYLES_CD_URL, { next: { revalidate: 86400 } });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      styles?: Array<{ id: number; iconPath: string; name?: string }>;
    };
    const styles = data.styles ?? [];
    return styles.map(({ id, iconPath, name }) => ({ id, iconPath, name }));
  } catch {
    return null;
  }
}
