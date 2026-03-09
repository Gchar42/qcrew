"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  getFavorites,
  getRecent,
  removeFavorite,
  type SavedSummoner,
} from "@/lib/savedSummoners";

function profileUrl(s: SavedSummoner) {
  return `/summoner?riotId=${encodeURIComponent(s.riotId)}&region=${encodeURIComponent(s.region)}`;
}

export function SavedSummonersList() {
  const [favorites, setFavorites] = useState<SavedSummoner[]>([]);
  const [recent, setRecent] = useState<SavedSummoner[]>([]);

  const refresh = useCallback(() => {
    setFavorites(getFavorites());
    setRecent(getRecent());
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    const onFocus = () => refresh();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [refresh]);

  const handleRemoveFavorite = (e: React.MouseEvent, riotId: string, region: string) => {
    e.preventDefault();
    e.stopPropagation();
    removeFavorite(riotId, region);
    setFavorites(getFavorites());
  };

  if (favorites.length === 0 && recent.length === 0) return null;

  return (
    <div className="mt-8 w-full max-w-3xl grid grid-cols-1 md:grid-cols-2 gap-6">
      <section className="min-w-0">
        <h2 className="text-sm font-medium text-zinc-400 uppercase tracking-wide mb-2">
          Recent
        </h2>
        <ul className="rounded-lg border border-white/10 bg-black/20 divide-y divide-white/5 overflow-hidden">
          {recent.slice(0, 5).map((s) => (
            <li key={`${s.riotId}-${s.region}`}>
              <Link
                href={profileUrl(s)}
                className="flex items-center justify-between gap-2 px-4 py-3 hover:bg-white/5 transition-colors"
              >
                <span className="text-white truncate">
                  {s.label || s.riotId}
                </span>
                <span className="text-zinc-500 text-xs shrink-0">{s.region}</span>
              </Link>
            </li>
          ))}
          {recent.length === 0 && (
            <li className="px-4 py-3 text-sm text-zinc-500">No recent searches yet.</li>
          )}
        </ul>
      </section>
      <section className="min-w-0">
          <div className="relative mb-2 text-center">
            <h2 className="text-sm font-medium text-zinc-400 uppercase tracking-wide">
              Favorites
            </h2>
            <Link
              href="/favorites"
              className="absolute right-0 top-1/2 -translate-y-1/2 text-xs text-indigo-400 hover:text-indigo-300"
            >
              View all
            </Link>
          </div>
          <ul className="rounded-lg border border-white/10 bg-black/20 divide-y divide-white/5 overflow-hidden">
            {favorites.slice(0, 5).map((s) => (
              <li key={`${s.riotId}-${s.region}`}>
                <Link
                  href={profileUrl(s)}
                  className="flex items-center justify-between gap-2 px-4 py-3 hover:bg-white/5 transition-colors"
                >
                  <span className="text-white truncate">
                    {s.label || s.riotId}
                  </span>
                  <span className="text-zinc-500 text-xs shrink-0">{s.region}</span>
                  <button
                    type="button"
                    onClick={(e) => handleRemoveFavorite(e, s.riotId, s.region)}
                    className="text-zinc-500 hover:text-red-400 text-xs shrink-0"
                    aria-label={`Remove ${s.label || s.riotId} from favorites`}
                  >
                    Remove
                  </button>
                </Link>
              </li>
            ))}
            {favorites.length === 0 && (
              <li className="px-4 py-3 text-sm text-zinc-500">No favorites yet.</li>
            )}
          </ul>
      </section>
    </div>
  );
}
