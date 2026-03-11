"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  getChampionSplashUrl,
  getChampionSquareUrl,
} from "@/lib/riotAssets";

type StatsBlock = {
  games: number; wins: number; winRate: number;
  avgKda: number; avgKills: number; avgDeaths: number; avgAssists: number;
  avgCsPerMin: number; avgVisionScore: number; avgDamageShare: number; avgGoldPerMin: number;
};

type StatComparison = {
  stat: string; label: string; playerValue: number; benchmark: number;
  percentile: number; status: "good" | "warning" | "bad";
};

type MatchupRecord = { opponentChampion: string; games: number; wins: number; winRate: number };
type PersonalBest = { label: string; value: string; detail: string };
type WinCondition = { description: string; winRate: number; games: number };

type AnalysisData = {
  championName: string; riotId: string; region: string; tier: string; rank: string;
  overall: StatsBlock; recentBlock: StatsBlock; previousBlock: StatsBlock;
  trend: "improving" | "plateauing" | "declining";
  trendDetails: { csPerMinChange: number; kdaChange: number; winRateChange: number };
  comparisons: StatComparison[]; avgPercentile: number; equivalentRank: string;
  bestMatchups: MatchupRecord[]; worstMatchups: MatchupRecord[];
  benchmarkTier: string; totalGamesAnalyzed: number;
  masteryGrade: string; playstyleTitle: string; playstyleDescription: string;
  personalBests: PersonalBest[]; winConditions: WinCondition[];
  oneThingCallout: { stat: string; current: number; target: number; targetRank: string; tip: string };
  betterThanPercent: { stat: string; label: string; percentile: number };
  currentWinStreak: number; bestWinStreak: number;
};

type AIResponse = { analysis: string; generatedAt: string; cached: boolean; rateLimited?: boolean; retryAfterMs?: number };

type TierComparison = {
  tier: string; kda: number; csPerMin: number; visionScore: number;
  damageShare: number; winRate: number; goldPerMin: number;
};

const TIER_COLORS: Record<string, string> = {
  CHALLENGER: "text-amber-400", GRANDMASTER: "text-red-400", MASTER: "text-purple-400",
  DIAMOND: "text-cyan-400", EMERALD: "text-emerald-400", PLATINUM: "text-teal-300",
  GOLD: "text-yellow-400", SILVER: "text-zinc-300", BRONZE: "text-orange-400", IRON: "text-stone-400",
};

const GRADE_COLORS: Record<string, string> = {
  "S+": "from-amber-400 to-yellow-300", S: "from-amber-400 to-yellow-400", "S-": "from-amber-500 to-yellow-500",
  "A+": "from-emerald-400 to-green-300", A: "from-emerald-400 to-green-400", "A-": "from-emerald-500 to-teal-400",
  "B+": "from-blue-400 to-cyan-300", B: "from-blue-400 to-cyan-400", "B-": "from-blue-500 to-cyan-500",
  "C+": "from-amber-500 to-orange-400", C: "from-orange-400 to-orange-500", "C-": "from-orange-500 to-red-400",
  "D+": "from-red-400 to-red-500", D: "from-red-500 to-red-600", "D-": "from-red-600 to-red-700",
};

const GRADE_GLOW: Record<string, string> = {
  "S+": "shadow-amber-500/40", S: "shadow-amber-500/30", "S-": "shadow-amber-500/20",
  "A+": "shadow-emerald-500/30", A: "shadow-emerald-500/20", "A-": "shadow-emerald-500/15",
  "B+": "shadow-blue-500/20", B: "shadow-blue-500/15", "B-": "shadow-blue-500/10",
};

function statusIcon(status: "good" | "warning" | "bad") {
  if (status === "good") return <span className="text-emerald-400 text-base">✅</span>;
  if (status === "warning") return <span className="text-amber-400 text-base">⚠️</span>;
  return <span className="text-red-400 text-base">❌</span>;
}

export default function ChampionAnalysisClient({
  summonerName, championName,
}: {
  summonerName: string; championName: string;
}) {
  const [data, setData] = useState<AnalysisData | null>(null);
  const [aiText, setAiText] = useState<string | null>(null);
  const [aiGeneratedAt, setAiGeneratedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [aiLoading, setAiLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [region] = useState("na1");
  const [tierComps, setTierComps] = useState<TierComparison[]>([]);
  const riotId = summonerName;
  const splashUrl = getChampionSplashUrl(championName);

  const fetchAnalysis = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res = await fetch(`/api/champion-analysis?riotId=${encodeURIComponent(riotId)}&region=${region}&champion=${encodeURIComponent(championName)}`);
      if (!res.ok) { const body = await res.json().catch(() => ({})); throw new Error(body.error || `Failed (${res.status})`); }
      const analysis: AnalysisData = await res.json();
      setData(analysis);

      fetch(`/api/champion-analysis/role-models?tier=${encodeURIComponent(analysis.tier)}`)
        .then((r) => (r.ok ? r.json() : { tiers: [] }))
        .then((d: { tiers: TierComparison[] }) => setTierComps(d.tiers ?? []))
        .catch(() => {});

      setAiLoading(true);
      try {
        const aiRes = await fetch("/api/champion-analysis/ai", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ analysisData: analysis }) });
        if (aiRes.ok) { const aiData: AIResponse = await aiRes.json(); setAiText(aiData.analysis); setAiGeneratedAt(aiData.generatedAt); }
      } catch { /* optional */ }
      setAiLoading(false);
    } catch (err) { setError(err instanceof Error ? err.message : "Unknown error"); }
    setLoading(false);
  }, [riotId, region, championName]);

  useEffect(() => { fetchAnalysis(); }, [fetchAnalysis]);

  const refreshAI = useCallback(async () => {
    if (!data) return; setAiLoading(true);
    try {
      const aiRes = await fetch("/api/champion-analysis/ai", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ analysisData: data, forceRefresh: true }) });
      if (aiRes.ok) { const aiData: AIResponse = await aiRes.json(); setAiText(aiData.analysis); setAiGeneratedAt(aiData.generatedAt); }
    } catch { /* ok */ }
    setAiLoading(false);
  }, [data]);

  if (loading) {
    return (
      <main className="min-h-screen bg-[#0E0F15] text-[#E8E9F0]">
        <div className="relative h-56 overflow-hidden">
          <div className="absolute inset-0 bg-cover bg-center blur-sm brightness-[0.3]" style={{ backgroundImage: `url(${splashUrl})` }} />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[#0E0F15]" />
        </div>
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <div className="h-10 w-10 mx-auto animate-spin rounded-full border-2 border-white/20 border-t-[#5865F2]" />
            <p className="mt-4 text-white/50 text-sm">Analyzing {summonerName}&apos;s {championName} gameplay...</p>
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
          <Link href="/" className="text-sm text-white/50 hover:text-white">Back to Home</Link>
        </div>
      </main>
    );
  }

  if (!data) return null;

  const gradeGradient = GRADE_COLORS[data.masteryGrade] ?? "from-zinc-400 to-zinc-500";
  const gradeGlow = GRADE_GLOW[data.masteryGrade] ?? "";
  const eqRankColor = TIER_COLORS[data.equivalentRank.toUpperCase()] ?? "text-white";

  return (
    <main className="min-h-screen bg-[#0E0F15] text-[#E8E9F0]">
      {/* Hero */}
      <div className="relative h-56 overflow-hidden">
        <div className="absolute inset-0 bg-cover bg-[center_20%] blur-sm brightness-[0.3] scale-105" style={{ backgroundImage: `url(${splashUrl})` }} />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#0E0F15]" />
        <div className="relative z-10 flex h-full items-end px-6 pb-6 sm:px-10">
          <Link
            href={`/summoner?riotId=${encodeURIComponent(riotId)}&region=${region}&tab=champion-pool`}
            className="absolute top-6 left-6 sm:left-10 flex items-center gap-1.5 text-sm text-white/40 hover:text-white transition"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" /></svg>
            Back to Champion Pool
          </Link>
          <div className="flex items-end gap-5">
            <img src={getChampionSquareUrl(championName)} alt={championName} className="h-20 w-20 rounded-xl border-2 border-white/20 shadow-lg" />
            <div>
              <h1 className="text-3xl font-bold tracking-tight drop-shadow-lg">{championName}</h1>
              <p className="text-white/60 text-sm mt-1">
                <Link href={`/summoner?riotId=${encodeURIComponent(riotId)}&region=${region}`} className="hover:text-white transition">{summonerName}</Link>
                {" · "}{data.totalGamesAnalyzed} games analyzed
              </p>
            </div>
          </div>
        </div>
      </div>

      <nav className="mx-auto max-w-5xl px-4 sm:px-8 pt-4 flex gap-1">
        <span className="inline-block px-5 py-2.5 text-sm font-bold text-indigo-400 bg-[#151620] border border-white/10 border-b-0 rounded-t-lg">Analysis</span>
        <Link
          href={`/profile/${encodeURIComponent(summonerName)}/champion/${encodeURIComponent(championName)}/patches`}
          className="inline-block px-5 py-2.5 text-sm font-semibold text-white/40 hover:text-white/70 transition rounded-t-lg"
        >
          Patch History
        </Link>
      </nav>

      <div className="mx-auto max-w-5xl px-4 sm:px-8 pb-16 pt-6">

        {/* === HERO CARD: Grade + Identity === */}
        <div className="relative rounded-2xl border border-white/10 bg-gradient-to-br from-[#151620] to-[#1a1d2e] p-6 sm:p-8 mb-8 overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 opacity-5 pointer-events-none">
            <img src={getChampionSplashUrl(championName)} alt="" className="w-full h-full object-cover rounded-full blur-2xl" />
          </div>
          <div className="relative z-10 flex flex-col sm:flex-row items-center gap-6">
            {/* Grade circle */}
            <div className={`flex-shrink-0 w-28 h-28 rounded-full bg-gradient-to-br ${gradeGradient} flex items-center justify-center shadow-xl ${gradeGlow}`}>
              <span className="text-4xl font-black text-white drop-shadow-lg">{data.masteryGrade}</span>
            </div>
            <div className="text-center sm:text-left flex-1">
              <div className="text-xs text-white/40 uppercase tracking-widest mb-1">Mastery Grade</div>
              <h2 className="text-2xl font-bold text-white mb-1">{data.playstyleTitle}</h2>
              <p className="text-sm text-white/50 mb-3">{data.playstyleDescription}</p>
              <div className="flex flex-wrap items-center gap-3">
                <span className={`text-sm font-bold ${eqRankColor}`}>{data.equivalentRank} Level</span>
                <span className="text-white/20">·</span>
                <span className="text-sm text-white/50">
                  Your {data.betterThanPercent.label} is better than <span className="font-bold text-white/80">{data.betterThanPercent.percentile}%</span> of {data.tier.charAt(0) + data.tier.slice(1).toLowerCase()} players
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* === Stats row: WR, KDA, Streaks === */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
          <div className="rounded-xl border border-white/10 bg-[#151620] p-4 text-center">
            <div className={`text-2xl font-black tabular-nums ${data.overall.winRate >= 50 ? "text-emerald-400" : "text-red-400"}`}>
              {data.overall.winRate}%
            </div>
            <div className="text-[10px] text-white/30 uppercase tracking-wider mt-1">Win Rate</div>
            <div className="text-xs text-white/40 mt-0.5">{data.overall.wins}W {data.overall.games - data.overall.wins}L</div>
          </div>
          <div className="rounded-xl border border-white/10 bg-[#151620] p-4 text-center">
            <div className={`text-2xl font-black tabular-nums ${data.overall.avgKda >= 3 ? "text-emerald-400" : data.overall.avgKda >= 2 ? "text-white/90" : "text-red-400"}`}>
              {data.overall.avgKda}
            </div>
            <div className="text-[10px] text-white/30 uppercase tracking-wider mt-1">KDA</div>
            <div className="text-xs text-white/40 mt-0.5">{data.overall.avgKills}/{data.overall.avgDeaths}/{data.overall.avgAssists}</div>
          </div>
          <div className="rounded-xl border border-white/10 bg-[#151620] p-4 text-center">
            <div className="text-2xl font-black tabular-nums text-amber-400">{data.bestWinStreak}</div>
            <div className="text-[10px] text-white/30 uppercase tracking-wider mt-1">Best Streak</div>
            <div className="text-xs text-white/40 mt-0.5">wins in a row</div>
          </div>
          <div className="rounded-xl border border-white/10 bg-[#151620] p-4 text-center">
            {data.currentWinStreak > 0 ? (
              <>
                <div className="text-2xl font-black tabular-nums text-emerald-400">{data.currentWinStreak} 🔥</div>
                <div className="text-[10px] text-white/30 uppercase tracking-wider mt-1">Current Streak</div>
                <div className="text-xs text-emerald-400/60 mt-0.5">on fire</div>
              </>
            ) : (
              <>
                <div className="text-2xl font-black tabular-nums text-white/50">{data.trend === "improving" ? "📈" : data.trend === "declining" ? "📉" : "➡️"}</div>
                <div className="text-[10px] text-white/30 uppercase tracking-wider mt-1">Trend</div>
                <div className={`text-xs mt-0.5 capitalize ${data.trend === "improving" ? "text-emerald-400" : data.trend === "declining" ? "text-red-400" : "text-amber-400"}`}>
                  {data.trend}
                </div>
              </>
            )}
          </div>
        </div>

        {/* === One Thing Callout === */}
        <div className="rounded-xl border border-indigo-500/20 bg-gradient-to-r from-indigo-500/10 to-purple-500/10 p-5 mb-8">
          <div className="flex items-start gap-3">
            <span className="text-2xl">🎯</span>
            <div>
              <h3 className="text-sm font-bold text-white/90 mb-1">Your #1 Focus to Climb</h3>
              <p className="text-sm text-white/70">
                Hit <span className="font-bold text-indigo-300">{data.oneThingCallout.target}{data.oneThingCallout.stat === "winRate" || data.oneThingCallout.stat === "damageShare" ? "%" : ""} {data.comparisons.find(c => c.stat === data.oneThingCallout.stat)?.label}</span> and
                you&apos;re playing at a <span className={`font-bold ${TIER_COLORS[data.oneThingCallout.targetRank.toUpperCase()] ?? "text-white"}`}>{data.oneThingCallout.targetRank}</span> level.
                You&apos;re currently at {data.oneThingCallout.current}{data.oneThingCallout.stat === "winRate" || data.oneThingCallout.stat === "damageShare" ? "%" : ""}.
              </p>
              <p className="text-xs text-white/40 mt-2">💡 {data.oneThingCallout.tip}</p>
            </div>
          </div>
        </div>

        {/* === Win Conditions === */}
        {data.winConditions.length > 0 && (
          <div className="rounded-xl border border-white/10 bg-[#151620] p-5 mb-8">
            <h3 className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-3">Your Win Conditions</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {data.winConditions.map((wc) => (
                <div key={wc.description} className="rounded-lg bg-white/[0.03] border border-white/5 p-3">
                  <div className={`text-xl font-black tabular-nums ${wc.winRate >= 60 ? "text-emerald-400" : wc.winRate >= 50 ? "text-white/80" : "text-red-400"}`}>
                    {wc.winRate}%
                  </div>
                  <div className="text-xs text-white/60 mt-1">{wc.description}</div>
                  <div className="text-[10px] text-white/25 mt-0.5">{wc.games} games</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* === Personal Bests === */}
        {data.personalBests.length > 0 && (
          <div className="rounded-xl border border-white/10 bg-[#151620] p-5 mb-8">
            <h3 className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-3">🏆 Personal Bests</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {data.personalBests.map((pb) => (
                <div key={pb.label} className="rounded-lg bg-white/[0.03] border border-white/5 p-3">
                  <div className="text-[10px] text-white/30 uppercase tracking-wider">{pb.label}</div>
                  <div className="text-lg font-bold text-amber-400 mt-1">{pb.value}</div>
                  <div className="text-xs text-white/40 mt-0.5">{pb.detail}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* === Stats Benchmark Table === */}
        <div className="rounded-xl border border-white/10 bg-[#151620] overflow-hidden mb-8">
          <div className="px-5 py-4 border-b border-white/10">
            <h2 className="text-sm font-semibold text-white/80 uppercase tracking-wider">Stats vs {data.benchmarkTier.charAt(0) + data.benchmarkTier.slice(1).toLowerCase()} Benchmark</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/5 text-xs text-white/40 uppercase tracking-wider">
                  <th className="text-left px-5 py-3 font-semibold">Stat</th>
                  <th className="text-center px-4 py-3 font-semibold">You</th>
                  <th className="text-center px-4 py-3 font-semibold">Benchmark</th>
                  <th className="text-center px-4 py-3 font-semibold">Percentile</th>
                  <th className="text-center px-4 py-3 font-semibold w-12"></th>
                </tr>
              </thead>
              <tbody>
                {data.comparisons.map((c) => (
                  <tr key={c.stat} className="border-b border-white/5 hover:bg-white/[0.02]">
                    <td className="px-5 py-3 font-medium text-white/80">{c.label}</td>
                    <td className="text-center px-4 py-3 font-bold tabular-nums text-white/90">
                      {c.playerValue}{c.stat === "winRate" || c.stat === "damageShare" ? "%" : ""}
                    </td>
                    <td className="text-center px-4 py-3 text-white/40 tabular-nums">
                      {c.benchmark}{c.stat === "winRate" || c.stat === "damageShare" ? "%" : ""}
                    </td>
                    <td className="text-center px-4 py-3">
                      <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-bold ${c.percentile >= 60 ? "bg-emerald-500/15 text-emerald-400" : c.percentile >= 40 ? "bg-amber-500/15 text-amber-400" : "bg-red-500/15 text-red-400"}`}>
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

        {/* === Matchups === */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
          <div className="rounded-xl border border-white/10 bg-[#151620] p-5">
            <h3 className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-3">Best Matchups</h3>
            {data.bestMatchups.length === 0 && <p className="text-sm text-white/30">Not enough data</p>}
            <div className="space-y-2">
              {data.bestMatchups.map((m) => (
                <div key={m.opponentChampion} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <img src={getChampionSquareUrl(m.opponentChampion)} alt={m.opponentChampion} className="h-7 w-7 rounded" />
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
            <h3 className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-3">Worst Matchups</h3>
            {data.worstMatchups.length === 0 && <p className="text-sm text-white/30">Not enough data</p>}
            <div className="space-y-2">
              {data.worstMatchups.map((m) => (
                <div key={m.opponentChampion} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <img src={getChampionSquareUrl(m.opponentChampion)} alt={m.opponentChampion} className="h-7 w-7 rounded" />
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

        {/* === Rank-Up Roadmap === */}
        {tierComps.length > 0 && (
          <div className="rounded-xl border border-white/10 bg-[#151620] overflow-hidden mb-8">
            <div className="px-5 py-4 border-b border-white/10">
              <h2 className="text-sm font-semibold text-white/80 uppercase tracking-wider">Rank-Up Roadmap</h2>
              <p className="text-xs text-white/30 mt-1">What each rank looks like — green checkmarks mean you already meet that target</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/5 text-xs text-white/40 uppercase tracking-wider">
                    <th className="text-left px-5 py-3 font-semibold">Stat</th>
                    <th className="text-center px-3 py-3 font-semibold">
                      <span className={TIER_COLORS[data.tier.toUpperCase()] ?? "text-white/60"}>
                        You
                      </span>
                    </th>
                    {tierComps.map((tc) => {
                      const label = tc.tier === "GRANDMASTER" ? "GM" : tc.tier === "CHALLENGER" ? "Chall" : tc.tier === "MASTER" ? "Master" : tc.tier.charAt(0) + tc.tier.slice(1).toLowerCase();
                      return (
                        <th key={tc.tier} className="text-center px-3 py-3 font-semibold">
                          <span className={TIER_COLORS[tc.tier.toUpperCase()] ?? "text-white/60"}>{label}</span>
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {[
                    { label: "KDA", key: "kda" as const, yours: data.overall.avgKda },
                    { label: "CS / min", key: "csPerMin" as const, yours: data.overall.avgCsPerMin },
                    { label: "Vision", key: "visionScore" as const, yours: data.overall.avgVisionScore },
                    { label: "Dmg %", key: "damageShare" as const, yours: data.overall.avgDamageShare, pct: true },
                    { label: "Win Rate", key: "winRate" as const, yours: data.overall.winRate, pct: true },
                  ].map((row) => (
                    <tr key={row.key} className="border-b border-white/5">
                      <td className="px-5 py-3 font-medium text-white/70">{row.label}</td>
                      <td className="text-center px-3 py-3 font-bold tabular-nums text-white/90">{row.yours}{row.pct ? "%" : ""}</td>
                      {tierComps.map((tc) => {
                        const target = tc[row.key]; const met = row.yours >= target;
                        return (
                          <td key={tc.tier} className="text-center px-3 py-3">
                            <div className="text-xs text-white/40 tabular-nums">{target}{row.pct ? "%" : ""}</div>
                            <div className={`text-[11px] font-bold ${met ? "text-emerald-400" : "text-red-400"}`}>
                              {met ? "✓" : (row.yours - target).toFixed(1)}{!met && (row.pct ? "%" : "")}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* === AI Coach === */}
        <div className="rounded-xl border border-white/10 bg-[#151620] overflow-hidden mb-8">
          <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold text-white/80 uppercase tracking-wider">AI Coach</h2>
              <span className="rounded bg-indigo-500/15 border border-indigo-500/30 px-2 py-0.5 text-[10px] font-semibold text-indigo-400 uppercase tracking-wide">AI</span>
            </div>
            <button type="button" onClick={refreshAI} disabled={aiLoading} className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/50 hover:text-white hover:bg-white/10 transition disabled:opacity-50">
              {aiLoading ? "Generating..." : "Refresh"}
            </button>
          </div>
          <div className="p-5">
            {aiLoading && !aiText && (
              <div className="flex items-center gap-3 py-8 justify-center">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/20 border-t-indigo-400" />
                <span className="text-sm text-white/40">Generating personalized coaching...</span>
              </div>
            )}
            {aiText && (
              <div className="prose prose-invert prose-sm max-w-none">
                {aiText.split("\n\n").map((paragraph, i) => (
                  <p key={i} className="text-sm text-white/70 leading-relaxed mb-4 last:mb-0">{paragraph}</p>
                ))}
              </div>
            )}
            {aiGeneratedAt && <p className="mt-4 text-[11px] text-white/25">Last updated: {new Date(aiGeneratedAt).toLocaleString()}</p>}
          </div>
        </div>

        {error && <div className="rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-400 mb-4">{error}</div>}

        <div className="text-center pt-4">
          <Link href={`/summoner?riotId=${encodeURIComponent(riotId)}&region=${region}`} className="text-sm text-white/40 hover:text-white transition">
            ← Back to {summonerName}&apos;s profile
          </Link>
        </div>
      </div>
    </main>
  );
}
