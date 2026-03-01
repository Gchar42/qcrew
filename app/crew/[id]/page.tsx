import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { MatchCard } from "@/components/MatchCard";
import { MatchCardSkeleton } from "@/components/SkeletonLoader";
import type { Match } from "@/types/database";

const PLACEHOLDER_MATCHES: Omit<Match, "id" | "crew_id" | "created_at" | "played_at">[] = [
  {
    champion_placeholder: "Placeholder Champion A",
    role: "Mid",
    kills: 8,
    deaths: 2,
    assists: 12,
    cs_per_min: 7.2,
    carry_score: 85,
    grief_index: 12,
    label: "Carry",
  },
  {
    champion_placeholder: "Placeholder Champion B",
    role: "ADC",
    kills: 12,
    deaths: 4,
    assists: 6,
    cs_per_min: 8.1,
    carry_score: 92,
    grief_index: 8,
    label: "MVP",
  },
  {
    champion_placeholder: "Placeholder Champion C",
    role: "Support",
    kills: 1,
    deaths: 3,
    assists: 18,
    cs_per_min: 1.2,
    carry_score: 45,
    grief_index: 25,
    label: null,
  },
];

export default async function CrewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: crewId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth");

  const { data: crew, error: crewError } = await supabase
    .from("crews")
    .select("id, name, slug")
    .eq("id", crewId)
    .single();

  if (crewError || !crew) notFound();

  const { data: membership } = await supabase
    .from("crew_members")
    .select("id")
    .eq("crew_id", crewId)
    .eq("user_id", user.id)
    .single();

  if (!membership) redirect("/dashboard");

  let matches = await supabase
    .from("matches")
    .select("*")
    .eq("crew_id", crewId)
    .order("played_at", { ascending: false })
    .limit(50);

  let matchList: Match[] = matches.data ?? [];

  if (matchList.length === 0) {
    const inserted = await supabase
      .from("matches")
      .insert(
        PLACEHOLDER_MATCHES.map((m) => ({
          crew_id: crewId,
          ...m,
        }))
      )
      .select("id");
    if (inserted.data?.length) {
      const refetch = await supabase
        .from("matches")
        .select("*")
        .eq("crew_id", crewId)
        .order("played_at", { ascending: false });
      matchList = refetch.data ?? [];
    }
  }

  const matchIds = matchList.map((m) => m.id);

  const [reactionsResult, commentsResult] = await Promise.all([
    matchIds.length > 0
      ? supabase
          .from("reactions")
          .select("match_id, user_id, type")
          .in("match_id", matchIds)
      : { data: [] as { match_id: string; user_id: string; type: string }[] },
    matchIds.length > 0
      ? supabase
          .from("comments")
          .select("id, match_id, user_id, body, created_at")
          .in("match_id", matchIds)
      : { data: [] as { id: string; match_id: string; user_id: string; body: string; created_at: string }[] },
  ]);

  const reactions = reactionsResult.data ?? [];
  const commentsRaw = commentsResult.data ?? [];

  const profileIds = [...new Set(commentsRaw.map((c) => c.user_id))];
  const { data: profiles } =
    profileIds.length > 0
      ? await supabase
          .from("profiles")
          .select("id, display_name")
          .in("id", profileIds)
      : { data: [] as { id: string; display_name: string | null }[] };
  const profileMap = new Map(profiles?.map((p) => [p.id, p.display_name]) ?? []);

  const commentsByMatch = new Map<
    string,
    { id: string; body: string; created_at: string; author: string | null }[]
  >();
  for (const c of commentsRaw) {
    const list = commentsByMatch.get(c.match_id) ?? [];
    list.push({
      id: c.id,
      body: c.body,
      created_at: c.created_at,
      author: profileMap.get(c.user_id) ?? null,
    });
    commentsByMatch.set(c.match_id, list);
  }

  const reactionsByMatch = new Map<
    string,
    { userIds: Set<string>; counts: Record<string, number> }
  >();
  for (const r of reactions) {
    if (!reactionsByMatch.has(r.match_id)) {
      reactionsByMatch.set(r.match_id, { userIds: new Set(), counts: {} });
    }
    const entry = reactionsByMatch.get(r.match_id)!;
    entry.userIds.add(r.user_id);
    entry.counts[r.type] = (entry.counts[r.type] ?? 0) + 1;
  }

  return (
    <div>
      <div className="mb-6">
        <Link
          href="/dashboard"
          className="text-sm text-zinc-400 hover:text-white mb-2 inline-block"
        >
          ← Dashboard
        </Link>
        <h1 className="text-2xl font-bold text-white">{crew.name}</h1>
        <p className="text-zinc-500 text-sm">/{crew.slug}</p>
      </div>
      <h2 className="text-lg font-semibold text-white mb-4">Match feed</h2>
      <div className="space-y-4">
        {matchList.length === 0 ? (
          <MatchCardSkeleton />
        ) : (
          matchList.map((match) => {
            const r = reactionsByMatch.get(match.id);
            const userReactions = reactions
              .filter(
                (x) => x.match_id === match.id && x.user_id === user.id
              )
              .map((x) => x.type);
            const counts = r?.counts ?? {};
            const comments = commentsByMatch.get(match.id) ?? [];
            return (
              <MatchCard
                key={match.id}
                match={match}
                userReactions={userReactions}
                reactionCounts={counts}
                comments={comments}
              />
            );
          })
        )}
      </div>
    </div>
  );
}
