import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { SEASON_KEY } from "@/lib/season";

export const dynamic = "force-dynamic";
export const revalidate = 0;
const NO_CACHE = { "Cache-Control": "no-store, max-age=0" };

/** Parse champions JSON from DB row */
function parseChampionsJson(val: unknown): unknown[] {
  if (val == null) return [];
  if (Array.isArray(val)) return val;
  try {
    const parsed = typeof val === "string" ? JSON.parse(val) : val;
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * GET /api/champion-stats/refresh-recent?limit=3
 *
 * Trigger champion-stats refresh for recently viewed profiles that don't have stats yet.
 * Call from a cron job (e.g. Vercel Cron every 10 min) so champion stats get filled automatically.
 * Optional: ?secret=YOUR_CRON_SECRET if CRON_SECRET env is set (recommended in production).
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const url = new URL(request.url);
    if (url.searchParams.get("secret") !== secret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: NO_CACHE });
    }
  }

  const url = new URL(request.url);
  const limit = Math.min(10, Math.max(1, parseInt(url.searchParams.get("limit") ?? "3", 10) || 3));

  const baseUrl =
    process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : request.headers.get("host")
        ? `${request.headers.get("x-forwarded-proto") ?? "https"}://${request.headers.get("host")}`
        : "";

  if (!baseUrl) {
    return NextResponse.json(
      { error: "Cannot determine base URL for triggering refresh" },
      { status: 500, headers: NO_CACHE }
    );
  }

  const { data: snapshots } = await supabaseAdmin
    .from("profile_snapshots")
    .select("puuid, region")
    .order("fetched_at", { ascending: false })
    .limit(50);

  const seen = new Set<string>();
  const unique: { puuid: string; region: string }[] = [];
  for (const row of snapshots ?? []) {
    const p = (row as { puuid?: string; region?: string }).puuid;
    const r = (row as { puuid?: string; region?: string }).region ?? "na1";
    if (p && !seen.has(p)) {
      seen.add(p);
      unique.push({ puuid: p, region: r });
    }
  }

  const toRefresh: { puuid: string; region: string; solo: boolean; flex: boolean }[] = [];

  for (let i = 0; i < Math.min(limit, unique.length); i++) {
    const { puuid, region } = unique[i];
    const [soloRes, flexRes] = await Promise.all([
      supabaseAdmin
        .from("champion_aggregates")
        .select("champions")
        .eq("puuid", puuid)
        .eq("queue", "solo")
        .eq("season_key", SEASON_KEY)
        .maybeSingle(),
      supabaseAdmin
        .from("champion_aggregates")
        .select("champions")
        .eq("puuid", puuid)
        .eq("queue", "flex")
        .eq("season_key", SEASON_KEY)
        .maybeSingle(),
    ]);
    const soloEmpty = !(parseChampionsJson(soloRes?.data?.champions).length > 0);
    const flexEmpty = !(parseChampionsJson(flexRes?.data?.champions).length > 0);
    if (soloEmpty || flexEmpty) {
      toRefresh.push({ puuid, region, solo: soloEmpty, flex: flexEmpty });
    }
  }

  const refreshUrl = `${baseUrl.replace(/\/$/, "")}/api/champion-stats/refresh`;
  const triggered: string[] = [];

  for (const { puuid, region, solo, flex } of toRefresh) {
    if (solo) {
      fetch(refreshUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ puuid, queue: "solo", region }),
      }).catch(() => {});
      triggered.push(`${puuid}:solo`);
    }
    if (flex) {
      fetch(refreshUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ puuid, queue: "flex", region }),
      }).catch(() => {});
      triggered.push(`${puuid}:flex`);
    }
  }

  return NextResponse.json(
    { ok: true, triggered: triggered.length, profiles: toRefresh.length, detail: triggered },
    { status: 200, headers: NO_CACHE }
  );
}
