"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  getFavorites,
  removeFavorite,
  type SavedSummoner,
} from "@/lib/savedSummoners";

function profileUrl(s: SavedSummoner) {
  return `/summoner?riotId=${encodeURIComponent(s.riotId)}&region=${encodeURIComponent(s.region)}`;
}

export default function FavoritesPage() {
  const [list, setList] = useState<SavedSummoner[]>([]);

  const refresh = useCallback(() => setList(getFavorites()), []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    const onFocus = () => refresh();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [refresh]);

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
            <Link
              href="/"
              className="text-sm text-zinc-400 hover:text-white transition-colors"
            >
              Search
            </Link>
            <Link
              href="/favorites"
              className="text-sm text-indigo-400"
            >
              Favorites
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex-1 max-w-2xl mx-auto w-full px-6 py-10">
        <h1 className="text-2xl font-bold text-white mb-2">Favorites</h1>
        <p className="text-zinc-400 text-sm mb-6">
          Summoners you've saved. Stored in this browser only.
        </p>

        {list.length === 0 ? (
          <div className="rounded-xl border border-white/10 bg-black/20 p-8 text-center">
            <p className="text-zinc-400 mb-4">No favorites yet.</p>
            <p className="text-zinc-500 text-sm mb-6">
              Open a summoner profile and click &quot;Add to Favorites&quot; to save them here.
            </p>
            <Link
              href="/"
              className="inline-block rounded-lg bg-indigo-500 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-600"
            >
              Search summoner
            </Link>
          </div>
        ) : (
          <ul className="rounded-lg border border-white/10 bg-black/20 divide-y divide-white/5 overflow-hidden">
            {list.map((s) => (
              <li key={`${s.riotId}-${s.region}`}>
                <div className="flex items-center justify-between gap-4 px-4 py-3 hover:bg-white/5">
                  <Link
                    href={profileUrl(s)}
                    className="flex-1 min-w-0 text-white truncate hover:text-indigo-400"
                  >
                    {s.label || s.riotId}
                  </Link>
                  <span className="text-zinc-500 text-sm shrink-0">{s.region}</span>
                  <button
                    type="button"
                    onClick={() => {
                      removeFavorite(s.riotId, s.region);
                      refresh();
                    }}
                    className="text-zinc-500 hover:text-red-400 text-sm shrink-0"
                  >
                    Remove
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
