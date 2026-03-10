import { getDiscordIdFromCookie } from "@/lib/discordSession";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { NextRequest, NextResponse } from "next/server";

function getDiscordId(req: NextRequest): string | null {
  return getDiscordIdFromCookie(req.headers.get("cookie") ?? null);
}

export async function GET(request: NextRequest) {
  const discordId = getDiscordId(request);
  if (!discordId) return NextResponse.json({ error: "Not connected" }, { status: 401 });
  const { data, error } = await supabaseAdmin.from("notification_preferences").select("*").eq("discord_id", discordId).single();
  if (error || !data) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(data);
}

export async function PATCH(request: NextRequest) {
  const discordId = getDiscordId(request);
  if (!discordId) return NextResponse.json({ error: "Not connected" }, { status: 401 });
  const body = await request.json();
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (typeof body.notify_rank_up === "boolean") updates.notify_rank_up = body.notify_rank_up;
  if (typeof body.notify_win_streak === "boolean") updates.notify_win_streak = body.notify_win_streak;
  if (typeof body.weekly_digest === "boolean") updates.weekly_digest = body.weekly_digest;
  if (typeof body.streak_threshold === "number" && body.streak_threshold >= 1 && body.streak_threshold <= 20) updates.streak_threshold = body.streak_threshold;
  const { data, error } = await supabaseAdmin.from("notification_preferences").update(updates).eq("discord_id", discordId).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
