import { unstable_cache } from "next/cache";

const VERSIONS_URL = "https://ddragon.leagueoflegends.com/api/versions.json";
const CHAMPION_JSON_PATH = "data/en_US/champion.json";

interface ChampionData {
  id: string;
  name: string;
  key: string;
  title: string;
  tags: string[];
}

interface ChampionJson {
  data: Record<string, { id: string; name: string; key: string; title: string; tags: string[] }>;
}

async function fetchChampionsRaw(): Promise<ChampionData[]> {
  const versionsRes = await fetch(VERSIONS_URL, { next: { revalidate: 3600 } });
  const versions = versionsRes.ok ? ((await versionsRes.json()) as string[]) : [];
  const version = versions[0] ?? "14.16.1";

  const url = `https://ddragon.leagueoflegends.com/cdn/${version}/${CHAMPION_JSON_PATH}`;
  const res = await fetch(url, { next: { revalidate: 86400 } });
  if (!res.ok) throw new Error("Failed to fetch champion list");

  const json = (await res.json()) as ChampionJson;
  return Object.values(json.data).map((c) => ({
    id: c.id,
    name: c.name,
    key: c.key,
    title: c.title,
    tags: c.tags,
  }));
}

/**
 * Fetches champion list from Data Dragon. Cached for 24h.
 */
export const getChampions = unstable_cache(
  fetchChampionsRaw,
  ["data-dragon-champions"],
  { revalidate: 86400 }
);
