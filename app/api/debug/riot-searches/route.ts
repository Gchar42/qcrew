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
    tableExistsCheck: null as unknown,
    rowCount: null as unknown,
    sampleRows: null as unknown,
    lastInsertTest: null as unknown,
  };

  if (!url || !serviceKey) {
    return NextResponse.json(out);
  }

  const client = createClient(url, serviceKey, {
    auth: { persistSession: false },
  });

  try {
    const { data: tableCheckData, error: tableCheckError } = await client
      .from("riot_searches")
      .select("puuid")
      .limit(1);

    out.tableExistsCheck = tableCheckError
      ? { ok: false, error: tableCheckError.message, code: tableCheckError.code }
      : { ok: true, data: tableCheckData };
  } catch (e) {
    out.tableExistsCheck = {
      ok: false,
      error: e instanceof Error ? e.message : String(e),
    };
  }

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
      .select("riot_id, game_name, tag_line, puuid, updated_at")
      .order("updated_at", { ascending: false })
      .limit(5);

    out.sampleRows = sampleError
      ? { error: sampleError.message, code: sampleError.code }
      : sampleData;
  } catch (e) {
    out.sampleRows = {
      error: e instanceof Error ? e.message : String(e),
    };
  }

  const testPuuid = "debug-test-puuid";
  const testRiotId = "debug#TEST";

  try {
    const { error: upsertError } = await client.from("riot_searches").upsert(
      {
        puuid: testPuuid,
        riot_id: testRiotId,
        game_name: "debug",
        tag_line: "TEST",
        updated_at: new Date().toISOString(),
      },
      { onConflict: "puuid" }
    );

    if (upsertError) {
      out.lastInsertTest = {
        step: "upsert",
        error: upsertError.message,
        code: upsertError.code,
      };
      return NextResponse.json(out);
    }

    const { data: selectData, error: selectError } = await client
      .from("riot_searches")
      .select("*")
      .eq("puuid", testPuuid)
      .single();

    if (selectError) {
      out.lastInsertTest = {
        step: "select after upsert",
        error: selectError.message,
        code: selectError.code,
      };
      await client.from("riot_searches").delete().eq("puuid", testPuuid);
      return NextResponse.json(out);
    }

    const { error: deleteError } = await client
      .from("riot_searches")
      .delete()
      .eq("puuid", testPuuid);

    out.lastInsertTest = {
      upsertOk: true,
      selectOk: true,
      row: selectData,
      deleteOk: !deleteError,
      deleteError: deleteError?.message ?? null,
    };
  } catch (e) {
    out.lastInsertTest = {
      error: e instanceof Error ? e.message : String(e),
    };
  }

  return NextResponse.json(out);
}
