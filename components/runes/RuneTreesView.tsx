"use client";

import { useEffect, useState } from "react";
import { perkIconPathToUrl } from "@/lib/runesCd";
import { LeagueTooltip } from "@/components/LeagueTooltip";

/* ── Constants ──────────────────────────────────────────── */

const PERKSTYLES_URL =
  "https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/perkstyles.json";
const PERKS_URL =
  "https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/perks.json";

const TREE_ORDER = [8000, 8100, 8200, 8300, 8400];

const TREE_ACCENT: Record<number, string> = {
  8000: "#C8AA6E",
  8100: "#D44747",
  8200: "#6B8CF7",
  8300: "#A8D26A",
  8400: "#49AAE1",
};

const TREE_NAME_FALLBACK: Record<number, string> = {
  8000: "Precision",
  8100: "Domination",
  8200: "Sorcery",
  8300: "Resolve",
  8400: "Inspiration",
};

const SHARD_ROWS: { label: string; shards: number[] }[] = [
  { label: "Offense", shards: [5008, 5005, 5007] },
  { label: "Flex", shards: [5008, 5002, 5003] },
  { label: "Defense", shards: [5001, 5002, 5003] },
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
  5008: "Adaptive Force",
  5005: "Attack Speed",
  5007: "Ability Haste",
  5002: "Armor",
  5003: "Magic Resist",
  5001: "Health Scaling",
};

const ROLE_FILTERS = ["All", "Top", "Jungle", "Mid", "ADC", "Support"];
const RANK_FILTERS = ["All", "Iron–Silver", "Gold–Plat", "Emerald–Diamond", "Master+"];

/* ── Types ──────────────────────────────────────────────── */

type TreeSlot = { type: string; perks: number[] };
type TreeDef = {
  id: number;
  name: string;
  iconPath: string;
  slots: TreeSlot[];
};
type PerkInfo = {
  id: number;
  name: string;
  iconPath: string;
  longDesc: string;
};

/* ── Component ──────────────────────────────────────────── */

export default function RuneTreesView() {
  const [trees, setTrees] = useState<TreeDef[]>([]);
  const [perksById, setPerksById] = useState<Map<number, PerkInfo>>(new Map());
  const [loading, setLoading] = useState(true);
  const [roleFilter, setRoleFilter] = useState("All");
  const [rankFilter, setRankFilter] = useState("All");
  const [champSearch, setChampSearch] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const [stylesRes, perksRes] = await Promise.all([
        fetch(PERKSTYLES_URL).then((r) => (r.ok ? r.json() : null)).catch(() => null),
        fetch(PERKS_URL).then((r) => (r.ok ? r.json() : null)).catch(() => null),
      ]);
      if (cancelled) return;

      if (stylesRes?.styles) {
        const ordered: TreeDef[] = [];
        const stylesMap = new Map<number, TreeDef>();
        for (const s of stylesRes.styles) {
          stylesMap.set(s.id, {
            id: s.id,
            name: s.name ?? TREE_NAME_FALLBACK[s.id] ?? "Unknown",
            iconPath: s.iconPath ?? "",
            slots: (s.slots ?? []).map((sl: { type?: string; perks?: number[] }) => ({
              type: sl.type ?? "",
              perks: sl.perks ?? [],
            })),
          });
        }
        for (const id of TREE_ORDER) {
          const t = stylesMap.get(id);
          if (t) ordered.push(t);
        }
        setTrees(ordered);
      }

      if (Array.isArray(perksRes)) {
        const map = new Map<number, PerkInfo>();
        for (const p of perksRes) {
          map.set(p.id, {
            id: p.id,
            name: p.name ?? `Rune ${p.id}`,
            iconPath: p.iconPath ?? "",
            longDesc: p.longDesc ?? p.shortDesc ?? "",
          });
        }
        setPerksById(map);
      }

      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 gap-3 text-zinc-500 text-sm">
        <div
          className="w-5 h-5 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin"
          style={{ boxShadow: "0 0 12px rgba(99,102,241,0.2)" }}
        />
        Loading rune data…
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* ── Header ─────────────────────────────────── */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-[#E8E9F0]">
          Rune Trees
        </h1>
        <p className="text-sm text-zinc-400 mt-1">
          Pick rates and win rates for every rune, every patch.
        </p>
        <p className="text-[11px] text-zinc-600 mt-2">
          Patch 16.5 · Based on — games · Updated —
        </p>
      </div>

      {/* ── Filters ────────────────────────────────── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:flex-wrap">
        <input
          type="text"
          placeholder="Search champion..."
          value={champSearch}
          onChange={(e) => setChampSearch(e.target.value)}
          className="w-full sm:w-56 px-3 py-2 text-sm rounded-lg bg-[#151620] border border-white/10 text-[#E8E9F0] placeholder:text-zinc-600 outline-none focus:border-indigo-500/50 transition"
        />

        <div className="flex gap-1 flex-wrap">
          {ROLE_FILTERS.map((r) => (
            <button
              key={r}
              onClick={() => setRoleFilter(r)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                roleFilter === r
                  ? "bg-indigo-500/15 text-indigo-400 border border-indigo-500/30"
                  : "text-zinc-500 hover:text-zinc-300 border border-transparent hover:border-white/10 hover:bg-white/[0.03]"
              }`}
            >
              {r}
            </button>
          ))}
        </div>

        <div className="flex gap-1 flex-wrap">
          {RANK_FILTERS.map((r) => (
            <button
              key={r}
              onClick={() => setRankFilter(r)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                rankFilter === r
                  ? "bg-indigo-500/15 text-indigo-400 border border-indigo-500/30"
                  : "text-zinc-500 hover:text-zinc-300 border border-transparent hover:border-white/10 hover:bg-white/[0.03]"
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* ── Five Tree Columns ──────────────────────── */}
      <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
        <div className="flex gap-4 min-w-max lg:min-w-0 lg:grid lg:grid-cols-5">
          {trees.map((tree) => {
            const accent = TREE_ACCENT[tree.id] ?? "#6366f1";
            return (
              <TreeColumn
                key={tree.id}
                tree={tree}
                accent={accent}
                perksById={perksById}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ── Tree Column ────────────────────────────────────────── */

function TreeColumn({
  tree,
  accent,
  perksById,
}: {
  tree: TreeDef;
  accent: string;
  perksById: Map<number, PerkInfo>;
}) {
  const treeIconUrl = tree.iconPath ? perkIconPathToUrl(tree.iconPath) : "";

  return (
    <div
      className="min-w-[200px] flex-1 rounded-xl bg-[#151620] border border-white/10 overflow-hidden"
      style={{ borderTopColor: accent, borderTopWidth: 3 }}
    >
      {/* Tree header */}
      <div className="flex items-center gap-2.5 px-4 pt-4 pb-3">
        {treeIconUrl ? (
          <img src={treeIconUrl} alt="" className="w-7 h-7" />
        ) : (
          <div className="w-7 h-7 rounded-full bg-zinc-800" />
        )}
        <span
          className="text-sm font-bold tracking-wide"
          style={{ color: accent }}
        >
          {tree.name}
        </span>
      </div>

      {/* Rune rows */}
      <div className="px-4 pb-2">
        {tree.slots.map((slot, si) => {
          const isKeystone = si === 0;
          return (
            <div key={si}>
              {si > 0 && (
                <div className="border-t border-white/5 my-2" />
              )}
              <div
                className={`flex items-start justify-center gap-${isKeystone ? "4" : "3"} py-2`}
              >
                {slot.perks.map((pid, pi) => (
                  <RuneIcon
                    key={pid}
                    perkId={pid}
                    perksById={perksById}
                    size={isKeystone ? 44 : 32}
                    accent={accent}
                    isTop={pi === 0}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Stat Shards */}
      <div className="px-4 pb-4 pt-2 border-t border-white/5">
        <p className="text-[10px] text-zinc-600 uppercase tracking-widest mb-2 font-semibold">
          Stat Shards
        </p>
        {SHARD_ROWS.map((row) => (
          <div key={row.label} className="mb-2">
            <p className="text-[9px] text-zinc-600 mb-1">{row.label}</p>
            <div className="flex items-center gap-3">
              {row.shards.map((sid, si) => (
                <div
                  key={`${row.label}-${sid}`}
                  className="flex flex-col items-center gap-0.5"
                  style={{ opacity: si === 0 ? 1 : 0.4 }}
                >
                  <img
                    src={SHARD_ICONS[sid] ?? ""}
                    alt={SHARD_NAMES[sid] ?? ""}
                    className="w-5 h-5"
                  />
                  <span className="text-[9px] text-zinc-500">
                    {SHARD_NAMES[sid] ?? sid}
                  </span>
                  <span className="text-[9px] text-zinc-600">—%</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Rune Icon ──────────────────────────────────────────── */

function RuneIcon({
  perkId,
  perksById,
  size,
  accent,
  isTop,
}: {
  perkId: number;
  perksById: Map<number, PerkInfo>;
  size: number;
  accent: string;
  isTop: boolean;
}) {
  const perk = perksById.get(perkId);
  const name = perk?.name ?? `Rune ${perkId}`;
  const iconUrl = perk?.iconPath ? perkIconPathToUrl(perk.iconPath) : "";
  const desc = perk?.longDesc ?? "";
  const s = `${size}px`;

  const cleanDesc = desc.replace(/<[^>]*>/g, "");
  const tooltipBody = [cleanDesc, "", "—% pick rate · —% WR · — games"]
    .filter(Boolean)
    .join("\n");

  return (
    <LeagueTooltip title={name} body={tooltipBody}>
      <div
        className="flex flex-col items-center gap-1 cursor-default"
        style={{ opacity: isTop ? 1 : 0.4, transition: "opacity 0.2s" }}
      >
        {iconUrl ? (
          <img
            src={iconUrl}
            alt={name}
            className="rounded-full"
            style={{
              width: s,
              height: s,
              border: isTop
                ? `2px solid ${accent}`
                : "2px solid transparent",
              boxShadow: isTop ? `0 0 8px ${accent}55` : undefined,
            }}
          />
        ) : (
          <div
            className="rounded-full bg-zinc-800 border border-zinc-700/50"
            style={{ width: s, height: s }}
          />
        )}
        <span className="text-[10px] text-zinc-500 tabular-nums">—%</span>
        <span className="text-[9px] text-zinc-600 tabular-nums">—% WR</span>
      </div>
    </LeagueTooltip>
  );
}
