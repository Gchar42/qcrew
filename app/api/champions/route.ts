import { NextRequest } from "next/server";
import { getAllSampleBuilds } from "@/lib/sampleChampionBuilds";

const VERSIONS_URL = "https://ddragon.leagueoflegends.com/api/versions.json";

interface ChampionListItem {
  id: string;
  name: string;
  title: string;
  tags: string[];
  iconUrl: string;
  tier: string;
  winRate: number;
  pickRate: number;
  banRate: number;
  role: string;
}

/* ── Fallback stats by primary tag ──────────────────────────── */

interface FallbackStats { tier: string; winRate: number; pickRate: number; banRate: number; role: string }

const TAG_DEFAULTS: Record<string, FallbackStats> = {
  Assassin:  { tier: "A", winRate: 50.2, pickRate: 5.8, banRate: 7.1, role: "mid" },
  Fighter:   { tier: "B", winRate: 50.0, pickRate: 4.5, banRate: 4.2, role: "top" },
  Mage:      { tier: "B", winRate: 50.4, pickRate: 5.1, banRate: 3.5, role: "mid" },
  Marksman:  { tier: "A", winRate: 50.6, pickRate: 7.2, banRate: 3.8, role: "bot" },
  Tank:      { tier: "B", winRate: 50.8, pickRate: 3.9, banRate: 2.9, role: "top" },
  Support:   { tier: "B", winRate: 50.5, pickRate: 4.8, banRate: 2.5, role: "support" },
};

function seededVariation(name: string): number {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = ((h << 5) - h + name.charCodeAt(i)) | 0;
  return ((h & 0x7fffffff) % 1000) / 1000;
}

function getFallbackStats(name: string, tags: string[]): FallbackStats {
  const base = TAG_DEFAULTS[tags[0]] ?? TAG_DEFAULTS.Fighter;
  const v = seededVariation(name);
  const wrShift = (v - 0.5) * 4;
  const prShift = (v - 0.5) * 3;
  const winRate = Math.round((base.winRate + wrShift) * 10) / 10;
  const pickRate = Math.round(Math.max(0.5, base.pickRate + prShift) * 10) / 10;
  const banRate = Math.round(Math.max(0, base.banRate + (v - 0.5) * 4) * 10) / 10;

  let tier = "B";
  if (winRate >= 52.5 && pickRate >= 6) tier = "S+";
  else if (winRate >= 51.5 || (winRate >= 51 && pickRate >= 7)) tier = "S";
  else if (winRate >= 50.5 || pickRate >= 5.5) tier = "A";
  else if (winRate >= 49) tier = "B";
  else if (winRate >= 47.5) tier = "C";
  else tier = "D";

  return { tier, winRate, pickRate, banRate, role: base.role };
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
      if (build) {
        return {
          id: c.id,
          name: c.name,
          title: c.title,
          tags: c.tags,
          iconUrl: `https://ddragon.leagueoflegends.com/cdn/${version}/img/champion/${c.id}.png`,
          tier: build.tier,
          winRate: build.win_rate,
          pickRate: build.pick_rate,
          banRate: build.ban_rate,
          role: build.role,
        };
      }

      const fallback = getFallbackStats(c.name, c.tags);
      return {
        id: c.id,
        name: c.name,
        title: c.title,
        tags: c.tags,
        iconUrl: `https://ddragon.leagueoflegends.com/cdn/${version}/img/champion/${c.id}.png`,
        tier: fallback.tier,
        winRate: fallback.winRate,
        pickRate: fallback.pickRate,
        banRate: fallback.banRate,
        role: fallback.role,
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

    champions.sort((a, b) => a.name.localeCompare(b.name));

    return Response.json({ champions, version, count: champions.length });
  } catch (err) {
    console.error("Champions list error:", err);
    return Response.json({ error: "Failed to load champions" }, { status: 500 });
  }
}
