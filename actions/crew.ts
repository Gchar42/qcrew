"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .slice(0, 50);
}

function randomInviteCode(): string {
  return Math.random().toString(36).slice(2, 10);
}

export async function createCrew(formData: FormData) {
  const name = (formData.get("name") as string)?.trim();
  const description = (formData.get("description") as string)?.trim() ?? null;
  if (!name) return { error: "Name is required" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const slug = slugify(name);
  const inviteCode = randomInviteCode();

  const { data: crew, error } = await supabase
    .from("crews")
    .insert({
      name,
      slug,
      description,
      owner_id: user.id,
      invite_code: inviteCode,
    })
    .select("id")
    .single();

  if (error) return { error: error.message };

  await supabase.from("crew_members").insert({
    crew_id: crew.id,
    user_id: user.id,
    role: "owner",
  });

  revalidatePath("/dashboard");
  return { data: { id: crew.id, invite_code: inviteCode } };
}

export async function joinCrew(inviteCode: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { data: crew, error: crewError } = await supabase
    .from("crews")
    .select("id")
    .eq("invite_code", inviteCode.trim())
    .single();

  if (crewError || !crew) return { error: "Invalid invite code" };

  const { error: insertError } = await supabase.from("crew_members").insert({
    crew_id: crew.id,
    user_id: user.id,
    role: "member",
  });

  if (insertError) {
    if (insertError.code === "23505") return { error: "Already in this crew" };
    return { error: insertError.message };
  }

  revalidatePath("/dashboard");
  revalidatePath(`/crew/${crew.id}`);
  return { data: { crew_id: crew.id } };
}
