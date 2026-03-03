export const dynamic = "force-dynamic";
export const revalidate = 0;

const CDN_CACHE = "public, s-maxage=3600, stale-while-revalidate=86400";

/**
 * League V4 uses platform host only: {region}.api.riotgames.com
 * Supports ?summonerId= or ?puuid= (and ?region= or ?platform=).
 */
export async function GET(request: Request) {
  const key = process.env.RIOT_API_KEY ?? "";
  if (!key) {
    return Response.json(
      { error: "Missing RIOT_API_KEY env var" },
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  const { searchParams } = new URL(request.url);
  const region = searchParams.get("platform") ?? searchParams.get("region") ?? "na1";
  const puuid = searchParams.get("puuid");
  const summonerId = searchParams.get("summonerId");

  let path: string;
  if (summonerId && typeof summonerId === "string" && summonerId.trim()) {
    path = `/lol/league/v4/entries/by-summoner/${encodeURIComponent(summonerId.trim())}`;
  } else if (puuid && typeof puuid === "string" && puuid.trim()) {
    path = `/lol/league/v4/entries/by-puuid/${encodeURIComponent(puuid.trim())}`;
  } else {
    return Response.json(
      { error: "missing puuid or summonerId" },
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const host = `${region}.api.riotgames.com`;
  const url = `https://${host}${path}`;
  const headers: HeadersInit = { "X-Riot-Token": key };

  const upstream = await fetch(url, { headers });
  const body = await upstream.text();

  return new Response(body, {
    status: upstream.status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": CDN_CACHE,
    },
  });
}
