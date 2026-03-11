"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import type { ChampionBuild } from "@/lib/sampleChampionBuilds";
import {
  getItemIconUrl,
  getSummonerSpellIconUrl,
  getRuneStyleIconUrl,
  getChampionSquareUrl,
} from "@/lib/riotAssets";

type Tab = "build" | "abilities" | "patches" | "guides";

interface AbilityData {
  key: string;
  name: string;
  description: string;
  cooldown: string;
  cost: string;
  range: string;
  iconUrl: string;
}

interface ChampionInfo {
  id: string;
  name: string;
  title: string;
  lore: string;
  tags: string[];
  passive: { name: string; description: string; iconUrl: string };
  abilities: AbilityData[];
  splashUrl: string;
  iconUrl: string;
}

interface PatchChange {
  patchVersion: string;
  patchDate: string;
  changeType: string;
  changes: string;
}

const TIER_STYLES: Record<string, { bg: string; text: string; border: string }> = {
  "S+": { bg: "bg-orange-500/15", text: "text-orange-400", border: "border-orange-500/30" },
  S: { bg: "bg-red-500/15", text: "text-red-400", border: "border-red-500/30" },
  A: { bg: "bg-blue-500/15", text: "text-blue-400", border: "border-blue-500/30" },
  B: { bg: "bg-emerald-500/15", text: "text-emerald-400", border: "border-emerald-500/30" },
  C: { bg: "bg-zinc-500/15", text: "text-zinc-400", border: "border-zinc-500/30" },
  D: { bg: "bg-zinc-600/15", text: "text-zinc-500", border: "border-zinc-600/30" },
};

const SKILL_LABELS = ["Q", "W", "E", "R"];
const SKILL_COLORS = [
  "bg-blue-500/20 text-blue-400 border-blue-500/30",
  "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  "bg-amber-500/20 text-amber-400 border-amber-500/30",
  "bg-purple-500/20 text-purple-400 border-purple-500/30",
];

const CHANGE_TYPE_COLORS: Record<string, string> = {
  buff: "text-emerald-400",
  nerf: "text-red-400",
  adjust: "text-amber-400",
  change: "text-blue-400",
};

const CHANGE_TYPE_BG: Record<string, string> = {
  buff: "bg-emerald-500/10 border-emerald-500/20",
  nerf: "bg-red-500/10 border-red-500/20",
  adjust: "bg-amber-500/10 border-amber-500/20",
  change: "bg-blue-500/10 border-blue-500/20",
};

export default function ChampionDetailClient({
  championId,
}: {
  championId: string;
}) {
  const [tab, setTab] = useState<Tab>("build");
  const [build, setBuild] = useState<ChampionBuild | null>(null);
  const [info, setInfo] = useState<ChampionInfo | null>(null);
  const [patches, setPatches] = useState<PatchChange[]>([]);
  const [loading, setLoading] = useState(true);
  const [patchLoading, setPatchLoading] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch(`/api/champions/${championId}/build`).then((r) => r.json()),
      fetch(`/api/ddragon/champion/${championId}`).then((r) => r.json()),
    ])
      .then(([buildData, infoData]) => {
        if (!buildData.error) setBuild(buildData);
        if (!infoData.error) setInfo(infoData);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [championId]);

  const loadPatches = useCallback(() => {
    if (patches.length > 0 || patchLoading) return;
    setPatchLoading(true);
    const champName = info?.name ?? championId;
    fetch(`/api/champion-changelog?champion=${encodeURIComponent(champName)}&limit=60`)
      .then((r) => r.json())
      .then((d) => setPatches(d.changes ?? []))
      .catch(() => {})
      .finally(() => setPatchLoading(false));
  }, [info, championId, patches.length, patchLoading]);

  useEffect(() => {
    if (tab === "patches") loadPatches();
  }, [tab, loadPatches]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--background)" }}>
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-zinc-400 text-sm">Loading champion data...</p>
        </div>
      </div>
    );
  }

  const name = info?.name ?? championId;
  const tierStyle = build?.tier ? TIER_STYLES[build.tier] : null;

  return (
    <div className="min-h-screen" style={{ background: "var(--background)" }}>
      {/* Hero header */}
      <div className="relative overflow-hidden border-b border-zinc-800/50">
        {info?.splashUrl && (
          <div
            className="absolute inset-0 bg-cover bg-center opacity-15"
            style={{ backgroundImage: `url(${info.splashUrl})`, filter: "blur(2px)" }}
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[var(--background)]/60 to-[var(--background)]" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 pt-6 pb-4">
          <Link href="/champions" className="inline-flex items-center gap-1.5 text-xs text-zinc-400 hover:text-indigo-400 transition-colors mb-4">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            All Champions
          </Link>

          <div className="flex items-center gap-4 mb-4">
            <img
              src={info?.iconUrl ?? getChampionSquareUrl(championId)}
              alt={name}
              className="w-16 h-16 rounded-xl border-2 border-zinc-700/50"
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-white">{name}</h1>
                {tierStyle && build?.tier && (
                  <span className={`text-sm font-bold px-2.5 py-0.5 rounded-lg border ${tierStyle.bg} ${tierStyle.text} ${tierStyle.border}`}>
                    {build.tier}
                  </span>
                )}
              </div>
              <p className="text-sm text-zinc-400">
                Build for {build?.role ? build.role.charAt(0).toUpperCase() + build.role.slice(1) : "Mid"} &middot; Patch {build?.patch ?? "16.5"}
              </p>
            </div>

            {/* Ability row */}
            {info && (
              <div className="hidden sm:flex items-center gap-1.5">
                <img src={info.passive.iconUrl} alt="P" className="w-8 h-8 rounded border border-zinc-700/50" title={info.passive.name} />
                {info.abilities.map((a) => (
                  <img key={a.key} src={a.iconUrl} alt={a.key} className="w-8 h-8 rounded border border-zinc-700/50" title={a.name} />
                ))}
              </div>
            )}
          </div>

          {/* Stats bar */}
          {build && (
            <div className="flex flex-wrap items-center gap-4 mb-4 text-sm">
              <StatPill label="Win Rate" value={`${build.win_rate.toFixed(1)}%`} color={build.win_rate >= 52 ? "text-emerald-400" : build.win_rate >= 50 ? "text-zinc-100" : "text-red-400"} />
              {build.tier_rank != null && <StatPill label="Rank" value={`${build.tier_rank} / ${build.tier_total}`} color="text-zinc-100" />}
              <StatPill label="Pick Rate" value={`${build.pick_rate.toFixed(1)}%`} color="text-zinc-300" />
              <StatPill label="Ban Rate" value={`${build.ban_rate.toFixed(1)}%`} color="text-zinc-300" />
              <StatPill label="Matches" value={build.sample_size.toLocaleString()} color="text-zinc-300" />
            </div>
          )}

          {/* Tabs */}
          <div className="flex gap-1">
            {(["build", "abilities", "patches", "guides"] as Tab[]).map((t) => {
              const labels: Record<Tab, string> = { build: "Build", abilities: "Abilities", patches: "Patch History", guides: "Guides" };
              return (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-all ${
                    tab === t
                      ? "bg-[rgba(24,24,32,0.9)] text-indigo-400 border-b-2 border-indigo-500"
                      : "text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  {labels[t]}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {tab === "build" && build && <BuildTab build={build} info={info} />}
        {tab === "build" && !build && (
          <div className="text-center py-12">
            <p className="text-zinc-400">No build data available for this champion yet.</p>
            <p className="text-zinc-500 text-sm mt-1">Build data is populated from one-trick and high-elo player matches.</p>
          </div>
        )}
        {tab === "abilities" && info && <AbilitiesTab info={info} />}
        {tab === "abilities" && !info && <p className="text-zinc-400 py-8 text-center">Ability data unavailable.</p>}
        {tab === "patches" && <PatchesTab patches={patches} loading={patchLoading} />}
        {tab === "guides" && <GuidesTab championName={info?.name ?? championId} />}
      </div>
    </div>
  );
}

/* ─── Stat Pill ─── */
function StatPill({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-zinc-500 text-xs">{label}</span>
      <span className={`font-semibold ${color}`}>{value}</span>
    </div>
  );
}

/* ─── Build Tab ─── */
function BuildTab({ build, info }: { build: ChampionBuild; info: ChampionInfo | null }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
      {/* Left column */}
      <div className="lg:col-span-5 flex flex-col gap-4">
        <RunesCard build={build} />
        <SummonerSpellsCard build={build} />
        <CountersCard build={build} />
      </div>

      {/* Right column */}
      <div className="lg:col-span-7 flex flex-col gap-4">
        <SkillOrderCard build={build} info={info} />
        <ItemsCard build={build} />
      </div>
    </div>
  );
}

/* ─── Runes Card ─── */
function RunesCard({ build }: { build: ChampionBuild }) {
  const { runes_primary, runes_secondary, rune_shards } = build;
  return (
    <Card title="Runes" subtitle={`${build.win_rate.toFixed(1)}% WR · ${build.sample_size.toLocaleString()} Matches`}>
      <div className="flex gap-6">
        {/* Primary */}
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-3">
            <img
              src={getRuneStyleIconUrl(runes_primary.treeId)}
              alt={runes_primary.tree}
              className="w-6 h-6"
            />
            <span className="text-xs font-medium text-zinc-300">{runes_primary.tree}</span>
          </div>
          <div className="flex flex-col gap-2">
            {/* Keystone */}
            <div className="flex items-center gap-2 p-2 rounded-lg bg-indigo-500/10 border border-indigo-500/20">
              <div className="w-10 h-10 rounded-full bg-zinc-800 border-2 border-indigo-500/40 flex items-center justify-center">
                <span className="text-[10px] text-indigo-400 font-bold">{runes_primary.keystone.name.slice(0, 3)}</span>
              </div>
              <span className="text-xs text-zinc-200">{runes_primary.keystone.name}</span>
            </div>
            {runes_primary.slots.map((s) => (
              <div key={s.id} className="flex items-center gap-2 p-1.5">
                <div className="w-7 h-7 rounded-full bg-zinc-800/80 border border-zinc-700/50 flex items-center justify-center">
                  <span className="text-[8px] text-zinc-400">{s.name.slice(0, 2)}</span>
                </div>
                <span className="text-xs text-zinc-400">{s.name}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Secondary */}
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-3">
            <img
              src={getRuneStyleIconUrl(runes_secondary.treeId)}
              alt={runes_secondary.tree}
              className="w-6 h-6"
            />
            <span className="text-xs font-medium text-zinc-300">{runes_secondary.tree}</span>
          </div>
          <div className="flex flex-col gap-2">
            {runes_secondary.slots.map((s) => (
              <div key={s.id} className="flex items-center gap-2 p-1.5">
                <div className="w-7 h-7 rounded-full bg-zinc-800/80 border border-zinc-700/50 flex items-center justify-center">
                  <span className="text-[8px] text-zinc-400">{s.name.slice(0, 2)}</span>
                </div>
                <span className="text-xs text-zinc-400">{s.name}</span>
              </div>
            ))}
          </div>

          {/* Shards */}
          {rune_shards.length > 0 && (
            <div className="mt-4 pt-3 border-t border-zinc-800/50">
              <p className="text-[10px] text-zinc-500 mb-2 uppercase tracking-wider">Shards</p>
              <div className="flex flex-col gap-1.5">
                {rune_shards.map((s, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-full bg-zinc-800 border border-zinc-700/50 flex items-center justify-center">
                      <div className="w-2 h-2 rounded-full bg-zinc-500" />
                    </div>
                    <span className="text-[11px] text-zinc-500">{s.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}

/* ─── Summoner Spells Card ─── */
function SummonerSpellsCard({ build }: { build: ChampionBuild }) {
  const { summoner_spells } = build;
  return (
    <Card
      title="Summoner Spells"
      subtitle={`${summoner_spells.winRate.toFixed(1)}% WR · ${summoner_spells.matches.toLocaleString()} Matches`}
    >
      <div className="flex items-center gap-3">
        {summoner_spells.spells.map((s) => (
          <div key={s.id} className="flex items-center gap-2">
            <img
              src={getSummonerSpellIconUrl(s.id)}
              alt={s.name}
              className="w-10 h-10 rounded-lg border border-zinc-700/50"
            />
            <span className="text-xs text-zinc-300">{s.name}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}

/* ─── Counters Card ─── */
function CountersCard({ build }: { build: ChampionBuild }) {
  const { counters } = build;
  if (!counters || counters.length === 0) return null;
  return (
    <Card title="Toughest Matchups" subtitle="Champions that counter this pick">
      <div className="flex flex-col gap-1.5">
        {counters.map((c) => (
          <Link
            key={c.name}
            href={`/champions/${encodeURIComponent(c.name)}`}
            className="flex items-center gap-3 p-2 rounded-lg hover:bg-zinc-800/50 transition-colors group"
          >
            <img
              src={getChampionSquareUrl(c.name)}
              alt={c.name}
              className="w-8 h-8 rounded border border-zinc-700/50"
            />
            <span className="flex-1 text-sm text-zinc-200 group-hover:text-white transition-colors">{c.name}</span>
            <span className="text-xs text-red-400 font-medium">{c.winRate.toFixed(1)}%</span>
            <span className="text-[10px] text-zinc-500">{c.matches.toLocaleString()}</span>
          </Link>
        ))}
      </div>
    </Card>
  );
}

/* ─── Skill Order Card ─── */
function SkillOrderCard({ build, info }: { build: ChampionBuild; info: ChampionInfo | null }) {
  const { skill_order, skill_path } = build;

  return (
    <Card title="Skill Priority" subtitle="Recommended skill max order">
      {/* Skill priority */}
      <div className="flex items-center gap-2 mb-4">
        {skill_order.map((s, i) => {
          const idx = SKILL_LABELS.indexOf(s);
          const color = idx >= 0 ? SKILL_COLORS[idx] : "bg-zinc-700/30 text-zinc-400";
          const ability = info?.abilities[idx];
          return (
            <div key={i} className="flex items-center gap-1.5">
              {i > 0 && <span className="text-zinc-500 text-lg">&gt;</span>}
              <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border ${color}`}>
                {ability && <img src={ability.iconUrl} alt={s} className="w-5 h-5 rounded" />}
                <span className="text-sm font-semibold">{s}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Skill path grid */}
      {skill_path.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr>
                <th className="text-left text-zinc-500 font-normal px-1 pb-2 w-8"></th>
                {Array.from({ length: 18 }).map((_, i) => (
                  <th key={i} className="text-center text-zinc-500 font-normal px-0.5 pb-2 min-w-[24px]">
                    {i + 1}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {SKILL_LABELS.map((label, rowIdx) => {
                const abilityIdx = rowIdx + 1;
                return (
                  <tr key={label}>
                    <td className="px-1 py-0.5">
                      <span className={`text-xs font-semibold ${SKILL_COLORS[rowIdx]?.split(" ")[1] ?? "text-zinc-400"}`}>
                        {label}
                      </span>
                    </td>
                    {skill_path.map((val, lvl) => {
                      const isActive = val === abilityIdx;
                      const isUlt = abilityIdx === 4;
                      return (
                        <td key={lvl} className="px-0.5 py-0.5">
                          <div
                            className={`w-5 h-5 rounded flex items-center justify-center text-[9px] font-bold ${
                              isActive
                                ? isUlt
                                  ? "bg-purple-500/30 text-purple-300 border border-purple-500/40"
                                  : `${SKILL_COLORS[rowIdx]?.split(" ")[0] ?? "bg-zinc-700"} ${SKILL_COLORS[rowIdx]?.split(" ")[1] ?? "text-zinc-300"} border ${SKILL_COLORS[rowIdx]?.split(" ")[2] ?? "border-zinc-600"}`
                                : "bg-zinc-900/50"
                            }`}
                          >
                            {isActive && (lvl + 1)}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

/* ─── Items Card ─── */
function ItemsCard({ build }: { build: ChampionBuild }) {
  return (
    <div className="flex flex-col gap-4">
      {/* Starting items */}
      <Card title="Starting Items">
        <div className="flex items-center gap-2">
          {build.items_start.map((item, i) => (
            <ItemIcon key={i} id={item.id} name={item.name} />
          ))}
        </div>
      </Card>

      {/* Core build */}
      <Card title="Core Build" subtitle="Recommended build path">
        <div className="flex items-center gap-2 flex-wrap">
          {build.items_core.map((item) => (
            <ItemWithStat key={item.id} id={item.id} name={item.name} winRate={item.winRate} matches={item.matches} />
          ))}
          {build.boots && (
            <>
              <div className="w-px h-12 bg-zinc-700/50 mx-1" />
              <ItemWithStat id={build.boots.id} name={build.boots.name} winRate={build.boots.winRate} matches={build.boots.matches} />
            </>
          )}
        </div>
      </Card>

      {/* Situational items */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card title="4th Item Options" compact>
          <div className="flex flex-col gap-2">
            {build.items_4th.map((item) => (
              <ItemRow key={item.id} id={item.id} name={item.name} winRate={item.winRate} matches={item.matches} />
            ))}
          </div>
        </Card>
        <Card title="5th Item Options" compact>
          <div className="flex flex-col gap-2">
            {build.items_5th.map((item) => (
              <ItemRow key={item.id} id={item.id} name={item.name} winRate={item.winRate} matches={item.matches} />
            ))}
          </div>
        </Card>
        <Card title="6th Item Options" compact>
          <div className="flex flex-col gap-2">
            {build.items_6th.map((item) => (
              <ItemRow key={item.id} id={item.id} name={item.name} winRate={item.winRate} matches={item.matches} />
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

/* ─── Abilities Tab ─── */
function AbilitiesTab({ info }: { info: ChampionInfo }) {
  return (
    <div className="flex flex-col gap-4 max-w-3xl">
      {/* Passive */}
      <AbilityCard
        label="Passive"
        name={info.passive.name}
        description={info.passive.description}
        iconUrl={info.passive.iconUrl}
        color="bg-zinc-500/20 text-zinc-300 border-zinc-500/30"
      />
      {/* Q/W/E/R */}
      {info.abilities.map((a, i) => (
        <AbilityCard
          key={a.key}
          label={a.key}
          name={a.name}
          description={a.description}
          iconUrl={a.iconUrl}
          cooldown={a.cooldown}
          cost={a.cost}
          range={a.range}
          color={SKILL_COLORS[i]}
        />
      ))}
    </div>
  );
}

function AbilityCard({
  label,
  name,
  description,
  iconUrl,
  cooldown,
  cost,
  range,
  color,
}: {
  label: string;
  name: string;
  description: string;
  iconUrl: string;
  cooldown?: string;
  cost?: string;
  range?: string;
  color: string;
}) {
  return (
    <div className="rounded-xl border border-zinc-800/50 p-4" style={{ background: "rgba(24, 24, 32, 0.7)" }}>
      <div className="flex items-start gap-3">
        <div className="relative shrink-0">
          <img src={iconUrl} alt={name} className="w-12 h-12 rounded-lg border border-zinc-700/50" />
          <span className={`absolute -top-1 -left-1 text-[10px] font-bold px-1.5 py-0.5 rounded border ${color}`}>
            {label}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-zinc-100 mb-1">{name}</h3>
          <p className="text-xs text-zinc-400 leading-relaxed whitespace-pre-wrap">{description}</p>
          {(cooldown || cost || range) && (
            <div className="flex gap-4 mt-2 text-[11px]">
              {cooldown && cooldown !== "0" && (
                <span className="text-zinc-500">
                  <span className="text-zinc-600">CD:</span> {cooldown}
                </span>
              )}
              {cost && cost !== "0" && (
                <span className="text-zinc-500">
                  <span className="text-zinc-600">Cost:</span> {cost}
                </span>
              )}
              {range && range !== "0" && (
                <span className="text-zinc-500">
                  <span className="text-zinc-600">Range:</span> {range}
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── Patches Tab ─── */
function PatchesTab({ patches, loading }: { patches: PatchChange[]; loading: boolean }) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (patches.length === 0) {
    return <p className="text-zinc-400 text-center py-12">No patch history available.</p>;
  }

  return (
    <div className="flex flex-col gap-3 max-w-3xl">
      {patches.map((p, i) => (
        <div
          key={i}
          className={`rounded-xl border p-4 ${CHANGE_TYPE_BG[p.changeType] ?? "bg-zinc-800/30 border-zinc-700/30"}`}
          style={{ background: "rgba(24, 24, 32, 0.7)" }}
        >
          <div className="flex items-center gap-2 mb-2">
            <span className="text-sm font-semibold text-zinc-100">Patch {p.patchVersion}</span>
            <span className={`text-xs font-medium uppercase px-2 py-0.5 rounded ${CHANGE_TYPE_COLORS[p.changeType] ?? "text-zinc-400"}`}>
              {p.changeType}
            </span>
            {p.patchDate && <span className="text-[11px] text-zinc-500 ml-auto">{p.patchDate}</span>}
          </div>
          <div className="text-xs text-zinc-300 leading-relaxed whitespace-pre-wrap">
            {renderPatchChanges(p.changes, p.changeType)}
          </div>
        </div>
      ))}
    </div>
  );
}

function renderPatchChanges(text: string, changeType: string) {
  const lines = text.split("\n");
  const color = CHANGE_TYPE_COLORS[changeType] ?? "text-zinc-300";
  return lines.map((line, i) => {
    const trimmed = line.trim();
    if (!trimmed) return null;
    if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
      return (
        <p key={i} className={`font-semibold mt-2 mb-1 ${color}`}>
          {trimmed}
        </p>
      );
    }
    if (trimmed.startsWith("- ")) {
      return (
        <p key={i} className="pl-3 text-zinc-400">
          <span className={color}>&bull;</span> {trimmed.slice(2)}
        </p>
      );
    }
    return <p key={i}>{trimmed}</p>;
  });
}

/* ─── Guides Tab ─── */
function GuidesTab({ championName }: { championName: string }) {
  const [guides, setGuides] = useState<{ id: number; slug: string; title: string; role: string; views: number; likes: number; created_at: string; guide_authors: { riot_id: string; tier: string | null; rank: string | null; champion_rank: string | null } }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/guides?champion=${encodeURIComponent(championName)}&limit=20`)
      .then((r) => r.json())
      .then((d) => setGuides(d.guides ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [championName]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl">
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-zinc-400">{guides.length} guide{guides.length !== 1 ? "s" : ""}</p>
        <Link
          href={`/guides/create?champion=${encodeURIComponent(championName)}`}
          className="px-3 py-1.5 rounded-lg text-xs font-medium bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 hover:bg-indigo-500/30 transition-colors"
        >
          Write a Guide
        </Link>
      </div>
      {guides.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-zinc-400 mb-2">No guides yet for {championName}</p>
          <p className="text-zinc-500 text-sm">Be the first to share your knowledge!</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {guides.map((g) => (
            <Link
              key={g.id}
              href={`/guides/${g.slug}`}
              className="flex items-center gap-3 p-3 rounded-lg border border-zinc-800/50 hover:border-indigo-500/30 transition-colors"
              style={{ background: "rgba(24, 24, 32, 0.7)" }}
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-zinc-100 truncate">{g.title}</p>
                <div className="flex items-center gap-2 text-[11px] text-zinc-500 mt-0.5">
                  <span>{g.guide_authors?.riot_id}</span>
                  {g.guide_authors?.tier && (
                    <span className="capitalize">{g.guide_authors.tier.toLowerCase()}</span>
                  )}
                  {g.guide_authors?.champion_rank && (
                    <span className="text-amber-400">{g.guide_authors.champion_rank}</span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-3 text-[11px] text-zinc-500 shrink-0">
                <span>{g.views} views</span>
                <span>{g.likes} likes</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Shared Components ─── */
function Card({
  title,
  subtitle,
  compact,
  children,
}: {
  title: string;
  subtitle?: string;
  compact?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`rounded-xl border border-zinc-800/50 ${compact ? "p-3" : "p-4"}`}
      style={{ background: "rgba(24, 24, 32, 0.7)" }}
    >
      <div className="flex items-baseline gap-2 mb-3">
        <h3 className={`font-semibold text-zinc-100 ${compact ? "text-xs" : "text-sm"}`}>{title}</h3>
        {subtitle && <span className="text-[10px] text-zinc-500">{subtitle}</span>}
      </div>
      {children}
    </div>
  );
}

function ItemIcon({ id, name }: { id: number; name: string }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <img
        src={getItemIconUrl(id)}
        alt={name}
        className="w-10 h-10 rounded-lg border border-zinc-700/50"
      />
      <span className="text-[10px] text-zinc-500 text-center max-w-[60px] truncate">{name}</span>
    </div>
  );
}

function ItemWithStat({ id, name, winRate, matches }: { id: number; name: string; winRate: number; matches: number }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <img
        src={getItemIconUrl(id)}
        alt={name}
        className="w-12 h-12 rounded-lg border border-zinc-700/50"
      />
      <span className="text-[10px] text-zinc-300 text-center max-w-[70px] truncate">{name}</span>
      <div className="flex gap-1 text-[9px]">
        <span className="text-emerald-400">{winRate.toFixed(1)}%</span>
        <span className="text-zinc-500">{(matches / 1000).toFixed(1)}k</span>
      </div>
    </div>
  );
}

function ItemRow({ id, name, winRate, matches }: { id: number; name: string; winRate: number; matches: number }) {
  return (
    <div className="flex items-center gap-2">
      <img
        src={getItemIconUrl(id)}
        alt={name}
        className="w-8 h-8 rounded border border-zinc-700/50"
      />
      <span className="flex-1 text-xs text-zinc-300 truncate">{name}</span>
      <span className="text-[10px] text-emerald-400 font-medium">{winRate.toFixed(1)}%</span>
      <span className="text-[10px] text-zinc-500">{(matches / 1000).toFixed(1)}k</span>
    </div>
  );
}
