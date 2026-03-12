"use client";

import { useEffect, useState, useCallback, useRef, Suspense } from "react";
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
  filterOptions: { ranks: string[]; regions: string[]; periods: string[] };
};

const GROUP_ICONS: Record<string, string> = {
  jungle: "\u{1F33F}",
  game: "\u{1F3AE}",
};

/** Dragon soul tier list by win rate (high elo). Sources: leaguetips.gg, zleague.gg, leagueofgraphs.com, procomps.gg */
const DRAGON_SOUL_TIER_LIST = [
  { name: "Cloud Soul", tier: "S", winRate: 92.8, color: "text-sky-400", bg: "bg-sky-500/10", border: "border-sky-500/30", desc: "60% MS for 6s after ult — chase, kite, reposition" },
  { name: "Mountain Soul", tier: "A", winRate: 91.1, color: "text-amber-600", bg: "bg-amber-500/10", border: "border-amber-500/30", desc: "Shield after 5s out of combat — survivability" },
  { name: "Hextech Soul", tier: "A", winRate: 91, color: "text-violet-400", bg: "bg-violet-500/10", border: "border-violet-500/30", desc: "True damage + slow on hit — damage and utility" },
  { name: "Infernal Soul", tier: "B", winRate: 90.9, color: "text-orange-400", bg: "bg-orange-500/10", border: "border-orange-500/30", desc: "Explosions on damage — burst, waveclear" },
  { name: "Ocean Soul", tier: "C", winRate: 90, color: "text-cyan-400", bg: "bg-cyan-500/10", border: "border-cyan-500/30", desc: "Heal + mana on damage — sustain (champ-dependent)" },
  { name: "Chemtech Soul", tier: "C", winRate: 89.5, color: "text-lime-400", bg: "bg-lime-500/10", border: "border-lime-500/30", desc: "10% DR + 10% damage when below 50% HP — bruiser/tank skewed" },
];

function FilterDropdown({
  label,
  value,
  options,
  onChange,
  color,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (v: string) => void;
  color?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 rounded-lg bg-[#151620] border border-white/10 px-3 py-1.5 hover:border-white/20 transition"
      >
        <span className="text-[10px] text-white/30 uppercase">{label}</span>
        <span className={`text-sm font-medium ${color ?? "text-white/70"}`}>{value}</span>
        <svg className="h-3 w-3 text-white/30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-1 z-50 rounded-lg bg-[#1a1d2e] border border-white/10 shadow-xl py-1 min-w-[140px] max-h-64 overflow-y-auto">
          {options.map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => { onChange(opt); setOpen(false); }}
              className={`w-full text-left px-3 py-1.5 text-sm transition ${
                opt === value
                  ? "bg-[#5865F2]/15 text-[#7B8CFF] font-medium"
                  : "text-white/60 hover:bg-white/5 hover:text-white/80"
              }`}
            >
              {opt}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

const CHAMP_DISPLAY_NAMES: Record<string, string> = {
  DrMundo: "Dr. Mundo",
  JarvanIV: "Jarvan IV",
  LeeSin: "Lee Sin",
  RekSai: "Rek'Sai",
  XinZhao: "Xin Zhao",
  MonkeyKing: "Wukong",
  Wukong: "Wukong",
  MasterYi: "Master Yi",
  MissFortune: "Miss Fortune",
  TwistedFate: "Twisted Fate",
  TahmKench: "Tahm Kench",
  KogMaw: "Kog'Maw",
  Khazix: "Kha'Zix",
  Belveth: "Bel'Veth",
  Fiddlesticks: "Fiddlesticks",
};

function formatChampName(key: string): string {
  if (CHAMP_DISPLAY_NAMES[key]) return CHAMP_DISPLAY_NAMES[key];
  return key.replace(/([A-Z])/g, " $1").trim();
}

function JungleStatsInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const activeStat = searchParams.get("stat") ?? "fullClearTime";

  const [data, setData] = useState<StatsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [rank, setRank] = useState("Emerald+");
  const [region, setRegion] = useState("ALL");
  const [period, setPeriod] = useState("30 days");

  const fetchData = useCallback(async (stat: string, r: string, reg: string, per: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ stat, rank: r, region: reg, period: per });
      const res = await fetch(`/api/champion-stats-global?${params}`);
      if (res.ok) setData(await res.json());
    } catch { /* ok */ }
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(activeStat, rank, region, period); }, [activeStat, rank, region, period, fetchData]);

  const setStat = (statId: string) => {
    router.push(`/jungle-stats?stat=${statId}`, { scroll: false });
  };

  const filteredEntries = data?.entries.filter((e) =>
    !search || formatChampName(e.championName).toLowerCase().includes(search.toLowerCase())
  ) ?? [];

  const maxValue = filteredEntries.length > 0 ? Math.max(...filteredEntries.map((e) => e.value)) : 1;
  const minValue = filteredEntries.length > 0 ? Math.min(...filteredEntries.map((e) => e.value)) : 0;

  const cat = data?.categories.find((c) => c.id === activeStat);
  const isLowerBetter = activeStat === "fullClearTime" || activeStat === "deathsPerGame" || activeStat === "avgGameDuration";
  const showExtraCols = activeStat === "fullClearTime";

  return (
    <main className="min-h-screen bg-[#0E0F15] text-[#E8E9F0]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">Jungle Stats</h1>
          <p className="text-sm text-white/40 mt-1">Jungle champion analytics — clear times, objective control, and more</p>
          {data?.source === "placeholder" && (
            <span className="inline-block mt-2 text-[10px] uppercase tracking-wider bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded">
              Sample Data
            </span>
          )}
        </div>

        {/* Dragon Soul Tier List */}
        <div className="mb-8 rounded-xl border border-white/10 bg-[#151620] overflow-hidden">
          <div className="px-4 py-3 border-b border-white/10">
            <h2 className="text-sm font-bold text-white/90">Dragon Soul Tier List</h2>
            <p className="text-[10px] text-white/40 mt-0.5">Best to worst by win rate (high elo). Prioritize souls accordingly. Sources: leaguetips.gg, zleague.gg, leagueofgraphs.com</p>
          </div>
          <div className="p-4 flex flex-wrap gap-3">
            {DRAGON_SOUL_TIER_LIST.map((soul, i) => (
              <div
                key={soul.name}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg border ${soul.bg} ${soul.border} min-w-[200px] flex-1`}
                title={soul.desc}
              >
                <span className={`text-lg font-bold tabular-nums ${soul.color}`}>{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-white/90">{soul.name}</span>
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${soul.bg} ${soul.color} border ${soul.border}`}>
                      {soul.tier}
                    </span>
                  </div>
                  <div className="text-[10px] text-white/50 mt-0.5">{soul.winRate}% WR</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex gap-6">
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
                    .map((c) => (
                      <button
                        key={c.id}
                        onClick={() => setStat(c.id)}
                        className={`w-full text-left px-3 py-1.5 text-sm rounded-lg transition ${
                          activeStat === c.id
                            ? "bg-[#5865F2]/15 text-[#7B8CFF] font-medium"
                            : "text-white/50 hover:text-white/80 hover:bg-white/5"
                        }`}
                      >
                        {c.label}
                      </button>
                    ))}
                </div>
              ))}
            </div>
          </aside>

          <div className="flex-1 min-w-0">
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
                      .map((c) => (
                        <option key={c.id} value={c.id}>{c.label}</option>
                      ))}
                  </optgroup>
                ))}
              </select>
            </div>

            <div className="flex flex-wrap items-center gap-3 mb-5">
              <FilterDropdown
                label="Rank"
                value={rank}
                options={data?.filterOptions.ranks ?? ["Emerald+"]}
                onChange={setRank}
                color="text-emerald-400"
              />
              <FilterDropdown
                label="Region"
                value={region}
                options={data?.filterOptions.regions ?? ["ALL"]}
                onChange={setRegion}
              />
              <FilterDropdown
                label="Period"
                value={period}
                options={data?.filterOptions.periods ?? ["30 days"]}
                onChange={setPeriod}
              />
              <div className="flex-1" />
              <input
                type="text"
                placeholder="Search for a Champion..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="bg-[#151620] border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white/80 placeholder-white/25 focus:outline-none focus:border-[#5865F2] w-52"
              />
            </div>

            <div className="rounded-xl border border-white/10 bg-[#151620] overflow-hidden">
              <div className={`grid items-center px-4 py-3 border-b border-white/10 text-[10px] text-white/35 uppercase tracking-wider font-semibold ${
                showExtraCols
                  ? "grid-cols-[40px_44px_1fr_minmax(110px,140px)_minmax(80px,100px)_minmax(80px,100px)_70px]"
                  : "grid-cols-[40px_44px_1fr_minmax(160px,220px)_70px]"
              }`}>
                <div className="text-center">#</div>
                <div></div>
                <div>Champion</div>
                <div className="text-center font-bold text-white/50">{cat?.label ?? "Stat"}</div>
                {showExtraCols ? (
                  <>
                    <div className="text-center">Blue Side</div>
                    <div className="text-center">Red Side</div>
                  </>
                ) : null}
                <div className="text-center">Games</div>
              </div>

              {loading && (
                <div className="flex items-center justify-center py-16">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-white/20 border-t-[#5865F2]" />
                </div>
              )}

              {!loading && filteredEntries.map((entry, idx) => {
                const barWidth = isLowerBetter
                  ? Math.max(5, ((maxValue - entry.value) / Math.max(1, maxValue - minValue)) * 100)
                  : Math.max(5, (entry.value / maxValue) * 100);

                return (
                  <div
                    key={entry.championName}
                    className={`grid items-center px-4 py-2.5 border-b border-white/5 hover:bg-white/[0.02] transition ${
                      showExtraCols
                        ? "grid-cols-[40px_44px_1fr_minmax(110px,140px)_minmax(80px,100px)_minmax(80px,100px)_70px]"
                        : "grid-cols-[40px_44px_1fr_minmax(160px,220px)_70px]"
                    } ${idx === 0 ? "bg-amber-500/[0.03]" : idx === 1 ? "bg-white/[0.015]" : idx === 2 ? "bg-white/[0.01]" : ""}`}
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
                      <span className={`text-sm font-bold tabular-nums flex-shrink-0 ${idx < 3 ? "text-white" : "text-white/80"}`}>
                        {entry.displayValue}
                      </span>
                      <div className="flex-1 h-1.5 rounded-full bg-white/5 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${idx === 0 ? "bg-amber-400" : idx < 5 ? "bg-[#5865F2]" : "bg-[#5865F2]/50"}`}
                          style={{ width: `${barWidth}%` }}
                        />
                      </div>
                    </div>
                    {showExtraCols ? (
                      <>
                        <div className="text-center text-xs text-blue-400/60 tabular-nums">{entry.extra?.blueSide ?? ""}</div>
                        <div className="text-center text-xs text-red-400/60 tabular-nums">{entry.extra?.redSide ?? ""}</div>
                      </>
                    ) : null}
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

export default function JungleStatsPage() {
  return (
    <Suspense fallback={
      <main className="min-h-screen bg-[#0E0F15] text-[#E8E9F0] flex items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-[#5865F2]" />
      </main>
    }>
      <JungleStatsInner />
    </Suspense>
  );
}
