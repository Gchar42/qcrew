import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getRiotPuuidFromCookie } from "@/lib/riotSession";

/**
 * GET /api/guides - List published guides with optional filters
 * POST /api/guides - Create a new guide (requires Riot auth)
 */
export async function GET(req: NextRequest) {
  const champion = req.nextUrl.searchParams.get("champion");
  const role = req.nextUrl.searchParams.get("role");
  const sort = req.nextUrl.searchParams.get("sort") ?? "latest";
  const limit = Math.min(parseInt(req.nextUrl.searchParams.get("limit") ?? "20"), 50);
  const offset = parseInt(req.nextUrl.searchParams.get("offset") ?? "0");

  let query = supabaseAdmin
    .from("guides")
    .select("*, guide_authors(riot_id, tier, rank, lp, main_champion, champion_rank, avatar_icon_id)")
    .eq("published", true);

  if (champion) query = query.eq("champion_name", champion);
  if (role) query = query.eq("role", role);

  switch (sort) {
    case "popular":
      query = query.order("views", { ascending: false });
      break;
    case "loved":
      query = query.order("likes", { ascending: false });
      break;
    case "latest":
    default:
      query = query.order("created_at", { ascending: false });
      break;
  }

  const { data, error, count } = await query.range(offset, offset + limit - 1);

  if (error) {
    console.error("Guides list error:", error);
    return Response.json({ error: "Failed to load guides" }, { status: 500 });
  }

  return Response.json({ guides: data ?? [], count });
}

export async function POST(req: NextRequest) {
  const cookie = req.headers.get("cookie");
  const puuid = getRiotPuuidFromCookie(cookie);

  if (!puuid) {
    return Response.json({ error: "Authentication required. Sign in with your Riot account." }, { status: 401 });
  }

  const { data: author } = await supabaseAdmin
    .from("guide_authors")
    .select("id")
    .eq("riot_puuid", puuid)
    .single();

  if (!author) {
    return Response.json({ error: "Author profile not found. Please re-authenticate." }, { status: 403 });
  }

  const body = await req.json();
  const { title, champion_name, role, content, tags } = body;

  if (!title || !champion_name || !content) {
    return Response.json({ error: "Title, champion, and content are required." }, { status: 400 });
  }

  const slug = generateSlug(title);

  const { data: guide, error } = await supabaseAdmin
    .from("guides")
    .insert({
      slug,
      author_id: author.id,
      champion_name,
      role: role ?? "mid",
      title,
      content,
      tags: tags ?? [],
      published: true,
    })
    .select()
    .single();

  if (error) {
    console.error("Guide create error:", error);
    if (error.code === "23505") {
      return Response.json({ error: "A guide with a similar title already exists." }, { status: 409 });
    }
    return Response.json({ error: "Failed to create guide" }, { status: 500 });
  }

  return Response.json({ guide }, { status: 201 });
}

function generateSlug(title: string): string {
  const base = title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 60);
  const suffix = Math.random().toString(36).slice(2, 8);
  return `${base}-${suffix}`;
}
