import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { CrewCard } from "@/components/CrewCard";
import { CreateCrewButton } from "@/components/CreateCrewButton";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth");

  const { data: memberships } = await supabase
    .from("crew_members")
    .select("crew_id")
    .eq("user_id", user.id);
  const crewIds = (memberships ?? []).map((m) => m.crew_id);

  let crews: { id: string; name: string; slug: string; invite_code: string }[] = [];
  if (crewIds.length > 0) {
    const { data } = await supabase
      .from("crews")
      .select("id, name, slug, invite_code")
      .in("id", crewIds);
    crews = data ?? [];
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-white">Your crews</h1>
        <CreateCrewButton />
      </div>
      {crews.length === 0 ? (
        <div className="glass rounded-2xl p-12 text-center">
          <p className="text-zinc-400 mb-4">You’re not in any crew yet.</p>
          <CreateCrewButton />
          <p className="text-sm text-zinc-500 mt-4">
            Or ask a friend for an invite link to join their crew.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {crews.map((crew) => (
            <CrewCard
              key={crew.id}
              id={crew.id}
              name={crew.name}
              slug={crew.slug}
              inviteCode={crew.invite_code}
            />
          ))}
        </div>
      )}
    </div>
  );
}
