import { NextRequest } from "next/server";

const DDRAGON_VERSION = "14.6.1";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const num = parseInt(id, 10);
  if (!Number.isFinite(num) || num < 0 || num > 9999) {
    return new Response("Invalid icon id", { status: 400 });
  }
  const url = `https://ddragon.leagueoflegends.com/cdn/${DDRAGON_VERSION}/img/profileicon/${num}.png`;
  const res = await fetch(url, { cache: "force-cache", next: { revalidate: 86400 } });
  if (!res.ok) {
    return new Response("Icon not found", { status: 404 });
  }
  const blob = await res.blob();
  return new Response(blob, {
    headers: {
      "content-type": res.headers.get("content-type") ?? "image/png",
      "cache-control": "public, max-age=86400",
    },
  });
}
