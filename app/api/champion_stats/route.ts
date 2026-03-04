import { NextResponse } from "next/server";

type QueueKey = "solo" | "flex";
type ChampAgg = {
  championId: number;
  championName: string;
  games: number;
  wins: number;
  kills: number;
  deaths: number;
  assists: number;
};

function riotRegionToRouting(region: string) {
  const r = (region || "").toLowerCase();
  if (r === "na" || r === "na1") return { platform: "na1", routing: "americas" };
  if (r === "euw" || r === "euw1") return { platform: "euw1", routing: "europe" };
  if (r === "eune" || r === "eun1") return { platform: "eun1", routing: "europe" };
  if (r === "kr") return { platform: "kr", routing: "asia" };
  if (r === "jp" || r === "jp1") return { platform: "jp1", routing: "asia" };
  if (r === "br" || r === "br1") return { platform: "br1", routing: "americas" };
  if (r === "la1") return { platform: "la1", routing: "americas" };
  if (r === "la2") return { platform: "la2", routing: "americas" };
  if (r === "oc" || r === "oc1") return { platform: "oc1", routing: "sea" };
  if (r === "tr" || r === "tr1") return { platform: "tr1", routing: "europe" };
  if (r === "ru") return { platform: "ru", routing: "europe" };
  return { platform: "na1", routing: "americas" };
}

async function riotFetch(url: string, signal?: AbortSignal) {
  const key = process.env.RIOT_API_KEY;
  if (!key) throw new Error("Missing RIOT_API_KEY");
  const res = await fetch(url, {
    headers: { "X-Riot-Token": key },
    signal,
    cache: "no-store",
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`Riot error ${res.status} ${txt.slice(0, 120)}`);
  }
  return res.json();
}

function queueIdFor(queue: QueueKey) {
  return queue === "solo" ? 420 : 440;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const region = searchParams.get("region") || "na";
  const puuid = searchParams.get("puuid") || "";
  const queue = (searchParams.get("queue") || "solo") as QueueKey;

  if (!puuid) return NextResponse.json({ rows: [] }, { status: 200 });

  const { routing } = riotRegionToRouting(region);
  const qid = queueIdFor(queue);
  const count = Math.min(Number(searchParams.get("count") || "40"), 80);
  const idsUrl =
    `https://${routing}.api.riotgames.com/lol/match/v5/matches/by-puuid/` +
    encodeURIComponent(puuid) +
    `/ids?start=0&count=${count}&queue=${qid}`;
  const matchIds: string[] = await riotFetch(idsUrl);
  const agg = new Map<number, ChampAgg>();
  const maxDetails = Math.min(matchIds.length, 30);

  for (let i = 0; i < maxDetails; i++) {
    const matchId = matchIds[i];
    const matchUrl =
      `https://${routing}.api.riotgames.com/lol/match/v5/matches/` +
      encodeURIComponent(matchId);
    const match = await riotFetch(matchUrl);
    const info = match?.info;
    const participants = info?.participants;
    if (!Array.isArray(participants)) continue;
    const me = participants.find((p: { puuid?: string }) => p?.puuid === puuid);
    if (!me) continue;
    const championId = Number(me?.championId || 0);
    if (!championId) continue;
    const championName =
      typeof me?.championName === "string" ? me.championName : `Champion ${championId}`;
    const kills = Number(me?.kills || 0);
    const deaths = Number(me?.deaths || 0);
    const assists = Number(me?.assists || 0);
    const win = Boolean(me?.win);
    const cur = agg.get(championId) || {
      championId,
      championName,
      games: 0,
      wins: 0,
      kills: 0,
      deaths: 0,
      assists: 0,
    };
    if (!cur.championName || cur.championName.startsWith("Champion "))
      cur.championName = championName;
    cur.games += 1;
    if (win) cur.wins += 1;
    cur.kills += kills;
    cur.deaths += deaths;
    cur.assists += assists;
    agg.set(championId, cur);
  }

  const rows = Array.from(agg.values())
    .sort((a, b) => b.games - a.games)
    .map((c) => {
      const safeDeaths = c.deaths > 0 ? c.deaths : 1;
      const kda = (c.kills + c.assists) / safeDeaths;
      const winRate = c.games > 0 ? (c.wins / c.games) * 100 : 0;
      return {
        championId: c.championId,
        championName: c.championName,
        championIcon: c.championName,
        games: c.games,
        wins: c.wins,
        winRate,
        kda,
        kills: c.kills / c.games,
        deaths: c.deaths / c.games,
        assists: c.assists / c.games,
      };
    });

  return NextResponse.json({ rows }, { status: 200 });
}
