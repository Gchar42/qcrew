"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";

interface Champion {
  id: string;
  name: string;
  title: string;
  tags: string[];
  iconUrl: string;
  tier: string;
  winRate: number;
  pickRate: number;
  banRate: number;
  role: string;
}

const ROLES = [
  { key: "all", label: "All Roles" },
  { key: "top", label: "Top" },
  { key: "jungle", label: "Jungle" },
  { key: "mid", label: "Mid" },
  { key: "bot", label: "Bot" },
  { key: "support", label: "Support" },
];

const TIER_ORDER: Record<string, number> = {
  "S+": 0, S: 1, A: 2, B: 3, C: 4, D: 5,
};

const TIER_COLORS: Record<string, string> = {
  "S+": "text-orange-400 bg-orange-400/10 border-orange-400/30",
  S: "text-red-400 bg-red-400/10 border-red-400/30",
  A: "text-blue-400 bg-blue-400/10 border-blue-400/30",
  B: "text-emerald-400 bg-emerald-400/10 border-emerald-400/30",
  C: "text-zinc-400 bg-zinc-400/10 border-zinc-400/30",
  D: "text-zinc-500 bg-zinc-500/10 border-zinc-500/30",
};

type SortKey = "name" | "tier" | "winRate" | "pickRate" | "banRate";

export default function ChampionsPage() {
  const [champions, setChampions] = useState<Champion[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [role, setRole] = useState("all");
  const [sort, setSort] = useState<SortKey>("name");

  useEffect(() => {
    fetch("/api/champions")
      .then((r) => r.json())
      .then((d) => setChampions(d.champions ?? []))
      .catch(() => setChampions([]))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    let list = champions;

    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.title.toLowerCase().includes(q)
      );
    }

    if (role !== "all") {
      const roleTagMap: Record<string, string[]> = {
        top: ["Fighter", "Tank"],
        jungle: ["Fighter", "Assassin"],
        mid: ["Mage", "Assassin"],
        bot: ["Marksman"],
        support: ["Support", "Mage"],
      };
      const tags = roleTagMap[role] ?? [];
      list = list.filter(
        (c) => c.role === role || c.tags.some((t) => tags.includes(t))
      );
    }

    list = [...list].sort((a, b) => {
      switch (sort) {
        case "tier": {
          const aT = TIER_ORDER[a.tier ?? ""] ?? 99;
          const bT = TIER_ORDER[b.tier ?? ""] ?? 99;
          return aT - bT || a.name.localeCompare(b.name);
        }
        case "winRate":
          return (b.winRate ?? 0) - (a.winRate ?? 0);
        case "pickRate":
          return (b.pickRate ?? 0) - (a.pickRate ?? 0);
        case "banRate":
          return (b.banRate ?? 0) - (a.banRate ?? 0);
        default:
          return a.name.localeCompare(b.name);
      }
    });

    return list;
  }, [champions, search, role, sort]);

  return (
    <div className="min-h-screen" style={{ background: "var(--background)" }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Champions</h1>
          <p className="text-zinc-400">
            Builds sourced from top one-tricks and high-elo mains
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 mb-6">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search champions..."
              className="w-full pl-10 pr-4 py-2 rounded-lg text-sm text-zinc-200 placeholder-zinc-500 border border-zinc-700/50 focus:outline-none focus:border-indigo-500/50 transition-colors"
              style={{ background: "rgba(24, 24, 32, 0.7)" }}
            />
          </div>

          {/* Role filter */}
          <div className="flex gap-1 rounded-lg p-1" style={{ background: "rgba(24, 24, 32, 0.7)" }}>
            {ROLES.map((r) => (
              <button
                key={r.key}
                onClick={() => setRole(r.key)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                  role === r.key
                    ? "bg-indigo-500/20 text-indigo-400 border border-indigo-500/30"
                    : "text-zinc-400 hover:text-zinc-200 border border-transparent"
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>

          {/* Sort */}
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
            className="px-3 py-2 rounded-lg text-sm text-zinc-200 border border-zinc-700/50 focus:outline-none focus:border-indigo-500/50"
            style={{ background: "rgba(24, 24, 32, 0.7)" }}
          >
            <option value="name">Name</option>
            <option value="tier">Tier</option>
            <option value="winRate">Win Rate</option>
            <option value="pickRate">Pick Rate</option>
            <option value="banRate">Ban Rate</option>
          </select>
        </div>

        {/* Grid */}
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
            {Array.from({ length: 24 }).map((_, i) => (
              <div
                key={i}
                className="rounded-xl h-[120px] animate-pulse"
                style={{ background: "rgba(24, 24, 32, 0.5)" }}
              />
            ))}
          </div>
        ) : (
          <>
            <p className="text-xs text-zinc-500 mb-3">
              {filtered.length} champion{filtered.length !== 1 ? "s" : ""}
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
              {filtered.map((c) => (
                <Link
                  key={c.id}
                  href={`/champions/${c.id}`}
                  className="group relative rounded-xl overflow-hidden border border-zinc-800/50 hover:border-indigo-500/30 transition-all hover:shadow-lg hover:shadow-indigo-500/5"
                  style={{ background: "rgba(24, 24, 32, 0.7)" }}
                >
                  <div className="p-3 flex flex-col items-center gap-2">
                    <div className="relative">
                      <img
                        src={c.iconUrl}
                        alt={c.name}
                        className="w-14 h-14 rounded-lg border border-zinc-700/50 group-hover:border-indigo-500/30 transition-colors"
                        loading="lazy"
                      />
                      {c.tier && (
                        <span
                          className={`absolute -top-1.5 -right-1.5 text-[10px] font-bold px-1.5 py-0.5 rounded border ${TIER_COLORS[c.tier] ?? "text-zinc-400"}`}
                        >
                          {c.tier}
                        </span>
                      )}
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-semibold text-zinc-100 group-hover:text-white transition-colors truncate max-w-full">
                        {c.name}
                      </p>
                      <p className="text-[10px] text-zinc-500 truncate">
                        {c.tags.join(" / ")}
                      </p>
                    </div>
                    {c.winRate != null && (
                      <div className="flex items-center gap-2 text-[10px]">
                        <span
                          className={
                            c.winRate >= 52
                              ? "text-emerald-400"
                              : c.winRate >= 50
                                ? "text-zinc-300"
                                : "text-red-400"
                          }
                        >
                          {c.winRate.toFixed(1)}% WR
                        </span>
                        <span className="text-zinc-500">
                          {c.pickRate?.toFixed(1)}% PR
                        </span>
                      </div>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
