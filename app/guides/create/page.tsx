"use client";

import { Suspense, useEffect, useState } from "react";
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

interface ChallengeData {
  puuid: string;
  riotId: string;
  currentIconId: number;
  challengeIcon: { id: number; name: string };
  summonerLevel: number;
}

const ROLES = ["top", "jungle", "mid", "bot", "support"];

const TAG_OPTIONS = [
  "Beginner", "Advanced", "Matchups", "Macro", "Combos",
  "Laning", "Teamfights", "Splitpush", "Roaming", "Itemization",
];

export default function CreateGuidePageWrapper() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--background)" }}>
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <CreateGuidePage />
    </Suspense>
  );
}

function CreateGuidePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [session, setSession] = useState<AuthorSession | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/auth/riot/session")
      .then((r) => r.json())
      .then(setSession)
      .catch(() => setSession({ authenticated: false }))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--background)" }}>
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!session?.authenticated) {
    return <VerifyAccountFlow champion={searchParams.get("champion") ?? ""} onVerified={() => {
      fetch("/api/auth/riot/session").then((r) => r.json()).then(setSession);
    }} />;
  }

  return <GuideEditor author={session.author!} defaultChampion={searchParams.get("champion") ?? ""} router={router} />;
}

/* ═══════════════ VERIFY ACCOUNT FLOW ═══════════════ */

function VerifyAccountFlow({ champion, onVerified }: { champion: string; onVerified: () => void }) {
  const [step, setStep] = useState<"input" | "challenge" | "checking">("input");
  const [gameName, setGameName] = useState("");
  const [tagLine, setTagLine] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [challenge, setChallenge] = useState<ChallengeData | null>(null);
  const [checkResult, setCheckResult] = useState<string | null>(null);
  const [devMode, setDevMode] = useState(false);

  const startVerification = async () => {
    if (!gameName.trim() || !tagLine.trim()) {
      setError("Please enter your full Riot ID (name and tag).");
      return;
    }

    setError(null);
    setStep("checking");

    try {
      const res = await fetch("/api/auth/riot/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "start", gameName: gameName.trim(), tagLine: tagLine.trim() }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Failed to look up account.");
        setStep("input");
        return;
      }

      if (data.devMode) setDevMode(true);
      setChallenge(data);
      setStep("challenge");
    } catch {
      setError("Something went wrong. Please try again.");
      setStep("input");
    }
  };

  const checkVerification = async () => {
    if (!challenge) return;
    setCheckResult(null);
    setStep("checking");

    try {
      const res = await fetch("/api/auth/riot/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "check", gameName: gameName.trim(), tagLine: tagLine.trim() }),
      });
      const data = await res.json();

      if (!res.ok) {
        setCheckResult(data.error ?? "Verification failed.");
        setStep("challenge");
        return;
      }

      if (data.verified) {
        onVerified();
      } else {
        setCheckResult(data.message ?? "Icon doesn't match yet. Change it and try again.");
        setStep("challenge");
      }
    } catch {
      setCheckResult("Something went wrong. Please try again.");
      setStep("challenge");
    }
  };

  return (
    <div className="min-h-screen" style={{ background: "var(--background)" }}>
      <div className="max-w-lg mx-auto px-4 py-16">
        <Link href="/guides" className="inline-flex items-center gap-1.5 text-xs text-zinc-500 hover:text-indigo-400 transition-colors mb-8 group">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="group-hover:-translate-x-0.5 transition-transform">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          Back to Guides
        </Link>

        <div className="glass rounded-2xl p-8">
          {/* Step 1: Enter Riot ID */}
          {(step === "input" || (step === "checking" && !challenge)) && (
            <>
              <div className="w-14 h-14 mx-auto mb-5 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center" style={{ boxShadow: "0 0 20px rgba(99, 102, 241, 0.15)" }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-indigo-400">
                  <path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <h1 className="text-xl font-bold text-white text-center mb-2">Verify Your Account</h1>
              <p className="text-zinc-400 text-sm text-center mb-6">
                To write a guide, verify your Riot account. This confirms your rank so readers can trust your expertise.
              </p>

              <div className="flex flex-col gap-3">
                <div className="flex gap-2">
                  <div className="flex-1">
                    <label className="block text-[10px] text-zinc-500 uppercase tracking-wider mb-1">Game Name</label>
                    <input
                      type="text"
                      value={gameName}
                      onChange={(e) => setGameName(e.target.value)}
                      placeholder="Player"
                      className="w-full px-3 py-2.5 rounded-lg text-sm text-zinc-200 placeholder-zinc-600 border border-white/10 focus:outline-none focus:border-indigo-500/50"
                      style={{ background: "rgba(255,255,255,0.03)" }}
                      onKeyDown={(e) => e.key === "Enter" && startVerification()}
                    />
                  </div>
                  <div className="w-24">
                    <label className="block text-[10px] text-zinc-500 uppercase tracking-wider mb-1">Tag</label>
                    <input
                      type="text"
                      value={tagLine}
                      onChange={(e) => setTagLine(e.target.value)}
                      placeholder="NA1"
                      className="w-full px-3 py-2.5 rounded-lg text-sm text-zinc-200 placeholder-zinc-600 border border-white/10 focus:outline-none focus:border-indigo-500/50"
                      style={{ background: "rgba(255,255,255,0.03)" }}
                      onKeyDown={(e) => e.key === "Enter" && startVerification()}
                    />
                  </div>
                </div>

                {error && (
                  <div className="px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
                    {error}
                  </div>
                )}

                <button
                  onClick={startVerification}
                  disabled={step === "checking"}
                  className="w-full py-3 rounded-xl text-sm font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition-colors disabled:opacity-50"
                  style={{ boxShadow: "0 0 16px rgba(99, 102, 241, 0.2)" }}
                >
                  {step === "checking" ? "Looking up account..." : "Start Verification"}
                </button>
              </div>
            </>
          )}

          {/* Step 2: Icon Challenge */}
          {step === "challenge" && challenge && (
            <>
              {devMode && (
                <div className="px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs mb-4 text-center">
                  Dev mode — Riot API key not set. Click &quot;Verify&quot; to auto-verify with mock rank data.
                </div>
              )}
              <div className="text-center mb-6">
                <div className="flex items-center justify-center gap-3 mb-4">
                  <img
                    src={getProfileIconUrl(challenge.currentIconId)}
                    alt="Current icon"
                    className="w-12 h-12 rounded-xl border border-white/10"
                  />
                  <div>
                    <p className="text-sm font-semibold text-white">{challenge.riotId}</p>
                    <p className="text-[11px] text-zinc-500">Level {challenge.summonerLevel}</p>
                  </div>
                </div>
                <h2 className="text-lg font-bold text-white mb-1">Change Your Summoner Icon</h2>
                <p className="text-zinc-400 text-sm">
                  Open the League client and change your summoner icon to the one below, then click &quot;Verify&quot;.
                </p>
              </div>

              {/* Challenge icon */}
              <div className="flex flex-col items-center gap-3 p-5 rounded-xl mb-5" style={{ background: "rgba(99, 102, 241, 0.06)", border: "1px solid rgba(99, 102, 241, 0.15)" }}>
                <p className="text-[10px] text-indigo-400 uppercase tracking-widest font-semibold">Set your icon to</p>
                <img
                  src={getProfileIconUrl(challenge.challengeIcon.id)}
                  alt={challenge.challengeIcon.name}
                  className="w-20 h-20 rounded-2xl border-2 border-indigo-500/40"
                  style={{ boxShadow: "0 0 24px rgba(99, 102, 241, 0.25)" }}
                />
                <p className="text-sm font-semibold text-white">{challenge.challengeIcon.name}</p>
                <p className="text-[11px] text-zinc-500">Icon ID: {challenge.challengeIcon.id}</p>
              </div>

              <div className="flex flex-col gap-3 text-xs text-zinc-500 mb-5 px-2">
                <div className="flex items-start gap-2">
                  <span className="text-indigo-400 mt-0.5">1.</span>
                  <span>Open the League of Legends client</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-indigo-400 mt-0.5">2.</span>
                  <span>Click your profile icon (top left) and find the icon shown above</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-indigo-400 mt-0.5">3.</span>
                  <span>Select it and click &quot;Verify&quot; below. You can change it back after.</span>
                </div>
              </div>

              {checkResult && (
                <div className="px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs mb-3">
                  {checkResult}
                </div>
              )}

              <div className="flex gap-2">
                <button
                  onClick={() => { setStep("input"); setChallenge(null); setCheckResult(null); }}
                  className="flex-1 py-3 rounded-xl text-sm font-medium text-zinc-400 border border-white/10 hover:border-white/20 transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={checkVerification}
                  className="flex-[2] py-3 rounded-xl text-sm font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition-colors"
                  style={{ boxShadow: "0 0 16px rgba(99, 102, 241, 0.2)" }}
                >
                  Verify
                </button>
              </div>

              <p className="text-[10px] text-zinc-600 text-center mt-3">
                Verification expires in 15 minutes
              </p>
            </>
          )}

          {/* Checking state */}
          {step === "checking" && challenge && (
            <div className="flex flex-col items-center gap-3 py-8">
              <div className="w-10 h-10 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" style={{ boxShadow: "0 0 16px rgba(99, 102, 241, 0.2)" }} />
              <p className="text-zinc-400 text-sm">Checking your summoner icon...</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════ GUIDE EDITOR ═══════════════ */

function GuideEditor({ author, defaultChampion, router }: {
  author: NonNullable<AuthorSession["author"]>;
  defaultChampion: string;
  router: ReturnType<typeof useRouter>;
}) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [champion, setChampion] = useState(defaultChampion);
  const [role, setRole] = useState("mid");
  const [content, setContent] = useState("");
  const [tags, setTags] = useState<string[]>([]);

  const toggleTag = (tag: string) => {
    setTags((prev) => prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag].slice(0, 5));
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
      if (!res.ok) { setError(data.error ?? "Failed to create guide"); return; }
      router.push(`/guides/${data.guide.slug}`);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen" style={{ background: "var(--background)" }}>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        <Link href="/guides" className="inline-flex items-center gap-1.5 text-xs text-zinc-500 hover:text-indigo-400 transition-colors mb-6 group">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="group-hover:-translate-x-0.5 transition-transform">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          Back to Guides
        </Link>

        <h1 className="text-2xl font-bold text-white mb-6">Write a Guide</h1>

        {/* Author card */}
        <div className="glass flex items-center gap-3 p-3 rounded-xl mb-6">
          {author.avatarIconId ? (
            <img src={getProfileIconUrl(author.avatarIconId)} alt="" className="w-10 h-10 rounded-full border border-white/10" />
          ) : (
            <div className="w-10 h-10 rounded-full bg-zinc-800 border border-white/10" />
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
              <span className="text-emerald-400 font-medium">Verified</span>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <div>
            <label className="block text-[10px] text-zinc-500 uppercase tracking-wider mb-1.5">Title *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Diamond Yasuo One-Trick Guide - How to Carry Every Game"
              className="w-full px-4 py-3 rounded-xl text-sm text-zinc-200 placeholder-zinc-600 border border-white/10 focus:outline-none focus:border-indigo-500/50"
              style={{ background: "rgba(255,255,255,0.03)" }}
              maxLength={200}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] text-zinc-500 uppercase tracking-wider mb-1.5">Champion *</label>
              <input
                type="text"
                value={champion}
                onChange={(e) => setChampion(e.target.value)}
                placeholder="e.g. Yasuo"
                className="w-full px-4 py-3 rounded-xl text-sm text-zinc-200 placeholder-zinc-600 border border-white/10 focus:outline-none focus:border-indigo-500/50"
                style={{ background: "rgba(255,255,255,0.03)" }}
              />
            </div>
            <div>
              <label className="block text-[10px] text-zinc-500 uppercase tracking-wider mb-1.5">Role</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full px-4 py-3 rounded-xl text-sm text-zinc-200 border border-white/10 focus:outline-none focus:border-indigo-500/50"
                style={{ background: "rgba(24, 24, 32, 0.9)" }}
              >
                {ROLES.map((r) => (
                  <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[10px] text-zinc-500 uppercase tracking-wider mb-1.5">Tags (up to 5)</label>
            <div className="flex flex-wrap gap-1.5">
              {TAG_OPTIONS.map((t) => (
                <button
                  key={t}
                  onClick={() => toggleTag(t)}
                  className={`text-xs px-2.5 py-1 rounded-full border transition-all ${
                    tags.includes(t)
                      ? "bg-indigo-500/15 text-indigo-400 border-indigo-500/30"
                      : "text-zinc-500 border-white/10 hover:border-white/20"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-[10px] text-zinc-500 uppercase tracking-wider mb-1.5">Guide Content *</label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Write your guide here. Share your knowledge about builds, matchups, combos, macro tips..."
              className="w-full px-4 py-3 rounded-xl text-sm text-zinc-200 placeholder-zinc-600 border border-white/10 focus:outline-none focus:border-indigo-500/50 min-h-[300px] resize-y"
              style={{ background: "rgba(255,255,255,0.03)" }}
            />
          </div>

          {error && (
            <div className="px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs">{error}</div>
          )}

          <div className="flex items-center gap-3 pt-2">
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="px-6 py-3 rounded-xl text-sm font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition-colors disabled:opacity-50"
              style={{ boxShadow: "0 0 16px rgba(99, 102, 241, 0.2)" }}
            >
              {submitting ? "Publishing..." : "Publish Guide"}
            </button>
            <Link href="/guides" className="px-4 py-3 text-sm text-zinc-500 hover:text-zinc-300 transition-colors">Cancel</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
