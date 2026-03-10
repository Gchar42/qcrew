"use client";

import { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

type RivalryProfile = {
  riot_id: string;
  region: string;
  tier: string | null;
  rank: string | null;
  league_points: number;
  wins: number;
  losses: number;
};

type RivalryData = {
  insufficient: boolean;
  message?: string;
  gamesTogetherTotal?: number;
  sameTeam?: number;
  opposing?: number;
  partnerWins?: number;
  partnerLosses?: number;
  lastGameAt?: string;
  profileA?: RivalryProfile | null;
  profileB?: RivalryProfile | null;
};

function tierLabel(tier: string | null, rank: string | null) {
  if (!tier) return "Unranked";
  const t = tier.toUpperCase();
  if (t === "GRANDMASTER") return "Grandmaster";
  if (t === "CHALLENGER") return "Challenger";
  if (t === "MASTER") return "Master";
  const base = t.charAt(0) + t.slice(1).toLowerCase();
  return rank ? `${base} ${rank}` : base;
}

function profileUrl(riotId: string, region: string) {
  return `/summoner?riotId=${encodeURIComponent(riotId)}&region=${region}`;
}

export default function RivalryClient({ slug }: { slug: string }) {
  const searchParams = useSearchParams();
  const region = searchParams.get("region") ?? "na1";
  const [data, setData] = useState<RivalryData | null>(null);
  const [loading, setLoading] = useState(true);

  const decoded = decodeURIComponent(slug);
  const parts = decoded.split("-vs-");
  const playerA = parts[0]?.trim() ?? "";
  const playerB = parts[1]?.trim() ?? "";

  const fetchRivalry = useCallback(async () => {
    if (!playerA || !playerB) { setLoading(false); return; }
    setLoading(true);
    try {
      const params = new URLSearchParams({
        playerA,
        regionA: region,
        playerB,
        regionB: region,
      });
      const res = await fetch(`/api/social/rivalry?${params}`);
      if (res.ok) setData((await res.json()) as RivalryData);
    } catch { /* ignore */ }
    setLoading(false);
  }, [playerA, playerB, region]);

  useEffect(() => { fetchRivalry(); }, [fetchRivalry]);

  return (
    <main className="min-h-screen bg-[#0E0F15] text-[#E8E9F0] px-4 py-6 sm:px-8">
      <div className="mx-auto max-w-3xl">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold tracking-tight">Rivalry</h1>
          <Link href="/" className="text-sm text-white/70 hover:text-white transition">Home</Link>
        </div>

        {/* VS header */}
        <div className="mb-6 flex items-center justify-center gap-6">
          <div className="text-center">
            <Link href={profileUrl(playerA, region)} className="text-lg font-bold text-white hover:text-indigo-400 transition">
              {playerA}
            </Link>
            {data?.profileA && (
              <div className="mt-1 text-sm text-white/50">
                {tierLabel(data.profileA.tier, data.profileA.rank)} · {data.profileA.league_points} LP
              </div>
            )}
          </div>
          <span className="text-2xl font-extrabold text-white/20">VS</span>
          <div className="text-center">
            <Link href={profileUrl(playerB, region)} className="text-lg font-bold text-white hover:text-indigo-400 transition">
              {playerB}
            </Link>
            {data?.profileB && (
              <div className="mt-1 text-sm text-white/50">
                {tierLabel(data.profileB.tier, data.profileB.rank)} · {data.profileB.league_points} LP
              </div>
            )}
          </div>
        </div>

        {loading && (
          <div className="flex items-center justify-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-[#5865F2]" />
          </div>
        )}

        {!loading && data?.insufficient && data.gamesTogetherTotal === undefined && (
          <div className="rounded-xl border border-white/10 bg-[#151620] p-8 text-center">
            <p className="text-white/50">Not enough shared games yet</p>
            <p className="mt-2 text-sm text-white/30">
              Both players need to appear in each other&apos;s match history for rivalry stats to populate.
            </p>
          </div>
        )}

        {!loading && data && (data.gamesTogetherTotal ?? 0) > 0 && (
          <div className="space-y-4">
            {data.insufficient && (
              <div className="rounded-lg border border-amber-400/20 bg-amber-400/5 px-4 py-2 text-sm text-amber-400">
                Only {data.gamesTogetherTotal} shared game{data.gamesTogetherTotal === 1 ? "" : "s"} found. Stats may not be representative yet.
              </div>
            )}

            <div className="grid grid-cols-3 gap-4">
              <div className="rounded-xl border border-white/10 bg-[#151620] p-5 text-center">
                <div className="text-3xl font-extrabold">{data.gamesTogetherTotal}</div>
                <div className="mt-1 text-xs text-white/40 uppercase tracking-wider">Games Together</div>
              </div>
              <div className="rounded-xl border border-white/10 bg-[#151620] p-5 text-center">
                <div className="text-3xl font-extrabold text-emerald-400">{data.sameTeam}</div>
                <div className="mt-1 text-xs text-white/40 uppercase tracking-wider">Same Team</div>
              </div>
              <div className="rounded-xl border border-white/10 bg-[#151620] p-5 text-center">
                <div className="text-3xl font-extrabold text-red-400">{data.opposing}</div>
                <div className="mt-1 text-xs text-white/40 uppercase tracking-wider">Opposing</div>
              </div>
            </div>

            {(data.sameTeam ?? 0) > 0 && (
              <div className="rounded-xl border border-white/10 bg-[#151620] p-5">
                <h3 className="text-sm font-semibold text-white/60 uppercase tracking-wider mb-3">
                  When On Same Team
                </h3>
                <div className="flex items-center justify-center gap-8">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-emerald-400">{data.partnerWins}</div>
                    <div className="text-xs text-white/40">Wins</div>
                  </div>
                  <div className="text-white/20 text-xl">-</div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-400">{data.partnerLosses}</div>
                    <div className="text-xs text-white/40">Losses</div>
                  </div>
                </div>
                {(data.partnerWins ?? 0) + (data.partnerLosses ?? 0) > 0 && (
                  <div className="mt-2 text-center text-sm text-white/50">
                    {Math.round(
                      ((data.partnerWins ?? 0) /
                        ((data.partnerWins ?? 0) + (data.partnerLosses ?? 0))) *
                        100
                    )}
                    % win rate together
                  </div>
                )}
              </div>
            )}

            {data.lastGameAt && (
              <div className="text-xs text-white/30 text-center">
                Last shared game: {new Date(data.lastGameAt).toLocaleDateString()}
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
