import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { scrapeMetaSrc } from "@/lib/scrapeMetaSrc";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

/**
 * POST /api/cron/tierlist-refresh
 *
 * Called by Vercel Cron (weekly) or manually.
 * Scrapes MetaSRC for Silver–Grandmaster champion stats by role and stores
 * a snapshot in the tierlist_snapshots table.
 *
 * Vercel Cron sets the Authorization header automatically;
 * for manual invocation pass ?secret=<CRON_SECRET>.
 */
export async function POST(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const authHeader = req.headers.get("authorization");
    const querySecret = req.nextUrl.searchParams.get("secret");
    if (authHeader !== `Bearer ${cronSecret}` && querySecret !== cronSecret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  try {
    const roleData = await scrapeMetaSrc();

    const totalChamps = Object.values(roleData).reduce((s, arr) => s + arr.length, 0);
    if (totalChamps < 20) {
      return NextResponse.json(
        { error: "Scrape returned too few champions", count: totalChamps },
        { status: 502 }
      );
    }

    const { error } = await supabaseAdmin.from("tierlist_snapshots").insert({
      source: "metasrc",
      data: roleData,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Prune old snapshots — keep last 10
    const { data: old } = await supabaseAdmin
      .from("tierlist_snapshots")
      .select("id")
      .order("scraped_at", { ascending: false })
      .range(10, 999);

    if (old && old.length > 0) {
      await supabaseAdmin
        .from("tierlist_snapshots")
        .delete()
        .in("id", old.map((r) => r.id));
    }

    return NextResponse.json({
      ok: true,
      championsScraped: totalChamps,
      roles: Object.fromEntries(
        Object.entries(roleData).map(([k, v]) => [k, v.length])
      ),
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  return POST(req);
}
