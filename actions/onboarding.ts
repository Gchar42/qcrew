"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

const USERNAME_REGEX = /^[a-zA-Z0-9_]{3,20}$/;

export async function setUsername(formData: FormData) {
  const raw = (formData.get("username") as string)?.trim().toLowerCase();
  if (!raw) return { error: "Username is required." };

  if (!USERNAME_REGEX.test(raw)) {
    return {
      error:
        "Username must be 3–20 characters and only letters, numbers, and underscores.",
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const { data: existing } = await supabase
    .from("profiles")
    .select("id")
    .ilike("username", raw)
    .limit(1)
    .maybeSingle();

  if (existing && existing.id !== user.id) {
    return { error: "That username is already taken." };
  }

  const { error } = await supabase
    .from("profiles")
    .update({ username: raw })
    .eq("id", user.id);

  if (error) {
    if (error.code === "23505") return { error: "That username is already taken." };
    return { error: error.message };
  }

  revalidatePath("/onboarding");
  revalidatePath("/dashboard");
  return { ok: true };
}
