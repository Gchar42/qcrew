import { NextRequest } from "next/server";
import { getCachedDdragonVersion } from "@/lib/ddragonVersion";

const FALLBACK_VERSION = "14.6.1";
const DEFAULT_ICON_ID = 29;

async function fetchIconBuffer(
  iconId: number,
  version: string
): Promise<ArrayBuffer | null> {
  const url = `https://ddragon.leagueoflegends.com/cdn/${version}/img/profileicon/${iconId}.png`;
  const res = await fetch(url, { cache: "default" });
  if (!res.ok) return null;
  return res.arrayBuffer();
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const idNum = id.replace(/:.*$/, "").trim();
  const num = parseInt(idNum, 10);
  if (!Number.isFinite(num) || num < 0 || num > 9999) {
    return new Response("Invalid icon id", { status: 400 });
  }
  const version = (await getCachedDdragonVersion()) ?? FALLBACK_VERSION;
  let buffer = await fetchIconBuffer(num, version);
  if (!buffer && num !== DEFAULT_ICON_ID) {
    buffer = await fetchIconBuffer(DEFAULT_ICON_ID, version);
  }
  if (!buffer) {
    return new Response("Icon not found", { status: 404 });
  }
  return new Response(buffer, {
    headers: {
      "content-type": "image/png",
      "cache-control": "public, max-age=86400",
    },
  });
}
