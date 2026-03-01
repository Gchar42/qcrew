import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { joinCrew } from "@/actions/crew";

interface PageProps {
  searchParams: Promise<{ code?: string }>;
}

export default async function JoinPage({ searchParams }: PageProps) {
  const { code } = await searchParams;
  if (!code) redirect("/dashboard");

  const result = await joinCrew(code);
  if (result.error) redirect(`/dashboard?join_error=${encodeURIComponent(result.error)}`);
  if (result.data?.crew_id) redirect(`/crew/${result.data.crew_id}`);
  redirect("/dashboard");
}
