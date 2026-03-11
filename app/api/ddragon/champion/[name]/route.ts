import { NextRequest } from "next/server";

const VERSIONS_URL = "https://ddragon.leagueoflegends.com/api/versions.json";

async function getLatestVersion(): Promise<string> {
  const res = await fetch(VERSIONS_URL, { next: { revalidate: 3600 } });
  if (!res.ok) return "14.16.1";
  const versions = (await res.json()) as string[];
  return versions?.[0] ?? "14.16.1";
}

export interface DDragonSpell {
  id: string;
  name: string;
  description: string;
  tooltip: string;
  cooldownBurn: string;
  costBurn: string;
  rangeBurn: string;
  maxrank: number;
  image: { full: string };
}

export interface DDragonPassive {
  name: string;
  description: string;
  image: { full: string };
}

export interface DDragonChampionFull {
  id: string;
  key: string;
  name: string;
  title: string;
  lore: string;
  tags: string[];
  info: { attack: number; defense: number; magic: number; difficulty: number };
  stats: Record<string, number>;
  passive: DDragonPassive;
  spells: DDragonSpell[];
  skins: { id: string; num: number; name: string }[];
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  const { name } = await params;
  if (!name) {
    return Response.json({ error: "Champion name required" }, { status: 400 });
  }

  try {
    const version = await getLatestVersion();
    const url = `https://ddragon.leagueoflegends.com/cdn/${version}/data/en_US/champion/${encodeURIComponent(name)}.json`;
    const res = await fetch(url, { next: { revalidate: 86400 } });

    if (!res.ok) {
      return Response.json(
        { error: `Champion "${name}" not found in DDragon` },
        { status: 404 }
      );
    }

    const json = await res.json();
    const data = json.data?.[name] as DDragonChampionFull | undefined;

    if (!data) {
      return Response.json(
        { error: `No data for "${name}"` },
        { status: 404 }
      );
    }

    const spellKeys = ["Q", "W", "E", "R"];
    const abilities = data.spells.map((s, i) => ({
      key: spellKeys[i] ?? `Spell${i}`,
      id: s.id,
      name: s.name,
      description: stripHtml(s.description),
      cooldown: s.cooldownBurn,
      cost: s.costBurn,
      range: s.rangeBurn,
      maxRank: s.maxrank,
      iconUrl: `https://ddragon.leagueoflegends.com/cdn/${version}/img/spell/${s.image.full}`,
    }));

    const passive = {
      name: data.passive.name,
      description: stripHtml(data.passive.description),
      iconUrl: `https://ddragon.leagueoflegends.com/cdn/${version}/img/passive/${data.passive.image.full}`,
    };

    return Response.json({
      id: data.id,
      name: data.name,
      title: data.title,
      lore: data.lore,
      tags: data.tags,
      info: data.info,
      passive,
      abilities,
      splashUrl: `https://ddragon.leagueoflegends.com/cdn/img/champion/splash/${data.id}_0.jpg`,
      iconUrl: `https://ddragon.leagueoflegends.com/cdn/${version}/img/champion/${data.id}.png`,
      version,
    });
  } catch (err) {
    console.error("DDragon champion fetch error:", err);
    return Response.json(
      { error: "Failed to fetch champion data" },
      { status: 500 }
    );
  }
}

function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .trim();
}
