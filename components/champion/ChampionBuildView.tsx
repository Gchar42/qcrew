"use client";

import { useEffect, useState, useMemo } from "react";
import {
  getItemIconUrl,
  getItemTooltip,
  type ItemTooltipData,
} from "@/lib/riotAssets";
import { perkIconPathToUrl } from "@/lib/runesCd";
import { LeagueTooltip } from "@/components/LeagueTooltip";

/* ── Demo accounts ──────────────────────────────────────── */

const DEMO_ACCOUNTS = [
  { riotId: "Demo#NA1", region: "na1" },
  { riotId: "TestW#NA1", region: "na1" },
  { riotId: "TestL#NA1", region: "na1" },
];

const BOOT_IDS = new Set([
  1001, 2422, 3006, 3009, 3020, 3047, 3111, 3117, 3158,
]);
const MIN_COMPLETED_GOLD = 1300;
const LOW_SAMPLE = 500;
const HIDE_THRESHOLD = 200;

const PERKSTYLES_URL =
  "https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/perkstyles.json";
const PERKS_URL =
  "https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/perks.json";
const REF_TREE_ORDER = [8000, 8100, 8200, 8300, 8400];
const REF_TREE_NAME: Record<number, string> = {
  8000: "Precision", 8100: "Domination", 8200: "Sorcery", 8300: "Inspiration", 8400: "Resolve",
};
const REF_SHARD_ROWS: { label: string; shards: number[] }[] = [
  { label: "Offense", shards: [5008, 5005, 5007] },
  { label: "Flex", shards: [5008, 5002, 5003] },
  { label: "Defense", shards: [5001, 5002, 5003] },
];

const TREE_ACCENT: Record<number, string> = {
  8000: "#c8aa6e",
  8100: "#d44242",
  8200: "#9faafc",
  8300: "#a1d586",
  8400: "#49aab9",
};

const SHARD_ROWS: number[][] = [
  [5008, 5005, 5007],
  [5008, 5002, 5003],
  [5001, 5002, 5003],
];
const SHARD_ICONS: Record<number, string> = {
  5008: "https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/perk-images/statmods/statmodsadaptiveforceicon.png",
  5005: "https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/perk-images/statmods/statmodsattackspeedicon.png",
  5007: "https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/perk-images/statmods/statmodscdrscalingicon.png",
  5002: "https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/perk-images/statmods/statmodsarmoricon.png",
  5003: "https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/perk-images/statmods/statmodsmagicresicon.png",
  5001: "https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/perk-images/statmods/statmodshealthscalingicon.png",
};
const SHARD_NAMES: Record<number, string> = {
  5008: "Adaptive", 5005: "Atk Spd", 5007: "Haste",
  5002: "Armor", 5003: "MR", 5001: "Health",
};

const RANK_FILTERS: { key: string; label: string }[] = [
  { key: "all", label: "All" },
  { key: "low", label: "Iron\u2013Silver" },
  { key: "mid", label: "Gold\u2013Plat" },
  { key: "high", label: "Emerald\u2013Diamond" },
  { key: "elite", label: "Master+" },
];

/* ── Types ──────────────────────────────────────────────── */

type MatchSample = {
  win: boolean;
  kills: number; deaths: number; assists: number;
  items: number[];
  bootId: number;
  primaryTree: number; secondaryTree: number;
  keystoneId: number; primarySlots: number[];
  secondarySlots: number[]; shardIds: number[];
  gameEnd: number;
};

type TreeSlot = { type: string; perks: number[] };
type TreeDef = { id: number; name: string; iconPath: string; slots: TreeSlot[] };
type BuildTab = "popular" | "winrate";
type RuneAgg = { id: number; games: number; wins: number; pickRate: number; winRate: number };
type ItemAgg = { id: number; games: number; wins: number; pickRate: number; winRate: number };

/* ── Extraction ─────────────────────────────────────────── */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractSamples(bundles: any[], championName: string): MatchSample[] {
  const out: MatchSample[] = [];
  for (const b of bundles) {
    if (!b?.profile?.account) continue;
    const puuid = b.profile.account.puuid;
    for (const m of b.matches ?? []) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const p = m.info?.participants?.find((x: any) =>
        x.puuid === puuid && x.championName?.toLowerCase() === championName.toLowerCase(),
      );
      if (!p) continue;
      const raw = [p.item0 ?? 0, p.item1 ?? 0, p.item2 ?? 0, p.item3 ?? 0, p.item4 ?? 0, p.item5 ?? 0];
      const bootId = raw.find((id: number) => BOOT_IDS.has(id)) ?? 0;
      const items = raw.filter((id: number) => id > 0 && !BOOT_IDS.has(id));
      const styles = p.perks?.styles ?? [];
      const pri = styles[0];
      const sec = styles[1];
      const priSels = pri?.selections?.map((s: { perk: number }) => s.perk) ?? [];
      const secSels = sec?.selections?.map((s: { perk: number }) => s.perk) ?? [];
      const allIds: number[] = p.perks?.perkIds ?? [];
      const used = new Set([...priSels, ...secSels]);
      const shards = allIds.filter((id: number) => id >= 5000 && id < 6000 && !used.has(id));
      out.push({
        win: p.win, kills: p.kills ?? 0, deaths: p.deaths ?? 0, assists: p.assists ?? 0,
        items, bootId,
        primaryTree: pri?.style ?? 0, secondaryTree: sec?.style ?? 0,
        keystoneId: priSels[0] ?? 0, primarySlots: priSels.slice(1), secondarySlots: secSels,
        shardIds: shards, gameEnd: m.info?.gameEndTimestamp ?? 0,
      });
    }
  }
  return out;
}

/* ── Aggregation ────────────────────────────────────────── */

function aggSlotRunes(samples: MatchSample[], extractor: (s: MatchSample) => number | undefined, tab: BuildTab): RuneAgg[] {
  const total = samples.length || 1;
  const map = new Map<number, { g: number; w: number }>();
  for (const s of samples) {
    const id = extractor(s);
    if (!id) continue;
    const e = map.get(id) ?? { g: 0, w: 0 };
    e.g++; if (s.win) e.w++;
    map.set(id, e);
  }
  return [...map.entries()]
    .map(([id, { g, w }]) => ({
      id, games: g, wins: w,
      pickRate: Math.round((g / total) * 1000) / 10,
      winRate: g > 0 ? Math.round((w / g) * 1000) / 10 : 0,
    }))
    .sort((a, b) => tab === "winrate" ? b.winRate - a.winRate : b.games - a.games);
}

function aggItemSlot(samples: MatchSample[], extractor: (s: MatchSample) => number, tab: BuildTab): ItemAgg[] {
  const total = samples.length || 1;
  const map = new Map<number, { g: number; w: number }>();
  for (const s of samples) {
    const id = extractor(s);
    if (!id) continue;
    const e = map.get(id) ?? { g: 0, w: 0 };
    e.g++; if (s.win) e.w++;
    map.set(id, e);
  }
  return [...map.entries()]
    .map(([id, { g, w }]) => ({
      id, games: g, wins: w,
      pickRate: Math.round((g / total) * 1000) / 10,
      winRate: g > 0 ? Math.round((w / g) * 1000) / 10 : 0,
    }))
    .filter(i => i.games >= 1)
    .sort((a, b) => tab === "winrate" ? b.winRate - a.winRate : b.games - a.games)
    .slice(0, 5);
}

function sortByGold(items: number[], itemData: ItemTooltipData): number[] {
  return [...items]
    .filter(id => id > 0 && (itemData[id]?.gold ?? 0) >= MIN_COMPLETED_GOLD)
    .sort((a, b) => (itemData[a]?.gold ?? 9999) - (itemData[b]?.gold ?? 9999));
}

function aggSecondItems(
  samples: MatchSample[],
  firstItemId: number,
  itemData: ItemTooltipData,
  tab: BuildTab,
): ItemAgg[] {
  const matching = samples.filter(s => {
    const sorted = sortByGold(s.items, itemData);
    return sorted[0] === firstItemId;
  });
  const total = matching.length || 1;
  const map = new Map<number, { g: number; w: number }>();
  for (const s of matching) {
    const sorted = sortByGold(s.items, itemData);
    const secondId = sorted[1];
    if (!secondId) continue;
    const e = map.get(secondId) ?? { g: 0, w: 0 };
    e.g++; if (s.win) e.w++;
    map.set(secondId, e);
  }
  return [...map.entries()]
    .map(([id, { g, w }]) => ({
      id, games: g, wins: w,
      pickRate: Math.round((g / total) * 1000) / 10,
      winRate: g > 0 ? Math.round((w / g) * 1000) / 10 : 0,
    }))
    .filter(i => i.games >= 1)
    .sort((a, b) => tab === "winrate" ? b.winRate - a.winRate : b.games - a.games)
    .slice(0, 4);
}

function timeAgo(ts: number): string {
  if (!ts) return "Unknown";
  const m = Math.floor((Date.now() - ts) / 60000);
  if (m < 1) return "Just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

/* ── Component ──────────────────────────────────────────── */

export default function ChampionBuildView({
  championName,
  getPerkIcon,
  getStyleIcon,
  itemData,
  perkNamesById,
}: {
  championName: string;
  getPerkIcon: (id: number) => string;
  getStyleIcon: (id: number) => string;
  itemData: ItemTooltipData;
  perkNamesById: Map<number, { name: string; desc: string }>;
}) {
  const [samples, setSamples] = useState<MatchSample[]>([]);
  const [loading, setLoading] = useState(true);
  const [trees, setTrees] = useState<TreeDef[]>([]);
  const [allTrees, setAllTrees] = useState<TreeDef[]>([]);
  const [buildTab, setBuildTab] = useState<BuildTab>("popular");
  const [rankFilter, setRankFilter] = useState("all");
  const [playerCount, setPlayerCount] = useState(0);
  const [lastUpdate, setLastUpdate] = useState(0);
  const [expandedFirstItem, setExpandedFirstItem] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const [bundleResults, treesRes, perksRes] = await Promise.all([
        Promise.allSettled(
          DEMO_ACCOUNTS.map(async ({ riotId, region }) => {
            const url = `/api/riot/profileBundle?riotId=${encodeURIComponent(riotId)}&region=${encodeURIComponent(region)}&queue=solo`;
            const r = await fetch(url, { cache: "no-store" });
            return r.ok ? r.json() : null;
          }),
        ),
        fetch(PERKSTYLES_URL).then(r => r.ok ? r.json() : null).catch(() => null),
        fetch(PERKS_URL).then(r => r.ok ? r.json() : null).catch(() => null),
      ]);
      if (cancelled) return;

      const bundles = bundleResults
        .filter((r): r is PromiseFulfilledResult<unknown> => r.status === "fulfilled" && r.value != null)
        .map(r => r.value);

      if (treesRes?.styles) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const allParsed: TreeDef[] = treesRes.styles.map((s: any) => ({
          id: s.id, name: s.name ?? REF_TREE_NAME[s.id] ?? "", iconPath: s.iconPath ?? "",
          slots: (s.slots ?? []).map((sl: { type?: string; perks?: number[] }) => ({
            type: sl.type ?? "", perks: sl.perks ?? [],
          })),
        }));
        setTrees(allParsed);
        const ordered: TreeDef[] = [];
        const byId = new Map(allParsed.map(t => [t.id, t]));
        for (const id of REF_TREE_ORDER) {
          const t = byId.get(id);
          if (t) ordered.push(t);
        }
        setAllTrees(ordered);
      }

      if (Array.isArray(perksRes)) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        for (const p of perksRes) {
          if (p.id && !perkNamesById.has(p.id)) {
            perkNamesById.set(p.id, { name: p.name ?? `Rune ${p.id}`, desc: p.longDesc ?? p.shortDesc ?? "" });
          }
        }
      }

      const ext = extractSamples(bundles, championName);
      setSamples(ext);
      setPlayerCount(bundles.length);
      setLastUpdate(ext.reduce((mx, s) => Math.max(mx, s.gameEnd), 0));
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [championName]);

  const topTreeCombo = useMemo(() => {
    const counts = new Map<string, number>();
    for (const s of samples) {
      const k = `${s.primaryTree}:${s.secondaryTree}`;
      counts.set(k, (counts.get(k) ?? 0) + 1);
    }
    const best = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
    if (!best) return { pri: 0, sec: 0 };
    const [p, s] = best[0].split(":").map(Number);
    return { pri: p, sec: s };
  }, [samples]);

  const priTree = useMemo(() => trees.find(t => t.id === topTreeCombo.pri), [trees, topTreeCombo.pri]);
  const secTree = useMemo(() => trees.find(t => t.id === topTreeCombo.sec), [trees, topTreeCombo.sec]);

  const keystoneAgg = useMemo(() => aggSlotRunes(samples, s => s.keystoneId, buildTab), [samples, buildTab]);
  const priSlotAggs = useMemo(() => [
    aggSlotRunes(samples, s => s.primarySlots[0], buildTab),
    aggSlotRunes(samples, s => s.primarySlots[1], buildTab),
    aggSlotRunes(samples, s => s.primarySlots[2], buildTab),
  ], [samples, buildTab]);
  const secSlotAggs = useMemo(() => [
    aggSlotRunes(samples, s => s.secondarySlots[0], buildTab),
    aggSlotRunes(samples, s => s.secondarySlots[1], buildTab),
  ], [samples, buildTab]);
  const shardAggs = useMemo(() => [
    aggSlotRunes(samples, s => s.shardIds[0], buildTab),
    aggSlotRunes(samples, s => s.shardIds[1], buildTab),
    aggSlotRunes(samples, s => s.shardIds[2], buildTab),
  ], [samples, buildTab]);

  const itemSlots = useMemo(() => {
    const labels = ["1st Item", "2nd Item", "3rd Item"];
    const slots = labels.map((label, pos) => ({
      label,
      items: aggItemSlot(samples, s => { const sorted = sortByGold(s.items, itemData); return sorted[pos] ?? 0; }, buildTab),
    }));
    slots.push({ label: "Boots", items: aggItemSlot(samples, s => s.bootId, buildTab) });
    return slots;
  }, [samples, buildTab, itemData]);

  const secondItemsForExpanded = useMemo(() => {
    if (expandedFirstItem == null) return [];
    return aggSecondItems(samples, expandedFirstItem, itemData, buildTab);
  }, [samples, expandedFirstItem, itemData, buildTab]);

  const perkName = (id: number) => perkNamesById.get(id)?.name ?? `Rune ${id}`;
  const perkDesc = (id: number) => perkNamesById.get(id)?.desc;

  const priAccent = TREE_ACCENT[topTreeCombo.pri] ?? "#6366f1";
  const secAccent = TREE_ACCENT[topTreeCombo.sec] ?? "#6366f1";

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 gap-3 text-zinc-500 text-sm">
        <div className="w-5 h-5 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" style={{ boxShadow: "0 0 12px rgba(99,102,241,0.2)" }} />
        Aggregating build data\u2026
      </div>
    );
  }

  if (samples.length === 0) {
    return (
      <div className="text-center py-16">
        <p className="text-zinc-400">No match data found for {championName}</p>
        <p className="text-zinc-600 text-sm mt-1">Play games on a tracked account to populate build data.</p>
      </div>
    );
  }

  const firstItemGroup = itemSlots[0];
  const topFirstWr = firstItemGroup?.items[0]?.winRate ?? 0;

  return (
    <div className="flex flex-col gap-5">
      {/* ── Rank filter ─────────────────────────── */}
      <div className="flex gap-1 flex-wrap">
        {RANK_FILTERS.map(rf => (
          <button key={rf.key} onClick={() => setRankFilter(rf.key)}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              rankFilter === rf.key
                ? "bg-indigo-500/15 text-indigo-400 border border-indigo-500/30"
                : "text-zinc-500 hover:text-zinc-300 border border-transparent hover:border-white/10 hover:bg-white/[0.03]"
            }`}>{rf.label}</button>
        ))}
      </div>

      {/* ── Data freshness ──────────────────────── */}
      <div className="text-[11px] text-zinc-500">
        Based on {samples.length} game{samples.length !== 1 ? "s" : ""}
        {" \u00b7 "}Patch 16.5
        {" \u00b7 "}Updated {lastUpdate > 0 ? timeAgo(lastUpdate) : "unknown"}
      </div>

      {/* ── Sub-tabs ────────────────────────────── */}
      <div className="flex gap-1">
        {(["popular", "winrate"] as BuildTab[]).map(t => (
          <button key={t} onClick={() => { setBuildTab(t); setExpandedFirstItem(null); }}
            className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all ${
              buildTab === t
                ? "bg-indigo-500/15 text-indigo-400 border border-indigo-500/30"
                : "text-zinc-500 hover:text-zinc-300 border border-transparent hover:border-white/10 hover:bg-white/[0.03]"
            }`}>{t === "popular" ? "Most Popular" : "Highest Win Rate"}</button>
        ))}
      </div>

      {/* ── Two-column ──────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">

        {/* ── Left: Rune Grid ────────────────────── */}
        <div className="lg:col-span-5">
          <Card>
            <CardHead title="Rune Configuration" meta={`${samples.length} games`} />

            {priTree && (
              <div className="mt-4 mb-5">
                <TreeLabel iconPath={priTree.iconPath} name={priTree.name} accent={priAccent} />
                {priTree.slots.map((slot, si) => {
                  const agg = si === 0 ? keystoneAgg : priSlotAggs[si - 1] ?? [];
                  const aggMap = new Map(agg.map(r => [r.id, r]));
                  const topId = agg[0]?.id;
                  const isKeystone = si === 0;
                  return (
                    <div key={si} className="flex items-center gap-2 py-1.5">
                      {slot.perks.map(pid => (
                        <RuneCell key={pid} id={pid} icon={getPerkIcon(pid)}
                          name={perkName(pid)} desc={perkDesc(pid)}
                          pickRate={aggMap.get(pid)?.pickRate ?? 0}
                          winRate={aggMap.get(pid)?.winRate ?? 0}
                          games={aggMap.get(pid)?.games ?? 0}
                          isTop={pid === topId} size={isKeystone ? 40 : 30}
                          accent={priAccent} />
                      ))}
                    </div>
                  );
                })}
              </div>
            )}

            {secTree && (
              <div className="mb-5">
                <TreeLabel iconPath={secTree.iconPath} name={secTree.name} accent={secAccent} />
                {secTree.slots.slice(1).map((slot, si) => {
                  const agg = secSlotAggs[si] ?? [];
                  const aggMap = new Map(agg.map(r => [r.id, r]));
                  const topId = agg[0]?.id;
                  return (
                    <div key={si} className="flex items-center gap-2 py-1.5">
                      {slot.perks.map(pid => (
                        <RuneCell key={pid} id={pid} icon={getPerkIcon(pid)}
                          name={perkName(pid)} desc={perkDesc(pid)}
                          pickRate={aggMap.get(pid)?.pickRate ?? 0}
                          winRate={aggMap.get(pid)?.winRate ?? 0}
                          games={aggMap.get(pid)?.games ?? 0}
                          isTop={pid === topId} size={30}
                          accent={secAccent} />
                      ))}
                    </div>
                  );
                })}
              </div>
            )}

            <div className="pt-4 border-t border-white/5">
              <p className="text-[10px] text-zinc-600 uppercase tracking-widest mb-2">Stat Shards</p>
              {SHARD_ROWS.map((row, ri) => {
                const agg = shardAggs[ri] ?? [];
                const aggMap = new Map(agg.map(r => [r.id, r]));
                const topId = agg[0]?.id;
                return (
                  <div key={ri} className="flex items-center gap-3 py-1">
                    {row.map(sid => {
                      const a = aggMap.get(sid);
                      const isTop = sid === topId;
                      return (
                        <div key={`${ri}-${sid}`} className="flex flex-col items-center gap-0.5"
                          style={{ opacity: isTop ? 1 : 0.4 }}>
                          <img src={SHARD_ICONS[sid] ?? ""} alt="" className="w-5 h-5" />
                          <span className="text-[9px] text-zinc-500">{SHARD_NAMES[sid] ?? sid}</span>
                          <span className="text-[9px] text-zinc-600">{a ? `${a.pickRate}%` : "\u2014"}</span>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </Card>
        </div>

        {/* ── Right: Item Build Path ─────────────── */}
        <div className="lg:col-span-7">
          <Card>
            <CardHead title="First Item Win Rates" meta={buildTab === "popular" ? "by pick rate" : "by win rate"} />
            <div className="overflow-x-auto -mx-1 px-1 mt-3">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-white/5">
                    <Th align="left">Slot</Th>
                    <Th align="left">Item</Th>
                    <Th align="right">WR</Th>
                    <Th align="right">Pick</Th>
                    <Th align="right">Games</Th>
                    <Th align="right">Diff</Th>
                  </tr>
                </thead>
                <tbody>
                  {itemSlots.map(group => {
                    const isFirstSlot = group.label === "1st Item";
                    const visible = group.items.filter(i => i.games >= HIDE_THRESHOLD);
                    const hidden = group.items.length - visible.length;

                    if (visible.length === 0) {
                      return (
                        <tr key={group.label} className="border-b border-white/[0.03]">
                          <td className="py-2 px-2 text-zinc-500 font-medium text-[11px]">{group.label}</td>
                          <td className="py-2 px-2 text-zinc-600 text-[10px]" colSpan={5}>
                            {hidden > 0 ? "Not enough data" : "\u2014"}
                          </td>
                        </tr>
                      );
                    }

                    return visible.map((item, j) => {
                      const isExpanded = isFirstSlot && expandedFirstItem === item.id;
                      const diff = isFirstSlot && j > 0 ? Math.round((item.winRate - topFirstWr) * 10) / 10 : null;
                      return (
                        <ItemRowGroup key={`${group.label}-${item.id}`}
                          slot={j === 0 ? group.label : ""}
                          item={item}
                          slotLabel={`${item.winRate}% as ${group.label}`}
                          diff={diff}
                          lowSample={item.games < LOW_SAMPLE}
                          expandable={isFirstSlot}
                          isExpanded={isExpanded}
                          onToggle={() => setExpandedFirstItem(isExpanded ? null : item.id)}
                          secondItems={isExpanded ? secondItemsForExpanded : []}
                          firstItemName={itemData[item.id]?.name ?? ""}
                          itemData={itemData}
                        />
                      );
                    });
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      </div>

      {/* ── Rune Trees Reference ─────────────────── */}
      {allTrees.length > 0 && (
        <div className="mt-6">
          <Card>
            <CardHead title="Rune Trees Reference" meta="All trees · pick rates" />
            <div className="overflow-x-auto -mx-1 px-1 mt-4">
              <div className="flex gap-4 min-w-max lg:min-w-0 lg:grid lg:grid-cols-5">
                {allTrees.map(tree => {
                  const accent = TREE_ACCENT[tree.id] ?? "#6366f1";
                  const treeUrl = tree.iconPath ? perkIconPathToUrl(tree.iconPath) : "";
                  return (
                    <div key={tree.id}
                      className="min-w-[180px] flex-1 rounded-xl bg-[#12131d] border border-white/10 overflow-hidden"
                      style={{ borderTopColor: accent, borderTopWidth: 3 }}>
                      <div className="flex items-center gap-2 px-3 pt-3 pb-2">
                        {treeUrl ? <img src={treeUrl} alt="" className="w-6 h-6" /> :
                          <div className="w-6 h-6 rounded-full bg-zinc-800" />}
                        <span className="text-[10px] font-bold uppercase tracking-wider"
                          style={{ color: accent }}>{tree.name}</span>
                      </div>
                      <div className="px-3 pb-2">
                        {tree.slots.map((slot, si) => {
                          const isKeystone = si === 0;
                          const aggs = aggSlotRunes(
                            samples.filter(s => s.primaryTree === tree.id || s.secondaryTree === tree.id),
                            s => {
                              if (isKeystone) return s.keystoneId;
                              if (s.primaryTree === tree.id) return s.primarySlots[si - 1];
                              const secIdx = si - 1;
                              return s.secondarySlots[secIdx];
                            },
                            buildTab,
                          );
                          const aggMap = new Map(aggs.map(r => [r.id, r]));
                          const topId = aggs[0]?.id;
                          return (
                            <div key={si}>
                              {si > 0 && <div className="border-t border-white/5 my-1.5" />}
                              <div className={`flex items-start justify-center gap-${isKeystone ? "3" : "2"} py-1.5`}>
                                {slot.perks.map(pid => {
                                  const a = aggMap.get(pid);
                                  const isTop = pid === topId;
                                  const name = perkName(pid);
                                  const desc = perkDesc(pid);
                                  const sz = isKeystone ? 36 : 26;
                                  const pr = a?.pickRate ?? 0;
                                  const wr = a?.winRate ?? 0;
                                  const g = a?.games ?? 0;
                                  const tooltip = [
                                    desc ?? "",
                                    "",
                                    `${pr}% pick · ${wr}% WR · ${g} games`,
                                  ].filter(Boolean).join("\n");
                                  return (
                                    <LeagueTooltip key={pid} title={name} body={tooltip}>
                                      <div className="flex flex-col items-center gap-0.5 cursor-default"
                                        style={{ opacity: isTop ? 1 : 0.4, transition: "opacity 0.2s" }}>
                                        <img src={getPerkIcon(pid)} alt={name}
                                          className="rounded-full"
                                          style={{
                                            width: sz, height: sz,
                                            border: isTop ? `2px solid ${accent}` : "2px solid transparent",
                                            boxShadow: isTop ? `0 0 8px ${accent}55` : undefined,
                                          }} />
                                        <span className="text-[8px] text-zinc-500 tabular-nums">
                                          {pr > 0 ? `${pr}%` : "\u2014"}
                                        </span>
                                      </div>
                                    </LeagueTooltip>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      <div className="px-3 pb-3 pt-1 border-t border-white/5">
                        <p className="text-[9px] text-zinc-600 uppercase tracking-widest mb-1.5 font-semibold">Shards</p>
                        {REF_SHARD_ROWS.map((row) => {
                          const shardAgg = aggSlotRunes(
                            samples.filter(s => s.primaryTree === tree.id),
                            s => {
                              const idx = REF_SHARD_ROWS.indexOf(row);
                              return s.shardIds[idx];
                            },
                            buildTab,
                          );
                          const shardMap = new Map(shardAgg.map(r => [r.id, r]));
                          const topShard = shardAgg[0]?.id;
                          return (
                            <div key={row.label} className="mb-1.5">
                              <p className="text-[8px] text-zinc-600 mb-0.5">{row.label}</p>
                              <div className="flex items-center gap-2">
                                {row.shards.map(sid => {
                                  const a = shardMap.get(sid);
                                  const isTop = sid === topShard;
                                  return (
                                    <div key={`${row.label}-${sid}`}
                                      className="flex flex-col items-center gap-0"
                                      style={{ opacity: isTop ? 1 : 0.4 }}>
                                      <img src={SHARD_ICONS[sid] ?? ""} alt="" className="w-4 h-4" />
                                      <span className="text-[8px] text-zinc-500">{SHARD_NAMES[sid] ?? sid}</span>
                                      <span className="text-[8px] text-zinc-600">{a ? `${a.pickRate}%` : "\u2014"}</span>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

/* ── Sub-components ─────────────────────────────────────── */

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl p-5" style={{
      background: "rgba(255,255,255,0.03)",
      border: "1px solid rgba(255,255,255,0.06)",
      backdropFilter: "blur(12px)",
    }}>{children}</div>
  );
}

function CardHead({ title, meta }: { title: string; meta?: string }) {
  return (
    <div className="flex items-baseline justify-between">
      <h3 className="text-sm font-bold text-zinc-100">{title}</h3>
      {meta && <span className="text-[10px] text-zinc-500">{meta}</span>}
    </div>
  );
}

function Th({ children, align }: { children: React.ReactNode; align: "left" | "right" }) {
  return (
    <th className={`text-${align} text-[10px] text-zinc-600 uppercase tracking-wider py-2 px-2 font-semibold`}>
      {children}
    </th>
  );
}

function TreeLabel({ iconPath, name, accent }: { iconPath: string; name: string; accent: string }) {
  const url = iconPath ? perkIconPathToUrl(iconPath) : "";
  return (
    <div className="flex items-center gap-2 mb-2">
      {url ? <img src={url} alt="" className="w-5 h-5" /> : <div className="w-5 h-5 rounded-full bg-zinc-800" />}
      <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: accent }}>{name}</span>
    </div>
  );
}

function RuneCell({
  id, icon, name, desc, pickRate, winRate, games, isTop, size, accent,
}: {
  id: number; icon: string; name: string; desc?: string;
  pickRate: number; winRate: number; games: number;
  isTop: boolean; size: number; accent: string;
}) {
  const s = `${size}px`;
  const lowSample = games < LOW_SAMPLE && games > 0;
  const tooltipBody = [
    desc ?? "",
    "",
    `${pickRate}% pick rate \u00b7 ${winRate}% win rate \u00b7 ${games} games`,
    lowSample ? "\u26a0 Low sample size" : "",
  ].filter(Boolean).join("\n");

  return (
    <LeagueTooltip title={name} body={tooltipBody}>
      <div className="flex flex-col items-center gap-0.5 cursor-default"
        style={{ opacity: isTop ? 1 : 0.4, transition: "opacity 0.2s" }}>
        {icon ? (
          <img src={icon} alt={name} className="rounded-full"
            style={{
              width: s, height: s,
              border: isTop ? `2px solid ${accent}` : "2px solid transparent",
              boxShadow: isTop ? `0 0 8px ${accent}55` : undefined,
            }} />
        ) : (
          <div className="rounded-full bg-zinc-800 border border-zinc-700/50" style={{ width: s, height: s }} />
        )}
        <span className="text-[9px] text-zinc-500 tabular-nums">
          {pickRate > 0 ? `${pickRate}%` : "\u2014"}
          {lowSample && " \u26a0"}
        </span>
      </div>
    </LeagueTooltip>
  );
}

function ItemRowGroup({
  slot, item, slotLabel, diff, lowSample, expandable, isExpanded,
  onToggle, secondItems, firstItemName, itemData,
}: {
  slot: string; item: ItemAgg; slotLabel: string; diff: number | null;
  lowSample: boolean; expandable: boolean; isExpanded: boolean;
  onToggle: () => void; secondItems: ItemAgg[]; firstItemName: string;
  itemData: ItemTooltipData;
}) {
  const tip = getItemTooltip(itemData, item.id);
  const itemName = itemData[item.id]?.name ?? `Item ${item.id}`;

  return (
    <>
      <tr className={`border-b border-white/[0.03] transition-colors ${expandable ? "cursor-pointer hover:bg-white/[0.03]" : "hover:bg-white/[0.02]"}`}
        onClick={expandable ? onToggle : undefined}>
        <td className="py-2.5 px-2 text-zinc-500 font-medium text-[11px] align-middle whitespace-nowrap">{slot}</td>
        <td className="py-2.5 px-2 align-middle">
          <LeagueTooltip title={tip.title} body={tip.body} bodyHtml={tip.bodyHtml}>
            <div className="flex items-center gap-2 cursor-default">
              <img src={getItemIconUrl(item.id)} alt={itemName} className="w-8 h-8 rounded-lg border border-white/10" />
              <div className="flex flex-col">
                <span className="text-xs text-zinc-200 font-medium truncate max-w-[140px]">
                  {itemName}
                  {lowSample && <span className="text-amber-400 ml-1" title="Low sample size">{"\u26a0"}</span>}
                </span>
                <span className="text-[9px] text-zinc-600">{slotLabel}</span>
              </div>
              {expandable && (
                <svg className={`w-3 h-3 text-zinc-600 ml-auto transition-transform ${isExpanded ? "rotate-180" : ""}`}
                  fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              )}
            </div>
          </LeagueTooltip>
        </td>
        <td className="py-2.5 px-2 text-right align-middle">
          <span className={`text-xs font-bold ${item.winRate >= 52 ? "text-emerald-400" : item.winRate >= 50 ? "text-zinc-300" : "text-red-400"}`}>
            {item.winRate}%
          </span>
        </td>
        <td className="py-2.5 px-2 text-right align-middle text-xs text-zinc-400">{item.pickRate}%</td>
        <td className="py-2.5 px-2 text-right align-middle text-xs text-zinc-600">{item.games}</td>
        <td className="py-2.5 px-2 text-right align-middle text-[10px]">
          {diff != null ? (
            <span className={diff > 0 ? "text-emerald-400" : diff < 0 ? "text-red-400" : "text-zinc-600"}>
              {diff > 0 ? "+" : ""}{diff}%
            </span>
          ) : (
            <span className="text-zinc-700">\u2014</span>
          )}
        </td>
      </tr>

      {isExpanded && (
        <>
          <tr className="bg-white/[0.01]">
            <td colSpan={6} className="py-1.5 px-4 text-[10px] text-indigo-400 font-semibold">
              Then built 2nd after {firstItemName}:
            </td>
          </tr>
          {secondItems.length > 0 ? secondItems.map(si => {
            const siName = itemData[si.id]?.name ?? `Item ${si.id}`;
            const siTip = getItemTooltip(itemData, si.id);
            const siLow = si.games < LOW_SAMPLE;
            return (
              <tr key={si.id} className="bg-white/[0.01] border-b border-white/[0.02] hover:bg-white/[0.03]">
                <td className="py-2 px-2" />
                <td className="py-2 px-2 align-middle">
                  <LeagueTooltip title={siTip.title} body={siTip.body} bodyHtml={siTip.bodyHtml}>
                    <div className="flex items-center gap-2 cursor-default pl-2">
                      <img src={getItemIconUrl(si.id)} alt={siName} className="w-6 h-6 rounded-md border border-white/10" />
                      <div className="flex flex-col">
                        <span className="text-[11px] text-zinc-300 truncate max-w-[130px]">
                          {siName}
                          {siLow && <span className="text-amber-400 ml-1">{"\u26a0"}</span>}
                        </span>
                        <span className="text-[8px] text-zinc-600">{si.winRate}% as 2nd after {firstItemName}</span>
                      </div>
                    </div>
                  </LeagueTooltip>
                </td>
                <td className="py-2 px-2 text-right align-middle">
                  <span className={`text-[11px] font-bold ${si.winRate >= 52 ? "text-emerald-400" : si.winRate >= 50 ? "text-zinc-300" : "text-red-400"}`}>
                    {si.winRate}%
                  </span>
                </td>
                <td className="py-2 px-2 text-right align-middle text-[11px] text-zinc-400">{si.pickRate}%</td>
                <td className="py-2 px-2 text-right align-middle text-[11px] text-zinc-600">{si.games}</td>
                <td className="py-2 px-2" />
              </tr>
            );
          }) : (
            <tr className="bg-white/[0.01]">
              <td colSpan={6} className="py-2 px-4 text-[10px] text-zinc-600">Not enough data for second items</td>
            </tr>
          )}
        </>
      )}
    </>
  );
}
