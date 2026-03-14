"use client";

import React, { useState, useMemo, useCallback } from "react";
import { getChampionSquareUrl } from "@/lib/riotAssets";
import {
  JUNGLERS,
  OBJECTIVES,
  GANK_TIMING,
  SCUTTLE_DATA,
  MATCHUP_DATA,
  type JunglerTier,
  type ClearSpeedEntry,
} from "./jungleSampleData";

/* ── Tabs ── */

export type JungleTab = "tier-list" | "clear-speeds" | "objectives" | "gank-stats" | "matchups";

const TABS: { key: JungleTab; label: string }[] = [
  { key: "tier-list", label: "Tier List" },
  { key: "clear-speeds", label: "Clear Speeds" },
  { key: "objectives", label: "Objectives" },
  { key: "gank-stats", label: "Gank Stats" },
  { key: "matchups", label: "Matchups" },
];

const RANK_FILTERS = [
  { key: "all", label: "All" },
  { key: "iron-silver", label: "Iron-Silver" },
  { key: "gold-plat", label: "Gold-Plat" },
  { key: "emerald-diamond", label: "Emerald-Diamond" },
  { key: "master+", label: "Master+" },
] as const;

/* ── Shared UI ── */

const TIER_COLORS: Record<JunglerTier, { bg: string; border: string; text: string }> = {
  S: { bg: "bg-orange-500/[0.06]", border: "border-orange-500/20", text: "text-orange-400" },
  A: { bg: "bg-blue-500/[0.04]", border: "border-blue-500/15", text: "text-blue-400" },
  B: { bg: "bg-emerald-500/[0.04]", border: "border-emerald-500/15", text: "text-emerald-400" },
  C: { bg: "bg-zinc-500/[0.04]", border: "border-zinc-500/15", text: "text-zinc-400" },
  D: { bg: "bg-red-500/[0.04]", border: "border-red-500/15", text: "text-red-400" },
};

function SectionCard({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-xl border border-white/[0.06] bg-[#151620] overflow-hidden ${className ?? ""}`}>
      {children}
    </div>
  );
}

function SectionTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="px-5 py-4 border-b border-white/[0.06]">
      <h2 className="text-sm font-bold text-white/90">{title}</h2>
      {subtitle && <p className="text-[10px] text-white/40 mt-0.5">{subtitle}</p>}
    </div>
  );
}

function formatGames(n: number): string {
  return n >= 1000 ? `${(n / 1000).toFixed(1)}K` : String(n);
}

function StatBar({ value, max, color }: { value: number; max: number; color: string }) {
  return (
    <div className="flex-1 h-1.5 rounded-full bg-white/5 overflow-hidden">
      <div className={`h-full rounded-full ${color}`} style={{ width: `${Math.max(3, (value / max) * 100)}%` }} />
    </div>
  );
}

/* ════════════════════════════════════════════════
   TAB 1 — Jungle Tier List
   ════════════════════════════════════════════════ */

function JungleTierList() {
  const tiers: JunglerTier[] = ["S", "A", "B", "C", "D"];

  return (
    <SectionCard>
      <SectionTitle title="Jungle Tier List" subtitle="Ranked by composite score: win rate, pick rate, ban rate, and game impact." />
      <div className="p-4 space-y-3">
        {tiers.map((tier) => {
          const champs = JUNGLERS.filter((j) => j.tier === tier);
          if (!champs.length) return null;
          const colors = TIER_COLORS[tier];
          return (
            <div key={tier} className={`flex items-start gap-3 rounded-lg border ${colors.border} ${colors.bg} p-3`}>
              <span className={`text-lg font-black tabular-nums w-8 text-center shrink-0 ${colors.text}`}>{tier}</span>
              <div className="flex flex-wrap gap-2 flex-1">
                {champs.map((c) => (
                  <div key={c.id} className="flex items-center gap-2 bg-black/20 rounded-lg px-2.5 py-1.5 group cursor-default">
                    <img src={getChampionSquareUrl(c.id)} alt={c.name} className="w-7 h-7 rounded-md" />
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-white/90 truncate">{c.name}</p>
                      <div className="flex items-center gap-2 text-[10px] text-white/40">
                        <span className={c.winRate >= 51 ? "text-green-400" : c.winRate < 49 ? "text-red-400" : ""}>{c.winRate}% WR</span>
                        <span>{c.pickRate}% PR</span>
                        <span>{c.banRate}% BR</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </SectionCard>
  );
}

/* ════════════════════════════════════════════════
   TAB 2 — First Clear Speed Rankings
   ════════════════════════════════════════════════ */

type SortKey = "rank" | "champion" | "clearTime" | "hpAfter" | "games";
type SortDir = "asc" | "desc";

function toSec(t: string): number {
  const [m, s] = t.split(":").map(Number);
  return m * 60 + s;
}

function SortHeader({
  label,
  active,
  sortDir,
  onClick,
  align = "left",
}: {
  label: string;
  active: boolean;
  sortDir: SortDir;
  onClick: () => void;
  align?: "left" | "center" | "right";
}) {
  const alignClass = align === "center" ? "justify-center" : align === "right" ? "justify-end" : "justify-start";
  return (
    <th
      className={`px-3 py-3 cursor-pointer text-xs uppercase tracking-wider border-b border-white/[0.06] group transition hover:text-white/60 ${active ? "text-indigo-400" : "text-white/35"}`}
      onClick={onClick}
    >
      <div className={`flex items-center gap-1.5 ${alignClass}`}>
        {label}
        {active ? (
          <span className="text-indigo-400/90">{sortDir === "asc" ? "▲" : "▼"}</span>
        ) : (
          <span className="opacity-0 group-hover:opacity-40 transition-opacity text-[10px] leading-none">▲▼</span>
        )}
      </div>
    </th>
  );
}

function ClearSpeedRankings({ data, source, loading }: { data: ClearSpeedEntry[]; source: string; loading: boolean }) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>("clearTime");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const rankByClearTime = useMemo(() => {
    const byClearTime = [...data].sort((a, b) => toSec(a.avgClearTime) - toSec(b.avgClearTime));
    const map: Record<string, number> = {};
    byClearTime.forEach((e, i) => { map[e.id] = i + 1; });
    return map;
  }, [data]);

  const sorted = useMemo(() => {
    const arr = [...data];
    switch (sortKey) {
      case "rank":
      case "clearTime":
        return arr.sort((a, b) => {
          const diff = toSec(a.avgClearTime) - toSec(b.avgClearTime);
          return sortDir === "asc" ? diff : -diff;
        });
      case "champion":
        return arr.sort((a, b) => {
          const diff = a.name.localeCompare(b.name);
          return sortDir === "asc" ? diff : -diff;
        });
      case "hpAfter":
        return arr.sort((a, b) => {
          const diff = a.avgHpAfterClear - b.avgHpAfterClear;
          return sortDir === "asc" ? diff : -diff;
        });
      case "games":
        return arr.sort((a, b) => {
          const diff = a.games - b.games;
          return sortDir === "asc" ? diff : -diff;
        });
      default:
        return arr.sort((a, b) => toSec(a.avgClearTime) - toSec(b.avgClearTime));
    }
  }, [data, sortKey, sortDir]);

  const handleSort = useCallback((key: SortKey) => {
    setSortKey(key);
    setSortDir((prev) => (sortKey === key ? (prev === "asc" ? "desc" : "asc") : key === "hpAfter" || key === "games" ? "desc" : "asc"));
  }, [sortKey]);

  const isSeed = source === "seed";

  return (
    <SectionCard>
      <SectionTitle
        title="First Clear Speed Rankings"
        subtitle={
          isSeed
            ? "Estimated p5 clear times — updates automatically when data pipeline runs."
            : "p5 (5th percentile) time to clear 6 camps from ranked games. Sorted fastest first."
        }
      />
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-white/20 border-t-indigo-500" />
        </div>
      ) : (
      <div className="overflow-x-auto">
        {isSeed && (
          <div className="px-4 py-2 bg-amber-500/[0.05] border-b border-amber-500/10">
            <p className="text-[10px] text-amber-400/70">Estimated — updates automatically when data pipeline runs</p>
          </div>
        )}
        <table className="w-full min-w-full text-sm table-fixed">
          <colgroup>
            <col style={{ width: 48 }} />
            <col /> {/* Champion: takes remaining space */}
            <col style={{ width: 112 }} />
            <col style={{ width: 96 }} />
            <col style={{ width: 256 }} />
            {!isSeed && <col style={{ width: 96 }} />}
          </colgroup>
          <thead>
            <tr>
              <SortHeader
                label="#"
                active={sortKey === "rank" || sortKey === "clearTime"}
                sortDir={sortKey === "rank" || sortKey === "clearTime" ? sortDir : "asc"}
                onClick={() => handleSort("rank")}
                align="center"
              />
              <SortHeader
                label="Champion"
                active={sortKey === "champion"}
                sortDir={sortDir}
                onClick={() => handleSort("champion")}
              />
              <SortHeader
                label="Clear Time"
                active={sortKey === "clearTime"}
                sortDir={sortDir}
                onClick={() => handleSort("clearTime")}
                align="center"
              />
              <SortHeader
                label="HP After"
                active={sortKey === "hpAfter"}
                sortDir={sortDir}
                onClick={() => handleSort("hpAfter")}
                align="center"
              />
              <th className="text-left px-3 py-3 w-64 text-xs uppercase tracking-wider text-white/35 border-b border-white/[0.06]">
                Most Common Path
              </th>
              {!isSeed && (
                <SortHeader
                  label="Games"
                  active={sortKey === "games"}
                  sortDir={sortDir}
                  onClick={() => handleSort("games")}
                  align="right"
                />
              )}
            </tr>
          </thead>
          <tbody>
            {sorted.map((entry) => {
              const rank = rankByClearTime[entry.id] ?? 0;
              const isTop3 = rank <= 3;
              return (
                <React.Fragment key={entry.id}>
                  <tr
                    className="border-b border-white/[0.03] hover:bg-white/[0.02] transition cursor-pointer"
                    onClick={() => setExpanded(expanded === entry.id ? null : entry.id)}
                  >
                    <td className={`text-center px-3 py-2.5 w-12 tabular-nums font-bold ${isTop3 ? "text-green-400" : "text-white/30"}`}>
                      {rank}
                    </td>
                    <td className="px-3 py-2.5 min-w-[200px]">
                      <div className="flex items-center gap-2">
                        <img src={getChampionSquareUrl(entry.id)} alt={entry.name} className="w-7 h-7 rounded-md shrink-0" />
                        <span className="font-medium text-white/90 truncate">{entry.name}</span>
                      </div>
                    </td>
                    <td className="text-center px-3 py-2.5 w-28 tabular-nums font-bold text-white/80">{entry.avgClearTime}</td>
                    <td className="text-center px-3 py-2.5 w-24">
                      <span className={`tabular-nums ${entry.avgHpAfterClear >= 80 ? "text-green-400" : entry.avgHpAfterClear >= 60 ? "text-yellow-400" : "text-red-400"}`}>
                        {entry.avgHpAfterClear}%
                      </span>
                    </td>
                    <td className="px-3 py-2.5 w-64 text-xs text-white/50 truncate">{entry.paths[0]?.icons ?? "—"}</td>
                    {!isSeed && (
                      <td className="text-right px-3 py-2.5 w-24 text-xs text-white/30 tabular-nums">
                        {formatGames(entry.games)}
                        {entry.games > 0 && entry.games < 500 && <span className="ml-1 text-yellow-400">⚠</span>}
                      </td>
                    )}
                  </tr>
                  {expanded === entry.id && (
                    <tr>
                      <td colSpan={isSeed ? 5 : 6} className="bg-white/[0.015] px-6 py-3 border-b border-white/[0.04]">
                        <p className="text-[10px] text-white/30 uppercase tracking-wider mb-2">All Paths ({entry.paths.length})</p>
                        <div className="space-y-1.5">
                          {entry.paths.map((p, pi) => (
                            <div key={pi} className="flex items-center gap-3 text-xs">
                              <span className="text-white/60">{p.icons}</span>
                              <span className="text-white/40">{p.label}</span>
                            </div>
                          ))}
                        </div>
                        {entry.note && (
                          <p className="text-[10px] text-white/25 mt-2 italic">{entry.note}</p>
                        )}
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
      )}
    </SectionCard>
  );
}

/* ════════════════════════════════════════════════
   TAB 3 — Objective Win Rate Impact
   ════════════════════════════════════════════════ */

function ObjectiveWinRate() {
  const topObj = useMemo(() => OBJECTIVES.reduce((a, b) => (a.delta > b.delta ? a : b)), []);

  return (
    <SectionCard>
      <SectionTitle title="Objective Win Rate Impact" subtitle="How each objective affects win rate when your team secures it." />
      <div className="p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
          {OBJECTIVES.map((obj) => (
            <div key={obj.id} className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-4">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xl">{obj.icon}</span>
                <span className="text-sm font-semibold text-white/90">{obj.name}</span>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-white/40">When achieved</span>
                  <span className="text-green-400 font-bold tabular-nums">{obj.wrWhenAchieved}%</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-white/40">When not</span>
                  <span className="text-red-400 font-bold tabular-nums">{obj.wrWhenNot}%</span>
                </div>
                <div className="h-px bg-white/[0.06]" />
                <div className="flex justify-between text-xs">
                  <span className="text-white/40">Win rate impact</span>
                  <span className="text-white font-bold tabular-nums">+{obj.delta}%</span>
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="rounded-lg bg-indigo-500/[0.06] border border-indigo-500/20 px-4 py-3">
          <p className="text-xs text-indigo-300">
            <span className="font-semibold">{topObj.name}</span> has the highest win rate impact this patch at <span className="font-bold">+{topObj.delta}%</span>.
          </p>
        </div>
      </div>
    </SectionCard>
  );
}

/* ════════════════════════════════════════════════
   TAB 4 — Gank Stats (gank timing + scuttle/counter-jungle)
   ════════════════════════════════════════════════ */

function GankStatsTab() {
  const sorted = useMemo(() => [...GANK_TIMING].sort((a, b) => b.gankSuccessRate - a.gankSuccessRate), []);
  const maxRate = Math.max(...sorted.map((g) => g.gankSuccessRate));
  const scuttleSorted = useMemo(() => [...SCUTTLE_DATA].sort((a, b) => b.scuttleContestRate - a.scuttleContestRate), []);

  return (
    <div className="space-y-6">
      <SectionCard>
        <SectionTitle title="Gank Timing Data" subtitle="First gank timing, success rate, and target lane preferences." />
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[10px] text-white/35 uppercase tracking-wider border-b border-white/[0.06]">
                <th className="text-left px-4 py-3">Champion</th>
                <th className="text-right px-3 py-3">First Gank</th>
                <th className="text-right px-3 py-3 min-w-[160px]">Success Rate</th>
                <th className="text-center px-3 py-3">Target Lane</th>
                <th className="text-right px-3 py-3">Games</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((entry) => (
                <tr key={entry.id} className="border-b border-white/[0.03] hover:bg-white/[0.02] transition">
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      <img src={getChampionSquareUrl(entry.id)} alt={entry.name} className="w-7 h-7 rounded-md" />
                      <span className="font-medium text-white/90">{entry.name}</span>
                    </div>
                  </td>
                  <td className="text-right px-3 py-2.5 tabular-nums text-white/70">{entry.avgFirstGankTime}</td>
                  <td className="text-right px-3 py-2.5">
                    <div className="flex items-center gap-2 justify-end">
                      <StatBar value={entry.gankSuccessRate} max={maxRate} color={entry.gankSuccessRate >= 60 ? "bg-green-500" : entry.gankSuccessRate >= 52 ? "bg-blue-500" : "bg-red-500"} />
                      <span className={`tabular-nums font-bold text-xs w-12 text-right ${entry.gankSuccessRate >= 60 ? "text-green-400" : entry.gankSuccessRate >= 52 ? "text-white/70" : "text-red-400"}`}>
                        {entry.gankSuccessRate}%
                      </span>
                    </div>
                  </td>
                  <td className="text-center px-3 py-2.5">
                    <span className="text-xs text-white/50 bg-white/[0.04] rounded px-2 py-0.5">{entry.mostGankedLane}</span>
                  </td>
                  <td className="text-right px-3 py-2.5 text-xs text-white/30 tabular-nums">{formatGames(entry.games)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>

      <SectionCard>
        <SectionTitle title="Scuttle & Counter-Jungle Stats" subtitle="Scuttle crab contest rate, enemy jungle invade frequency, and early kill rate (before 5 min)." />
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[10px] text-white/35 uppercase tracking-wider border-b border-white/[0.06]">
                <th className="text-left px-4 py-3">Champion</th>
                <th className="text-right px-3 py-3">Scuttle Contest</th>
                <th className="text-right px-3 py-3">Counter-Jungle</th>
                <th className="text-right px-3 py-3">Early Kill Rate</th>
                <th className="text-right px-3 py-3">Games</th>
              </tr>
            </thead>
            <tbody>
              {scuttleSorted.map((entry) => (
                <tr key={entry.id} className="border-b border-white/[0.03] hover:bg-white/[0.02] transition">
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      <img src={getChampionSquareUrl(entry.id)} alt={entry.name} className="w-7 h-7 rounded-md" />
                      <span className="font-medium text-white/90">{entry.name}</span>
                    </div>
                  </td>
                  <td className="text-right px-3 py-2.5">
                    <span className={`tabular-nums font-bold text-xs ${entry.scuttleContestRate >= 70 ? "text-green-400" : entry.scuttleContestRate >= 50 ? "text-white/70" : "text-red-400"}`}>
                      {entry.scuttleContestRate}%
                    </span>
                  </td>
                  <td className="text-right px-3 py-2.5">
                    <span className={`tabular-nums font-bold text-xs ${entry.counterJungleRate >= 30 ? "text-amber-400" : "text-white/50"}`}>
                      {entry.counterJungleRate}%
                    </span>
                  </td>
                  <td className="text-right px-3 py-2.5">
                    <span className={`tabular-nums font-bold text-xs ${entry.earlyKillRate >= 35 ? "text-red-400" : "text-white/50"}`}>
                      {entry.earlyKillRate}%
                    </span>
                  </td>
                  <td className="text-right px-3 py-2.5 text-xs text-white/30 tabular-nums">{formatGames(entry.games)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>
    </div>
  );
}

/* ════════════════════════════════════════════════
   TAB 5 — Jungle Matchup Table
   ════════════════════════════════════════════════ */

function JungleMatchupTable() {
  const availableChamps = Object.keys(MATCHUP_DATA);
  const [selected, setSelected] = useState(availableChamps[0] ?? "LeeSin");
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const matchups = MATCHUP_DATA[selected] ?? [];
  const sorted = useMemo(() => [...matchups].sort((a, b) => b.wrAgainst - a.wrAgainst), [matchups]);

  return (
    <SectionCard>
      <SectionTitle title="Jungle Matchup Table" subtitle="Select your champion to see win rates and tips against every other jungler." />
      <div className="px-5 pt-4 pb-2">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-xs text-white/40">Your champion:</span>
          {availableChamps.map((id) => {
            const j = JUNGLERS.find((x) => x.id === id);
            const active = selected === id;
            return (
              <button
                key={id}
                onClick={() => { setSelected(id); setExpandedRow(null); }}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition ${
                  active
                    ? "bg-indigo-500/15 text-indigo-300 border border-indigo-500/30"
                    : "bg-white/[0.03] text-white/50 border border-transparent hover:text-white/80 hover:bg-white/[0.06]"
                }`}
              >
                <img src={getChampionSquareUrl(id)} alt={j?.name ?? id} className="w-5 h-5 rounded" />
                {j?.name ?? id}
              </button>
            );
          })}
          {availableChamps.length <= 1 && (
            <span className="text-[10px] text-white/25 italic">More matchup data coming soon</span>
          )}
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-[10px] text-white/35 uppercase tracking-wider border-b border-white/[0.06]">
              <th className="text-left px-4 py-3">Enemy Jungler</th>
              <th className="text-right px-3 py-3">WR Against</th>
              <th className="text-right px-3 py-3">Games</th>
              <th className="text-right px-3 py-3">Early Advantage</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((m) => (
              <>
                <tr
                  key={m.enemyId}
                  className="border-b border-white/[0.03] hover:bg-white/[0.02] transition cursor-pointer"
                  onClick={() => setExpandedRow(expandedRow === m.enemyId ? null : m.enemyId)}
                >
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      <img src={getChampionSquareUrl(m.enemyId)} alt={m.enemyName} className="w-7 h-7 rounded-md" />
                      <span className="font-medium text-white/90">{m.enemyName}</span>
                    </div>
                  </td>
                  <td className="text-right px-3 py-2.5">
                    <span className={`tabular-nums font-bold ${m.wrAgainst >= 52 ? "text-green-400" : m.wrAgainst < 48 ? "text-red-400" : "text-white/70"}`}>
                      {m.wrAgainst}%
                    </span>
                  </td>
                  <td className="text-right px-3 py-2.5 text-xs text-white/30 tabular-nums">{formatGames(m.games)}</td>
                  <td className="text-right px-3 py-2.5">
                    <div className="flex items-center gap-2 justify-end">
                      <div className="w-16 h-1.5 rounded-full bg-white/5 overflow-hidden">
                        <div
                          className={`h-full rounded-full ${m.earlyAdvantageScore >= 65 ? "bg-green-500" : m.earlyAdvantageScore >= 50 ? "bg-blue-500" : "bg-red-500"}`}
                          style={{ width: `${m.earlyAdvantageScore}%` }}
                        />
                      </div>
                      <span className="text-xs text-white/50 tabular-nums w-6 text-right">{m.earlyAdvantageScore}</span>
                    </div>
                  </td>
                </tr>
                {expandedRow === m.enemyId && (
                  <tr key={`${m.enemyId}-detail`}>
                    <td colSpan={4} className="bg-white/[0.015] px-6 py-3 border-b border-white/[0.04]">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                        <div>
                          <p className="text-white/30 uppercase tracking-wider text-[10px] mb-1">Pathing Tip</p>
                          <p className="text-white/60">{m.tip}</p>
                        </div>
                        <div>
                          <p className="text-white/30 uppercase tracking-wider text-[10px] mb-1">Starting Side</p>
                          <p className="text-white/60">{m.startSide}</p>
                        </div>
                        <div>
                          <p className="text-white/30 uppercase tracking-wider text-[10px] mb-1">Scaling Note</p>
                          <p className="text-white/60">{m.spikeNote}</p>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </>
            ))}
          </tbody>
        </table>
      </div>
    </SectionCard>
  );
}

/* ════════════════════════════════════════════════
   MAIN EXPORT — Tabbed Layout
   ════════════════════════════════════════════════ */

export interface JungleStatsProps {
  tab: JungleTab;
  rank: string;
  clearSpeeds?: ClearSpeedEntry[];
  clearSpeedSource?: string;
  clearSpeedLoading?: boolean;
  onTabChange: (tab: JungleTab) => void;
  onRankChange: (rank: string) => void;
}

export default function JungleStatsContent({
  tab,
  rank,
  clearSpeeds = [],
  clearSpeedSource = "seed",
  clearSpeedLoading = false,
  onTabChange,
  onRankChange,
}: JungleStatsProps) {
  return (
    <main className="min-h-screen bg-[#0E0F15] text-[#E8E9F0]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-8">
        {/* Page Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold tracking-tight">Jungle Stats</h1>
          <p className="text-sm text-white/40 mt-1">Clear speeds, objective priority, and pathing data for every jungler.</p>
          <p className="text-xs text-white/25 mt-2">Patch 16.5 · Based on 1.2M games · Updated 3h ago</p>
        </div>

        {/* Sticky: Rank Filter + Tabs */}
        <div className="sticky top-0 z-30 bg-[#0E0F15] -mx-4 px-4 sm:-mx-6 sm:px-6 pb-0">
          {/* Rank Filter */}
          <div className="flex flex-wrap gap-2 pb-3">
            {RANK_FILTERS.map((f) => (
              <button
                key={f.key}
                onClick={() => onRankChange(f.key)}
                className={`px-3 py-1.5 text-sm rounded-lg transition font-medium ${
                  rank === f.key
                    ? "bg-indigo-500/15 text-indigo-300 border border-indigo-500/30"
                    : "text-white/40 border border-transparent hover:text-white/70 hover:bg-white/[0.04]"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Tab Navigation */}
          <div className="flex gap-0.5 border-b border-white/5">
            {TABS.map((t) => {
              const active = tab === t.key;
              return (
                <button
                  key={t.key}
                  onClick={() => onTabChange(t.key)}
                  className={`relative px-5 py-2.5 text-sm font-medium transition-all ${active ? "text-white" : "text-zinc-500 hover:text-zinc-300"}`}
                >
                  {t.label}
                  {active && <div className="absolute bottom-0 left-2 right-2 h-[2px] rounded-full bg-indigo-500" style={{ boxShadow: "0 0 8px rgba(99, 102, 241, 0.5)" }} />}
                </button>
              );
            })}
          </div>
        </div>

        {/* Tab Content */}
        <div className="mt-6">
          {tab === "tier-list" && <JungleTierList />}
          {tab === "clear-speeds" && <ClearSpeedRankings data={clearSpeeds} source={clearSpeedSource} loading={clearSpeedLoading} />}
          {tab === "objectives" && <ObjectiveWinRate />}
          {tab === "gank-stats" && <GankStatsTab />}
          {tab === "matchups" && <JungleMatchupTable />}
        </div>
      </div>
    </main>
  );
}
