"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import type { ChampionBuild } from "@/lib/sampleChampionBuilds";
import {
  getItemIconUrl,
  getSummonerSpellIconUrl,
  getChampionSquareUrl,
  getItemTooltip,
  type ItemTooltipData,
} from "@/lib/riotAssets";
import { perkIconPathToUrl } from "@/lib/runesCd";
import { LeagueTooltip } from "@/components/LeagueTooltip";
import ChampionBuildView from "@/components/champion/ChampionBuildView";
import MatchupsTab from "@/components/champion/MatchupsTab";
import PatchChangeBanner from "@/components/champion/PatchChangeBanner";
import WinRateTrend from "@/components/champion/WinRateTrend";
import PatchWinRateGraph from "@/components/champion/PatchWinRateGraph";

type Tab = "build" | "builds" | "abilities" | "matchups" | "patches" | "guides";

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

const TIER_STYLES: Record<string, string> = {
  "S+": "from-orange-500/25 to-orange-600/10 border-orange-500/40 text-orange-300 shadow-orange-500/10",
  S: "from-red-500/25 to-red-600/10 border-red-500/40 text-red-300 shadow-red-500/10",
  A: "from-blue-500/25 to-blue-600/10 border-blue-500/40 text-blue-300 shadow-blue-500/10",
  B: "from-emerald-500/25 to-emerald-600/10 border-emerald-500/40 text-emerald-300 shadow-emerald-500/10",
  C: "from-zinc-500/20 to-zinc-600/10 border-zinc-500/30 text-zinc-400",
  D: "from-zinc-600/15 to-zinc-700/10 border-zinc-600/30 text-zinc-500",
};

const SKILL_LABELS = ["Q", "W", "E", "R"];
const SKILL_ACCENTS = ["#3b82f6", "#22c55e", "#f59e0b", "#a855f7"];

const STAT_SHARD_ICONS: Record<number, string> = {
  5008: "https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/perk-images/statmods/statmodsadaptiveforceicon.png",
  5005: "https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/perk-images/statmods/statmodsattackspeedicon.png",
  5007: "https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/perk-images/statmods/statmodscdrscalingicon.png",
  5002: "https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/perk-images/statmods/statmodsarmoricon.png",
  5003: "https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/perk-images/statmods/statmodsmagicresicon.png",
  5001: "https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/perk-images/statmods/statmodshealthscalingicon.png",
};
function getStatShardIcon(id: number): string {
  return STAT_SHARD_ICONS[id] ?? STAT_SHARD_ICONS[5008];
}

const CHANGE_TYPE_COLORS: Record<string, string> = {
  buff: "text-emerald-400",
  nerf: "text-red-400",
  adjust: "text-amber-400",
  change: "text-blue-400",
};

const CHANGE_TYPE_BG: Record<string, string> = {
  buff: "border-emerald-500/20",
  nerf: "border-red-500/20",
  adjust: "border-amber-500/20",
  change: "border-blue-500/20",
};

const ROLE_LABELS: Record<string, string> = {
  top: "Top", jungle: "Jungle", mid: "Mid", bot: "ADC", support: "Support",
};

function RoleIcon({ role, size = 16 }: { role: string; size?: number }) {
  const s = { width: size, height: size, fill: "currentColor" };
  switch (role) {
    case "top":
      return <svg viewBox="0 0 24 24" {...s}><path d="M4 4h7v2H6v5H4V4zm16 10h-2v5h-5v2h7v-7z" /><path d="M4 20l7-7 2 2-7 7-2-2zM13 9l7-7 2 2-7 7-2-2z" opacity=".4" /></svg>;
    case "jungle":
      return <svg viewBox="0 0 24 24" {...s}><path d="M12 2C9 6 4 9 4 14a8 8 0 0016 0c0-5-5-8-8-12zm0 18a6 6 0 01-6-6c0-3.5 3-6 6-9 3 3 6 5.5 6 9a6 6 0 01-6 6z" /></svg>;
    case "mid":
      return <svg viewBox="0 0 24 24" {...s}><path d="M4 20l4-4m0 0l8-8m-8 8h6m2-8h-6m8-4L14 8m0 0L6 16" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" /></svg>;
    case "bot":
      return <svg viewBox="0 0 24 24" {...s}><circle cx="12" cy="12" r="3" /><path d="M12 2v4m0 12v4M2 12h4m12 0h4M4.93 4.93l2.83 2.83m8.48 8.48l2.83 2.83M19.07 4.93l-2.83 2.83M7.76 16.24l-2.83 2.83" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" /></svg>;
    case "support":
      return <svg viewBox="0 0 24 24" {...s}><path d="M12 3L4 9v6l8 6 8-6V9l-8-6zm0 2.5L18 10v4.5L12 19 6 14.5V10l6-4.5z" /><path d="M12 8v8M8 12h8" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" /></svg>;
    default:
      return null;
  }
}

function AbilityTooltip({
  label,
  name,
  description,
  cooldown,
  cost,
  iconUrl,
  accentColor,
  children,
}: {
  label: string;
  name: string;
  description: string;
  cooldown?: string;
  cost?: string;
  iconUrl: string;
  accentColor?: string;
  children: React.ReactNode;
}) {
  const [show, setShow] = useState(false);

  return (
    <div
      className="relative"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      {children}
      {show && (
        <div
          className="absolute z-50 top-full mt-2 right-0 w-[320px] rounded-xl border border-white/10 shadow-2xl pointer-events-none"
          style={{ background: "linear-gradient(135deg, #1a1a2e 0%, #16162a 100%)" }}
        >
          <div className="flex items-center gap-3 px-4 pt-4 pb-2">
            <img src={iconUrl} alt={label} className="w-10 h-10 rounded-lg border border-white/10" />
            <div>
              <div className="flex items-center gap-2">
                <span
                  className="text-[11px] font-bold px-1.5 py-0.5 rounded"
                  style={{
                    background: accentColor ? `${accentColor}20` : "rgba(255,255,255,0.08)",
                    color: accentColor ?? "#a78bfa",
                  }}
                >
                  {label}
                </span>
                <span className="text-sm font-bold" style={{ color: "#e8c56d" }}>{name}</span>
              </div>
            </div>
          </div>
          <div className="px-4 pb-2">
            <p className="text-xs text-white/80 leading-relaxed whitespace-pre-line">{description}</p>
          </div>
          {(cooldown || cost) && (
            <div className="flex gap-4 px-4 pb-3 pt-1 border-t border-white/5">
              {cooldown && cooldown !== "0" && (
                <span className="text-[11px] text-zinc-500">
                  <span className="text-zinc-400 font-medium">Cooldown:</span> {cooldown}s
                </span>
              )}
              {cost && cost !== "0" && (
                <span className="text-[11px] text-zinc-500">
                  <span className="text-zinc-400 font-medium">Cost:</span> {cost}
                </span>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function ChampionDetailClient({ championId }: { championId: string }) {
  const [tab, setTab] = useState<Tab>("build");
  const [builds, setBuilds] = useState<Record<string, ChampionBuild>>({});
  const [availableRoles, setAvailableRoles] = useState<string[]>([]);
  const [selectedRole, setSelectedRole] = useState<string>("");
  const [info, setInfo] = useState<ChampionInfo | null>(null);
  const [patches, setPatches] = useState<PatchChange[]>([]);
  const [loading, setLoading] = useState(true);
  const [patchLoading, setPatchLoading] = useState(false);
  const [perksById, setPerksById] = useState<Map<number, string>>(new Map());
  const [perkNamesById, setPerkNamesById] = useState<Map<number, { name: string; desc: string }>>(new Map());
  const [stylesById, setStylesById] = useState<Map<number, string>>(new Map());
  const [itemData, setItemData] = useState<ItemTooltipData>({});

  const build = builds[selectedRole] ?? null;

  useEffect(() => {
    Promise.all([
      fetch(`/api/champions/${championId}/build`).then((r) => r.json()),
      fetch(`/api/ddragon/champion/${championId}`).then((r) => r.json()),
      fetch("/api/cd/perks").then((r) => r.json()),
      fetch("/api/cd/perkstyles").then((r) => r.json()),
      fetch("/api/ddragon/version").then((r) => r.json()).then((v) =>
        fetch(`/api/ddragon/items?version=${v.version ?? "14.16.1"}`).then((r) => r.json())
      ),
    ])
      .then(([buildData, infoData, perksData, stylesData, itemsData]) => {
        if (buildData.builds) {
          setBuilds(buildData.builds);
          setAvailableRoles(buildData.availableRoles ?? []);
          setSelectedRole(buildData.defaultRole ?? "");
        }
        if (!infoData.error) setInfo(infoData);
        if (perksData.perks) {
          const iconMap = new Map<number, string>();
          const nameMap = new Map<number, { name: string; desc: string }>();
          for (const p of perksData.perks) {
            iconMap.set(p.id, p.iconPath);
            nameMap.set(p.id, { name: p.name ?? `Rune ${p.id}`, desc: p.shortDesc ?? "" });
          }
          setPerksById(iconMap);
          setPerkNamesById(nameMap);
        }
        if (stylesData.styles) {
          const m = new Map<number, string>();
          for (const s of stylesData.styles) m.set(s.id, s.iconPath);
          setStylesById(m);
        }
        if (itemsData?.items) {
          const byId: ItemTooltipData = {};
          for (const [id, entry] of Object.entries(itemsData.items)) {
            const num = Number(id);
            if (Number.isFinite(num)) byId[num] = entry as { name: string; plaintext?: string; description?: string; gold?: number };
          }
          setItemData(byId);
        }
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
    loadPatches();
  }, [loadPatches]);

  const getPerkIcon = (id: number) => {
    const path = perksById.get(id);
    return path ? perkIconPathToUrl(path) : "";
  };

  const getStyleIcon = (id: number) => {
    const path = stylesById.get(id);
    return path ? perkIconPathToUrl(path) : "";
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--background)" }}>
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" style={{ boxShadow: "0 0 20px rgba(99, 102, 241, 0.3)" }} />
          <p className="text-zinc-500 text-sm">Loading champion data...</p>
        </div>
      </div>
    );
  }

  const name = info?.name ?? championId;
  const tierClass = build?.tier ? TIER_STYLES[build.tier] : null;

  return (
    <div className="min-h-screen" style={{ background: "var(--background)" }}>
      {/* Hero */}
      <div className="relative overflow-hidden">
        {info?.splashUrl && (
          <div className="absolute inset-0 bg-cover bg-top opacity-20" style={{ backgroundImage: `url(${info.splashUrl})`, filter: "blur(3px) saturate(0.6)" }} />
        )}
        <div className="absolute inset-0" style={{ background: "linear-gradient(to bottom, rgba(12,12,15,0.3) 0%, rgba(12,12,15,0.85) 60%, var(--background) 100%)" }} />

        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 pt-6 pb-5">
          <Link href="/champions" className="inline-flex items-center gap-1.5 text-xs text-zinc-500 hover:text-indigo-400 transition-colors mb-5 group">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="group-hover:-translate-x-0.5 transition-transform">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            All Champions
          </Link>

          <div className="flex items-center gap-5 mb-5">
            <div className="relative">
              <img
                src={info?.iconUrl ?? getChampionSquareUrl(championId)}
                alt={name}
                className="w-[72px] h-[72px] rounded-2xl border-2 border-white/10"
                style={{ boxShadow: "0 0 24px rgba(99, 102, 241, 0.15)" }}
              />
              {tierClass && build?.tier && (
                <span className={`absolute -bottom-1.5 -right-1.5 text-[11px] font-extrabold px-2 py-0.5 rounded-md border bg-gradient-to-b shadow-lg ${tierClass}`}>
                  {build.tier}
                </span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-bold text-white glow-text">{name}</h1>
              <p className="text-sm text-zinc-400 mt-0.5">{info?.title}</p>
              <p className="text-xs text-zinc-500 mt-1">
                Patch {build?.patch ?? "16.5"} &middot; Data from one-tricks &amp; high-elo
              </p>
            </div>
            {info && (
              <div className="hidden md:flex items-center gap-2">
                <AbilityTooltip
                  label="Passive"
                  name={info.passive.name}
                  description={info.passive.description}
                  iconUrl={info.passive.iconUrl}
                  accentColor="#a78bfa"
                >
                  <div className="p-1 rounded-lg glass cursor-help">
                    <img src={info.passive.iconUrl} alt="P" className="w-8 h-8 rounded" />
                  </div>
                </AbilityTooltip>
                {info.abilities.map((a, i) => (
                  <AbilityTooltip
                    key={a.key}
                    label={SKILL_LABELS[i] ?? a.key}
                    name={a.name}
                    description={a.description}
                    cooldown={a.cooldown}
                    cost={a.cost}
                    iconUrl={a.iconUrl}
                    accentColor={SKILL_ACCENTS[i]}
                  >
                    <div className="p-1 rounded-lg cursor-help" style={{ background: `${SKILL_ACCENTS[i]}15`, border: `1px solid ${SKILL_ACCENTS[i]}30` }}>
                      <img src={a.iconUrl} alt={a.key} className="w-8 h-8 rounded" />
                    </div>
                  </AbilityTooltip>
                ))}
              </div>
            )}
          </div>

          {/* Patch change banner */}
          {(patches.length > 0 || name.toLowerCase() === "ahri") && (
            <div className="mb-4">
              <PatchChangeBanner
                championName={name}
                patches={patches}
                onClickBanner={() => {
                  setTab("patches");
                  setTimeout(() => {
                    document.querySelector('[data-section="patches-content"]')?.scrollIntoView({ behavior: "smooth", block: "start" });
                  }, 50);
                }}
              />
            </div>
          )}

          {/* Role selector */}
          {availableRoles.length > 0 && (
            <div className="flex items-center gap-1 mb-4">
              {availableRoles.map((role) => {
                const active = role === selectedRole;
                const roleBuild = builds[role];
                const games = roleBuild?.sample_size ?? 0;
                const isLowData = games < 1000;
                return (
                  <button
                    key={role}
                    onClick={() => setSelectedRole(role)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      active
                        ? "bg-indigo-500/15 text-indigo-400 border border-indigo-500/30"
                        : isLowData
                          ? "text-zinc-600 hover:text-zinc-400 border border-transparent hover:border-white/5 hover:bg-white/[0.02]"
                          : "text-zinc-500 hover:text-zinc-300 border border-transparent hover:border-white/10 hover:bg-white/[0.03]"
                    }`}
                  >
                    <RoleIcon role={role} size={14} />
                    {ROLE_LABELS[role] ?? role}
                    {games > 0 && (
                      <span className={`text-[10px] font-normal ${active ? "text-indigo-400/60" : isLowData ? "text-zinc-700" : "text-zinc-600"}`}>
                        {games >= 1000 ? `${(games / 1000).toFixed(1)}k` : games}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {/* Stats row */}
          {build && (
            <div className="flex flex-wrap items-center gap-3 mb-5">
              <GlassPill>
                <span className="text-[10px] text-zinc-500 uppercase tracking-wider">WR</span>
                <span className={`text-sm font-bold ${build.win_rate >= 52 ? "text-emerald-400" : build.win_rate >= 50 ? "text-white" : "text-red-400"}`}>
                  {build.win_rate.toFixed(1)}%
                </span>
                <WinRateTrend championName={name} currentWinRate={build.win_rate} />
              </GlassPill>
              <GlassPill>
                <span className="text-[10px] text-zinc-500 uppercase tracking-wider">Pick</span>
                <span className="text-sm font-semibold text-zinc-300">{build.pick_rate.toFixed(1)}%</span>
              </GlassPill>
              <GlassPill>
                <span className="text-[10px] text-zinc-500 uppercase tracking-wider">Ban</span>
                <span className="text-sm font-semibold text-zinc-300">{build.ban_rate.toFixed(1)}%</span>
              </GlassPill>
              <GlassPill>
                <span className="text-[10px] text-zinc-500 uppercase tracking-wider">Games</span>
                <span className="text-sm font-semibold text-zinc-300">{build.sample_size.toLocaleString()}</span>
              </GlassPill>
            </div>
          )}

          {/* Tabs */}
          <div className="flex gap-0.5 border-b border-white/5">
            {(["build", "builds", "abilities", "matchups", "patches", "guides"] as Tab[]).map((t) => {
              const labels: Record<Tab, string> = { build: "Build", builds: "Stats & Runes", abilities: "Abilities", matchups: "Matchups", patches: "Patch History", guides: "Guides" };
              const active = tab === t;
              return (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`relative px-5 py-2.5 text-sm font-medium transition-all ${active ? "text-white" : "text-zinc-500 hover:text-zinc-300"}`}
                >
                  {labels[t]}
                  {active && <div className="absolute bottom-0 left-2 right-2 h-[2px] rounded-full bg-indigo-500" style={{ boxShadow: "0 0 8px rgba(99, 102, 241, 0.5)" }} />}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
        {tab === "build" && build && <BuildTab build={build} info={info} getPerkIcon={getPerkIcon} getStyleIcon={getStyleIcon} itemData={itemData} perkNamesById={perkNamesById} />}
        {tab === "build" && !build && (
          <EmptyState text="No build data available yet" sub="Build data is populated from one-trick and high-elo player matches." />
        )}
        {tab === "builds" && (
          <ChampionBuildView
            championName={info?.name ?? championId}
            getPerkIcon={getPerkIcon}
            getStyleIcon={getStyleIcon}
            itemData={itemData}
            perkNamesById={perkNamesById}
          />
        )}
        {tab === "abilities" && info && <AbilitiesTab info={info} />}
        {tab === "abilities" && !info && <EmptyState text="Ability data unavailable" />}
        {tab === "matchups" && (
          <MatchupsTab
            championId={championId}
            championName={info?.name ?? championId}
            role={selectedRole || "mid"}
            patch={build?.patch ?? "16.5"}
          />
        )}
        {tab === "patches" && (
          <div data-section="patches-content">
            <PatchWinRateGraph championName={info?.name ?? championId} patches={patches} />
            <PatchesTab patches={patches} loading={patchLoading} />
          </div>
        )}
        {tab === "guides" && <GuidesTab championName={info?.name ?? championId} />}
      </div>
    </div>
  );
}

function GlassPill({ children }: { children: React.ReactNode }) {
  return (
    <div className="glass flex items-center gap-1.5 px-3 py-1.5 rounded-lg">
      {children}
    </div>
  );
}

function EmptyState({ text, sub }: { text: string; sub?: string }) {
  return (
    <div className="text-center py-16">
      <p className="text-zinc-400">{text}</p>
      {sub && <p className="text-zinc-600 text-sm mt-1">{sub}</p>}
    </div>
  );
}

/* ═══════════════ BUILD TAB ═══════════════ */

function BuildTab({ build, info, getPerkIcon, getStyleIcon, itemData, perkNamesById }: {
  build: ChampionBuild;
  info: ChampionInfo | null;
  getPerkIcon: (id: number) => string;
  getStyleIcon: (id: number) => string;
  itemData: ItemTooltipData;
  perkNamesById: Map<number, { name: string; desc: string }>;
}) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
      <div className="lg:col-span-5 flex flex-col gap-5">
        <RunesCard build={build} getPerkIcon={getPerkIcon} getStyleIcon={getStyleIcon} perkNamesById={perkNamesById} />
        <SummonerSpellsCard build={build} />
        <CountersCard build={build} />
      </div>
      <div className="lg:col-span-7 flex flex-col gap-5">
        <SkillOrderCard build={build} info={info} />
        <ItemsCard build={build} itemData={itemData} />
      </div>
    </div>
  );
}

/* ── Runes ── */
function RunesCard({ build, getPerkIcon, getStyleIcon, perkNamesById }: {
  build: ChampionBuild;
  getPerkIcon: (id: number) => string;
  getStyleIcon: (id: number) => string;
  perkNamesById: Map<number, { name: string; desc: string }>;
}) {
  const { runes_primary: p, runes_secondary: s, rune_shards } = build;
  const perkTip = (id: number, fallbackName: string) => {
    const data = perkNamesById.get(id);
    return { title: data?.name ?? fallbackName, body: data?.desc };
  };
  return (
    <GlassCard>
      <CardHeader title="Runes" meta={`${build.win_rate.toFixed(1)}% WR`} />
      <div className="flex gap-8 mt-4">
        {/* Primary tree */}
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-4">
            <RuneTreeIcon url={getStyleIcon(p.treeId)} />
            <span className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">{p.tree}</span>
          </div>
          {/* Keystone */}
          <LeagueTooltip {...perkTip(p.keystone.id, p.keystone.name)}>
            <div className="flex items-center gap-3 py-1.5 cursor-default">
              <RuneIcon url={getPerkIcon(p.keystone.id)} size={40} glow />
              <span className="text-sm font-semibold text-zinc-100">{p.keystone.name}</span>
            </div>
          </LeagueTooltip>
          {p.slots.map((r) => (
            <LeagueTooltip key={r.id} {...perkTip(r.id, r.name)}>
              <div className="flex items-center gap-3 py-1.5 cursor-default">
                <RuneIcon url={getPerkIcon(r.id)} size={32} />
                <span className="text-xs text-zinc-400">{r.name}</span>
              </div>
            </LeagueTooltip>
          ))}
        </div>

        {/* Secondary tree */}
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-4">
            <RuneTreeIcon url={getStyleIcon(s.treeId)} />
            <span className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">{s.tree}</span>
          </div>
          {s.slots.map((r) => (
            <LeagueTooltip key={r.id} {...perkTip(r.id, r.name)}>
              <div className="flex items-center gap-3 py-1.5 cursor-default">
                <RuneIcon url={getPerkIcon(r.id)} size={32} />
                <span className="text-xs text-zinc-400">{r.name}</span>
              </div>
            </LeagueTooltip>
          ))}

          {rune_shards.length > 0 && (
            <div className="mt-5 pt-4 border-t border-white/5">
              <p className="text-[10px] text-zinc-600 uppercase tracking-widest mb-2">Stat Shards</p>
              <div className="flex gap-2">
                {rune_shards.map((sh, i) => (
                  <div key={i} className="flex items-center gap-1.5 px-2 py-1 rounded-md" style={{ background: "rgba(255,255,255,0.04)" }}>
                    <img src={getStatShardIcon(sh.id)} alt={sh.name} className="w-3.5 h-3.5" />
                    <span className="text-[10px] text-zinc-500">{sh.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </GlassCard>
  );
}

function RuneTreeIcon({ url }: { url: string }) {
  if (!url) return <div className="w-6 h-6 rounded-full bg-zinc-800" />;
  return <img src={url} alt="" className="w-6 h-6" />;
}

function RuneIcon({ url, size, glow }: { url: string; size: number; glow?: boolean }) {
  const s = `${size}px`;
  if (!url) return <div className="rounded-full bg-zinc-800 border border-zinc-700/50" style={{ width: s, height: s }} />;
  return (
    <img
      src={url}
      alt=""
      className="rounded-full"
      style={{
        width: s,
        height: s,
        boxShadow: glow ? "0 0 12px rgba(99, 102, 241, 0.25)" : undefined,
      }}
    />
  );
}

/* ── Summoner Spells ── */
function SummonerSpellsCard({ build }: { build: ChampionBuild }) {
  const { summoner_spells: ss } = build;
  return (
    <GlassCard>
      <CardHeader title="Summoner Spells" meta={`${ss.winRate.toFixed(1)}% WR`} />
      <div className="flex items-center gap-4 mt-3">
        {ss.spells.map((s) => (
          <div key={s.id} className="flex items-center gap-2.5">
            <img src={getSummonerSpellIconUrl(s.id)} alt={s.name} className="w-11 h-11 rounded-xl border border-white/10" style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.3)" }} />
            <span className="text-xs text-zinc-300 font-medium">{s.name}</span>
          </div>
        ))}
      </div>
    </GlassCard>
  );
}

/* ── Counters ── */
function CountersCard({ build }: { build: ChampionBuild }) {
  const [expanded, setExpanded] = useState<string | null>(null);
  if (!build.counters?.length) return null;

  return (
    <GlassCard>
      <CardHeader title="Toughest Matchups" />
      <div className="flex flex-col gap-1 mt-3">
        {build.counters.map((c) => {
          const isOpen = expanded === c.name;
          return (
            <div key={c.name}>
              <button
                onClick={() => setExpanded(isOpen ? null : c.name)}
                className="w-full flex items-center gap-3 p-2 -mx-1 rounded-xl hover:bg-white/[0.03] transition-colors group text-left"
              >
                <img src={getChampionSquareUrl(c.name)} alt={c.name} className="w-9 h-9 rounded-lg border border-white/10" />
                <span className="flex-1 text-sm text-zinc-300 group-hover:text-white transition-colors">{c.name}</span>
                <span className="text-xs font-semibold text-red-400">{c.winRate.toFixed(1)}%</span>
                <svg
                  className={`w-3.5 h-3.5 text-zinc-600 transition-transform ${isOpen ? "rotate-180" : ""}`}
                  fill="none" stroke="currentColor" viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {isOpen && (c.tip || c.powerSpikes) && (
                <div className="ml-12 mr-2 mb-2 p-3 rounded-xl" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}>
                  {c.tip && (
                    <p className="text-xs text-zinc-400 leading-relaxed">{c.tip}</p>
                  )}
                  {c.powerSpikes && (
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-[10px] text-indigo-400 font-semibold uppercase tracking-wider shrink-0">Power Spikes</span>
                      <span className="text-[11px] text-zinc-300">{c.powerSpikes}</span>
                    </div>
                  )}
                  <Link
                    href={`/champions/${encodeURIComponent(c.name)}`}
                    className="inline-block mt-2 text-[10px] text-indigo-400 hover:text-indigo-300 transition-colors"
                  >
                    View {c.name}&apos;s build →
                  </Link>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </GlassCard>
  );
}

/* ── Skill Order ── */
function SkillOrderCard({ build, info }: { build: ChampionBuild; info: ChampionInfo | null }) {
  return (
    <GlassCard>
      <CardHeader title="Skill Priority" />
      <div className="flex items-center gap-3 mt-3 mb-5">
        {build.skill_order.map((s, i) => {
          const idx = SKILL_LABELS.indexOf(s);
          const accent = SKILL_ACCENTS[idx] ?? "#71717a";
          const ability = info?.abilities[idx];
          return (
            <div key={i} className="flex items-center gap-2">
              {i > 0 && <span className="text-zinc-600 text-sm font-bold">&gt;</span>}
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl" style={{ background: `${accent}12`, border: `1px solid ${accent}30` }}>
                {ability && <img src={ability.iconUrl} alt={s} className="w-6 h-6 rounded" />}
                <span className="text-sm font-bold" style={{ color: accent }}>{s}</span>
              </div>
            </div>
          );
        })}
      </div>

      {build.skill_path.length > 0 && (
        <div className="overflow-x-auto -mx-1 px-1">
          <table className="w-full text-xs">
            <thead>
              <tr>
                <th className="w-8" />
                {Array.from({ length: 18 }).map((_, i) => (
                  <th key={i} className="text-center text-zinc-600 font-normal pb-1.5 min-w-[26px] text-[10px]">{i + 1}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {SKILL_LABELS.map((label, rowIdx) => {
                const abilityIdx = rowIdx + 1;
                const accent = SKILL_ACCENTS[rowIdx];
                return (
                  <tr key={label}>
                    <td className="py-[2px]">
                      <span className="text-[11px] font-bold" style={{ color: accent }}>{label}</span>
                    </td>
                    {build.skill_path.map((val, lvl) => {
                      const active = val === abilityIdx;
                      return (
                        <td key={lvl} className="py-[2px] px-[1px]">
                          <div
                            className="w-[22px] h-[22px] rounded-md flex items-center justify-center text-[9px] font-bold transition-colors"
                            style={active ? {
                              background: `${accent}25`,
                              border: `1px solid ${accent}50`,
                              color: accent,
                            } : {
                              background: "rgba(255,255,255,0.02)",
                            }}
                          >
                            {active ? lvl + 1 : ""}
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
    </GlassCard>
  );
}

/* ── Items ── */
function ItemsCard({ build, itemData }: { build: ChampionBuild; itemData: ItemTooltipData }) {
  return (
    <div className="flex flex-col gap-5">
      <GlassCard>
        <CardHeader title="Starting Items" />
        <div className="flex items-center gap-2 mt-3">
          {build.items_start.map((item, i) => <ItemIcon key={i} id={item.id} name={item.name} itemData={itemData} />)}
        </div>
      </GlassCard>

      <GlassCard>
        <CardHeader title="Core Build" meta="Recommended path" />
        <div className="flex items-center gap-3 mt-3 flex-wrap">
          {build.items_core.map((item, i) => (
            <div key={item.id} className="flex items-center gap-3">
              {i > 0 && <div className="text-zinc-700">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><path d="M9 18l6-6-6-6" /></svg>
              </div>}
              <ItemWithStat id={item.id} name={item.name} winRate={item.winRate} matches={item.matches} itemData={itemData} />
            </div>
          ))}
          {build.boots && (
            <>
              <div className="w-px h-14 bg-white/5 mx-1" />
              <ItemWithStat id={build.boots.id} name={build.boots.name} winRate={build.boots.winRate} matches={build.boots.matches} itemData={itemData} />
            </>
          )}
        </div>
      </GlassCard>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { title: "4th Item", items: build.items_4th },
          { title: "5th Item", items: build.items_5th },
          { title: "6th Item", items: build.items_6th },
        ].map(({ title, items }) => (
          <GlassCard key={title}>
            <CardHeader title={title} compact />
            <div className="flex flex-col gap-2 mt-2">
              {items.map((item) => <ItemRow key={item.id} id={item.id} name={item.name} winRate={item.winRate} matches={item.matches} itemData={itemData} />)}
            </div>
          </GlassCard>
        ))}
      </div>
    </div>
  );
}

/* ═══════════════ ABILITIES TAB ═══════════════ */

function AbilitiesTab({ info }: { info: ChampionInfo }) {
  return (
    <div className="flex flex-col gap-4 max-w-3xl">
      <AbilityRow label="P" name={info.passive.name} description={info.passive.description} iconUrl={info.passive.iconUrl} accent="#71717a" />
      {info.abilities.map((a, i) => (
        <AbilityRow key={a.key} label={a.key} name={a.name} description={a.description} iconUrl={a.iconUrl} cooldown={a.cooldown} cost={a.cost} range={a.range} accent={SKILL_ACCENTS[i]} />
      ))}
    </div>
  );
}

function AbilityRow({ label, name, description, iconUrl, cooldown, cost, range, accent }: {
  label: string; name: string; description: string; iconUrl: string; accent: string; cooldown?: string; cost?: string; range?: string;
}) {
  return (
    <GlassCard>
      <div className="flex items-start gap-4">
        <div className="relative shrink-0">
          <img src={iconUrl} alt={name} className="w-14 h-14 rounded-xl" style={{ border: `2px solid ${accent}40`, boxShadow: `0 0 12px ${accent}15` }} />
          <span className="absolute -top-1.5 -right-1.5 text-[10px] font-extrabold px-1.5 py-0.5 rounded-md" style={{ background: accent, color: "#fff" }}>
            {label}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-bold text-zinc-100 mb-1">{name}</h3>
          <p className="text-xs text-zinc-400 leading-relaxed whitespace-pre-wrap">{description}</p>
          {(cooldown || cost || range) && (
            <div className="flex gap-4 mt-2">
              {cooldown && cooldown !== "0" && <StatTag label="CD" value={cooldown} />}
              {cost && cost !== "0" && <StatTag label="Cost" value={cost} />}
              {range && range !== "0" && <StatTag label="Range" value={range} />}
            </div>
          )}
        </div>
      </div>
    </GlassCard>
  );
}

function StatTag({ label, value }: { label: string; value: string }) {
  return (
    <span className="text-[10px] px-2 py-0.5 rounded" style={{ background: "rgba(255,255,255,0.04)", color: "var(--muted)" }}>
      <span className="text-zinc-600">{label}</span> {value}
    </span>
  );
}

/* ═══════════════ PATCHES TAB ═══════════════ */

const PATCH_TYPE_STYLES: Record<string, { bg: string; text: string; border: string; label: string }> = {
  buff: { bg: "bg-emerald-500/10", text: "text-emerald-400", border: "border-emerald-500/20", label: "Buff" },
  nerf: { bg: "bg-red-500/10", text: "text-red-400", border: "border-red-500/20", label: "Nerf" },
  adjust: { bg: "bg-amber-500/10", text: "text-amber-400", border: "border-amber-500/20", label: "Adjust" },
  change: { bg: "bg-blue-500/10", text: "text-blue-400", border: "border-blue-500/20", label: "Change" },
};

const PATCH_TEXT_COLOR: Record<string, string> = {
  buff: "text-emerald-400",
  nerf: "text-red-400",
  adjust: "text-amber-400",
  change: "text-blue-300",
};

function formatPatchDate(dateStr: string | null): string {
  if (!dateStr) return "";
  try {
    return new Date(dateStr).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  } catch {
    return dateStr;
  }
}

function PatchesTab({ patches, loading }: { patches: PatchChange[]; loading: boolean }) {
  const [filter, setFilter] = useState<string>("all");

  if (loading) return (
    <div className="flex items-center justify-center py-24 gap-3 text-white/40">
      <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.25" />
        <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      </svg>
      Loading patch history...
    </div>
  );

  if (!patches.length) return <EmptyState text="No patch history available" sub="This champion hasn't been changed in recent patches." />;

  const filtered = filter === "all" ? patches : patches.filter((c) => c.changeType === filter);
  const counts = {
    all: patches.length,
    buff: patches.filter((c) => c.changeType === "buff").length,
    nerf: patches.filter((c) => c.changeType === "nerf").length,
    adjust: patches.filter((c) => c.changeType === "adjust").length,
    change: patches.filter((c) => c.changeType === "change").length,
  };

  return (
    <div className="max-w-4xl">
      {/* Summary */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <span className="text-sm text-white/50">{patches.length} changes found across recent patches</span>
        <span className="text-white/15">|</span>
        <span className="text-xs text-emerald-400 font-semibold">{counts.buff} buffs</span>
        <span className="text-xs text-red-400 font-semibold">{counts.nerf} nerfs</span>
        <span className="text-xs text-amber-400 font-semibold">{counts.adjust} adjustments</span>
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {(["all", "buff", "nerf", "adjust", "change"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              filter === f
                ? "bg-indigo-500/20 text-indigo-400 border border-indigo-500/30"
                : "bg-white/5 text-white/40 border border-white/10 hover:text-white/60"
            }`}
          >
            {f === "all" ? `All (${counts.all})` : `${f.charAt(0).toUpperCase() + f.slice(1)}s (${counts[f]})`}
          </button>
        ))}
      </div>

      {/* Entries */}
      <div className="space-y-4">
        {filtered.map((c, i) => {
          const style = PATCH_TYPE_STYLES[c.changeType ?? "change"] ?? PATCH_TYPE_STYLES.change;
          return (
            <div key={i} className={`rounded-xl border ${style.border} ${style.bg} overflow-hidden`}>
              <div className="flex items-center gap-3 px-5 py-3 border-b border-white/5">
                <span className="text-lg font-bold text-white/90">Patch {c.patchVersion}</span>
                <span className={`rounded-md px-2 py-0.5 text-[11px] font-bold uppercase ${style.bg} ${style.text} border ${style.border}`}>
                  {style.label}
                </span>
                {c.patchDate && <span className="text-xs text-white/30 ml-auto">{formatPatchDate(c.patchDate)}</span>}
              </div>
              <div className="px-5 py-4">
                {renderPatchChanges(c.changes, c.changeType)}
              </div>
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="rounded-xl border border-white/10 bg-[#151620] p-8 text-center">
          <p className="text-white/40">No {filter} changes found.</p>
        </div>
      )}
    </div>
  );
}

function renderPatchChanges(raw: string, changeType: string | null) {
  const parts = raw.split(/\[ABILITY\]/);
  const sections: { ability: string | null; lines: string[] }[] = [];
  const textColor = PATCH_TEXT_COLOR[changeType ?? "change"] ?? "text-white/60";

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i].trim();
    if (!part) continue;
    if (i === 0 && !raw.startsWith("[ABILITY]")) {
      const lines = part.split("\n").map((l) => l.trim()).filter(Boolean);
      if (lines.length > 0) sections.push({ ability: null, lines });
    } else {
      const lines = part.split("\n").map((l) => l.trim()).filter(Boolean);
      const ability = lines[0] || null;
      const changeLines = lines.slice(1);
      if (ability) sections.push({ ability, lines: changeLines });
    }
  }

  return (
    <div className="space-y-3">
      {sections.map((sec, si) => (
        <div key={si}>
          {sec.ability && <div className={`font-semibold text-sm mb-1.5 ${textColor}`}>{sec.ability}</div>}
          <ul className="space-y-1 pl-1">
            {sec.lines.map((line, li) => {
              const text = line.startsWith("- ") ? line.slice(2) : line;
              if (!text.trim()) return null;
              const arrowIdx = text.indexOf("\u21D2");
              const bulletColor = changeType === "buff" ? "text-emerald-500/40" : changeType === "nerf" ? "text-red-500/40" : "text-white/20";

              if (arrowIdx > -1) {
                return (
                  <li key={li} className={`text-sm ${textColor} flex items-start gap-1.5`}>
                    <span className={`${bulletColor} mt-0.5 shrink-0`}>&bull;</span>
                    <span>
                      <span className="opacity-60">{text.slice(0, arrowIdx)}</span>
                      <span className="opacity-40 mx-1">&rArr;</span>
                      <span className="font-medium">{text.slice(arrowIdx + 1)}</span>
                    </span>
                  </li>
                );
              }

              return (
                <li key={li} className={`text-sm ${textColor} flex items-start gap-1.5`}>
                  <span className={`${bulletColor} mt-0.5 shrink-0`}>&bull;</span>
                  <span>{text}</span>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  );
}

/* ═══════════════ GUIDES TAB ═══════════════ */

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

  if (loading) return (
    <div className="flex justify-center py-12">
      <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="max-w-3xl">
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-zinc-500">{guides.length} guide{guides.length !== 1 ? "s" : ""}</p>
        <Link href={`/guides/create?champion=${encodeURIComponent(championName)}`} className="glass px-3 py-1.5 rounded-lg text-xs font-medium text-indigo-400 hover:text-indigo-300 transition-colors">
          Write a Guide
        </Link>
      </div>
      {!guides.length ? <EmptyState text={`No guides yet for ${championName}`} sub="Be the first to share your knowledge!" /> : (
        <div className="flex flex-col gap-2">
          {guides.map((g) => (
            <Link key={g.id} href={`/guides/${g.slug}`} className="glass flex items-center gap-3 p-3 rounded-xl hover:border-indigo-500/20 transition-colors group">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-zinc-200 group-hover:text-white truncate">{g.title}</p>
                <div className="flex items-center gap-2 text-[11px] text-zinc-500 mt-0.5">
                  <span>{g.guide_authors?.riot_id}</span>
                  {g.guide_authors?.tier && <span className="capitalize">{g.guide_authors.tier.toLowerCase()}</span>}
                  {g.guide_authors?.champion_rank && <span className="text-amber-400">{g.guide_authors.champion_rank}</span>}
                </div>
              </div>
              <div className="flex items-center gap-3 text-[11px] text-zinc-600 shrink-0">
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

/* ═══════════════ SHARED ═══════════════ */

function GlassCard({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`glass rounded-2xl p-5 ${className ?? ""}`}>
      {children}
    </div>
  );
}

function CardHeader({ title, meta, compact }: { title: string; meta?: string; compact?: boolean }) {
  return (
    <div className="flex items-baseline justify-between">
      <h3 className={`font-bold text-zinc-100 ${compact ? "text-xs" : "text-sm"}`}>{title}</h3>
      {meta && <span className="text-[10px] text-zinc-500">{meta}</span>}
    </div>
  );
}

function ItemIcon({ id, name, itemData }: { id: number; name: string; itemData: ItemTooltipData }) {
  const tip = getItemTooltip(itemData, id);
  return (
    <LeagueTooltip title={tip.title} body={tip.body} bodyHtml={tip.bodyHtml}>
      <div className="flex flex-col items-center gap-1 cursor-default">
        <img src={getItemIconUrl(id)} alt={name} className="w-11 h-11 rounded-xl border border-white/10" style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.3)" }} />
        <span className="text-[10px] text-zinc-500 text-center max-w-[64px] truncate">{name}</span>
      </div>
    </LeagueTooltip>
  );
}

function ItemWithStat({ id, name, winRate, matches, itemData }: { id: number; name: string; winRate: number; matches: number; itemData: ItemTooltipData }) {
  const tip = getItemTooltip(itemData, id);
  return (
    <LeagueTooltip title={tip.title} body={tip.body} bodyHtml={tip.bodyHtml}>
      <div className="flex flex-col items-center gap-1 cursor-default">
        <img src={getItemIconUrl(id)} alt={name} className="w-13 h-13 rounded-xl border border-white/10" style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.3)" }} />
        <span className="text-[10px] text-zinc-300 text-center max-w-[72px] truncate font-medium">{name}</span>
        <div className="flex gap-1.5 text-[9px]">
          <span className="text-emerald-400 font-semibold">{winRate.toFixed(1)}%</span>
          <span className="text-zinc-600">{(matches / 1000).toFixed(1)}k</span>
        </div>
      </div>
    </LeagueTooltip>
  );
}

function ItemRow({ id, name, winRate, matches, itemData }: { id: number; name: string; winRate: number; matches: number; itemData: ItemTooltipData }) {
  const tip = getItemTooltip(itemData, id);
  return (
    <LeagueTooltip title={tip.title} body={tip.body} bodyHtml={tip.bodyHtml}>
      <div className="flex items-center gap-2.5 py-0.5 cursor-default">
        <img src={getItemIconUrl(id)} alt={name} className="w-9 h-9 rounded-lg border border-white/10" />
        <span className="flex-1 text-xs text-zinc-300 truncate">{name}</span>
        <span className="text-[10px] text-emerald-400 font-bold">{winRate.toFixed(1)}%</span>
        <span className="text-[10px] text-zinc-600">{(matches / 1000).toFixed(1)}k</span>
      </div>
    </LeagueTooltip>
  );
}
