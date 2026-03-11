import { NextRequest } from "next/server";
import { getAllSampleBuilds } from "@/lib/sampleChampionBuilds";

const VERSIONS_URL = "https://ddragon.leagueoflegends.com/api/versions.json";

interface ChampionListItem {
  id: string;
  name: string;
  title: string;
  tags: string[];
  iconUrl: string;
  tier: string | null;
  winRate: number | null;
  pickRate: number | null;
  banRate: number | null;
  role: string | null;
}

export async function GET(req: NextRequest) {
  const role = req.nextUrl.searchParams.get("role");

  try {
    const vRes = await fetch(VERSIONS_URL, { next: { revalidate: 3600 } });
    const versions = vRes.ok ? ((await vRes.json()) as string[]) : [];
    const version = versions[0] ?? "14.16.1";

    const champUrl = `https://ddragon.leagueoflegends.com/cdn/${version}/data/en_US/champion.json`;
    const champRes = await fetch(champUrl, { next: { revalidate: 86400 } });
    if (!champRes.ok) {
      return Response.json({ error: "Failed to fetch champion list" }, { status: 502 });
    }

    const champJson = await champRes.json();
    const champData = champJson.data as Record<
      string,
      { id: string; name: string; title: string; tags: string[]; key: string }
    >;

    const sampleBuilds = getAllSampleBuilds();
    const buildMap = new Map(sampleBuilds.map((b) => [b.champion_name, b]));

    const roleToTag: Record<string, string> = {
      top: "Fighter",
      jungle: "Fighter",
      mid: "Mage",
      bot: "Marksman",
      support: "Support",
    };

    let champions: ChampionListItem[] = Object.values(champData).map((c) => {
      const build = buildMap.get(c.name);
      return {
        id: c.id,
        name: c.name,
        title: c.title,
        tags: c.tags,
        iconUrl: `https://ddragon.leagueoflegends.com/cdn/${version}/img/champion/${c.id}.png`,
        tier: build?.tier ?? null,
        winRate: build?.win_rate ?? null,
        pickRate: build?.pick_rate ?? null,
        banRate: build?.ban_rate ?? null,
        role: build?.role ?? null,
      };
    });

    if (role) {
      const tag = roleToTag[role.toLowerCase()];
      if (tag) {
        champions = champions.filter(
          (c) => c.tags.includes(tag) || c.role === role.toLowerCase()
        );
      }
    }

    champions.sort((a, b) => {
      if (a.tier && !b.tier) return -1;
      if (!a.tier && b.tier) return 1;
      return (a.name > b.name ? 1 : -1);
    });

    return Response.json({ champions, version, count: champions.length });
  } catch (err) {
    console.error("Champions list error:", err);
    return Response.json({ error: "Failed to load champions" }, { status: 500 });
  }
}
