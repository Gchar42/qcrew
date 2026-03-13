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

const PERKSTYLES_URL =
  "https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/perkstyles.json";

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
  5008: "Adaptive",
  5005: "Atk Spd",
  5007: "Haste",
  5002: "Armor",
  5003: "MR",
  5001: "Health",
};

const RANK_FILTERS: { key: string; label: string }[] = [
  { key: "all", label: "All" },
  { key: "low", label: "Iron–Silver" },
  { key: "mid", label: "Gold–Plat" },
  { key: "high", label: "Emerald–Diamond" },
  { key: "elite", label: "Master+" },
];

/* ── Types ──────────────────────────────────────────────── */

type MatchSample = {
  win: boolean;
  kills: number;
  deaths: number;
  assists: number;
  items: number[];
  bootId: number;
  primaryTree: number;
  secondaryTree: number;
  keystoneId: number;
  primarySlots: number[];
  secondarySlots: number[];
  shardIds: number[];
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
    e.g++;
    if (s.win) e.w++;
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
    e.g++;
    if (s.win) e.w++;
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
    .slice(0, 4);
}

function sortByGold(items: number[], itemData: ItemTooltipData): number[] {
  return [...items]
    .filter(id => id > 0 && (itemData[id]?.gold ?? 0) >= MIN_COMPLETED_GOLD)
    .sort((a, b) => (itemData[a]?.gold ?? 9999) - (itemData[b]?.gold ?? 9999));
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
  const [buildTab, setBuildTab] = useState<BuildTab>("popular");
  const [rankFilter, setRankFilter] = useState("all");
  const [playerCount, setPlayerCount] = useState(0);
  const [lastUpdate, setLastUpdate] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const [bundleResults, treesRes] = await Promise.all([
        Promise.allSettled(
          DEMO_ACCOUNTS.map(async ({ riotId, region }) => {
            const url = `/api/riot/profileBundle?riotId=${encodeURIComponent(riotId)}&region=${encodeURIComponent(region)}&queue=solo`;
            const r = await fetch(url, { cache: "no-store" });
            return r.ok ? r.json() : null;
          }),
        ),
        fetch(PERKSTYLES_URL).then(r => r.ok ? r.json() : null).catch(() => null),
      ]);
      if (cancelled) return;

      const bundles = bundleResults
        .filter((r): r is PromiseFulfilledResult<unknown> => r.status === "fulfilled" && r.value != null)
        .map(r => r.value);

      if (treesRes?.styles) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setTrees(treesRes.styles.map((s: any) => ({
          id: s.id,
          name: s.name ?? "",
          iconPath: s.iconPath ?? "",
          slots: (s.slots ?? []).map((sl: { type?: string; perks?: number[] }) => ({
            type: sl.type ?? "",
            perks: sl.perks ?? [],
          })),
        })));
      }

      const ext = extractSamples(bundles, championName);
      setSamples(ext);
      setPlayerCount(bundles.length);
      setLastUpdate(ext.reduce((mx, s) => Math.max(mx, s.gameEnd), 0));
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [championName]);

  /* Determine primary & secondary tree from data */
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

  /* Rune aggregation per slot */
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

  /* Item aggregation */
  const itemSlots = useMemo(() => {
    const labels = ["1st Item", "2nd Item", "3rd Item"];
    const slots = labels.map((label, pos) => ({
      label,
      items: aggItemSlot(samples, s => { const sorted = sortByGold(s.items, itemData); return sorted[pos] ?? 0; }, buildTab),
    }));
    slots.push({
      label: "Boots",
      items: aggItemSlot(samples, s => s.bootId, buildTab),
    });
    return slots;
  }, [samples, buildTab, itemData]);

  const perkName = (id: number) => perkNamesById.get(id)?.name ?? `Rune ${id}`;
  const perkDesc = (id: number) => perkNamesById.get(id)?.desc;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 gap-3 text-zinc-500 text-sm">
        <div className="w-5 h-5 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" style={{ boxShadow: "0 0 12px rgba(99,102,241,0.2)" }} />
        Aggregating build data…
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

  return (
    <div className="flex flex-col gap-5">
      {/* ── Rank filter row ─────────────────────── */}
      <div className="flex gap-1 flex-wrap">
        {RANK_FILTERS.map(rf => (
          <button
            key={rf.key}
            onClick={() => setRankFilter(rf.key)}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              rankFilter === rf.key
                ? "bg-indigo-500/15 text-indigo-400 border border-indigo-500/30"
                : "text-zinc-500 hover:text-zinc-300 border border-transparent hover:border-white/10 hover:bg-white/[0.03]"
            }`}
          >
            {rf.label}
          </button>
        ))}
      </div>

      {/* ── Sub-tabs ────────────────────────────── */}
      <div className="flex gap-1">
        {(["popular", "winrate"] as BuildTab[]).map(t => (
          <button
            key={t}
            onClick={() => setBuildTab(t)}
            className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all ${
              buildTab === t
                ? "bg-indigo-500/15 text-indigo-400 border border-indigo-500/30"
                : "text-zinc-500 hover:text-zinc-300 border border-transparent hover:border-white/10 hover:bg-white/[0.03]"
            }`}
          >
            {t === "popular" ? "Most Popular" : "Highest Win Rate"}
          </button>
        ))}
      </div>

      {/* ── Two-column ──────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">

        {/* ── Left: Rune Grid ────────────────────── */}
        <div className="lg:col-span-5">
          <Card>
            <CardHead title="Rune Configuration" meta={`${samples.length} games`} />

            {/* Primary tree */}
            {priTree && (
              <div className="mt-4 mb-5">
                <TreeLabel iconPath={priTree.iconPath} name={priTree.name} />
                {priTree.slots.map((slot, si) => {
                  const agg = si === 0 ? keystoneAgg : priSlotAggs[si - 1] ?? [];
                  const aggMap = new Map(agg.map(r => [r.id, r]));
                  const topId = agg[0]?.id;
                  const isKeystone = si === 0;
                  return (
                    <div key={si} className="flex items-center gap-2 py-1.5">
                      {slot.perks.map(pid => {
                        const a = aggMap.get(pid);
                        const isTop = pid === topId;
                        return (
                          <RuneCell
                            key={pid}
                            id={pid}
                            icon={getPerkIcon(pid)}
                            name={perkName(pid)}
                            desc={perkDesc(pid)}
                            pickRate={a?.pickRate ?? 0}
                            winRate={a?.winRate ?? 0}
                            isTop={isTop}
                            size={isKeystone ? 40 : 30}
                          />
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Secondary tree */}
            {secTree && (
              <div className="mb-5">
                <TreeLabel iconPath={secTree.iconPath} name={secTree.name} />
                {secTree.slots.slice(1).map((slot, si) => {
                  const agg = secSlotAggs[si] ?? [];
                  const aggMap = new Map(agg.map(r => [r.id, r]));
                  const topId = agg[0]?.id;
                  return (
                    <div key={si} className="flex items-center gap-2 py-1.5">
                      {slot.perks.map(pid => {
                        const a = aggMap.get(pid);
                        const isTop = pid === topId;
                        return (
                          <RuneCell
                            key={pid}
                            id={pid}
                            icon={getPerkIcon(pid)}
                            name={perkName(pid)}
                            desc={perkDesc(pid)}
                            pickRate={a?.pickRate ?? 0}
                            winRate={a?.winRate ?? 0}
                            isTop={isTop}
                            size={30}
                          />
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Stat shards */}
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
                        <div
                          key={`${ri}-${sid}`}
                          className="flex flex-col items-center gap-0.5"
                          style={{ opacity: isTop ? 1 : 0.4 }}
                        >
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
            <CardHead title="Item Build Path" meta={buildTab === "popular" ? "by pick rate" : "by win rate"} />
            <div className="overflow-x-auto -mx-1 px-1 mt-3">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-white/5">
                    <Th align="left">Slot</Th>
                    <Th align="left">Item</Th>
                    <Th align="right">WR</Th>
                    <Th align="right">Pick</Th>
                    <Th align="right">Games</Th>
                  </tr>
                </thead>
                <tbody>
                  {itemSlots.map(group =>
                    group.items.length > 0 ? (
                      group.items.map((item, j) => (
                        <ItemRow
                          key={`${group.label}-${item.id}`}
                          slot={j === 0 ? group.label : ""}
                          itemId={item.id}
                          itemName={itemData[item.id]?.name ?? `Item ${item.id}`}
                          winRate={item.winRate}
                          pickRate={item.pickRate}
                          games={item.games}
                          slotLabel={`${item.winRate}% as ${group.label}`}
                          itemData={itemData}
                        />
                      ))
                    ) : (
                      <tr key={group.label} className="border-b border-white/[0.03]">
                        <td className="py-2 px-2 text-zinc-500 font-medium text-[11px]">{group.label}</td>
                        <td className="py-2 px-2 text-zinc-600" colSpan={4}>&mdash;</td>
                      </tr>
                    ),
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      </div>

      {/* ── Data Freshness ──────────────────────── */}
      <div className="text-center text-[11px] text-zinc-600 py-2">
        {lastUpdate > 0 ? `Updated ${timeAgo(lastUpdate)}` : "No timestamp"}
        {" · "}Source: {playerCount} player{playerCount !== 1 ? "s" : ""}
        {" · "}{samples.length} game{samples.length !== 1 ? "s" : ""}
        {rankFilter !== "all" && <> · Rank filter: {RANK_FILTERS.find(r => r.key === rankFilter)?.label}</>}
      </div>
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
    }}>
      {children}
    </div>
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

function TreeLabel({ iconPath, name }: { iconPath: string; name: string }) {
  const url = iconPath ? perkIconPathToUrl(iconPath) : "";
  return (
    <div className="flex items-center gap-2 mb-2">
      {url ? <img src={url} alt="" className="w-5 h-5" /> : <div className="w-5 h-5 rounded-full bg-zinc-800" />}
      <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">{name}</span>
    </div>
  );
}

function RuneCell({
  id, icon, name, desc, pickRate, winRate, isTop, size,
}: {
  id: number; icon: string; name: string; desc?: string;
  pickRate: number; winRate: number; isTop: boolean; size: number;
}) {
  const s = `${size}px`;
  return (
    <LeagueTooltip title={name} body={desc ? `${desc}\n\n${pickRate}% pick · ${winRate}% WR` : `${pickRate}% pick · ${winRate}% WR`}>
      <div
        className="flex flex-col items-center gap-0.5 cursor-default"
        style={{ opacity: isTop ? 1 : 0.4, transition: "opacity 0.2s" }}
      >
        {icon ? (
          <img
            src={icon}
            alt={name}
            className="rounded-full"
            style={{
              width: s, height: s,
              boxShadow: isTop ? "0 0 10px rgba(99,102,241,0.3)" : undefined,
            }}
          />
        ) : (
          <div className="rounded-full bg-zinc-800 border border-zinc-700/50" style={{ width: s, height: s }} />
        )}
        <span className="text-[9px] text-zinc-500 tabular-nums">{pickRate > 0 ? `${pickRate}%` : "\u2014"}</span>
      </div>
    </LeagueTooltip>
  );
}

function ItemRow({
  slot, itemId, itemName, winRate, pickRate, games, slotLabel, itemData,
}: {
  slot: string; itemId: number; itemName: string;
  winRate: number; pickRate: number; games: number; slotLabel: string;
  itemData: ItemTooltipData;
}) {
  const tip = getItemTooltip(itemData, itemId);
  return (
    <tr className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors">
      <td className="py-2.5 px-2 text-zinc-500 font-medium text-[11px] align-middle whitespace-nowrap">{slot}</td>
      <td className="py-2.5 px-2 align-middle">
        <LeagueTooltip title={tip.title} body={tip.body} bodyHtml={tip.bodyHtml}>
          <div className="flex items-center gap-2 cursor-default">
            <img src={getItemIconUrl(itemId)} alt={itemName} className="w-8 h-8 rounded-lg border border-white/10" />
            <div className="flex flex-col">
              <span className="text-xs text-zinc-200 font-medium truncate max-w-[140px]">{itemName}</span>
              <span className="text-[9px] text-zinc-600">{slotLabel}</span>
            </div>
          </div>
        </LeagueTooltip>
      </td>
      <td className="py-2.5 px-2 text-right align-middle">
        <span className={`text-xs font-bold ${winRate >= 52 ? "text-emerald-400" : winRate >= 50 ? "text-zinc-300" : "text-red-400"}`}>
          {winRate}%
        </span>
      </td>
      <td className="py-2.5 px-2 text-right align-middle text-xs text-zinc-400">{pickRate}%</td>
      <td className="py-2.5 px-2 text-right align-middle text-xs text-zinc-600">{games}</td>
    </tr>
  );
}
