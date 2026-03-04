import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const QUEUE_SOLO = 420;
const QUEUE_FLEX = 440;

export type ChampionStatRow = {
  championId: number;
  championName: string;
  championIcon: string;
  games: number;
  winRate: number;
  kda: number;
  kills: number;
  deaths: number;
  assists: number;
};

/** GET: season champion stats from matches table. No Riot calls. */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const puuid = searchParams.get("puuid") ?? "";
  const queue = (searchParams.get("queue") ?? "solo") === "flex" ? "flex" : "solo";
  if (!puuid) return NextResponse.json({ rows: [] }, { status: 200 });

  const queueId = queue === "flex" ? QUEUE_FLEX : QUEUE_SOLO;

  const { data: rows, error } = await supabaseAdmin
    .from("matches")
    .select("champion_id, champion_name, kills, deaths, assists, win")
    .eq("puuid", puuid)
    .eq("queue_id", queueId);

  if (error) {
    return NextResponse.json({ rows: [], error: error.message }, { status: 200 });
  }

  const agg = new Map<
    number,
    { games: number; wins: number; kills: number; deaths: number; assists: number; championName: string }
  >();

  for (const r of rows ?? []) {
    const cid = Number(r.champion_id ?? 0);
    if (!cid) continue;
    const name = typeof r.champion_name === "string" ? r.champion_name : `Champion ${cid}`;
    if (!agg.has(cid)) {
      agg.set(cid, { games: 0, wins: 0, kills: 0, deaths: 0, assists: 0, championName: name });
    }
    const c = agg.get(cid)!;
    c.games++;
    if (r.win) c.wins++;
    c.kills += Number(r.kills ?? 0);
    c.deaths += Number(r.deaths ?? 0);
    c.assists += Number(r.assists ?? 0);
    if (c.championName.startsWith("Champion ")) c.championName = name;
  }

  const out: ChampionStatRow[] = [...agg.entries()].map(([championId, c]) => {
    const winRate = c.games ? (c.wins / c.games) * 100 : 0;
    const kda = (c.kills + c.assists) / Math.max(1, c.deaths);
    return {
      championId,
      championName: c.championName,
      championIcon: c.championName,
      games: c.games,
      winRate,
      kda,
      kills: c.kills / c.games,
      deaths: c.deaths / c.games,
      assists: c.assists / c.games,
    };
  });
  out.sort((a, b) => b.games - a.games);

  return NextResponse.json({ rows: out }, { status: 200 });
}
