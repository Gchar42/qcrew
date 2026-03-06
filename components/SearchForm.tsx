"use client";

import Image from "next/image";
import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { getProfileIconUrl } from "@/lib/riotAssets";

type Region = { value: string; label: string };

type SuggestionItem = {
  riotId: string;
  gameName?: string;
  tagLine?: string;
  puuid?: string;
  profileIconId?: number;
  summonerLevel?: number;
};

const SUGGESTIONS_DEBOUNCE_MS = 200;
const DEFAULT_ICON_ID = 29;

function summonerProfileUrl(riotId: string, region: string) {
  return `/summoner?riotId=${encodeURIComponent(riotId)}&region=${encodeURIComponent(region)}`;
}

export function SearchForm({ regions }: { regions: readonly Region[] }) {
  const [region, setRegion] = useState("na1");
  const [riotId, setRiotId] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<SuggestionItem[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fetchIdRef = useRef(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const query = riotId.trim();
  const queryMinLength = query.length >= 2;

  useEffect(() => {
    if (!queryMinLength) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setLoadingSuggestions(true);
    debounceRef.current = setTimeout(async () => {
      const id = fetchIdRef.current + 1;
      fetchIdRef.current = id;
      try {
        const res = await fetch(
          `/api/search/suggestions?q=${encodeURIComponent(query)}&limit=10`,
          { cache: "no-store" }
        );
        if (fetchIdRef.current !== id) return;
        const data = await res.json().catch(() => ({}));
        const list = data.suggestions ?? [];
        setSuggestions(Array.isArray(list) ? list : []);
      } catch {
        if (fetchIdRef.current === id) setSuggestions([]);
      } finally {
        if (fetchIdRef.current === id) setLoadingSuggestions(false);
      }
    }, SUGGESTIONS_DEBOUNCE_MS);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, queryMinLength]);

  const handleBlur = useCallback(() => {
    setTimeout(() => {
      const active = typeof document !== "undefined" && document.activeElement;
      if (
        dropdownRef.current?.contains(active) ||
        inputRef.current?.contains(active)
      )
        return;
      setShowSuggestions(false);
    }, 150);
  }, []);

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setShowSuggestions(false);
    const riotIdTrimmed: string = riotId.trim();
    const hash = riotIdTrimmed.indexOf("#");
    if (hash === -1) {
      if (riotIdTrimmed.length < 2) {
        setError("Enter at least 2 characters to search.");
        return;
      }
      router.push(`/search?q=${encodeURIComponent(riotIdTrimmed)}`);
      return;
    }
    const name = riotIdTrimmed.slice(0, hash).trim();
    const tag = riotIdTrimmed.slice(hash + 1).trim();
    if (!name || !tag) {
      setError("Enter both name and tag");
      return;
    }
    const encodedRiotId = `${name}#${tag}`;
    router.push(summonerProfileUrl(encodedRiotId, region));
  };

  const handleSelectSuggestion = (item: SuggestionItem) => {
    const id = item.riotId ?? `${item.gameName ?? ""}#${item.tagLine ?? ""}`;
    if (!id || !id.includes("#")) return;
    setRiotId(id);
    setShowSuggestions(false);
    router.push(summonerProfileUrl(id, region));
  };

  const displaySuggestions = queryMinLength && (suggestions.length > 0 || loadingSuggestions);

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <label className="block">
          <span className="text-sm text-zinc-400">Region</span>
          <select
            value={region}
            onChange={(e) => setRegion(e.target.value)}
            className="mt-1 block w-full rounded-lg bg-white/5 border border-white/10 px-4 py-3 text-white focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            {regions.map((r) => (
              <option key={r.value} value={r.value} className="bg-zinc-900">
                {r.label}
              </option>
            ))}
          </select>
        </label>
        <label className="block relative">
          <span className="text-sm text-zinc-400">Riot ID</span>
          <input
            ref={inputRef}
            type="text"
            value={riotId}
            onChange={(e) => {
              setRiotId(e.target.value);
              setError(null);
              if (e.target.value.trim().length >= 2) setShowSuggestions(true);
            }}
            onFocus={() => queryMinLength && setShowSuggestions(true)}
            onBlur={handleBlur}
            placeholder="GameName#Tag"
            className="mt-1 block w-full rounded-lg bg-white/5 border border-white/10 px-4 py-3 text-white placeholder-zinc-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            autoComplete="off"
          />
          {showSuggestions && displaySuggestions && (
            <div
              ref={dropdownRef}
              className="absolute left-0 right-0 z-20 mt-1 rounded-lg border border-white/10 bg-zinc-900/95 shadow-xl backdrop-blur"
              role="listbox"
              aria-label="Summoner profiles"
            >
              <div className="border-b border-white/10 px-3 py-2 text-xs font-medium uppercase tracking-wide text-zinc-400">
                Summoner Profiles
              </div>
              {loadingSuggestions ? (
                <div className="px-4 py-6 text-center text-sm text-zinc-400">
                  Loading…
                </div>
              ) : suggestions.length === 0 ? (
                <div className="px-4 py-6 text-center text-sm text-zinc-500">
                  No profiles found. Search a full Riot ID to add it.
                </div>
              ) : (
                <ul className="max-h-72 overflow-y-auto py-1">
                  {suggestions.map((r) => {
                    const id = r.riotId ?? `${r.gameName ?? ""}#${r.tagLine ?? ""}`;
                    const iconId = r.profileIconId ?? DEFAULT_ICON_ID;
                    const iconUrl = getProfileIconUrl(iconId);
                    const level =
                      r.summonerLevel != null
                        ? `Level ${r.summonerLevel}`
                        : null;
                    return (
                      <li key={r.puuid ?? id}>
                        <button
                          type="button"
                          onClick={() => handleSelectSuggestion(r)}
                          className="flex w-full cursor-pointer items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-white/10"
                          role="option"
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
                            <span className="font-medium text-red-400">
                              {r.gameName ?? id.split("#")[0]}
                            </span>
                            <span className="text-zinc-300">
                              #{r.tagLine ?? id.split("#")[1] ?? ""}
                            </span>
                          </div>
                          {level && (
                            <span className="shrink-0 text-sm text-zinc-400">
                              {level}
                            </span>
                          )}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          )}
        </label>
      </div>
      {error && (
        <p className="text-sm text-amber-400" role="alert">
          {error}
        </p>
      )}
      <button
        type="submit"
        className="w-full rounded-lg bg-indigo-500 py-3 font-medium text-white hover:bg-indigo-600 transition-colors"
      >
        Search
      </button>
    </form>
  );
}
