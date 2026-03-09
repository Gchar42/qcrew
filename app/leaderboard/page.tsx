import Link from "next/link";

export default function LeaderboardPage() {
  return (
    <main className="min-h-screen bg-[#0E0F15] text-[#E8E9F0] px-4 py-10">
      <div className="mx-auto max-w-4xl rounded-xl border border-white/10 bg-[#151620] p-8">
        <h1 className="text-2xl font-bold">Leaderboard</h1>
        <p className="mt-3 text-sm text-white/60">
          Leaderboard is coming next. For now, use Tierlist for role-based champion strength.
        </p>
        <Link href="/tierlist" className="mt-5 inline-block text-sm text-indigo-400 hover:text-indigo-300">
          Go to Tierlist
        </Link>
      </div>
    </main>
  );
}

