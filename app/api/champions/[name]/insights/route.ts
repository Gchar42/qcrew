import { NextRequest } from "next/server";

const VERSIONS_URL = "https://ddragon.leagueoflegends.com/api/versions.json";

async function getLatestVersion(): Promise<string> {
  const res = await fetch(VERSIONS_URL, { next: { revalidate: 3600 } });
  if (!res.ok) return "14.16.1";
  const versions = (await res.json()) as string[];
  return versions?.[0] ?? "14.16.1";
}

type ChampionClass =
  | "Fighter"
  | "Mage"
  | "Assassin"
  | "Marksman"
  | "Tank"
  | "Support";

interface Insight {
  metric: string;
  oneTrickAvg: string;
  averageAvg: string;
  diff: string;
  icon: string;
}

const BASE_INSIGHTS: Insight[] = [
  { metric: "Win Rate", oneTrickAvg: "62.1%", averageAvg: "50.1%", diff: "+12.0%", icon: "🏆" },
  { metric: "CS per Minute", oneTrickAvg: "7.8", averageAvg: "6.2", diff: "+25.8%", icon: "🗡️" },
  { metric: "Control Ward Purchases", oneTrickAvg: "3.2/game", averageAvg: "1.0/game", diff: "+220%", icon: "👁️" },
  { metric: "Deaths per Game", oneTrickAvg: "3.8", averageAvg: "5.4", diff: "-29.6%", icon: "💀" },
  { metric: "Kill Participation", oneTrickAvg: "68%", averageAvg: "54%", diff: "+14%", icon: "🤝" },
  { metric: "First Blood Rate", oneTrickAvg: "28%", averageAvg: "20%", diff: "+8%", icon: "🩸" },
];

const CLASS_INSIGHTS: Record<ChampionClass, Insight[]> = {
  Fighter: [
    { metric: "Solo Kills in Lane", oneTrickAvg: "1.8/game", averageAvg: "0.7/game", diff: "+157%", icon: "⚔️" },
    { metric: "Max Q First", oneTrickAvg: "89%", averageAvg: "72%", diff: "+17%", icon: "🎯" },
  ],
  Mage: [
    { metric: "Skill Shot Accuracy", oneTrickAvg: "42%", averageAvg: "31%", diff: "+35.5%", icon: "🎯" },
    { metric: "Damage Share", oneTrickAvg: "31.2%", averageAvg: "24.8%", diff: "+25.8%", icon: "💥" },
  ],
  Assassin: [
    { metric: "Roam Kills Before 14 min", oneTrickAvg: "2.1/game", averageAvg: "0.8/game", diff: "+163%", icon: "🗡️" },
    { metric: "Average Time to First Kill", oneTrickAvg: "4:32", averageAvg: "7:15", diff: "-37.5%", icon: "⏱️" },
  ],
  Marksman: [
    { metric: "DPM (Damage per Minute)", oneTrickAvg: "742", averageAvg: "581", diff: "+27.7%", icon: "💥" },
    { metric: "Positioning Deaths", oneTrickAvg: "1.2/game", averageAvg: "2.8/game", diff: "-57.1%", icon: "🛡️" },
  ],
  Tank: [
    { metric: "Damage Mitigated", oneTrickAvg: "38.2k", averageAvg: "27.4k", diff: "+39.4%", icon: "🛡️" },
    { metric: "Engage Success Rate", oneTrickAvg: "71%", averageAvg: "52%", diff: "+19%", icon: "🎯" },
  ],
  Support: [
    { metric: "Vision Score per Min", oneTrickAvg: "2.1", averageAvg: "1.3", diff: "+61.5%", icon: "👁️" },
    { metric: "Roam Timer (min in lane)", oneTrickAvg: "62%", averageAvg: "78%", diff: "-20.5%", icon: "🗺️" },
  ],
};

function resolveClass(tags: string[]): ChampionClass {
  const tagMap: Record<string, ChampionClass> = {
    Fighter: "Fighter",
    Mage: "Mage",
    Assassin: "Assassin",
    Marksman: "Marksman",
    Tank: "Tank",
    Support: "Support",
  };
  for (const t of tags) {
    if (tagMap[t]) return tagMap[t];
  }
  return "Fighter";
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  const { name } = await params;
  if (!name) {
    return Response.json({ error: "Champion name required" }, { status: 400 });
  }

  let tags: string[] = ["Fighter"];
  try {
    const version = await getLatestVersion();
    const url = `https://ddragon.leagueoflegends.com/cdn/${version}/data/en_US/champion/${encodeURIComponent(name)}.json`;
    const res = await fetch(url, { next: { revalidate: 86400 } });
    if (res.ok) {
      const json = await res.json();
      const data = json.data?.[name];
      if (data?.tags) tags = data.tags;
    }
  } catch {
    /* fall through with default */
  }

  const champClass = resolveClass(tags);
  const classSpecific = CLASS_INSIGHTS[champClass] ?? [];
  const insights: Insight[] = [...BASE_INSIGHTS, ...classSpecific];

  return Response.json({ championName: name, class: champClass, insights });
}
