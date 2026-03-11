"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
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

function getSessionId(): string {
  if (typeof window === "undefined") return "";
  let id = localStorage.getItem("statgap_session_id");
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem("statgap_session_id", id);
  }
  return id;
}

export default function GuideDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const [guide, setGuide] = useState<Guide | null>(null);
  const [loading, setLoading] = useState(true);
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);

  useEffect(() => {
    if (!slug) return;
    fetch(`/api/guides/${slug}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.guide) {
          setGuide(d.guide);
          setLikeCount(d.guide.likes ?? 0);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [slug]);

  const toggleLike = useCallback(async () => {
    if (!slug) return;
    const sessionId = getSessionId();
    const res = await fetch(`/api/guides/${slug}/like`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId }),
    });
    const data = await res.json();
    setLiked(data.liked);
    setLikeCount(data.likes);
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--background)" }}>
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!guide) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4" style={{ background: "var(--background)" }}>
        <p className="text-zinc-400">Guide not found</p>
        <Link href="/guides" className="text-indigo-400 text-sm hover:underline">Back to Guides</Link>
      </div>
    );
  }

  const author = guide.guide_authors;

  return (
    <div className="min-h-screen" style={{ background: "var(--background)" }}>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        {/* Back */}
        <Link href="/guides" className="inline-flex items-center gap-1.5 text-xs text-zinc-400 hover:text-indigo-400 transition-colors mb-6">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          All Guides
        </Link>

        {/* Header */}
        <div className="flex items-start gap-4 mb-6">
          <img
            src={getChampionSquareUrl(guide.champion_name)}
            alt={guide.champion_name}
            className="w-16 h-16 rounded-xl border-2 border-zinc-700/50 shrink-0"
          />
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold text-white mb-1">{guide.title}</h1>
            <div className="flex items-center gap-2 text-sm text-zinc-400">
              <span className="capitalize">{guide.role}</span>
              <span>&middot;</span>
              <span>{guide.champion_name}</span>
            </div>
          </div>
        </div>

        {/* Author card */}
        <div
          className="flex items-center gap-3 p-3 rounded-xl border border-zinc-800/50 mb-6"
          style={{ background: "rgba(24, 24, 32, 0.7)" }}
        >
          {author?.avatar_icon_id ? (
            <img src={getProfileIconUrl(author.avatar_icon_id)} alt="" className="w-10 h-10 rounded-full border border-zinc-700/50" />
          ) : (
            <div className="w-10 h-10 rounded-full bg-zinc-800 border border-zinc-700/50" />
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-zinc-100">{author?.riot_id ?? "Anonymous"}</p>
            <div className="flex items-center gap-2 text-[11px]">
              {author?.tier && (
                <span className="flex items-center gap-1">
                  <img src={getRankEmblemUrl(author.tier)} alt="" className="w-4 h-4" />
                  <span className="text-zinc-400 capitalize">{author.tier.toLowerCase()} {author.rank}</span>
                  {author.lp > 0 && <span className="text-zinc-500">{author.lp} LP</span>}
                </span>
              )}
              {author?.champion_rank && (
                <span className="text-amber-400 font-medium">{author.champion_rank}</span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3 text-xs text-zinc-500">
            <span>{guide.views} views</span>
            <button
              onClick={toggleLike}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-lg border transition-colors ${
                liked
                  ? "bg-red-500/10 border-red-500/30 text-red-400"
                  : "bg-zinc-800/50 border-zinc-700/50 text-zinc-400 hover:text-red-400 hover:border-red-500/30"
              }`}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill={liked ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
              </svg>
              {likeCount}
            </button>
          </div>
        </div>

        {/* Tags */}
        {guide.tags.length > 0 && (
          <div className="flex gap-1.5 flex-wrap mb-6">
            {(guide.tags as string[]).map((t) => (
              <span key={t} className="text-xs px-2.5 py-1 rounded-full bg-zinc-800/80 text-zinc-400 border border-zinc-700/30">
                {t}
              </span>
            ))}
          </div>
        )}

        {/* Content */}
        <article
          className="prose prose-invert prose-sm max-w-none rounded-xl border border-zinc-800/50 p-6"
          style={{ background: "rgba(24, 24, 32, 0.7)" }}
        >
          <div className="whitespace-pre-wrap text-sm text-zinc-300 leading-relaxed">
            {guide.content}
          </div>
        </article>
      </div>
    </div>
  );
}
