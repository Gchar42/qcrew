"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  getTrackedFriends,
  removeTrackedFriend,
  type TrackedFriend,
} from "@/lib/trackedFriends";
import type { FriendStatsItem } from "@/app/api/riot/friends-stats/route";

function profileUrl(s: TrackedFriend) {
  return `/summoner?riotId=${encodeURIComponent(s.riotId)}&region=${encodeURIComponent(s.region)}`;
}

function rankLabel(entry: { tier: string; rank: string; leaguePoints: number } | null): string {
  if (!entry?.tier) return "Unranked";
  if (["MASTER", "GRANDMASTER", "CHALLENGER"].includes(entry.tier.toUpperCase())) {
    return `${entry.tier} ${entry.leaguePoints} LP`;
  }
  return `${entry.tier} ${entry.rank} · ${entry.leaguePoints} LP`;
}

export default function FriendsPage() {
  const [list, setList] = useState<TrackedFriend[]>([]);
  const [stats, setStats] = useState<Record<string, FriendStatsItem>>({});
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(() => setList(getTrackedFriends()), []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    const onFocus = () => refresh();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [refresh]);

  useEffect(() => {
    if (list.length === 0) {
      setStats({});
      setLoading(false);
      return;
    }
    setLoading(true);
    const byRegion = new Map<string, TrackedFriend[]>();
    list.forEach((s) => {
      const r = s.region || "na1";
      if (!byRegion.has(r)) byRegion.set(r, []);
      byRegion.get(r)!.push(s);
    });
    const byRiotId: Record<string, FriendStatsItem> = {};
    const promises = Array.from(byRegion.entries()).map(([region, friends]) => {
      const riotIds = friends.map((s) => encodeURIComponent(s.riotId)).join(",");
      const url = `/api/riot/friends-stats?riotIds=${riotIds}&region=${encodeURIComponent(region)}`;
      return fetch(url)
        .then((res) => res.json())
        .then((data: { friends?: FriendStatsItem[] }) => data.friends ?? []);
    });
    Promise.all(promises)
      .then((results) => {
        const merged: Record<string, FriendStatsItem> = {};
        results.flat().forEach((f) => {
          merged[f.riotId] = f;
        });
        setStats(merged);
      })
      .catch(() => setStats({}))
      .finally(() => setLoading(false));
  }, [list]);

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
              className="text-sm text-zinc-400 hover:text-white transition-colors"
            >
              Favorites
            </Link>
            <Link
              href="/friends"
              className="text-sm text-indigo-400"
            >
              Friends
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex-1 max-w-3xl mx-auto w-full px-6 py-10">
        <h1 className="text-2xl font-bold text-white mb-2">Tracked friends</h1>
        <p className="text-zinc-400 text-sm mb-6">
          People you track from &quot;Recently played with.&quot; Stored in this browser only.
        </p>

        {list.length === 0 ? (
          <div className="rounded-xl border border-white/10 bg-black/20 p-8 text-center">
            <p className="text-zinc-400 mb-4">No tracked friends yet.</p>
            <p className="text-zinc-500 text-sm mb-6">
              On a summoner profile, open &quot;Recently played with&quot; and click &quot;Track&quot; next to a teammate to add them here.
            </p>
            <Link
              href="/"
              className="inline-block rounded-lg bg-indigo-500 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-600"
            >
              Search summoner
            </Link>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {list.map((s) => {
              const key = `${s.riotId}#${s.region}`;
              const friendStats =
                stats[s.riotId] ??
                Object.values(stats).find(
                  (f) => f.riotId.toLowerCase() === s.riotId.toLowerCase()
                );
              const solo = friendStats?.soloEntry ?? null;
              const flex = friendStats?.flexEntry ?? null;

              return (
                <div
                  key={key}
                  className="rounded-xl border border-white/10 bg-black/20 p-4 flex flex-col gap-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <Link
                      href={profileUrl(s)}
                      className="font-semibold text-white hover:text-indigo-400 truncate min-w-0"
                    >
                      {s.label || s.riotId}
                    </Link>
                    <button
                      type="button"
                      onClick={() => {
                        removeTrackedFriend(s.riotId, s.region);
                        refresh();
                      }}
                      className="text-zinc-500 hover:text-red-400 text-sm shrink-0"
                    >
                      Remove
                    </button>
                  </div>
                  {loading && !friendStats ? (
                    <span className="text-zinc-500 text-sm">Loading…</span>
                  ) : (
                    <>
                      <div className="text-sm">
                        <span className="text-zinc-400">Solo: </span>
                        <span className="text-white">{rankLabel(solo)}</span>
                      </div>
                      <div className="text-sm">
                        <span className="text-zinc-400">Flex: </span>
                        <span className="text-white">{rankLabel(flex)}</span>
                      </div>
                      <p className="text-zinc-500 text-xs mt-1">
                        Champion & badges: view profile →
                      </p>
                      <Link
                        href={profileUrl(s)}
                        className="text-indigo-400 text-sm font-medium hover:underline"
                      >
                        View profile
                      </Link>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
