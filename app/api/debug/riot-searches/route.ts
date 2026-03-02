import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

export async function GET() {
  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  const hasSupabaseUrl = !!url;
  const hasServiceRoleKey = !!serviceKey;

  if (url) {
    try {
      const host = new URL(url).host;
      console.log("[debug/riot-searches] Supabase URL host:", host);
    } catch {
      console.log("[debug/riot-searches] Supabase URL present but invalid URL");
    }
  } else {
    console.log("[debug/riot-searches] SUPABASE_URL not set");
  }

  const out: Record<string, unknown> = {
    hasSupabaseUrl,
    hasServiceRoleKey,
    rowCount: null as unknown,
    last5RiotIds: null as unknown,
  };

  if (!url || !serviceKey) {
    return NextResponse.json(out);
  }

  const client = createClient(url, serviceKey, {
    auth: { persistSession: false },
  });

  try {
    const { count, error: countError } = await client
      .from("riot_searches")
      .select("*", { count: "exact", head: true });

    out.rowCount = countError
      ? { error: countError.message, code: countError.code }
      : count;
  } catch (e) {
    out.rowCount = {
      error: e instanceof Error ? e.message : String(e),
    };
  }

  try {
    const { data: sampleData, error: sampleError } = await client
      .from("riot_searches")
      .select("riot_id")
      .order("updated_at", { ascending: false })
      .limit(5);

    out.last5RiotIds = sampleError
      ? { error: sampleError.message, code: sampleError.code }
      : (sampleData ?? []).map((r: { riot_id: string }) => r.riot_id);
  } catch (e) {
    out.last5RiotIds = {
      error: e instanceof Error ? e.message : String(e),
    };
  }

  return NextResponse.json(out);
}
