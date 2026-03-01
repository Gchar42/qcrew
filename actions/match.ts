"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function addReaction(matchId: string, type: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase.from("reactions").insert({
    match_id: matchId,
    user_id: user.id,
    type,
  });
  if (error) {
    if (error.code === "23505") return {};
    return { error: error.message };
  }

  revalidatePath("/crew/[id]", "page");
  return {};
}

export async function removeReaction(matchId: string, type: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  await supabase
    .from("reactions")
    .delete()
    .eq("match_id", matchId)
    .eq("user_id", user.id)
    .eq("type", type);

  revalidatePath("/crew/[id]", "page");
  return {};
}

export async function addComment(matchId: string, body: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase.from("comments").insert({
    match_id: matchId,
    user_id: user.id,
    body: body.trim(),
  });
  if (error) return { error: error.message };

  revalidatePath("/crew/[id]", "page");
  return {};
}
