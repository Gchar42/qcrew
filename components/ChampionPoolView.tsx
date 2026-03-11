"use client";

import Link from "next/link";
import { getChampionSquareUrl, getChampionSplashUrl } from "@/lib/riotAssets";

type ChampionStatRow = {
  championId: number;
  championName: string;
  games: number;
  wins: number;
  winRate: number;
  kills: number;
  deaths: number;
  assists: number;
  kda: number;
  avgKills: number;
  avgDeaths: number;
  avgAssists: number;
};

const TIER_COLORS: Record<string, string> = {
  CHALLENGER: "border-amber-500/40",
  GRANDMASTER: "border-red-500/40",
  MASTER: "border-purple-500/40",
  DIAMOND: "border-cyan-500/40",
  EMERALD: "border-emerald-500/40",
  PLATINUM: "border-teal-500/40",
  GOLD: "border-yellow-500/40",
  SILVER: "border-zinc-400/40",
  BRONZE: "border-orange-500/40",
  IRON: "border-stone-500/40",
};

function wrColor(wr: number): string {
  if (wr >= 60) return "text-emerald-400";
  if (wr >= 50) return "text-white/80";
  return "text-red-400";
}

function kdaColor(kda: number): string {
  if (kda >= 4) return "text-amber-400";
  if (kda >= 3) return "text-emerald-400";
  if (kda >= 2) return "text-white/80";
  return "text-red-400";
}

export default function ChampionPoolView({
  champions,
  riotId,
  region,
  tier,
  ddragonVersion,
}: {
  champions: ChampionStatRow[];
  riotId: string;
  region: string;
  tier: string;
  ddragonVersion: string | null;
}) {
  const top5 = champions.slice(0, 6);
  const rest = champions.slice(6);
  const borderClass = TIER_COLORS[tier?.toUpperCase()] ?? "border-white/10";

  return (
    <div className="px-4 py-6 sm:px-8 max-w-5xl mx-auto w-full">
      <div className="mb-6">
        <h2 className="text-lg font-bold text-white/90">Champion Pool</h2>
        <p className="text-sm text-white/40 mt-1">
          Your top champions this season — click any for a deep AI-powered analysis
        </p>
      </div>

      {top5.length === 0 ? (
        <div className="rounded-xl border border-white/10 bg-[#151620] p-12 text-center">
          <p className="text-white/40">No champion data yet. Play some ranked games or click Refresh on your profile.</p>
        </div>
      ) : (
        <>
          {/* Top 5 champion cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
            {top5.map((champ, i) => {
              const analysisUrl = `/profile/${encodeURIComponent(riotId)}/champion/${encodeURIComponent(champ.championName)}`;
              return (
                <Link
                  key={champ.championId}
                  href={analysisUrl}
                  className={`group relative rounded-xl border ${i === 0 ? borderClass : "border-white/10"} bg-[#151620] overflow-hidden hover:border-white/20 transition-all hover:shadow-lg`}
                >
                  {/* Splash background */}
                  <div className="relative h-28 overflow-hidden">
                    <div
                      className="absolute inset-0 bg-cover bg-[center_20%] brightness-[0.35] group-hover:brightness-[0.45] transition-all scale-105"
                      style={{ backgroundImage: `url(${getChampionSplashUrl(champ.championName)})` }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#151620] via-transparent to-transparent" />
                    <div className="absolute bottom-3 left-3 flex items-center gap-3 z-10">
                      <img
                        src={getChampionSquareUrl(champ.championName, ddragonVersion)}
                        alt={champ.championName}
                        className="h-10 w-10 rounded-lg border border-white/20 shadow"
                      />
                      <div>
                        <div className="text-sm font-bold text-white drop-shadow">
                          {champ.championName}
                        </div>
                        <div className="text-[11px] text-white/50">
                          {champ.games} games
                        </div>
                      </div>
                    </div>
                    {i === 0 && (
                      <div className="absolute top-2 right-2 rounded bg-amber-500/20 border border-amber-500/30 px-2 py-0.5 text-[10px] font-bold text-amber-400 uppercase z-10">
                        Main
                      </div>
                    )}
                  </div>

                  {/* Stats */}
                  <div className="p-4">
                    <div className="grid grid-cols-3 gap-3 text-center">
                      <div>
                        <div className={`text-lg font-bold tabular-nums ${wrColor(champ.winRate)}`}>
                          {champ.winRate}%
                        </div>
                        <div className="text-[10px] text-white/30 uppercase tracking-wider">Win Rate</div>
                      </div>
                      <div>
                        <div className={`text-lg font-bold tabular-nums ${kdaColor(champ.kda)}`}>
                          {champ.kda.toFixed(2)}
                        </div>
                        <div className="text-[10px] text-white/30 uppercase tracking-wider">KDA</div>
                      </div>
                      <div>
                        <div className="text-lg font-bold tabular-nums text-white/80">
                          {champ.wins}W {champ.games - champ.wins}L
                        </div>
                        <div className="text-[10px] text-white/30 uppercase tracking-wider">Record</div>
                      </div>
                    </div>
                    <div className="mt-3 text-xs text-white/30 text-center">
                      {champ.avgKills.toFixed(1)} / {champ.avgDeaths.toFixed(1)} / {champ.avgAssists.toFixed(1)}
                    </div>
                    <div className="mt-3 flex items-center justify-center gap-1 text-xs text-indigo-400 opacity-0 group-hover:opacity-100 transition">
                      <span>View AI Analysis</span>
                      <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>

          {/* Rest of champions table */}
          {rest.length > 0 && (
            <div className="rounded-xl border border-white/10 bg-[#151620] overflow-hidden">
              <div className="px-5 py-3 border-b border-white/10">
                <h3 className="text-xs font-semibold text-white/40 uppercase tracking-wider">
                  Other Champions
                </h3>
              </div>
              <div className="divide-y divide-white/5">
                {rest.map((champ) => (
                  <div
                    key={champ.championId}
                    className="grid grid-cols-[40px_1fr_80px_80px_100px] gap-3 px-5 py-3 items-center"
                  >
                    <img
                      src={getChampionSquareUrl(champ.championName, ddragonVersion)}
                      alt={champ.championName}
                      className="h-8 w-8 rounded"
                    />
                    <div className="text-sm font-medium text-white/80 truncate">
                      {champ.championName}
                    </div>
                    <div className={`text-sm font-semibold text-center tabular-nums ${wrColor(champ.winRate)}`}>
                      {champ.winRate}%
                    </div>
                    <div className={`text-sm text-center tabular-nums ${kdaColor(champ.kda)}`}>
                      {champ.kda.toFixed(2)}
                    </div>
                    <div className="text-sm text-white/40 text-center tabular-nums">
                      {champ.games} games
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
