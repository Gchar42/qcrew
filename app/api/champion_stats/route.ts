import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { aggregateChampRows } from "@/lib/aggregateChampRows";

/** GET: read from profile_bundle_cache (region, puuid, queue_key), aggregate from payload.matches. No Riot calls. */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const region = searchParams.get("region") ?? "na1";
  const puuid = searchParams.get("puuid") ?? "";
  const queue = (searchParams.get("queue") ?? "solo") === "flex" ? "flex" : "solo";
  if (!puuid) return NextResponse.json({ rows: [] }, { status: 200 });

  const { data: row } = await supabaseAdmin
    .from("profile_bundle_cache")
    .select("payload")
    .eq("region", region)
    .eq("puuid", puuid)
    .eq("queue_key", queue)
    .maybeSingle();

  const payload = row?.payload as { matches?: unknown[] } | null;
  const matches = Array.isArray(payload?.matches) ? payload.matches : [];
  const rows = aggregateChampRows(matches, puuid, queue);
  return NextResponse.json({ rows }, { status: 200 });
}

export async function POST(req: Request) {
  const body = await req.json();
  const matches = body.matches || [];
  const queue = (body.queue === "flex" ? "flex" : "solo") as string;
  const puuid = body.puuid ?? "";
  const rows = aggregateChampRows(matches, puuid, queue);
  return NextResponse.json({ rows });
}
