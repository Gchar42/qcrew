"use client";

import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { getProfileIconUrl } from "@/lib/riotAssets";

export type SearchResultItem = {
  riotId: string;
  gameName: string;
  tagLine: string;
  puuid: string;
  updatedAt: string;
  profileIconId?: number;
  summonerLevel?: number;
};

const PAGE_SIZE = 25;
const DEFAULT_ICON_ID = 29;

function toSummonerPath(riotId: string) {
  const idx = riotId.indexOf("#");
  if (idx === -1) return "/dashboard";
  const name = riotId.slice(0, idx).trim();
  const tag = riotId.slice(idx + 1).trim();
  if (!name || !tag) return "/dashboard";
  return `/summoner/na1/${encodeURIComponent(name)}/${encodeURIComponent(tag)}`;
}

function SearchContent() {
  const searchParams = useSearchParams();
  const q = (searchParams.get("q") || "").trim();
  const [results, setResults] = useState<SearchResultItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  const fetchResults = useCallback(
    async (query: string, pageNum: number) => {
      if (query.length < 2) {
        setResults([]);
        setTotal(0);
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const res = await fetch(
          `/api/search/suggestions?q=${encodeURIComponent(query)}&limit=${PAGE_SIZE}&page=${pageNum}`,
          { cache: "no-store" }
        );
        const data = await res.json();
        setResults(data.suggestions || []);
        setTotal(data.total ?? 0);
      } catch {
        setResults([]);
        setTotal(0);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    fetchResults(q, 1);
    setPage(1);
  }, [q, fetchResults]);

  useEffect(() => {
    if (q.length >= 2 && page > 1) {
      fetchResults(q, page);
    }
  }, [page, q, fetchResults]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  if (q.length < 2) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-8">
        <h1 className="text-2xl font-bold text-white">Search</h1>
        <p className="mt-2 text-sm text-amber-400">
          Enter at least 2 characters.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-8">
      <h1 className="text-xl font-bold text-white">
        This is the search result for the summoner &quot;{q}&quot; in the North
        America region.
      </h1>

      <div className="mt-3 flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-sm text-zinc-400">Region</span>
          <select
            defaultValue="na1"
            disabled
            className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:opacity-70"
          >
            <option value="na1" className="bg-zinc-900">
              NA
            </option>
          </select>
        </div>
        {!loading && (
          <p className="text-sm text-zinc-400">
            There are a total of {total} search result{total !== 1 ? "s" : ""}.
          </p>
        )}
      </div>

      <div className="mt-3 rounded-lg border border-indigo-500/20 bg-indigo-500/5 px-4 py-2 text-sm text-zinc-300">
        Results are based on previously searched Riot IDs in this app.
      </div>

      {loading ? (
        <p className="mt-6 text-sm text-zinc-400">Loading...</p>
      ) : results.length === 0 ? (
        <div className="mt-6 rounded-xl border border-white/10 bg-black/30 p-8 text-center">
          <p className="text-zinc-300">
            No similar Riot IDs found in our history yet. Search a full Riot ID
            once so it can be saved.
          </p>
        </div>
      ) : (
        <>
          <ul className="mt-6 space-y-1">
            {results.map((r) => {
              const href = toSummonerPath(r.riotId);
              const iconId =
                r.profileIconId != null ? r.profileIconId : DEFAULT_ICON_ID;
              const iconUrl = getProfileIconUrl(iconId);
              return (
                <li key={r.puuid}>
                  <Link
                    href={href}
                    className="flex cursor-pointer items-center gap-4 rounded-lg border border-white/10 bg-black/30 px-4 py-3 transition-colors hover:bg-white/5"
                  >
                    <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full border border-white/10 bg-zinc-800">
                      {iconUrl ? (
                        <Image
                          src={iconUrl}
                          alt=""
                          fill
                          className="object-cover"
                          unoptimized
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-xs text-zinc-500">
                          ?
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="font-medium text-white">
                        {r.gameName}#{r.tagLine}
                      </span>
                    </div>
                    <span className="shrink-0 rounded bg-zinc-700/80 px-2 py-0.5 text-xs text-zinc-300">
                      NA
                    </span>
                    <span className="shrink-0 text-zinc-500" aria-hidden>
                      <svg
                        className="h-5 w-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 5l7 7-7 7"
                        />
                      </svg>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>

          {totalPages > 1 && (
            <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                (p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPage(p)}
                    className={`min-w-[2.25rem] rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                      p === page
                        ? "border-indigo-500 bg-indigo-500 text-white"
                        : "border-white/10 bg-black/30 text-white hover:bg-white/10"
                    }`}
                  >
                    {p}
                  </button>
                )
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-3xl px-6 py-8">
          <h1 className="text-2xl font-bold text-white">Search</h1>
          <p className="mt-4 text-sm text-zinc-400">Loading...</p>
        </div>
      }
    >
      <SearchContent />
    </Suspense>
  );
}
