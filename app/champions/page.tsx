"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { getChampionSquareUrl } from "@/lib/riotAssets";

type StatCategory = { id: string; label: string; group: string };
type StatGroup = { id: string; label: string };

type ChampionEntry = {
  championName: string;
  value: number;
  displayValue: string;
  extra?: Record<string, string>;
  games: number;
  gamesFormatted: string;
  rank: number;
};

type StatsResponse = {
  stat: string;
  category: StatCategory;
  groups: StatGroup[];
  categories: StatCategory[];
  entries: ChampionEntry[];
  source: string;
  filters: { rank: string; region: string; period: string };
};

const GROUP_ICONS: Record<string, string> = {
  jungle: "🌿",
  combat: "⚔️",
  game: "🎮",
  lane: "🏰",
};

function ChampionsPageInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const activeStat = searchParams.get("stat") ?? "fullClearTime";

  const [data, setData] = useState<StatsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const fetchData = useCallback(async (stat: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/champion-stats-global?stat=${encodeURIComponent(stat)}`);
      if (res.ok) setData(await res.json());
    } catch { /* ok */ }
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(activeStat); }, [activeStat, fetchData]);

  const setStat = (statId: string) => {
    router.push(`/champions?stat=${statId}`, { scroll: false });
  };

  const filteredEntries = data?.entries.filter((e) =>
    !search || e.championName.toLowerCase().includes(search.toLowerCase())
  ) ?? [];

  const maxValue = filteredEntries.length > 0 ? Math.max(...filteredEntries.map((e) => e.value)) : 1;
  const minValue = filteredEntries.length > 0 ? Math.min(...filteredEntries.map((e) => e.value)) : 0;

  const isLowerBetter = activeStat === "fullClearTime" || activeStat === "deathsPerGame" || activeStat === "avgGameDuration";
  const barBase = isLowerBetter ? minValue : 0;
  const barMax = isLowerBetter ? maxValue : maxValue;

  return (
    <main className="min-h-screen bg-[#0E0F15] text-[#E8E9F0]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">Champion Statistics</h1>
          <p className="text-sm text-white/40 mt-1">Detailed champion analytics across all ranks and regions</p>
          {data?.source === "placeholder" && (
            <span className="inline-block mt-2 text-[10px] uppercase tracking-wider bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded">
              Sample Data
            </span>
          )}
        </div>

        <div className="flex gap-6">
          {/* Sidebar */}
          <aside className="hidden lg:block w-56 flex-shrink-0">
            <div className="sticky top-20 space-y-1">
              {data?.groups.map((group) => (
                <div key={group.id} className="mb-4">
                  <div className="text-[10px] font-bold text-white/30 uppercase tracking-widest px-3 py-2 flex items-center gap-1.5">
                    <span>{GROUP_ICONS[group.id] ?? ""}</span>
                    {group.label}
                  </div>
                  {data.categories
                    .filter((c) => c.group === group.id)
                    .map((cat) => (
                      <button
                        key={cat.id}
                        onClick={() => setStat(cat.id)}
                        className={`w-full text-left px-3 py-1.5 text-sm rounded-lg transition ${
                          activeStat === cat.id
                            ? "bg-[#5865F2]/15 text-[#7B8CFF] font-medium"
                            : "text-white/50 hover:text-white/80 hover:bg-white/5"
                        }`}
                      >
                        {cat.label}
                      </button>
                    ))}
                </div>
              ))}
            </div>
          </aside>

          {/* Main content */}
          <div className="flex-1 min-w-0">
            {/* Mobile category selector */}
            <div className="lg:hidden mb-4">
              <select
                value={activeStat}
                onChange={(e) => setStat(e.target.value)}
                className="w-full bg-[#151620] border border-white/10 rounded-lg px-3 py-2 text-sm text-white/80 focus:outline-none focus:border-[#5865F2]"
              >
                {data?.groups.map((group) => (
                  <optgroup key={group.id} label={group.label}>
                    {data.categories
                      .filter((c) => c.group === group.id)
                      .map((cat) => (
                        <option key={cat.id} value={cat.id}>{cat.label}</option>
                      ))}
                  </optgroup>
                ))}
              </select>
            </div>

            {/* Filters bar */}
            <div className="flex flex-wrap items-center gap-3 mb-5">
              <div className="flex items-center gap-2 rounded-lg bg-[#151620] border border-white/10 px-3 py-1.5">
                <span className="text-[10px] text-white/30 uppercase">Rank</span>
                <span className="text-sm text-emerald-400 font-medium">{data?.filters.rank ?? "Emerald+"}</span>
              </div>
              <div className="flex items-center gap-2 rounded-lg bg-[#151620] border border-white/10 px-3 py-1.5">
                <span className="text-[10px] text-white/30 uppercase">Region</span>
                <span className="text-sm text-white/70 font-medium">{data?.filters.region ?? "ALL"}</span>
              </div>
              <div className="flex items-center gap-2 rounded-lg bg-[#151620] border border-white/10 px-3 py-1.5">
                <span className="text-[10px] text-white/30 uppercase">Period</span>
                <span className="text-sm text-white/70 font-medium">{data?.filters.period ?? "30 days"}</span>
              </div>
              <div className="flex-1" />
              <input
                type="text"
                placeholder="Search for a Champion..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="bg-[#151620] border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white/80 placeholder-white/25 focus:outline-none focus:border-[#5865F2] w-52"
              />
            </div>

            {/* Stat header */}
            <div className="rounded-xl border border-white/10 bg-[#151620] overflow-hidden">
              <div className="grid grid-cols-[40px_44px_1fr_minmax(110px,140px)_minmax(80px,100px)_minmax(80px,100px)_70px] items-center px-4 py-3 border-b border-white/10 text-[10px] text-white/35 uppercase tracking-wider font-semibold">
                <div className="text-center">#</div>
                <div></div>
                <div>Champion</div>
                <div className="text-center font-bold text-white/50">{data?.category.label ?? "Stat"}</div>
                {activeStat === "fullClearTime" ? (
                  <>
                    <div className="text-center">Blue Side</div>
                    <div className="text-center">Red Side</div>
                  </>
                ) : (
                  <>
                    <div></div>
                    <div></div>
                  </>
                )}
                <div className="text-center">Games</div>
              </div>

              {loading && (
                <div className="flex items-center justify-center py-16">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-white/20 border-t-[#5865F2]" />
                </div>
              )}

              {!loading && filteredEntries.map((entry, idx) => {
                const barWidth = isLowerBetter
                  ? Math.max(5, ((barMax - entry.value) / Math.max(1, barMax - barBase)) * 100)
                  : Math.max(5, (entry.value / barMax) * 100);

                return (
                  <div
                    key={entry.championName}
                    className={`grid grid-cols-[40px_44px_1fr_minmax(110px,140px)_minmax(80px,100px)_minmax(80px,100px)_70px] items-center px-4 py-2.5 border-b border-white/5 hover:bg-white/[0.02] transition ${
                      idx === 0 ? "bg-amber-500/[0.03]" : idx === 1 ? "bg-white/[0.015]" : idx === 2 ? "bg-white/[0.01]" : ""
                    }`}
                  >
                    <div className={`text-center text-sm font-bold tabular-nums ${idx === 0 ? "text-amber-400" : idx === 1 ? "text-zinc-300" : idx === 2 ? "text-amber-600" : "text-white/30"}`}>
                      {entry.rank}
                    </div>
                    <div>
                      <img
                        src={getChampionSquareUrl(entry.championName)}
                        alt={entry.championName}
                        className="h-8 w-8 rounded-md"
                      />
                    </div>
                    <div className="font-medium text-sm text-white/90 pr-4">
                      {formatChampName(entry.championName)}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-bold tabular-nums ${idx < 3 ? "text-white" : "text-white/80"}`}>
                        {entry.displayValue}
                      </span>
                      <div className="flex-1 h-1.5 rounded-full bg-white/5 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${idx === 0 ? "bg-amber-400" : idx < 5 ? "bg-[#5865F2]" : "bg-[#5865F2]/50"}`}
                          style={{ width: `${barWidth}%` }}
                        />
                      </div>
                    </div>
                    {activeStat === "fullClearTime" ? (
                      <>
                        <div className="text-center text-xs text-blue-400/60 tabular-nums">{entry.extra?.blueSide ?? ""}</div>
                        <div className="text-center text-xs text-red-400/60 tabular-nums">{entry.extra?.redSide ?? ""}</div>
                      </>
                    ) : (
                      <>
                        <div></div>
                        <div></div>
                      </>
                    )}
                    <div className="text-center text-xs text-white/30 tabular-nums">{entry.gamesFormatted}</div>
                  </div>
                );
              })}

              {!loading && filteredEntries.length === 0 && (
                <div className="text-center py-12 text-white/30 text-sm">No champions found</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

function formatChampName(key: string): string {
  if (key === "DrMundo") return "Dr. Mundo";
  if (key === "JarvanIV") return "Jarvan IV";
  if (key === "LeeSin") return "Lee Sin";
  if (key === "RekSai") return "Rek'Sai";
  if (key === "Xinzhao") return "Xin Zhao";
  return key.replace(/([A-Z])/g, " $1").trim();
}

export default function ChampionsPage() {
  return (
    <Suspense fallback={
      <main className="min-h-screen bg-[#0E0F15] text-[#E8E9F0] flex items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-[#5865F2]" />
      </main>
    }>
      <ChampionsPageInner />
    </Suspense>
  );
}
