import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const DDragonBase = "https://ddragon.leagueoflegends.com/cdn";

type ItemEntry = { name?: string; plaintext?: string; description?: string };

/** GET /api/ddragon/items?version=14.6.1 — returns item id -> { name, plaintext, description } for League-style tooltips */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const version = searchParams.get("version")?.trim();
  if (!version) {
    return NextResponse.json({ error: "Missing version" }, { status: 400 });
  }
  const url = `${DDragonBase}/${version}/data/en_US/item.json`;
  try {
    const res = await fetch(url, { next: { revalidate: 86400 } });
    if (!res.ok) {
      return NextResponse.json(
        { error: `DDragon returned ${res.status}` },
        { status: 502 }
      );
    }
    const data = (await res.json()) as {
      data?: Record<string, ItemEntry>;
    };
    const dataMap = data.data ?? {};
    const items: Record<string, { name: string; plaintext?: string; description?: string }> = {};
    for (const [id, entry] of Object.entries(dataMap)) {
      const name = entry?.name ?? "";
      if (!name) continue;
      items[id] = {
        name,
        plaintext: entry.plaintext,
        description: entry.description,
      };
    }
    return Response.json({ items });
  } catch (e) {
    console.error("[ddragon/items]", e);
    return NextResponse.json(
      { error: "Failed to fetch items" },
      { status: 502 }
    );
  }
}
