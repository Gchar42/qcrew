"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Region = { value: string; label: string };

export function SearchForm({ regions }: { regions: readonly Region[] }) {
  const [region, setRegion] = useState("na1");
  const [riotId, setRiotId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const trimmed = riotId.trim();
    const hash = trimmed.indexOf("#");
    if (hash === -1) {
      if (trimmed.length < 2) {
        setError("Enter at least 2 characters to search.");
        return;
      }
      router.push(`/search?q=${encodeURIComponent(trimmed)}`);
      return;
    }
    const name = trimmed.slice(0, hash).trim();
    const tag = trimmed.slice(hash + 1).trim();
    if (!name || !tag) {
      setError("Enter both name and tag");
      return;
    }
    const nameEnc = encodeURIComponent(name);
    const tagEnc = encodeURIComponent(tag);
    router.push(`/summoner/${region}/${nameEnc}/${tagEnc}`);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
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
        <label className="block">
          <span className="text-sm text-zinc-400">Riot ID</span>
          <input
            type="text"
            value={riotId}
            onChange={(e) => {
              setRiotId(e.target.value);
              setError(null);
            }}
            placeholder="GameName#Tag"
            className="mt-1 block w-full rounded-lg bg-white/5 border border-white/10 px-4 py-3 text-white placeholder-zinc-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
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
