import Link from "next/link";
import { SearchForm } from "@/components/SearchForm";
import { REGIONS } from "@/lib/riot-regions";

export default function Home() {
  return (
    <div className="min-h-screen bg-[var(--background)] flex flex-col">
      <header className="border-b border-white/10 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Link
            href="/"
            className="text-xl font-bold text-white hover:text-indigo-400 transition-colors"
          >
            Statgap
          </Link>
          <nav className="flex items-center gap-4">
            <span className="text-sm text-zinc-500">Search</span>
            <Link
              href="/"
              className="text-sm text-zinc-400 hover:text-white transition-colors"
            >
              Favorites (soon)
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 py-16">
        <div className="w-full max-w-xl">
          <h1 className="text-3xl sm:text-4xl font-bold text-white text-center mb-2">
            League of Legends stats
          </h1>
          <p className="text-zinc-400 text-center mb-8">
            Search by game name or Riot ID and region
          </p>

          <div className="glass rounded-2xl p-6 sm:p-8">
            <SearchForm regions={REGIONS} />
          </div>
        </div>
      </main>
    </div>
  );
}
