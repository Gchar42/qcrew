"use client";

import { useEffect, useState, useMemo } from "react";
import {
  getItemIconUrl,
  type ItemTooltipData,
} from "@/lib/riotAssets";
import { perkIconPathToUrl } from "@/lib/runesCd";
import { LeagueTooltip } from "@/components/LeagueTooltip";

/* ── Demo accounts to aggregate from ───────────────────── */

const DEMO_ACCOUNTS = [
  { riotId: "Demo#NA1", region: "na1" },
  { riotId: "TestW#NA1", region: "na1" },
  { riotId: "TestL#NA1", region: "na1" },
];

const BOOT_IDS = new Set([
  1001, 2422, 3006, 3009, 3020, 3047, 3111, 3117, 3158,
]);
const MIN_COMPLETED_GOLD = 1300;

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

type RuneSlotAgg = {
  id: number;
  games: number;
  wins: number;
  winRate: number;
  pickRate: number;
};

type ItemSlotAgg = {
  id: number;
  games: number;
  wins: number;
  winRate: number;
  pickRate: number;
};

type BuildTab = "popular" | "winrate";

/* ── Data extraction ────────────────────────────────────── */

function extractSamples(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  bundles: any[],
  championName: string,
): MatchSample[] {
  const samples: MatchSample[] = [];

  for (const bundle of bundles) {
    if (!bundle?.profile?.account) continue;
    const puuid = bundle.profile.account.puuid;

    for (const match of bundle.matches ?? []) {
      const p = match.info?.participants?.find(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (x: any) =>
          x.puuid === puuid &&
          x.championName?.toLowerCase() === championName.toLowerCase(),
      );
      if (!p) continue;

      const rawItems = [
        p.item0 ?? 0,
        p.item1 ?? 0,
        p.item2 ?? 0,
        p.item3 ?? 0,
        p.item4 ?? 0,
        p.item5 ?? 0,
      ];
      const bootId = rawItems.find((id: number) => BOOT_IDS.has(id)) ?? 0;
      const items = rawItems.filter(
        (id: number) => id > 0 && !BOOT_IDS.has(id),
      );

      const styles = p.perks?.styles ?? [];
      const primary = styles[0];
      const secondary = styles[1];
      const primarySels =
        primary?.selections?.map((s: { perk: number }) => s.perk) ?? [];
      const secondarySels =
        secondary?.selections?.map((s: { perk: number }) => s.perk) ?? [];

      const allPerkIds = p.perks?.perkIds ?? [];
      const styleRunes = new Set([...primarySels, ...secondarySels]);
      const shardIds = allPerkIds.filter(
        (id: number) => id >= 5000 && id < 6000 && !styleRunes.has(id),
      );

      samples.push({
        win: p.win,
        kills: p.kills ?? 0,
        deaths: p.deaths ?? 0,
        assists: p.assists ?? 0,
        items,
        bootId,
        primaryTree: primary?.style ?? 0,
        secondaryTree: secondary?.style ?? 0,
        keystoneId: primarySels[0] ?? 0,
        primarySlots: primarySels.slice(1),
        secondarySlots: secondarySels,
        shardIds,
        gameEnd: match.info?.gameEndTimestamp ?? 0,
      });
    }
  }

  return samples;
}

/* ── Aggregation helpers ────────────────────────────────── */

function computeOverview(samples: MatchSample[]) {
  const games = samples.length;
  const wins = samples.filter((s) => s.win).length;
  let totalK = 0,
    totalD = 0,
    totalA = 0;
  for (const s of samples) {
    totalK += s.kills;
    totalD += s.deaths;
    totalA += s.assists;
  }
  return {
    games,
    wins,
    winRate: games > 0 ? Math.round((wins / games) * 1000) / 10 : 0,
    avgKills: games > 0 ? Math.round((totalK / games) * 10) / 10 : 0,
    avgDeaths: games > 0 ? Math.round((totalD / games) * 10) / 10 : 0,
    avgAssists: games > 0 ? Math.round((totalA / games) * 10) / 10 : 0,
    kda:
      games > 0
        ? Math.round(((totalK + totalA) / Math.max(1, totalD)) * 100) / 100
        : 0,
  };
}

function aggregateRuneSlots(
  samples: MatchSample[],
  tab: BuildTab,
): {
  primaryTree: number;
  secondaryTree: number;
  keystone: RuneSlotAgg[];
  primary: RuneSlotAgg[][];
  secondary: RuneSlotAgg[][];
  shards: RuneSlotAgg[][];
} {
  const total = samples.length || 1;

  const treeCount = new Map<string, number>();
  for (const s of samples) {
    const key = `${s.primaryTree}:${s.secondaryTree}`;
    treeCount.set(key, (treeCount.get(key) ?? 0) + 1);
  }
  const topTreeKey = [...treeCount.entries()].sort(
    (a, b) => b[1] - a[1],
  )[0]?.[0] ?? "0:0";
  const [primaryTree, secondaryTree] = topTreeKey.split(":").map(Number);

  function aggSlot(
    extractor: (s: MatchSample) => number | undefined,
  ): RuneSlotAgg[] {
    const map = new Map<number, { games: number; wins: number }>();
    for (const s of samples) {
      const id = extractor(s);
      if (!id) continue;
      const entry = map.get(id) ?? { games: 0, wins: 0 };
      entry.games++;
      if (s.win) entry.wins++;
      map.set(id, entry);
    }
    const arr = [...map.entries()].map(([id, { games, wins }]) => ({
      id,
      games,
      wins,
      winRate: games > 0 ? Math.round((wins / games) * 1000) / 10 : 0,
      pickRate: Math.round((games / total) * 1000) / 10,
    }));

    return arr.sort((a, b) =>
      tab === "winrate" ? b.winRate - a.winRate : b.games - a.games,
    );
  }

  return {
    primaryTree,
    secondaryTree,
    keystone: aggSlot((s) => s.keystoneId),
    primary: [
      aggSlot((s) => s.primarySlots[0]),
      aggSlot((s) => s.primarySlots[1]),
      aggSlot((s) => s.primarySlots[2]),
    ],
    secondary: [
      aggSlot((s) => s.secondarySlots[0]),
      aggSlot((s) => s.secondarySlots[1]),
    ],
    shards: [
      aggSlot((s) => s.shardIds[0]),
      aggSlot((s) => s.shardIds[1]),
      aggSlot((s) => s.shardIds[2]),
    ],
  };
}

function aggregateItems(
  samples: MatchSample[],
  tab: BuildTab,
  itemData: ItemTooltipData,
): { slot: string; items: ItemSlotAgg[] }[] {
  const total = samples.length || 1;

  function aggItemGroup(
    extractor: (s: MatchSample) => number,
  ): ItemSlotAgg[] {
    const map = new Map<number, { games: number; wins: number }>();
    for (const s of samples) {
      const id = extractor(s);
      if (!id) continue;
      const entry = map.get(id) ?? { games: 0, wins: 0 };
      entry.games++;
      if (s.win) entry.wins++;
      map.set(id, entry);
    }
    return [...map.entries()]
      .map(([id, { games, wins }]) => ({
        id,
        games,
        wins,
        winRate: games > 0 ? Math.round((wins / games) * 1000) / 10 : 0,
        pickRate: Math.round((games / total) * 1000) / 10,
      }))
      .filter((i) => i.games >= 1)
      .sort((a, b) =>
        tab === "winrate" ? b.winRate - a.winRate : b.games - a.games,
      )
      .slice(0, 3);
  }

  function sortItemsByGold(items: number[]): number[] {
    return [...items]
      .filter((id) => id > 0)
      .sort((a, b) => {
        const ga = itemData[a]?.gold ?? 9999;
        const gb = itemData[b]?.gold ?? 9999;
        return ga - gb;
      })
      .filter((id) => (itemData[id]?.gold ?? 0) >= MIN_COMPLETED_GOLD);
  }

  const slots: { slot: string; items: ItemSlotAgg[] }[] = [];

  for (let pos = 0; pos < 3; pos++) {
    slots.push({
      slot: `${pos + 1}${pos === 0 ? "st" : pos === 1 ? "nd" : "rd"} Item`,
      items: aggItemGroup((s) => {
        const sorted = sortItemsByGold(s.items);
        return sorted[pos] ?? 0;
      }),
    });
  }

  slots.push({
    slot: "Boots",
    items: aggItemGroup((s) => s.bootId),
  });

  return slots;
}

/* ── Stat shard icons ───────────────────────────────────── */

const STAT_SHARD_ICONS: Record<number, string> = {
  5008: "https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/perk-images/statmods/statmodsadaptiveforceicon.png",
  5005: "https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/perk-images/statmods/statmodsattackspeedicon.png",
  5007: "https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/perk-images/statmods/statmodscdrscalingicon.png",
  5002: "https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/perk-images/statmods/statmodsarmoricon.png",
  5003: "https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/perk-images/statmods/statmodsmagicresicon.png",
  5001: "https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/perk-images/statmods/statmodshealthscalingicon.png",
};

const STAT_SHARD_NAMES: Record<number, string> = {
  5008: "Adaptive Force",
  5005: "Attack Speed",
  5007: "Ability Haste",
  5002: "Armor",
  5003: "Magic Resist",
  5001: "Health Scaling",
};

/* ── Time formatting ────────────────────────────────────── */

function timeAgo(timestamp: number): string {
  if (!timestamp) return "Unknown";
  const diff = Date.now() - timestamp;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
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
  const [buildTab, setBuildTab] = useState<BuildTab>("popular");
  const [rankFilter, setRankFilter] = useState("all");
  const [playerCount, setPlayerCount] = useState(0);
  const [lastUpdate, setLastUpdate] = useState(0);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      const results = await Promise.allSettled(
        DEMO_ACCOUNTS.map(async ({ riotId, region }) => {
          const url = `/api/riot/profileBundle?riotId=${encodeURIComponent(riotId)}&region=${encodeURIComponent(region)}&queue=solo`;
          const res = await fetch(url, { cache: "no-store" });
          if (!res.ok) return null;
          return res.json();
        }),
      );
      if (cancelled) return;

      const bundles = results
        .filter(
          (r): r is PromiseFulfilledResult<unknown> =>
            r.status === "fulfilled" && r.value != null,
        )
        .map((r) => r.value);

      const extracted = extractSamples(bundles, championName);
      setSamples(extracted);
      setPlayerCount(bundles.length);
      setLastUpdate(
        extracted.reduce((max, s) => Math.max(max, s.gameEnd), 0),
      );
      setLoading(false);
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [championName]);

  const overview = useMemo(() => computeOverview(samples), [samples]);
  const runes = useMemo(
    () => aggregateRuneSlots(samples, buildTab),
    [samples, buildTab],
  );
  const itemSlots = useMemo(
    () => aggregateItems(samples, buildTab, itemData),
    [samples, buildTab, itemData],
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 gap-3 text-zinc-500 text-sm">
        <div
          className="w-5 h-5 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin"
          style={{ boxShadow: "0 0 12px rgba(99,102,241,0.2)" }}
        />
        Aggregating build data...
      </div>
    );
  }

  if (samples.length === 0) {
    return (
      <div className="text-center py-16">
        <p className="text-zinc-400">
          No match data found for {championName}
        </p>
        <p className="text-zinc-600 text-sm mt-1">
          Play games on a tracked account to populate build data.
        </p>
      </div>
    );
  }

  const perkName = (id: number) =>
    perkNamesById.get(id)?.name ?? `Rune ${id}`;
  const perkDesc = (id: number) => perkNamesById.get(id)?.desc;

  return (
    <div className="space-y-6">
      {/* ── Overview Stats ─────────────────────────── */}
      <div className="flex flex-wrap items-center gap-3">
        <Pill label="WR" value={`${overview.winRate}%`} color={overview.winRate >= 52 ? "text-emerald-400" : overview.winRate >= 50 ? "text-white" : "text-red-400"} />
        <Pill label="KDA" value={overview.kda.toFixed(2)} color="text-zinc-300" />
        <Pill
          label="Avg"
          value={`${overview.avgKills}/${overview.avgDeaths}/${overview.avgAssists}`}
          color="text-zinc-300"
        />
        <Pill label="Games" value={String(overview.games)} color="text-zinc-300" />
      </div>

      {/* ── Build Tabs + Rank Filter ──────────────── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex gap-1">
          {(["popular", "winrate"] as BuildTab[]).map((t) => (
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
        <select
          value={rankFilter}
          onChange={(e) => setRankFilter(e.target.value)}
          className="px-3 py-2 rounded-lg text-xs text-zinc-300 border border-zinc-700/50 focus:outline-none focus:border-indigo-500/50"
          style={{ background: "rgba(24, 24, 32, 0.7)" }}
        >
          <option value="all">All Ranks</option>
          <option value="diamond">Diamond+</option>
          <option value="master">Master+</option>
          <option value="challenger">Challenger</option>
        </select>
      </div>

      {/* ── Two-column layout ─────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* ── Left: Runes ──────────────────────────── */}
        <div className="lg:col-span-5">
          <GlassCard>
            <div className="flex items-baseline justify-between mb-4">
              <h3 className="text-sm font-bold text-zinc-100">
                Rune Configuration
              </h3>
              <span className="text-[10px] text-zinc-500">
                {overview.games} games
              </span>
            </div>

            {/* Primary tree */}
            <div className="mb-5">
              <div className="flex items-center gap-2 mb-3">
                <TreeIcon url={getStyleIcon(runes.primaryTree)} />
                <span className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">
                  Primary
                </span>
              </div>

              {/* Keystone */}
              {runes.keystone[0] && (
                <RuneRow
                  id={runes.keystone[0].id}
                  icon={getPerkIcon(runes.keystone[0].id)}
                  name={perkName(runes.keystone[0].id)}
                  desc={perkDesc(runes.keystone[0].id)}
                  pickRate={runes.keystone[0].pickRate}
                  winRate={runes.keystone[0].winRate}
                  size={40}
                  glow
                />
              )}

              {/* Primary slots */}
              {runes.primary.map((slot, i) =>
                slot[0] ? (
                  <RuneRow
                    key={i}
                    id={slot[0].id}
                    icon={getPerkIcon(slot[0].id)}
                    name={perkName(slot[0].id)}
                    desc={perkDesc(slot[0].id)}
                    pickRate={slot[0].pickRate}
                    winRate={slot[0].winRate}
                    size={30}
                  />
                ) : (
                  <PlaceholderRuneRow key={i} />
                ),
              )}
            </div>

            {/* Secondary tree */}
            <div className="mb-5">
              <div className="flex items-center gap-2 mb-3">
                <TreeIcon url={getStyleIcon(runes.secondaryTree)} />
                <span className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">
                  Secondary
                </span>
              </div>
              {runes.secondary.map((slot, i) =>
                slot[0] ? (
                  <RuneRow
                    key={i}
                    id={slot[0].id}
                    icon={getPerkIcon(slot[0].id)}
                    name={perkName(slot[0].id)}
                    desc={perkDesc(slot[0].id)}
                    pickRate={slot[0].pickRate}
                    winRate={slot[0].winRate}
                    size={30}
                  />
                ) : (
                  <PlaceholderRuneRow key={i} />
                ),
              )}
            </div>

            {/* Stat shards */}
            <div className="pt-4 border-t border-white/5">
              <p className="text-[10px] text-zinc-600 uppercase tracking-widest mb-2">
                Stat Shards
              </p>
              <div className="flex gap-2 flex-wrap">
                {runes.shards.map((slot, i) => {
                  const top = slot[0];
                  if (!top)
                    return (
                      <ShardPill key={i} icon="" name="\u2014" rate="\u2014" />
                    );
                  return (
                    <ShardPill
                      key={i}
                      icon={STAT_SHARD_ICONS[top.id] ?? ""}
                      name={STAT_SHARD_NAMES[top.id] ?? `Shard ${top.id}`}
                      rate={`${top.pickRate}%`}
                    />
                  );
                })}
              </div>
            </div>
          </GlassCard>
        </div>

        {/* ── Right: Item Paths ────────────────────── */}
        <div className="lg:col-span-7">
          <GlassCard>
            <div className="flex items-baseline justify-between mb-4">
              <h3 className="text-sm font-bold text-zinc-100">
                Item Build Path
              </h3>
              <span className="text-[10px] text-zinc-500">
                sorted by{" "}
                {buildTab === "popular" ? "pick rate" : "win rate"}
              </span>
            </div>

            <div className="overflow-x-auto -mx-1 px-1">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-white/5">
                    <th className="text-left text-[10px] text-zinc-600 uppercase tracking-wider py-2 px-2 font-semibold">
                      Slot
                    </th>
                    <th className="text-left text-[10px] text-zinc-600 uppercase tracking-wider py-2 px-2 font-semibold">
                      Item
                    </th>
                    <th className="text-right text-[10px] text-zinc-600 uppercase tracking-wider py-2 px-2 font-semibold">
                      WR
                    </th>
                    <th className="text-right text-[10px] text-zinc-600 uppercase tracking-wider py-2 px-2 font-semibold">
                      Pick
                    </th>
                    <th className="text-right text-[10px] text-zinc-600 uppercase tracking-wider py-2 px-2 font-semibold">
                      Games
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {itemSlots.map((group) =>
                    group.items.length > 0 ? (
                      group.items.map((item, j) => (
                        <ItemPathRow
                          key={`${group.slot}-${item.id}`}
                          slot={j === 0 ? group.slot : ""}
                          itemId={item.id}
                          itemName={
                            itemData[item.id]?.name ?? `Item ${item.id}`
                          }
                          winRate={item.winRate}
                          pickRate={item.pickRate}
                          games={item.games}
                          slotLabel={`${item.winRate}% as ${group.slot}`}
                          itemData={itemData}
                        />
                      ))
                    ) : (
                      <tr
                        key={group.slot}
                        className="border-b border-white/[0.03]"
                      >
                        <td className="py-2 px-2 text-zinc-500 font-medium">
                          {group.slot}
                        </td>
                        <td
                          className="py-2 px-2 text-zinc-600"
                          colSpan={4}
                        >
                          &mdash;
                        </td>
                      </tr>
                    ),
                  )}
                </tbody>
              </table>
            </div>
          </GlassCard>
        </div>
      </div>

      {/* ── Data Freshness ────────────────────────── */}
      <div className="text-center text-[11px] text-zinc-600 py-2">
        {lastUpdate > 0 ? `Updated ${timeAgo(lastUpdate)}` : "No timestamp"}{" "}
        &middot; Source: {playerCount} player{playerCount !== 1 ? "s" : ""}{" "}
        &middot; {overview.games} game{overview.games !== 1 ? "s" : ""}{" "}
        &middot; Rank filter: {rankFilter === "all" ? "All Ranks" : rankFilter}
      </div>
    </div>
  );
}

/* ── Sub-components ─────────────────────────────────────── */

function Pill({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg"
      style={{
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      <span className="text-[10px] text-zinc-500 uppercase tracking-wider">
        {label}
      </span>
      <span className={`text-sm font-bold ${color}`}>{value}</span>
    </div>
  );
}

function GlassCard({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="rounded-2xl p-5"
      style={{
        background: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(255,255,255,0.06)",
        backdropFilter: "blur(12px)",
      }}
    >
      {children}
    </div>
  );
}

function TreeIcon({ url }: { url: string }) {
  if (!url)
    return <div className="w-6 h-6 rounded-full bg-zinc-800" />;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={url} alt="" className="w-6 h-6" />;
}

function RuneRow({
  id,
  icon,
  name,
  desc,
  pickRate,
  winRate,
  size,
  glow,
}: {
  id: number;
  icon: string;
  name: string;
  desc?: string;
  pickRate: number;
  winRate: number;
  size: number;
  glow?: boolean;
}) {
  const s = `${size}px`;
  return (
    <LeagueTooltip title={name} body={desc}>
      <div className="flex items-center gap-3 py-1.5 cursor-default group">
        {icon ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={icon}
            alt={name}
            className="rounded-full flex-shrink-0"
            style={{
              width: s,
              height: s,
              boxShadow: glow
                ? "0 0 12px rgba(99, 102, 241, 0.25)"
                : undefined,
            }}
          />
        ) : (
          <div
            className="rounded-full bg-zinc-800 border border-zinc-700/50 flex-shrink-0"
            style={{ width: s, height: s }}
          />
        )}
        <span className="text-xs text-zinc-400 flex-1 truncate">{name}</span>
        <span className="text-[10px] text-zinc-500 font-medium tabular-nums">
          {pickRate}% PR
        </span>
        <span className="text-[10px] text-emerald-400/70 font-medium tabular-nums">
          {winRate}% WR
        </span>
      </div>
    </LeagueTooltip>
  );
}

function PlaceholderRuneRow() {
  return (
    <div className="flex items-center gap-3 py-1.5">
      <div className="w-[30px] h-[30px] rounded-full bg-zinc-800 border border-zinc-700/50" />
      <span className="text-xs text-zinc-600">&mdash;</span>
      <span className="text-[10px] text-zinc-700 ml-auto">&mdash;</span>
    </div>
  );
}

function ShardPill({
  icon,
  name,
  rate,
}: {
  icon: string;
  name: string;
  rate: string;
}) {
  return (
    <div
      className="flex items-center gap-1.5 px-2 py-1 rounded-md"
      style={{ background: "rgba(255,255,255,0.04)" }}
    >
      {icon ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={icon} alt={name} className="w-3.5 h-3.5" />
      ) : (
        <div className="w-3.5 h-3.5 rounded bg-zinc-700" />
      )}
      <span className="text-[10px] text-zinc-500">{name}</span>
      <span className="text-[9px] text-zinc-600">{rate}</span>
    </div>
  );
}

function ItemPathRow({
  slot,
  itemId,
  itemName,
  winRate,
  pickRate,
  games,
  slotLabel,
  itemData,
}: {
  slot: string;
  itemId: number;
  itemName: string;
  winRate: number;
  pickRate: number;
  games: number;
  slotLabel: string;
  itemData: ItemTooltipData;
}) {
  const tip = itemData[itemId];
  return (
    <tr className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors">
      <td className="py-2.5 px-2 text-zinc-500 font-medium text-[11px] align-middle whitespace-nowrap">
        {slot}
      </td>
      <td className="py-2.5 px-2 align-middle">
        <LeagueTooltip
          title={tip?.name ?? itemName}
          body={tip?.plaintext}
          bodyHtml={false}
        >
          <div className="flex items-center gap-2 cursor-default">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={getItemIconUrl(itemId)}
              alt={itemName}
              className="w-8 h-8 rounded-lg border border-white/10"
            />
            <div className="flex flex-col">
              <span className="text-xs text-zinc-200 font-medium truncate max-w-[140px]">
                {itemName}
              </span>
              <span className="text-[9px] text-zinc-600">{slotLabel}</span>
            </div>
          </div>
        </LeagueTooltip>
      </td>
      <td className="py-2.5 px-2 text-right align-middle">
        <span
          className={`text-xs font-bold ${winRate >= 52 ? "text-emerald-400" : winRate >= 50 ? "text-zinc-300" : "text-red-400"}`}
        >
          {winRate}%
        </span>
      </td>
      <td className="py-2.5 px-2 text-right align-middle text-xs text-zinc-400">
        {pickRate}%
      </td>
      <td className="py-2.5 px-2 text-right align-middle text-xs text-zinc-600">
        {games}
      </td>
    </tr>
  );
}
