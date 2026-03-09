"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type Region = { value: string; label: string };

const RECENTS_KEY = "qcrew:home:recents";
const FAVORITES_KEY = "qcrew:home:favorites";
const MAX_RECENTS = 8;

function isRiotId(input: string): boolean {
  const hash = input.indexOf("#");
  if (hash === -1) return false;
  const name = input.slice(0, hash).trim();
  const tag = input.slice(hash + 1).trim();
  return Boolean(name && tag);
}

function normRiotId(input: string): string {
  const hash = input.indexOf("#");
  if (hash === -1) return input.trim();
  const name = input.slice(0, hash).trim();
  const tag = input.slice(hash + 1).trim();
  return `${name}#${tag}`;
}

export default function HomeLanding({ regions }: { regions: readonly Region[] }) {
  const router = useRouter();
  const [region, setRegion] = useState("na1");
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [recents, setRecents] = useState<string[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);

  useEffect(() => {
    try {
      const r = JSON.parse(localStorage.getItem(RECENTS_KEY) ?? "[]");
      const f = JSON.parse(localStorage.getItem(FAVORITES_KEY) ?? "[]");
      setRecents(Array.isArray(r) ? r.filter((x) => typeof x === "string") : []);
      setFavorites(Array.isArray(f) ? f.filter((x) => typeof x === "string") : []);
    } catch {
      setRecents([]);
      setFavorites([]);
    }
  }, []);

  const toggleFavorite = (riotId: string) => {
    setFavorites((prev) => {
      const next = prev.includes(riotId) ? prev.filter((x) => x !== riotId) : [riotId, ...prev].slice(0, MAX_RECENTS);
      localStorage.setItem(FAVORITES_KEY, JSON.stringify(next));
      return next;
    });
  };

  const rememberRecent = (riotId: string) => {
    setRecents((prev) => {
      const next = [riotId, ...prev.filter((x) => x !== riotId)].slice(0, MAX_RECENTS);
      localStorage.setItem(RECENTS_KEY, JSON.stringify(next));
      return next;
    });
  };

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    const trimmed = query.trim();
    if (!trimmed) {
      setError("Enter a Riot ID or search term.");
      return;
    }

    if (isRiotId(trimmed)) {
      const riotId = normRiotId(trimmed);
      rememberRecent(riotId);
      router.push(`/summoner?riotId=${encodeURIComponent(riotId)}&region=${encodeURIComponent(region)}`);
      return;
    }

    if (trimmed.length < 2) {
      setError("Enter at least 2 characters to search.");
      return;
    }
    router.push(`/search?q=${encodeURIComponent(trimmed)}`);
  };

  const pills = useMemo(() => recents.slice(0, 6), [recents]);

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#0E0F15] text-[#E8E9F0]">
      <div className="pointer-events-none absolute left-1/2 top-[45%] h-[900px] w-[900px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(88,101,242,0.11)_0%,transparent_62%)]" />
      <div className="pointer-events-none absolute bottom-[12%] right-[8%] h-[350px] w-[350px] rounded-full bg-[radial-gradient(circle,rgba(88,101,242,0.05)_0%,transparent_60%)]" />

      <header className="relative z-10 flex items-center justify-between px-6 py-5 sm:px-12">
        <div className="flex items-center gap-2 font-semibold">
          <span className="flex h-8 w-8 items-center justify-center rounded-md bg-gradient-to-br from-[#5865F2] to-[#7289DA] text-sm">📈</span>
          <span>
            Stat<span className="text-[#7289DA]">Gap</span>
          </span>
        </div>
        <div className="flex items-center gap-6 text-sm text-white/60">
          <span>Recents</span>
          <span>Favorites</span>
        </div>
      </header>

      <section className="relative z-10 mx-auto flex max-w-4xl flex-col items-center px-5 pb-16 pt-10 text-center">
        <h1 className="mb-3 text-4xl font-bold leading-tight tracking-tight sm:text-6xl">
          Close the gap.
          <br />
          Outplay with <span className="text-[#7289DA]">better data.</span>
        </h1>
        <p className="mb-8 max-w-xl text-sm text-white/50 sm:text-base">
          Track your stats, spy on opponents, and follow your friends&apos; ranks.
        </p>

        <form onSubmit={onSubmit} className="w-full max-w-3xl">
          <div className="flex flex-col gap-3 rounded-xl border border-white/10 bg-[#151620] p-3 sm:flex-row sm:items-center">
            <div className="flex items-center gap-2 border-white/10 pr-0 sm:border-r sm:pr-3">
              <span className="text-xs text-white/50">Region</span>
              <select
                value={region}
                onChange={(e) => setRegion(e.target.value)}
                className="bg-transparent text-sm font-semibold outline-none"
              >
                {regions.map((r) => (
                  <option key={r.value} value={r.value} className="bg-[#151620]">
                    {r.label}
                  </option>
                ))}
              </select>
            </div>
            <input
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setError(null);
              }}
              placeholder="Search by Riot ID (GameName#Tag)"
              className="flex-1 bg-transparent px-2 text-sm outline-none placeholder:text-white/30"
            />
            <button className="rounded-lg bg-[#5865F2] px-5 py-2 text-sm font-semibold transition hover:bg-[#6875F5]" type="submit">
              Search
            </button>
          </div>
          {error && <p className="mt-2 text-left text-sm text-amber-400">{error}</p>}
        </form>

        {(favorites.length > 0 || pills.length > 0) && (
          <div className="mt-6 w-full max-w-3xl space-y-3 text-left">
            {favorites.length > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs text-white/50">Favorites</span>
                {favorites.slice(0, 6).map((r) => (
                  <button
                    key={`fav-${r}`}
                    type="button"
                    onClick={() => router.push(`/summoner?riotId=${encodeURIComponent(r)}&region=${encodeURIComponent(region)}`)}
                    className="rounded-md border border-[#5865F2]/40 bg-[#5865F2]/10 px-2 py-1 text-xs hover:bg-[#5865F2]/20"
                  >
                    {r}
                  </button>
                ))}
              </div>
            )}
            {pills.length > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs text-white/50">Recents</span>
                {pills.map((r) => {
                  const isFav = favorites.includes(r);
                  return (
                    <div key={`recent-${r}`} className="inline-flex items-center gap-1 rounded-md border border-white/10 bg-[#1C1E2D] px-2 py-1">
                      <button
                        type="button"
                        onClick={() => router.push(`/summoner?riotId=${encodeURIComponent(r)}&region=${encodeURIComponent(region)}`)}
                        className="text-xs text-white/80 hover:text-white"
                      >
                        {r}
                      </button>
                      <button
                        type="button"
                        aria-label={isFav ? "Remove favorite" : "Add favorite"}
                        onClick={() => toggleFavorite(r)}
                        className={`text-xs ${isFav ? "text-yellow-400" : "text-white/50 hover:text-white/80"}`}
                      >
                        ★
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </section>
    </main>
  );
}

