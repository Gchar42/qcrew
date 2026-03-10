"use client";

import { Suspense, useEffect, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

type PlayerData = {
  riot_id: string;
  region: string;
  tier: string | null;
  rank: string | null;
  league_points: number;
  wins: number;
  losses: number;
  profile_icon_id: number | null;
  last_updated: string;
};

type GroupResponse = {
  players: PlayerData[];
  stats: {
    totalGames: number;
    mostGamesPlayer: string | null;
    highestLPPlayer: string | null;
    playerCount: number;
  };
};

function tierLabel(tier: string | null, rank: string | null) {
  if (!tier) return "Unranked";
  const t = tier.toUpperCase();
  if (t === "GRANDMASTER") return "GM";
  if (t === "CHALLENGER") return "Challenger";
  if (t === "MASTER") return "Master";
  const base = t.charAt(0) + t.slice(1).toLowerCase();
  return rank ? `${base} ${rank}` : base;
}

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

function winRate(w: number, l: number) {
  const total = w + l;
  return total > 0 ? Math.round((w / total) * 100) : 0;
}

export default function GroupPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-[#0E0F15] text-[#E8E9F0] flex items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-[#5865F2]" />
        </main>
      }
    >
      <GroupPageInner />
    </Suspense>
  );
}

function GroupPageInner() {
  const searchParams = useSearchParams();
  const playersParam = searchParams.get("p") ?? "";
  const region = searchParams.get("region") ?? "na1";
  const [data, setData] = useState<GroupResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  const fetchGroup = useCallback(async () => {
    if (!playersParam) { setLoading(false); return; }
    setLoading(true);
    try {
      const pairs = playersParam
        .split(",")
        .map((p) => `${encodeURIComponent(p.trim())}:${region}`)
        .join(",");
      const res = await fetch(`/api/social/group?players=${pairs}`);
      if (res.ok) {
        setData((await res.json()) as GroupResponse);
      }
    } catch { /* ignore */ }
    setLoading(false);
  }, [playersParam, region]);

  useEffect(() => { fetchGroup(); }, [fetchGroup]);

  const copyLink = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const players = playersParam.split(",").filter(Boolean);

  return (
    <main className="min-h-screen bg-[#0E0F15] text-[#E8E9F0] px-4 py-6 sm:px-8">
      <div className="mx-auto max-w-4xl">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Group Leaderboard</h1>
            <p className="mt-1 text-sm text-white/50">
              {players.length} player{players.length !== 1 ? "s" : ""} in this group
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={copyLink}
              className="rounded-lg border border-white/10 bg-[#151620] px-4 py-2 text-sm font-medium text-white/70 hover:text-white transition"
            >
              {copied ? "Copied!" : "Copy Group Link"}
            </button>
            <Link href="/" className="text-sm text-white/70 hover:text-white transition">
              Home
            </Link>
          </div>
        </div>

        {!playersParam && (
          <div className="rounded-xl border border-white/10 bg-[#151620] p-8 text-center">
            <p className="text-white/50 mb-3">
              Create a group by adding player names to the URL:
            </p>
            <code className="text-sm text-indigo-400 bg-black/30 px-3 py-1.5 rounded">
              /group?p=Player1%23Tag1,Player2%23Tag2&region=na1
            </code>
          </div>
        )}

        {loading && playersParam && (
          <div className="flex items-center justify-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-[#5865F2]" />
          </div>
        )}

        {!loading && data && (
          <>
            {/* Stats bar */}
            {data.stats.totalGames > 0 && (
              <div className="mb-5 grid grid-cols-2 sm:grid-cols-3 gap-3">
                {data.stats.highestLPPlayer && (
                  <div className="rounded-lg border border-white/10 bg-[#151620] p-3">
                    <div className="text-[11px] text-white/40 uppercase tracking-wider">Highest Rank</div>
                    <div className="mt-1 text-sm font-semibold text-amber-400 truncate">
                      {data.stats.highestLPPlayer}
                    </div>
                  </div>
                )}
                {data.stats.mostGamesPlayer && (
                  <div className="rounded-lg border border-white/10 bg-[#151620] p-3">
                    <div className="text-[11px] text-white/40 uppercase tracking-wider">Most Games</div>
                    <div className="mt-1 text-sm font-semibold text-emerald-400 truncate">
                      {data.stats.mostGamesPlayer}
                    </div>
                  </div>
                )}
                <div className="rounded-lg border border-white/10 bg-[#151620] p-3">
                  <div className="text-[11px] text-white/40 uppercase tracking-wider">Total Games</div>
                  <div className="mt-1 text-sm font-semibold">{data.stats.totalGames.toLocaleString()}</div>
                </div>
              </div>
            )}

            {/* Player table */}
            <div className="rounded-xl border border-white/10 bg-[#151620] overflow-hidden">
              <div className="grid grid-cols-[40px_1fr_100px_72px_80px_80px] gap-2 px-4 py-3 border-b border-white/10 text-xs font-semibold text-white/40 uppercase tracking-wider">
                <div>#</div>
                <div>Player</div>
                <div className="text-center">Rank</div>
                <div className="text-center">LP</div>
                <div className="text-center">Win Rate</div>
                <div className="text-center">Games</div>
              </div>
              {data.players.length === 0 && (
                <div className="py-12 text-center text-sm text-white/40">
                  No cached data for these players yet. Visit their profiles first to populate the cache.
                </div>
              )}
              {data.players.map((p, i) => {
                const wr = winRate(p.wins, p.losses);
                const color = TIER_COLORS[p.tier?.toUpperCase() ?? ""] ?? "text-white/50";
                return (
                  <div
                    key={p.riot_id}
                    className="grid grid-cols-[40px_1fr_100px_72px_80px_80px] gap-2 px-4 py-2.5 border-b border-white/5 items-center hover:bg-white/[0.02] transition"
                  >
                    <div className="text-sm text-white/50">{i + 1}</div>
                    <div className="min-w-0">
                      <Link
                        href={`/summoner?riotId=${encodeURIComponent(p.riot_id)}&region=${p.region}`}
                        className="text-sm font-medium text-white/90 hover:text-white truncate block"
                      >
                        {p.riot_id}
                      </Link>
                    </div>
                    <div className={`text-center text-sm font-medium ${color}`}>
                      {tierLabel(p.tier, p.rank)}
                    </div>
                    <div className="text-center text-sm font-semibold tabular-nums">
                      {p.league_points}
                    </div>
                    <div className={`text-center text-sm font-semibold tabular-nums ${wr >= 50 ? "text-emerald-400" : "text-red-400"}`}>
                      {wr}%
                    </div>
                    <div className="text-center text-sm text-white/50 tabular-nums">
                      {(p.wins + p.losses).toLocaleString()}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </main>
  );
}
