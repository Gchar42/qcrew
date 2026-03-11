import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

/**
 * POST /api/guides/[slug]/like - Toggle like on a guide
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const body = await req.json().catch(() => ({}));
  const sessionId = body.sessionId;

  if (!sessionId) {
    return Response.json({ error: "Session ID required" }, { status: 400 });
  }

  const { data: guide } = await supabaseAdmin
    .from("guides")
    .select("id, likes")
    .eq("slug", slug)
    .single();

  if (!guide) {
    return Response.json({ error: "Guide not found" }, { status: 404 });
  }

  // Check if already liked
  const { data: existing } = await supabaseAdmin
    .from("guide_likes")
    .select("id")
    .eq("guide_id", guide.id)
    .eq("session_id", sessionId)
    .single();

  if (existing) {
    // Unlike
    await supabaseAdmin.from("guide_likes").delete().eq("id", existing.id);
    await supabaseAdmin
      .from("guides")
      .update({ likes: Math.max(0, (guide.likes ?? 1) - 1) })
      .eq("id", guide.id);
    return Response.json({ liked: false, likes: Math.max(0, (guide.likes ?? 1) - 1) });
  } else {
    // Like
    await supabaseAdmin.from("guide_likes").insert({ guide_id: guide.id, session_id: sessionId });
    await supabaseAdmin
      .from("guides")
      .update({ likes: (guide.likes ?? 0) + 1 })
      .eq("id", guide.id);
    return Response.json({ liked: true, likes: (guide.likes ?? 0) + 1 });
  }
}
