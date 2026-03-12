import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const DDragonBase = "https://ddragon.leagueoflegends.com/cdn";

type ItemEntry = { name?: string; plaintext?: string; description?: string };

/** Strip HTML-like tags so we can show the full official description as plain text in tooltips */
function stripTags(html: string): string {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** GET /api/ddragon/items?version=14.6.1 — returns item id -> { name, plaintext } for League-style tooltips */
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
    const items: Record<string, { name: string; plaintext?: string }> = {};
    for (const [id, entry] of Object.entries(dataMap)) {
      const rawName = (entry?.name ?? "").trim();
      const name = rawName || `Item ${id}`;
      const desc =
        typeof entry?.description === "string" && entry.description.trim().length > 0
          ? stripTags(entry.description)
          : "";
      const trimmedPlain = (entry?.plaintext ?? "").trim();
      const plaintext =
        desc.length > 0 ? desc : trimmedPlain.length > 0 ? trimmedPlain : undefined;
      items[id] = { name, plaintext: plaintext ?? undefined };
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
