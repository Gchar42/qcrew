import { NextResponse } from "next/server";
import { DEFAULT_DDRAGON_VERSION } from "@/lib/riotAssets";

const DDragonBase = "https://ddragon.leagueoflegends.com/cdn";

type SpellEntry = {
  id?: string;
  name?: string;
  description?: string;
  key?: string;
};

export async function GET() {
  const version = DEFAULT_DDRAGON_VERSION;
  const url = `${DDragonBase}/${version}/data/en_US/summoner.json`;
  try {
    const res = await fetch(url, { next: { revalidate: 86400 } });
    if (!res.ok) {
      return NextResponse.json(
        { error: `DDragon returned ${res.status}` },
        { status: 502 }
      );
    }
    const data = (await res.json()) as { data?: Record<string, SpellEntry> };
    const spells: Record<string, { name: string; description: string; key: string }> = {};
    for (const entry of Object.values(data.data ?? {})) {
      if (!entry?.key) continue;
      spells[entry.key] = {
        name: (entry.name ?? "").trim() || `Spell ${entry.key}`,
        description: (entry.description ?? "").trim(),
        key: entry.id ?? "",
      };
    }
    return Response.json({ spells });
  } catch (e) {
    console.error("[ddragon/summoner-spells]", e);
    return NextResponse.json(
      { error: "Failed to fetch summoner spells" },
      { status: 502 }
    );
  }
}
