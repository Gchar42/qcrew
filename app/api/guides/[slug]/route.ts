import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

/**
 * GET /api/guides/[slug] - Fetch a single guide by slug
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  const { data: guide, error } = await supabaseAdmin
    .from("guides")
    .select("*, guide_authors(riot_id, tier, rank, lp, main_champion, champion_rank, avatar_icon_id)")
    .eq("slug", slug)
    .single();

  if (error || !guide) {
    return Response.json({ error: "Guide not found" }, { status: 404 });
  }

  // Increment views
  await supabaseAdmin
    .from("guides")
    .update({ views: (guide.views ?? 0) + 1 })
    .eq("id", guide.id);

  return Response.json({ guide });
}
