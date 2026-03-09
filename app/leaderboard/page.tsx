"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { REGIONS } from "@/lib/riot-regions";

type TierFilter = "all" | "challenger" | "grandmaster" | "master";
type QueueFilter = "solo" | "flex";

type LeaderboardEntry = {
  rank: number;
  summonerName: string;
  puuid: string;
  tier: string;
  leaguePoints: number;
  wins: number;
  losses: number;
  winRate: number;
  hotStreak: boolean;
  veteran: boolean;
  freshBlood: boolean;
};

type LeaderboardResponse = {
  entries: LeaderboardEntry[];
  total: number;
  page: number;
  pageSize: number;
  tierFilter: string;
  region: string;
  queue: string;
  source?: string;
};

const TIER_TABS: { key: TierFilter; label: string }[] = [
  { key: "all", label: "All Tiers" },
  { key: "challenger", label: "Challenger" },
  { key: "grandmaster", label: "Grandmaster" },
  { key: "master", label: "Master" },
];

const TIER_COLORS: Record<string, string> = {
  CHALLENGER: "text-amber-400",
  GRANDMASTER: "text-red-400",
  MASTER: "text-purple-400",
};

const TIER_BG: Record<string, string> = {
  CHALLENGER: "bg-amber-400/10 border-amber-400/30",
  GRANDMASTER: "bg-red-400/10 border-red-400/30",
  MASTER: "bg-purple-400/10 border-purple-400/30",
};

function tierBadge(tier: string) {
  const label =
    tier === "CHALLENGER" ? "C" : tier === "GRANDMASTER" ? "GM" : "M";
  const color = TIER_COLORS[tier] ?? "text-white/60";
  const bg = TIER_BG[tier] ?? "bg-white/5 border-white/10";
  return (
    <span
      className={`inline-flex items-center justify-center rounded px-1.5 py-0.5 text-[11px] font-bold border ${bg} ${color}`}
    >
      {label}
    </span>
  );
}

function winRateColor(wr: number): string {
  if (wr >= 60) return "text-emerald-400";
  if (wr >= 55) return "text-green-400";
  if (wr >= 50) return "text-white/80";
  return "text-red-400";
}

export default function LeaderboardPage() {
  const [region, setRegion] = useState("na1");
  const [tier, setTier] = useState<TierFilter>("all");
  const [queue, setQueue] = useState<QueueFilter>("solo");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<LeaderboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLeaderboard = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        region,
        tier,
        queue,
        page: String(page),
      });
      const res = await fetch(`/api/leaderboard?${params}`, {
        cache: "no-store",
      });
      if (!res.ok) throw new Error(`API error ${res.status}`);
      const json = (await res.json()) as LeaderboardResponse;
      setData(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load leaderboard");
    } finally {
      setLoading(false);
    }
  }, [region, tier, queue, page]);

  useEffect(() => {
    fetchLeaderboard();
  }, [fetchLeaderboard]);

  useEffect(() => {
    setPage(1);
  }, [region, tier, queue]);

  const totalPages = data ? Math.ceil(data.total / data.pageSize) : 0;
  const regionLabel =
    REGIONS.find((r) => r.value === region)?.label ?? region.toUpperCase();

  return (
    <main className="min-h-screen bg-[#0E0F15] text-[#E8E9F0] px-4 py-6 sm:px-8">
      <div className="mx-auto max-w-5xl">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Leaderboard</h1>
            <p className="mt-1 text-sm text-white/50">
              Top ranked players by region
            </p>
          </div>
          <Link
            href="/"
            className="text-sm text-white/70 hover:text-white transition"
          >
            Back to Home
          </Link>
        </div>

        {/* Controls */}
        <div className="mb-5 flex flex-wrap items-center gap-3">
          {/* Region selector */}
          <select
            value={region}
            onChange={(e) => setRegion(e.target.value)}
            className="rounded-lg border border-white/10 bg-[#151620] px-3 py-2 text-sm font-medium text-white/90 outline-none focus:border-[#5865F2] transition"
          >
            {REGIONS.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>

          {/* Tier tabs */}
          <div className="flex gap-1.5">
            {TIER_TABS.map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => setTier(t.key)}
                className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${
                  tier === t.key
                    ? "bg-[#5865F2] text-white"
                    : "bg-[#151620] text-white/60 hover:text-white border border-white/10"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Queue toggle */}
          <div className="ml-auto flex rounded-lg border border-white/10 overflow-hidden">
            <button
              type="button"
              onClick={() => setQueue("solo")}
              className={`px-3 py-2 text-sm font-medium transition ${
                queue === "solo"
                  ? "bg-[#5865F2] text-white"
                  : "bg-[#151620] text-white/60 hover:text-white"
              }`}
            >
              Solo/Duo
            </button>
            <button
              type="button"
              onClick={() => setQueue("flex")}
              className={`px-3 py-2 text-sm font-medium transition border-l border-white/10 ${
                queue === "flex"
                  ? "bg-[#5865F2] text-white"
                  : "bg-[#151620] text-white/60 hover:text-white"
              }`}
            >
              Flex
            </button>
          </div>
        </div>

        {/* Player count */}
        {data && !loading && (
          <div className="mb-3 flex items-center gap-3 text-xs text-white/40">
            <span>
              {data.total.toLocaleString()} players in{" "}
              {tier === "all"
                ? "Challenger + Grandmaster + Master"
                : tier.charAt(0).toUpperCase() + tier.slice(1)}{" "}
              ({regionLabel})
            </span>
            {data.source === "placeholder" && (
              <span className="rounded bg-amber-400/10 border border-amber-400/20 px-2 py-0.5 text-[10px] font-semibold text-amber-400 uppercase tracking-wide">
                Sample Data
              </span>
            )}
          </div>
        )}

        {/* Table */}
        <div className="rounded-xl border border-white/10 bg-[#151620] overflow-x-auto">
          <div className="min-w-[600px]">
          {/* Table header */}
          <div className="grid grid-cols-[48px_1fr_64px_72px_80px_64px_88px] gap-2 px-4 py-3 border-b border-white/10 text-xs font-semibold text-white/40 uppercase tracking-wider">
            <div>#</div>
            <div>Summoner</div>
            <div className="text-center">Tier</div>
            <div className="text-right">LP</div>
            <div className="text-center">Win Rate</div>
            <div className="text-center">Games</div>
            <div className="text-right">W / L</div>
          </div>

          {/* Loading state */}
          {loading && (
            <div className="flex items-center justify-center py-20">
              <div className="flex flex-col items-center gap-3">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-[#5865F2]" />
                <span className="text-sm text-white/40">
                  Loading leaderboard...
                </span>
              </div>
            </div>
          )}

          {/* Error state */}
          {!loading && error && (
            <div className="flex items-center justify-center py-20">
              <div className="text-center">
                <p className="text-sm text-red-400">{error}</p>
                <button
                  type="button"
                  onClick={fetchLeaderboard}
                  className="mt-3 text-sm text-[#5865F2] hover:text-[#7983F5] transition"
                >
                  Retry
                </button>
              </div>
            </div>
          )}

          {/* Empty state */}
          {!loading && !error && data?.entries.length === 0 && (
            <div className="flex items-center justify-center py-20">
              <p className="text-sm text-white/40">
                No players found for this region and tier.
              </p>
            </div>
          )}

          {/* Table rows */}
          {!loading &&
            !error &&
            data?.entries.map((entry) => {
              const displayName =
                entry.summonerName || `Summoner #${entry.rank}`;
              const [gameName, tagLine] = displayName.includes("#")
                ? displayName.split("#")
                : [displayName, ""];

              return (
                <div
                  key={`${entry.rank}-${entry.puuid || entry.summonerName}`}
                  className="grid grid-cols-[48px_1fr_64px_72px_80px_64px_88px] gap-2 px-4 py-2.5 border-b border-white/5 items-center hover:bg-white/[0.02] transition"
                >
                  {/* Rank */}
                  <div className="text-sm font-medium text-white/50">
                    {entry.rank}
                  </div>

                  {/* Summoner name */}
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="truncate text-sm font-medium text-white/90">
                      {gameName}
                    </span>
                    {tagLine && (
                      <span className="shrink-0 text-xs text-white/30">
                        #{tagLine}
                      </span>
                    )}
                    {entry.hotStreak && (
                      <span
                        className="shrink-0 text-[10px] font-bold text-orange-400"
                        title="On a hot streak"
                      >
                        HOT
                      </span>
                    )}
                    {entry.freshBlood && (
                      <span
                        className="shrink-0 text-[10px] font-bold text-green-400"
                        title="Recently promoted"
                      >
                        NEW
                      </span>
                    )}
                  </div>

                  {/* Tier badge */}
                  <div className="flex justify-center">{tierBadge(entry.tier)}</div>

                  {/* LP */}
                  <div className="text-right text-sm font-semibold tabular-nums">
                    {entry.leaguePoints.toLocaleString()}
                    <span className="text-white/30 ml-0.5 text-xs">LP</span>
                  </div>

                  {/* Win Rate */}
                  <div className="text-center">
                    <span
                      className={`text-sm font-semibold tabular-nums ${winRateColor(entry.winRate)}`}
                    >
                      {entry.winRate}%
                    </span>
                  </div>

                  {/* Games */}
                  <div className="text-center text-sm text-white/50 tabular-nums">
                    {(entry.wins + entry.losses).toLocaleString()}
                  </div>

                  {/* W/L */}
                  <div className="text-right text-sm tabular-nums">
                    <span className="text-green-400/80">{entry.wins}</span>
                    <span className="text-white/20 mx-0.5">/</span>
                    <span className="text-red-400/80">{entry.losses}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Pagination */}
        {!loading && totalPages > 1 && (
          <div className="mt-4 flex items-center justify-between">
            <div className="text-xs text-white/30">
              Page {page} of {totalPages} ({data?.total.toLocaleString()}{" "}
              players)
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="rounded-lg border border-white/10 bg-[#151620] px-3 py-1.5 text-sm font-medium text-white/60 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition"
              >
                Previous
              </button>

              {/* Page numbers */}
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum: number;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (page <= 3) {
                  pageNum = i + 1;
                } else if (page >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = page - 2 + i;
                }
                return (
                  <button
                    key={pageNum}
                    type="button"
                    onClick={() => setPage(pageNum)}
                    className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                      page === pageNum
                        ? "bg-[#5865F2] text-white"
                        : "border border-white/10 bg-[#151620] text-white/60 hover:text-white"
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}

              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="rounded-lg border border-white/10 bg-[#151620] px-3 py-1.5 text-sm font-medium text-white/60 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
