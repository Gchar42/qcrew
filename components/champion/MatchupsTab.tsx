"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { getChampionSquareUrl } from "@/lib/riotAssets";

export type MatchupEntry = {
  name: string;
  winRate: number;
  games: number;
  trendThisPatch?: string;
  tips: string[];
  laningTip?: string;
  powerSpike?: string;
  itemRecommendations?: string;
  difficulty?: "easy" | "medium" | "hard";
};

/** Sample matchup data for Ahri mid (champion:matchups:{championId}:{patch}:{tier}:{role}) */
const SAMPLE_MATCHUPS_AHRI_MID: MatchupEntry[] = [
  { name: "Mel", winRate: 47.2, games: 3299, trendThisPatch: "-1.2%", tips: ["Respect their level 2 all-in. Play safe until 6."], difficulty: "hard" },
  { name: "Veigar", winRate: 48.0, games: 1961, trendThisPatch: "+0.3%", tips: ["Dodge his cage. Use R to escape or engage."], difficulty: "hard" },
  { name: "Annie", winRate: 48.3, games: 1250, tips: ["Respect her flash Tibbers. Track her stun stacks."], difficulty: "hard" },
  { name: "Vex", winRate: 48.8, games: 1142, tips: ["Avoid her fear. Charm when her passive is down."], difficulty: "hard" },
  { name: "Katarina", winRate: 49.2, games: 2507, tips: ["Interrupt her R with Charm. Save E for her daggers."], difficulty: "medium" },
  { name: "Zed", winRate: 49.5, games: 4200, trendThisPatch: "-0.5%", tips: ["Rush Zhonya's. Charm when he ults."], laningTip: "Farm safely, avoid his WEQ combo.", powerSpike: "Post-6 with Zhonya", itemRecommendations: "Zhonya's Hourglass, Seeker's Armguard", difficulty: "medium" },
  { name: "Yasuo", winRate: 51.2, games: 3800, tips: ["Bait his windwall. Use Q through minions."] },
  { name: "Lux", winRate: 52.1, games: 2100, tips: ["Dodge her bind. All-in when her Q is down."] },
  { name: "Ziggs", winRate: 52.8, games: 1800, tips: ["You outscale. Trade short early, win late."] },
  { name: "Syndra", winRate: 53.2, games: 2400, tips: ["You outscale after Luden's. Trade short early, win late."] },
  { name: "Orianna", winRate: 53.5, games: 1950, tips: ["Dodge her ball. Charm when she ults."] },
  { name: "Viktor", winRate: 54.1, games: 2200, trendThisPatch: "+0.8%", tips: ["You outscale. Avoid his E poke early."], laningTip: "Farm and scale", powerSpike: "Post-Luden's", itemRecommendations: "Void Staff vs his upgrades" },
  { name: "Twisted Fate", winRate: 54.8, games: 1650, tips: ["Push and roam. Punish his ult cooldown."] },
  { name: "Malzahar", winRate: 55.2, games: 1890, tips: ["QSS second item. Push him in and roam."], laningTip: "Clear voidlings, avoid his silence", powerSpike: "Post-QSS", itemRecommendations: "Quicksilver Sash, Mercury's Treads" },
  { name: "Aurelion Sol", winRate: 55.8, games: 1450, tips: ["You outscale. Dodge his Q, all-in when he's vulnerable."] },
  { name: "Corki", winRate: 56.2, games: 890, tips: ["You outrange him. Poke with Q, all-in when low."] },
  { name: "Azir", winRate: 56.5, games: 2100, tips: ["Respect his shuffle. Charm when he ults."] },
  { name: "Ryze", winRate: 57.1, games: 1200, tips: ["You outscale. Avoid his root, win late."] },
  { name: "Kassadin", winRate: 57.8, games: 1850, tips: ["Bully early. End before he scales."], laningTip: "Poke with Q, deny farm", powerSpike: "Pre-6 dominance", itemRecommendations: "Early magic pen" },
  { name: "LeBlanc", winRate: 58.2, games: 1650, tips: ["Charm her W return. Save E for her distortion."] },
];

function getDifficultyBadge(difficulty?: string) {
  if (!difficulty) return null;
  if (difficulty === "hard") return <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-red-500/20 text-red-400">Hard Counter</span>;
  if (difficulty === "medium") return <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400">Slight Counter</span>;
  return null;
}

export default function MatchupsTab({
  championId,
  championName,
  role,
  patch = "16.5",
}: {
  championId: string;
  championName: string;
  role: string;
  patch?: string;
}) {
  const [showFullTable, setShowFullTable] = useState(false);
  const [sortBy, setSortBy] = useState<"wr" | "games">("wr");
  const [search, setSearch] = useState("");
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  const matchups = useMemo(() => {
    const data = championId.toLowerCase() === "ahri" && role === "mid" ? SAMPLE_MATCHUPS_AHRI_MID : [];
    return data.filter((m) => m.games >= 200);
  }, [championId, role]);

  const hardestCounters = useMemo(() => matchups.filter((m) => m.winRate < 50).sort((a, b) => a.winRate - b.winRate).slice(0, 5), [matchups]);
  const bestInto = useMemo(() => matchups.filter((m) => m.winRate >= 50).sort((a, b) => b.winRate - a.winRate).slice(0, 5), [matchups]);

  const fullTableData = useMemo(() => {
    let list = [...matchups];
    const q = search.toLowerCase().trim();
    if (q) list = list.filter((m) => m.name.toLowerCase().includes(q));
    if (sortBy === "wr") list.sort((a, b) => a.winRate - b.winRate);
    else list.sort((a, b) => b.games - a.games);
    return list;
  }, [matchups, search, sortBy]);

  if (!matchups.length) {
    return (
      <div className="text-center py-16">
        <p className="text-zinc-400">No matchup data available yet</p>
        <p className="text-zinc-600 text-sm mt-1">Matchup data for {championName} {role} will appear here.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Hardest Counters */}
      <div className="glass rounded-2xl p-5 border border-white/5">
        <h3 className="text-sm font-bold text-zinc-300 uppercase tracking-wider mb-4">Hardest Counters</h3>
        <div className="flex flex-col gap-3">
          {hardestCounters.map((m) => (
            <div key={m.name} className="flex items-center gap-4 p-3 rounded-xl bg-white/[0.02] border border-white/5">
              <img src={getChampionSquareUrl(m.name)} alt={m.name} className="w-10 h-10 rounded-lg border border-white/10" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-zinc-200">{m.name}</span>
                  {getDifficultyBadge(m.difficulty)}
                </div>
                <p className="text-xs text-zinc-500 mt-0.5">{m.tips[0] ?? "—"}</p>
              </div>
              <div className="text-right shrink-0">
                <span className="text-sm font-bold text-red-400">{m.winRate.toFixed(1)}% WR</span>
                <p className="text-[10px] text-zinc-500">{m.games.toLocaleString()} games</p>
              </div>
              <Link href={`/champions/${encodeURIComponent(m.name)}`} className="text-[10px] text-indigo-400 hover:text-indigo-300 shrink-0">
                View build →
              </Link>
            </div>
          ))}
        </div>
      </div>

      {/* Best Into */}
      <div className="glass rounded-2xl p-5 border border-white/5">
        <h3 className="text-sm font-bold text-zinc-300 uppercase tracking-wider mb-4">Best Into</h3>
        <div className="flex flex-col gap-3">
          {bestInto.map((m) => (
            <div key={m.name} className="flex items-center gap-4 p-3 rounded-xl bg-white/[0.02] border border-white/5">
              <img src={getChampionSquareUrl(m.name)} alt={m.name} className="w-10 h-10 rounded-lg border border-white/10" />
              <div className="flex-1 min-w-0">
                <span className="font-medium text-zinc-200">{m.name}</span>
                <p className="text-xs text-zinc-500 mt-0.5">{m.tips[0] ?? "—"}</p>
              </div>
              <div className="text-right shrink-0">
                <span className="text-sm font-bold text-emerald-400">{m.winRate.toFixed(1)}% WR</span>
                <p className="text-[10px] text-zinc-500">{m.games.toLocaleString()} games</p>
              </div>
              <Link href={`/champions/${encodeURIComponent(m.name)}`} className="text-[10px] text-indigo-400 hover:text-indigo-300 shrink-0">
                View build →
              </Link>
            </div>
          ))}
        </div>
      </div>

      {/* Full Matchup Table (expandable) */}
      <div className="glass rounded-2xl p-5 border border-white/5">
        <button
          onClick={() => setShowFullTable(!showFullTable)}
          className="flex items-center gap-2 text-sm font-medium text-zinc-400 hover:text-white transition-colors"
        >
          <svg className={`w-4 h-4 transition-transform ${showFullTable ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
          Full Matchup Table ({fullTableData.length} matchups, 200+ games)
        </button>

        {showFullTable && (
          <div className="mt-4 space-y-4">
            <div className="flex items-center gap-3 flex-wrap">
              <input
                type="text"
                placeholder="Search champion..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-white placeholder-zinc-500 w-48"
              />
              <div className="flex gap-1">
                <button
                  onClick={() => setSortBy("wr")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium ${sortBy === "wr" ? "bg-indigo-500/20 text-indigo-400" : "text-zinc-500 hover:text-zinc-300"}`}
                >
                  Sort by WR
                </button>
                <button
                  onClick={() => setSortBy("games")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium ${sortBy === "games" ? "bg-indigo-500/20 text-indigo-400" : "text-zinc-500 hover:text-zinc-300"}`}
                >
                  Sort by Games
                </button>
              </div>
            </div>

            <div className="overflow-x-auto -mx-1">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-zinc-500 text-xs uppercase tracking-wider border-b border-white/5">
                    <th className="pb-2 pr-4">Champion</th>
                    <th className="pb-2 pr-4">Your WR</th>
                    <th className="pb-2 pr-4">Games</th>
                    <th className="pb-2">Trend</th>
                  </tr>
                </thead>
                <tbody>
                  {fullTableData.map((m) => {
                    const isExpanded = expandedRow === m.name;
                    return (
                      <React.Fragment key={m.name}>
                        <tr className="border-b border-white/5">
                          <td className="py-2 pr-4">
                            <button
                              onClick={() => setExpandedRow(isExpanded ? null : m.name)}
                              className="flex items-center gap-2 text-left group w-full"
                            >
                              <img src={getChampionSquareUrl(m.name)} alt={m.name} className="w-8 h-8 rounded border border-white/10" />
                              <span className="font-medium text-zinc-200 group-hover:text-white">{m.name}</span>
                              <svg className={`w-3.5 h-3.5 text-zinc-600 ${isExpanded ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                              </svg>
                            </button>
                          </td>
                          <td className="py-2 pr-4">
                            <span className={`font-semibold ${m.winRate < 50 ? "text-red-400" : "text-emerald-400"}`}>
                              {m.winRate.toFixed(1)}%
                            </span>
                          </td>
                          <td className="py-2 pr-4 text-zinc-500">{m.games.toLocaleString()}</td>
                          <td className="py-2">
                            {m.trendThisPatch ? (
                              <span className={`text-xs ${m.trendThisPatch.startsWith("+") ? "text-emerald-500" : "text-red-500"}`}>
                                {m.trendThisPatch}
                              </span>
                            ) : (
                              "—"
                            )}
                          </td>
                        </tr>
                        {isExpanded && (m.laningTip || m.powerSpike || m.itemRecommendations || m.tips?.length) && (
                          <tr>
                            <td colSpan={4} className="pb-2 pt-0">
                              <div className="ml-10 mr-2 p-3 rounded-xl bg-white/[0.02] border border-white/5 text-xs space-y-2">
                                {m.laningTip && <p><span className="text-indigo-400 font-semibold">Laning:</span> {m.laningTip}</p>}
                                {m.powerSpike && <p><span className="text-indigo-400 font-semibold">Power spike:</span> {m.powerSpike}</p>}
                                {m.itemRecommendations && <p><span className="text-indigo-400 font-semibold">Items vs:</span> {m.itemRecommendations}</p>}
                                {m.tips?.map((t, i) => <p key={i} className="text-zinc-400">{t}</p>)}
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
