"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getChampionSquareUrl, getProfileIconUrl, getRankEmblemUrl } from "@/lib/riotAssets";

interface Author {
  riot_id: string;
  tier: string | null;
  rank: string | null;
  lp: number;
  main_champion: string | null;
  champion_rank: string | null;
  avatar_icon_id: number | null;
}

interface Guide {
  id: number;
  slug: string;
  champion_name: string;
  role: string;
  title: string;
  content: string;
  tags: string[];
  views: number;
  likes: number;
  created_at: string;
  guide_authors: Author;
}

type SortMode = "latest" | "popular" | "loved";

export default function GuidesPage() {
  const [guides, setGuides] = useState<Guide[]>([]);
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState<SortMode>("latest");
  const [championFilter, setChampionFilter] = useState("");

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({ sort, limit: "30" });
    if (championFilter) params.set("champion", championFilter);

    fetch(`/api/guides?${params}`)
      .then((r) => r.json())
      .then((d) => setGuides(d.guides ?? []))
      .catch(() => setGuides([]))
      .finally(() => setLoading(false));
  }, [sort, championFilter]);

  return (
    <div className="min-h-screen" style={{ background: "var(--background)" }}>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-1">Community Guides</h1>
            <p className="text-zinc-400 text-sm">Written by verified one-tricks and high-elo players</p>
          </div>
          <Link
            href="/guides/create"
            className="px-4 py-2 rounded-lg text-sm font-medium bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 hover:bg-indigo-500/30 transition-colors"
          >
            Write a Guide
          </Link>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 mb-6">
          <input
            type="text"
            value={championFilter}
            onChange={(e) => setChampionFilter(e.target.value)}
            placeholder="Filter by champion..."
            className="px-3 py-2 rounded-lg text-sm text-zinc-200 placeholder-zinc-500 border border-zinc-700/50 focus:outline-none focus:border-indigo-500/50"
            style={{ background: "rgba(24, 24, 32, 0.7)" }}
          />
          <div className="flex gap-1 rounded-lg p-1" style={{ background: "rgba(24, 24, 32, 0.7)" }}>
            {(["latest", "popular", "loved"] as SortMode[]).map((s) => (
              <button
                key={s}
                onClick={() => setSort(s)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                  sort === s
                    ? "bg-indigo-500/20 text-indigo-400 border border-indigo-500/30"
                    : "text-zinc-400 hover:text-zinc-200 border border-transparent"
                }`}
              >
                {s === "latest" ? "Latest" : s === "popular" ? "Most Viewed" : "Most Loved"}
              </button>
            ))}
          </div>
        </div>

        {/* Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-40 rounded-xl animate-pulse" style={{ background: "rgba(24, 24, 32, 0.5)" }} />
            ))}
          </div>
        ) : guides.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-zinc-400 mb-2">No guides found</p>
            <p className="text-zinc-500 text-sm">Be the first to write one!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {guides.map((g) => (
              <GuideCard key={g.id} guide={g} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function GuideCard({ guide }: { guide: Guide }) {
  const author = guide.guide_authors;
  const readTime = Math.max(1, Math.ceil(guide.content.length / 1200));
  const age = getRelativeTime(guide.created_at);

  return (
    <Link
      href={`/guides/${guide.slug}`}
      className="group rounded-xl border border-zinc-800/50 hover:border-indigo-500/30 transition-all overflow-hidden"
      style={{ background: "rgba(24, 24, 32, 0.7)" }}
    >
      <div className="p-4">
        {/* Champion + Title */}
        <div className="flex items-start gap-3 mb-3">
          <img
            src={getChampionSquareUrl(guide.champion_name)}
            alt={guide.champion_name}
            className="w-12 h-12 rounded-lg border border-zinc-700/50 shrink-0"
          />
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-zinc-100 group-hover:text-white transition-colors line-clamp-2 mb-1">
              {guide.title}
            </h3>
            <div className="flex items-center gap-2 text-[11px] text-zinc-500">
              <span className="capitalize">{guide.role}</span>
              <span>&middot;</span>
              <span>{readTime} min read</span>
              <span>&middot;</span>
              <span>{age}</span>
            </div>
          </div>
        </div>

        {/* Author */}
        <div className="flex items-center gap-2 mb-3">
          {author?.avatar_icon_id ? (
            <img
              src={getProfileIconUrl(author.avatar_icon_id)}
              alt=""
              className="w-6 h-6 rounded-full border border-zinc-700/50"
            />
          ) : (
            <div className="w-6 h-6 rounded-full bg-zinc-800 border border-zinc-700/50" />
          )}
          <span className="text-xs text-zinc-300">{author?.riot_id ?? "Anonymous"}</span>
          {author?.tier && (
            <span className="flex items-center gap-1">
              <img src={getRankEmblemUrl(author.tier)} alt={author.tier} className="w-4 h-4" />
              <span className="text-[10px] text-zinc-400 capitalize">
                {author.tier.toLowerCase()} {author.rank}
              </span>
            </span>
          )}
          {author?.champion_rank && (
            <span className="text-[10px] font-medium text-amber-400">{author.champion_rank}</span>
          )}
        </div>

        {/* Tags + Stats */}
        <div className="flex items-center justify-between">
          <div className="flex gap-1 flex-wrap">
            {(guide.tags as string[]).slice(0, 3).map((t) => (
              <span key={t} className="text-[10px] px-2 py-0.5 rounded-full bg-zinc-800/80 text-zinc-400 border border-zinc-700/30">
                {t}
              </span>
            ))}
          </div>
          <div className="flex items-center gap-3 text-[11px] text-zinc-500">
            <span className="flex items-center gap-1">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
              {guide.views}
            </span>
            <span className="flex items-center gap-1">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
              </svg>
              {guide.likes}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}

function getRelativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const hours = Math.floor(diff / 3600000);
  if (hours < 1) return "just now";
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return `${Math.floor(days / 30)}mo ago`;
}
