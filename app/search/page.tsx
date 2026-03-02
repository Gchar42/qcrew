"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

type SearchResult = { riotId: string; updatedAt: string };

export default function SearchPage() {
  const searchParams = useSearchParams();
  const q = (searchParams.get("q") || "").trim();
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (q.length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    fetch(
      `/api/search/suggestions?q=${encodeURIComponent(q)}&limit=25`,
      { cache: "no-store" }
    )
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        setResults(data.suggestions || []);
      })
      .catch(() => {
        if (!cancelled) setResults([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [q]);

  function formatLastSearched(updatedAt: string) {
    try {
      const d = new Date(updatedAt);
      const now = new Date();
      const diffMs = now.getTime() - d.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      if (diffMins < 1) return "Just now";
      if (diffMins < 60) return `${diffMins}m ago`;
      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) return `${diffHours}h ago`;
      const diffDays = Math.floor(diffHours / 24);
      if (diffDays < 7) return `${diffDays}d ago`;
      return d.toLocaleDateString();
    } catch {
      return "";
    }
  }

  function toSummonerPath(riotId: string) {
    const idx = riotId.indexOf("#");
    if (idx === -1) return "/dashboard";
    const name = riotId.slice(0, idx).trim();
    const tag = riotId.slice(idx + 1).trim();
    if (!name || !tag) return "/dashboard";
    return `/summoner/na1/${encodeURIComponent(name)}/${encodeURIComponent(tag)}`;
  }

  if (q.length < 2) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-8">
        <h1 className="text-2xl font-bold text-white">Search</h1>
        <p className="mt-2 text-sm text-amber-400">
          Enter at least 2 characters.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-6 py-8">
      <h1 className="text-2xl font-bold text-white">
        Results for &quot;{q}&quot;
      </h1>

      {loading ? (
        <p className="mt-4 text-sm text-zinc-400">Loading...</p>
      ) : results.length === 0 ? (
        <p className="mt-4 text-sm text-amber-400">
          No similar Riot IDs found in our history yet. Try a full Riot ID with
          #TAG once so it can be saved.
        </p>
      ) : (
        <ul className="mt-4 space-y-2">
          {results.map((r) => (
            <li
              key={r.riotId}
              className="flex items-center justify-between gap-4 rounded-xl border border-white/10 bg-black/30 px-4 py-3"
            >
              <div>
                <span className="font-medium text-white">{r.riotId}</span>
                <span className="ml-2 text-xs text-zinc-500">
                  {formatLastSearched(r.updatedAt)}
                </span>
              </div>
              <Link
                href={toSummonerPath(r.riotId)}
                className="shrink-0 rounded-lg border border-white/10 bg-indigo-500 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-600"
              >
                View match history
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
