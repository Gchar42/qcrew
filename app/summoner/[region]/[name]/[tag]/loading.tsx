import { SummonerSkeleton } from "@/components/summoner/SummonerSkeleton";

export default function Loading() {
  return (
    <div className="min-h-screen bg-[var(--background)]">
      <header className="border-b border-white/10 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="h-7 w-24 rounded bg-white/10 animate-pulse" />
          <div className="h-5 w-24 rounded bg-white/10 animate-pulse" />
        </div>
      </header>
      <main className="max-w-5xl mx-auto px-4 py-6">
        <SummonerSkeleton />
      </main>
    </div>
  );
}
