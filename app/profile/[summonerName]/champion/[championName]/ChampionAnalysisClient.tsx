"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  getChampionSplashUrl,
  getChampionSquareUrl,
} from "@/lib/riotAssets";

type StatsBlock = {
  games: number;
  wins: number;
  winRate: number;
  avgKda: number;
  avgKills: number;
  avgDeaths: number;
  avgAssists: number;
  avgCsPerMin: number;
  avgVisionScore: number;
  avgDamageShare: number;
  avgGoldPerMin: number;
};

type StatComparison = {
  stat: string;
  label: string;
  playerValue: number;
  benchmark: number;
  percentile: number;
  status: "good" | "warning" | "bad";
};

type MatchupRecord = {
  opponentChampion: string;
  games: number;
  wins: number;
  winRate: number;
};

type AnalysisData = {
  championName: string;
  riotId: string;
  region: string;
  tier: string;
  rank: string;
  overall: StatsBlock;
  recentBlock: StatsBlock;
  previousBlock: StatsBlock;
  trend: "improving" | "plateauing" | "declining";
  trendDetails: {
    csPerMinChange: number;
    kdaChange: number;
    winRateChange: number;
  };
  comparisons: StatComparison[];
  avgPercentile: number;
  equivalentRank: string;
  bestMatchups: MatchupRecord[];
  worstMatchups: MatchupRecord[];
  benchmarkTier: string;
  totalGamesAnalyzed: number;
};

type AIResponse = {
  analysis: string;
  generatedAt: string;
  cached: boolean;
  rateLimited?: boolean;
  retryAfterMs?: number;
};

const TIER_COLORS: Record<string, string> = {
  CHALLENGER: "text-amber-400",
  GRANDMASTER: "text-red-400",
  MASTER: "text-purple-400",
  DIAMOND: "text-cyan-400",
  EMERALD: "text-emerald-400",
  PLATINUM: "text-teal-300",
  GOLD: "text-yellow-400",
  SILVER: "text-zinc-300",
  BRONZE: "text-orange-400",
  IRON: "text-stone-400",
};

function statusIcon(status: "good" | "warning" | "bad") {
  if (status === "good") return <span className="text-emerald-400">✅</span>;
  if (status === "warning") return <span className="text-amber-400">⚠️</span>;
  return <span className="text-red-400">❌</span>;
}

function trendArrow(trend: "improving" | "plateauing" | "declining") {
  if (trend === "improving")
    return (
      <div className="flex items-center gap-2">
        <svg className="h-8 w-8 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
        </svg>
        <span className="text-lg font-bold text-emerald-400">Improving</span>
      </div>
    );
  if (trend === "declining")
    return (
      <div className="flex items-center gap-2">
        <svg className="h-8 w-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
        <span className="text-lg font-bold text-red-400">Declining</span>
      </div>
    );
  return (
    <div className="flex items-center gap-2">
      <svg className="h-8 w-8 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14" />
      </svg>
      <span className="text-lg font-bold text-amber-400">Plateauing</span>
    </div>
  );
}

export default function ChampionAnalysisClient({
  summonerName,
  championName,
}: {
  summonerName: string;
  championName: string;
}) {
  const [data, setData] = useState<AnalysisData | null>(null);
  const [aiText, setAiText] = useState<string | null>(null);
  const [aiGeneratedAt, setAiGeneratedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [aiLoading, setAiLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [region] = useState("na1");

  const riotId = summonerName;

  const fetchAnalysis = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/champion-analysis?riotId=${encodeURIComponent(riotId)}&region=${region}&champion=${encodeURIComponent(championName)}`
      );
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Failed (${res.status})`);
      }
      const analysis: AnalysisData = await res.json();
      setData(analysis);

      setAiLoading(true);
      try {
        const aiRes = await fetch("/api/champion-analysis/ai", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ analysisData: analysis }),
        });
        if (aiRes.ok) {
          const aiData: AIResponse = await aiRes.json();
          setAiText(aiData.analysis);
          setAiGeneratedAt(aiData.generatedAt);
        }
      } catch { /* AI is optional */ }
      setAiLoading(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    }
    setLoading(false);
  }, [riotId, region, championName]);

  useEffect(() => {
    fetchAnalysis();
  }, [fetchAnalysis]);

  const refreshAI = useCallback(async () => {
    if (!data) return;
    setAiLoading(true);
    try {
      const aiRes = await fetch("/api/champion-analysis/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ analysisData: data, forceRefresh: true }),
      });
      if (aiRes.ok) {
        const aiData: AIResponse = await aiRes.json();
        setAiText(aiData.analysis);
        setAiGeneratedAt(aiData.generatedAt);
        if (aiData.rateLimited) {
          const mins = Math.ceil((aiData.retryAfterMs ?? 0) / 60000);
          setError(`Rate limited. Try again in ${mins} minutes.`);
          setTimeout(() => setError(null), 5000);
        }
      }
    } catch { /* ok */ }
    setAiLoading(false);
  }, [data]);

  const splashUrl = getChampionSplashUrl(championName);

  if (loading) {
    return (
      <main className="min-h-screen bg-[#0E0F15] text-[#E8E9F0]">
        <div className="relative h-64 overflow-hidden">
          <div
            className="absolute inset-0 bg-cover bg-center blur-sm brightness-[0.3]"
            style={{ backgroundImage: `url(${splashUrl})` }}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[#0E0F15]" />
        </div>
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <div className="h-10 w-10 mx-auto animate-spin rounded-full border-2 border-white/20 border-t-[#5865F2]" />
            <p className="mt-4 text-white/50 text-sm">Analyzing {summonerName}&apos;s {championName} gameplay...</p>
            <p className="mt-1 text-white/30 text-xs">Fetching match data and computing stats</p>
          </div>
        </div>
      </main>
    );
  }

  if (error && !data) {
    return (
      <main className="min-h-screen bg-[#0E0F15] text-[#E8E9F0] flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 text-lg mb-4">{error}</p>
          <Link href="/" className="text-sm text-white/50 hover:text-white">
            Back to Home
          </Link>
        </div>
      </main>
    );
  }

  if (!data) return null;

  const eqRankColor = TIER_COLORS[data.equivalentRank.toUpperCase()] ?? "text-white";

  return (
    <main className="min-h-screen bg-[#0E0F15] text-[#E8E9F0]">
      {/* Hero with splash art */}
      <div className="relative h-72 overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-[center_20%] blur-sm brightness-[0.3] scale-105"
          style={{ backgroundImage: `url(${splashUrl})` }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#0E0F15]" />
        <div className="relative z-10 flex h-full items-end px-6 pb-6 sm:px-10">
          <div className="flex items-end gap-5">
            <img
              src={getChampionSquareUrl(championName)}
              alt={championName}
              className="h-20 w-20 rounded-xl border-2 border-white/20 shadow-lg"
            />
            <div>
              <h1 className="text-3xl font-bold tracking-tight drop-shadow-lg">
                {championName}
              </h1>
              <p className="text-white/60 text-sm mt-1">
                <Link href={`/summoner?riotId=${encodeURIComponent(riotId)}&region=${region}`} className="hover:text-white transition">
                  {summonerName}
                </Link>
                {" · "}{data.totalGamesAnalyzed} games analyzed
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-4 sm:px-8 pb-16 -mt-4">
        {/* Top cards row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          {/* Equivalent rank */}
          <div className="rounded-xl border border-white/10 bg-[#151620] p-5">
            <div className="text-[11px] text-white/40 uppercase tracking-wider mb-2">Champion Mastery Level</div>
            <div className={`text-2xl font-bold ${eqRankColor}`}>
              {data.equivalentRank}
            </div>
            <p className="text-xs text-white/40 mt-1">
              You play {championName} at a {data.equivalentRank} level
            </p>
          </div>

          {/* Trend */}
          <div className="rounded-xl border border-white/10 bg-[#151620] p-5">
            <div className="text-[11px] text-white/40 uppercase tracking-wider mb-2">Performance Trend</div>
            {trendArrow(data.trend)}
            <p className="text-xs text-white/40 mt-2">
              Based on last 20 vs previous 20 games
            </p>
          </div>

          {/* Overall stats */}
          <div className="rounded-xl border border-white/10 bg-[#151620] p-5">
            <div className="text-[11px] text-white/40 uppercase tracking-wider mb-2">Overall Stats</div>
            <div className="flex items-baseline gap-3">
              <span className="text-2xl font-bold">{data.overall.winRate}%</span>
              <span className="text-sm text-white/50">WR</span>
              <span className="text-lg font-semibold text-white/70">{data.overall.avgKda}</span>
              <span className="text-sm text-white/50">KDA</span>
            </div>
            <p className="text-xs text-white/40 mt-1">
              {data.overall.avgKills}/{data.overall.avgDeaths}/{data.overall.avgAssists} · {data.overall.games} games
            </p>
          </div>
        </div>

        {/* Stats comparison table */}
        <div className="rounded-xl border border-white/10 bg-[#151620] overflow-hidden mb-8">
          <div className="px-5 py-4 border-b border-white/10">
            <h2 className="text-sm font-semibold text-white/80 uppercase tracking-wider">
              Stats vs {data.benchmarkTier} Benchmark
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/5 text-xs text-white/40 uppercase tracking-wider">
                  <th className="text-left px-5 py-3 font-semibold">Stat</th>
                  <th className="text-center px-4 py-3 font-semibold">Your Average</th>
                  <th className="text-center px-4 py-3 font-semibold">Benchmark</th>
                  <th className="text-center px-4 py-3 font-semibold">Percentile</th>
                  <th className="text-center px-4 py-3 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {data.comparisons.map((c) => (
                  <tr key={c.stat} className="border-b border-white/5 hover:bg-white/[0.02]">
                    <td className="px-5 py-3 font-medium text-white/80">{c.label}</td>
                    <td className="text-center px-4 py-3 font-semibold tabular-nums">
                      {c.stat === "winRate" || c.stat === "damageShare"
                        ? `${c.playerValue}%`
                        : c.playerValue}
                    </td>
                    <td className="text-center px-4 py-3 text-white/50 tabular-nums">
                      {c.stat === "winRate" || c.stat === "damageShare"
                        ? `${c.benchmark}%`
                        : c.benchmark}
                    </td>
                    <td className="text-center px-4 py-3">
                      <span
                        className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-bold ${
                          c.percentile >= 60
                            ? "bg-emerald-500/15 text-emerald-400"
                            : c.percentile >= 40
                            ? "bg-amber-500/15 text-amber-400"
                            : "bg-red-500/15 text-red-400"
                        }`}
                      >
                        {c.percentile}th
                      </span>
                    </td>
                    <td className="text-center px-4 py-3">{statusIcon(c.status)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Trend details */}
        {data.previousBlock.games >= 5 && (
          <div className="rounded-xl border border-white/10 bg-[#151620] overflow-hidden mb-8">
            <div className="px-5 py-4 border-b border-white/10">
              <h2 className="text-sm font-semibold text-white/80 uppercase tracking-wider">
                Trend Details — Recent 20 vs Previous 20
              </h2>
            </div>
            <div className="grid grid-cols-3 divide-x divide-white/5">
              {[
                { label: "CS / min", val: data.trendDetails.csPerMinChange },
                { label: "KDA", val: data.trendDetails.kdaChange },
                { label: "Win Rate", val: data.trendDetails.winRateChange, pct: true },
              ].map((item) => (
                <div key={item.label} className="p-5 text-center">
                  <div className="text-xs text-white/40 uppercase tracking-wider mb-2">{item.label}</div>
                  <div
                    className={`text-xl font-bold tabular-nums ${
                      item.val > 0 ? "text-emerald-400" : item.val < 0 ? "text-red-400" : "text-amber-400"
                    }`}
                  >
                    {item.val > 0 ? "+" : ""}{item.val}{item.pct ? "%" : ""}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Matchups */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
          <div className="rounded-xl border border-white/10 bg-[#151620] p-5">
            <h3 className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-3">
              Best Matchups
            </h3>
            {data.bestMatchups.length === 0 && (
              <p className="text-sm text-white/30">Not enough matchup data</p>
            )}
            <div className="space-y-2">
              {data.bestMatchups.map((m) => (
                <div key={m.opponentChampion} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <img
                      src={getChampionSquareUrl(m.opponentChampion)}
                      alt={m.opponentChampion}
                      className="h-7 w-7 rounded"
                    />
                    <span className="text-sm text-white/80">{m.opponentChampion}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-emerald-400">{m.winRate}%</span>
                    <span className="text-xs text-white/30">{m.games}g</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-white/10 bg-[#151620] p-5">
            <h3 className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-3">
              Worst Matchups
            </h3>
            {data.worstMatchups.length === 0 && (
              <p className="text-sm text-white/30">Not enough matchup data</p>
            )}
            <div className="space-y-2">
              {data.worstMatchups.map((m) => (
                <div key={m.opponentChampion} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <img
                      src={getChampionSquareUrl(m.opponentChampion)}
                      alt={m.opponentChampion}
                      className="h-7 w-7 rounded"
                    />
                    <span className="text-sm text-white/80">{m.opponentChampion}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-red-400">{m.winRate}%</span>
                    <span className="text-xs text-white/30">{m.games}g</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* AI Analysis */}
        <div className="rounded-xl border border-white/10 bg-[#151620] overflow-hidden mb-8">
          <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold text-white/80 uppercase tracking-wider">
                AI Coach Analysis
              </h2>
              <span className="rounded bg-indigo-500/15 border border-indigo-500/30 px-2 py-0.5 text-[10px] font-semibold text-indigo-400 uppercase tracking-wide">
                Generated by AI
              </span>
            </div>
            <button
              type="button"
              onClick={refreshAI}
              disabled={aiLoading}
              className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/50 hover:text-white hover:bg-white/10 transition disabled:opacity-50"
            >
              {aiLoading ? "Generating..." : "Refresh Analysis"}
            </button>
          </div>
          <div className="p-5">
            {aiLoading && !aiText && (
              <div className="flex items-center gap-3 py-8 justify-center">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/20 border-t-indigo-400" />
                <span className="text-sm text-white/40">Generating AI analysis...</span>
              </div>
            )}
            {aiText && (
              <div className="prose prose-invert prose-sm max-w-none">
                {aiText.split("\n\n").map((paragraph, i) => (
                  <p key={i} className="text-sm text-white/70 leading-relaxed mb-4 last:mb-0">
                    {paragraph}
                  </p>
                ))}
              </div>
            )}
            {aiGeneratedAt && (
              <p className="mt-4 text-[11px] text-white/25">
                Last updated: {new Date(aiGeneratedAt).toLocaleString()}
              </p>
            )}
          </div>
        </div>

        {error && (
          <div className="rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-400 mb-4">
            {error}
          </div>
        )}

        {/* Back link */}
        <div className="text-center pt-4">
          <Link
            href={`/summoner?riotId=${encodeURIComponent(riotId)}&region=${region}`}
            className="text-sm text-white/40 hover:text-white transition"
          >
            ← Back to {summonerName}&apos;s profile
          </Link>
        </div>
      </div>
    </main>
  );
}
