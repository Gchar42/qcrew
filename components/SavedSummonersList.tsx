"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  getFavorites,
  getRecent,
  removeFavorite,
  type SavedSummoner,
} from "@/lib/savedSummoners";

type CachedProfile = {
  riot_id: string;
  region: string;
  tier: string | null;
  rank: string | null;
  league_points: number;
  wins: number;
  losses: number;
};

function profileUrl(s: SavedSummoner) {
  return `/summoner?riotId=${encodeURIComponent(s.riotId)}&region=${encodeURIComponent(s.region)}`;
}

function tierLabel(tier: string | null | undefined, rank: string | null | undefined) {
  if (!tier) return "";
  const short =
    tier === "GRANDMASTER" ? "GM" :
    tier === "CHALLENGER" ? "C" :
    tier === "MASTER" ? "M" :
    tier.charAt(0) + tier.slice(1).toLowerCase();
  if (["MASTER", "GRANDMASTER", "CHALLENGER"].includes(tier)) return short;
  return `${short} ${rank ?? ""}`.trim();
}

function LPDiff({ current, previous }: { current: number; previous: number | undefined }) {
  if (previous === undefined || previous === current) return null;
  const diff = current - previous;
  const isUp = diff > 0;
  return (
    <span className={`ml-1 text-[11px] font-semibold ${isUp ? "text-emerald-400" : "text-red-400"}`}>
      {isUp ? "+" : ""}{diff} LP
    </span>
  );
}

export function SavedSummonersList() {
  const [favorites, setFavorites] = useState<SavedSummoner[]>([]);
  const [recent, setRecent] = useState<SavedSummoner[]>([]);
  const [cachedProfiles, setCachedProfiles] = useState<Record<string, CachedProfile>>({});

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

  useEffect(() => {
    const allPlayers = [...recent, ...favorites].slice(0, 10);
    if (allPlayers.length === 0) return;

    const param = allPlayers
      .map((p) => `${encodeURIComponent(p.riotId)}:${p.region}`)
      .join(",");
    fetch(`/api/social/profile-cache?players=${param}`)
      .then((r) => (r.ok ? r.json() : { profiles: [] }))
      .then((data: { profiles: CachedProfile[] }) => {
        const map: Record<string, CachedProfile> = {};
        for (const p of data.profiles ?? []) {
          map[`${p.riot_id.toLowerCase()}#${p.region}`] = p;
        }
        setCachedProfiles(map);
      })
      .catch(() => {});
  }, [recent, favorites]);

  const handleRemoveFavorite = (e: React.MouseEvent, riotId: string, region: string) => {
    e.preventDefault();
    e.stopPropagation();
    removeFavorite(riotId, region);
    setFavorites(getFavorites());
  };

  if (favorites.length === 0 && recent.length === 0) return null;

  const getCached = (s: SavedSummoner) =>
    cachedProfiles[`${s.riotId.toLowerCase()}#${s.region}`];

  return (
    <div className="mt-8 w-full max-w-3xl grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Your Players — Recent */}
      <section className="min-w-0">
        <h2 className="text-sm font-medium text-zinc-400 uppercase tracking-wide mb-2">
          Your Players
        </h2>
        <ul className="rounded-lg border border-white/10 bg-black/20 divide-y divide-white/5 overflow-hidden">
          {recent.slice(0, 5).map((s) => {
            const cached = getCached(s);
            const currentLP = cached?.league_points ?? null;
            const tier = tierLabel(cached?.tier, cached?.rank);
            return (
              <li key={`${s.riotId}-${s.region}`}>
                <Link
                  href={profileUrl(s)}
                  className="flex items-center justify-between gap-2 px-4 py-3 hover:bg-white/5 transition-colors"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-white truncate">
                      {s.label || s.riotId}
                    </span>
                    {tier && (
                      <span className="shrink-0 text-[11px] text-indigo-400 font-medium">
                        {tier}
                      </span>
                    )}
                    {currentLP !== null && s.lastSeenLP !== undefined && (
                      <LPDiff current={currentLP} previous={s.lastSeenLP} />
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {currentLP !== null && (
                      <span className="text-xs text-white/40">
                        {currentLP} LP
                      </span>
                    )}
                    <span className="text-zinc-500 text-xs">{s.region}</span>
                  </div>
                </Link>
              </li>
            );
          })}
          {recent.length === 0 && (
            <li className="px-4 py-3 text-sm text-zinc-500">Search a summoner to track them here.</li>
          )}
        </ul>
      </section>

      {/* Favorites */}
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
          {favorites.slice(0, 5).map((s) => {
            const cached = getCached(s);
            const tier = tierLabel(cached?.tier, cached?.rank);
            return (
              <li key={`${s.riotId}-${s.region}`}>
                <Link
                  href={profileUrl(s)}
                  className="flex items-center justify-between gap-2 px-4 py-3 hover:bg-white/5 transition-colors"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-white truncate">
                      {s.label || s.riotId}
                    </span>
                    {tier && (
                      <span className="shrink-0 text-[11px] text-indigo-400 font-medium">
                        {tier}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {cached?.league_points != null && (
                      <span className="text-xs text-white/40">
                        {cached.league_points} LP
                      </span>
                    )}
                    <span className="text-zinc-500 text-xs">{s.region}</span>
                    <button
                      type="button"
                      onClick={(e) => handleRemoveFavorite(e, s.riotId, s.region)}
                      className="text-zinc-500 hover:text-red-400 text-xs"
                      aria-label={`Remove ${s.label || s.riotId} from favorites`}
                    >
                      Remove
                    </button>
                  </div>
                </Link>
              </li>
            );
          })}
          {favorites.length === 0 && (
            <li className="px-4 py-3 text-sm text-zinc-500">No favorites yet.</li>
          )}
        </ul>
      </section>
    </div>
  );
}
