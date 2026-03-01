import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { OnboardingForm } from "./OnboardingForm";

export default async function OnboardingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/auth?next=/onboarding");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("username")
    .eq("id", user.id)
    .single();

  if (profile?.username) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen bg-[var(--background)] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <Link
          href="/"
          className="inline-block text-xl font-bold text-white mb-8 hover:text-indigo-400 transition-colors"
        >
          Qcrew
        </Link>
        <div className="glass rounded-2xl p-8">
          <h1 className="text-xl font-bold text-white mb-2">Choose a username</h1>
          <p className="text-zinc-400 text-sm mb-6">
            3–20 characters, letters, numbers, and underscores only.
          </p>
          <OnboardingForm />
        </div>
      </div>
    </div>
  );
}
