"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { getRankEmblemUrl, getProfileIconUrl } from "@/lib/riotAssets";

interface AuthorSession {
  authenticated: boolean;
  author?: {
    id: number;
    riotId: string;
    tier: string | null;
    rank: string | null;
    lp: number;
    mainChampion: string | null;
    championRank: string | null;
    avatarIconId: number | null;
  };
}

const ROLES = ["top", "jungle", "mid", "bot", "support"];

const TAG_OPTIONS = [
  "Beginner",
  "Advanced",
  "Matchups",
  "Macro",
  "Combos",
  "Laning",
  "Teamfights",
  "Splitpush",
  "Roaming",
  "Itemization",
];

export default function CreateGuidePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [session, setSession] = useState<AuthorSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [champion, setChampion] = useState(searchParams.get("champion") ?? "");
  const [role, setRole] = useState("mid");
  const [content, setContent] = useState("");
  const [tags, setTags] = useState<string[]>([]);

  useEffect(() => {
    fetch("/api/auth/riot/session")
      .then((r) => r.json())
      .then(setSession)
      .catch(() => setSession({ authenticated: false }))
      .finally(() => setLoading(false));
  }, []);

  const toggleTag = (tag: string) => {
    setTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag].slice(0, 5)
    );
  };

  const handleSubmit = async () => {
    if (!title.trim() || !champion.trim() || !content.trim()) {
      setError("Please fill in all required fields.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/guides", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, champion_name: champion, role, content, tags }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Failed to create guide");
        return;
      }

      router.push(`/guides/${data.guide.slug}`);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--background)" }}>
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!session?.authenticated) {
    return (
      <div className="min-h-screen" style={{ background: "var(--background)" }}>
        <div className="max-w-lg mx-auto px-4 py-16 text-center">
          <div
            className="rounded-xl border border-zinc-800/50 p-8"
            style={{ background: "rgba(24, 24, 32, 0.7)" }}
          >
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-indigo-400">
                <path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <h1 className="text-xl font-bold text-white mb-2">Sign in with Riot</h1>
            <p className="text-zinc-400 text-sm mb-6">
              To write a guide, you need to verify your Riot account. This confirms your rank and one-trick status so readers can trust your expertise.
            </p>
            <a
              href={`/api/auth/riot/login?returnTo=${encodeURIComponent(`/guides/create${champion ? `?champion=${champion}` : ""}`)}`}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-medium bg-red-600 hover:bg-red-500 text-white transition-colors"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
              </svg>
              Sign in with Riot Account
            </a>
            <Link href="/guides" className="block mt-4 text-xs text-zinc-500 hover:text-zinc-300 transition-colors">
              Back to Guides
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const author = session.author!;

  return (
    <div className="min-h-screen" style={{ background: "var(--background)" }}>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        <Link href="/guides" className="inline-flex items-center gap-1.5 text-xs text-zinc-400 hover:text-indigo-400 transition-colors mb-6">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          Back to Guides
        </Link>

        <h1 className="text-2xl font-bold text-white mb-6">Write a Guide</h1>

        {/* Author identity */}
        <div
          className="flex items-center gap-3 p-3 rounded-xl border border-zinc-800/50 mb-6"
          style={{ background: "rgba(24, 24, 32, 0.7)" }}
        >
          {author.avatarIconId ? (
            <img src={getProfileIconUrl(author.avatarIconId)} alt="" className="w-10 h-10 rounded-full border border-zinc-700/50" />
          ) : (
            <div className="w-10 h-10 rounded-full bg-zinc-800 border border-zinc-700/50" />
          )}
          <div>
            <p className="text-sm font-medium text-zinc-100">{author.riotId}</p>
            <div className="flex items-center gap-2 text-[11px]">
              {author.tier && (
                <span className="flex items-center gap-1">
                  <img src={getRankEmblemUrl(author.tier)} alt="" className="w-4 h-4" />
                  <span className="text-zinc-400 capitalize">{author.tier.toLowerCase()} {author.rank}</span>
                </span>
              )}
              <span className="text-emerald-400">Verified</span>
            </div>
          </div>
        </div>

        {/* Form */}
        <div className="flex flex-col gap-4">
          {/* Title */}
          <div>
            <label className="block text-xs text-zinc-400 mb-1.5">Title *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Diamond Yasuo One-Trick Guide - How to Carry Every Game"
              className="w-full px-4 py-3 rounded-lg text-sm text-zinc-200 placeholder-zinc-500 border border-zinc-700/50 focus:outline-none focus:border-indigo-500/50"
              style={{ background: "rgba(24, 24, 32, 0.7)" }}
              maxLength={200}
            />
          </div>

          {/* Champion + Role */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-zinc-400 mb-1.5">Champion *</label>
              <input
                type="text"
                value={champion}
                onChange={(e) => setChampion(e.target.value)}
                placeholder="e.g. Yasuo"
                className="w-full px-4 py-3 rounded-lg text-sm text-zinc-200 placeholder-zinc-500 border border-zinc-700/50 focus:outline-none focus:border-indigo-500/50"
                style={{ background: "rgba(24, 24, 32, 0.7)" }}
              />
            </div>
            <div>
              <label className="block text-xs text-zinc-400 mb-1.5">Role</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full px-4 py-3 rounded-lg text-sm text-zinc-200 border border-zinc-700/50 focus:outline-none focus:border-indigo-500/50"
                style={{ background: "rgba(24, 24, 32, 0.7)" }}
              >
                {ROLES.map((r) => (
                  <option key={r} value={r} className="capitalize">
                    {r.charAt(0).toUpperCase() + r.slice(1)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Tags */}
          <div>
            <label className="block text-xs text-zinc-400 mb-1.5">Tags (up to 5)</label>
            <div className="flex flex-wrap gap-1.5">
              {TAG_OPTIONS.map((t) => (
                <button
                  key={t}
                  onClick={() => toggleTag(t)}
                  className={`text-xs px-2.5 py-1 rounded-full border transition-all ${
                    tags.includes(t)
                      ? "bg-indigo-500/20 text-indigo-400 border-indigo-500/30"
                      : "bg-zinc-800/50 text-zinc-400 border-zinc-700/30 hover:border-zinc-600"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Content */}
          <div>
            <label className="block text-xs text-zinc-400 mb-1.5">Guide Content *</label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Write your guide here. Share your knowledge about builds, matchups, combos, macro tips..."
              className="w-full px-4 py-3 rounded-lg text-sm text-zinc-200 placeholder-zinc-500 border border-zinc-700/50 focus:outline-none focus:border-indigo-500/50 min-h-[300px] resize-y"
              style={{ background: "rgba(24, 24, 32, 0.7)" }}
            />
          </div>

          {/* Error */}
          {error && (
            <div className="px-4 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* Submit */}
          <div className="flex items-center gap-3 pt-2">
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="px-6 py-3 rounded-lg text-sm font-medium bg-indigo-600 hover:bg-indigo-500 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? "Publishing..." : "Publish Guide"}
            </button>
            <Link href="/guides" className="px-4 py-3 text-sm text-zinc-400 hover:text-zinc-200 transition-colors">
              Cancel
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
