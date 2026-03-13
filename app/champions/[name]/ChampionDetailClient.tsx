"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  getChampionSquareUrl,
  type ItemTooltipData,
} from "@/lib/riotAssets";
import { perkIconPathToUrl } from "@/lib/runesCd";
import ChampionBuildView from "@/components/champion/ChampionBuildView";

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

const SKILL_ACCENTS = ["#3b82f6", "#22c55e", "#f59e0b", "#a855f7"];

export default function ChampionDetailClient({ championId }: { championId: string }) {
  const [tab, setTab] = useState<Tab>("build");
  const [info, setInfo] = useState<ChampionInfo | null>(null);
  const [patches, setPatches] = useState<PatchChange[]>([]);
  const [loading, setLoading] = useState(true);
  const [patchLoading, setPatchLoading] = useState(false);
  const [perksById, setPerksById] = useState<Map<number, string>>(new Map());
  const [perkNamesById, setPerkNamesById] = useState<Map<number, { name: string; desc: string }>>(new Map());
  const [stylesById, setStylesById] = useState<Map<number, string>>(new Map());
  const [itemData, setItemData] = useState<ItemTooltipData>({});

  useEffect(() => {
    Promise.all([
      fetch(`/api/ddragon/champion/${championId}`).then((r) => r.json()),
      fetch("/api/cd/perks").then((r) => r.json()),
      fetch("/api/cd/perkstyles").then((r) => r.json()),
      fetch("/api/ddragon/version").then((r) => r.json()).then((v) =>
        fetch(`/api/ddragon/items?version=${v.version ?? "14.16.1"}`).then((r) => r.json())
      ),
    ])
      .then(([infoData, perksData, stylesData, itemsData]) => {
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
    if (tab === "patches") loadPatches();
  }, [tab, loadPatches]);

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
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-bold text-white glow-text">{name}</h1>
              <p className="text-sm text-zinc-400 mt-0.5">{info?.title}</p>
              <p className="text-xs text-zinc-500 mt-1">
                Patch 16.5 &middot; Data from tracked players via profileBundle
              </p>
            </div>
            {info && (
              <div className="hidden md:flex items-center gap-2">
                <div className="p-1 rounded-lg glass">
                  <img src={info.passive.iconUrl} alt="P" className="w-8 h-8 rounded" title={info.passive.name} />
                </div>
                {info.abilities.map((a, i) => (
                  <div key={a.key} className="p-1 rounded-lg" style={{ background: `${SKILL_ACCENTS[i]}15`, border: `1px solid ${SKILL_ACCENTS[i]}30` }}>
                    <img src={a.iconUrl} alt={a.key} className="w-8 h-8 rounded" title={a.name} />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Tabs */}
          <div className="flex gap-0.5 border-b border-white/5">
            {(["build", "abilities", "patches", "guides"] as Tab[]).map((t) => {
              const labels: Record<Tab, string> = { build: "Build", abilities: "Abilities", patches: "Patch History", guides: "Guides" };
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
        {tab === "build" && (
          <ChampionBuildView
            championName={name}
            getPerkIcon={getPerkIcon}
            getStyleIcon={getStyleIcon}
            itemData={itemData}
            perkNamesById={perkNamesById}
          />
        )}
        {tab === "abilities" && info && <AbilitiesTab info={info} />}
        {tab === "abilities" && !info && <EmptyState text="Ability data unavailable" />}
        {tab === "patches" && <PatchesTab patches={patches} loading={patchLoading} />}
        {tab === "guides" && <GuidesTab championName={info?.name ?? championId} />}
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
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <span className="text-sm text-white/50">{patches.length} changes found across recent patches</span>
        <span className="text-white/15">|</span>
        <span className="text-xs text-emerald-400 font-semibold">{counts.buff} buffs</span>
        <span className="text-xs text-red-400 font-semibold">{counts.nerf} nerfs</span>
        <span className="text-xs text-amber-400 font-semibold">{counts.adjust} adjustments</span>
      </div>

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

function EmptyState({ text, sub }: { text: string; sub?: string }) {
  return (
    <div className="text-center py-16">
      <p className="text-zinc-400">{text}</p>
      {sub && <p className="text-zinc-600 text-sm mt-1">{sub}</p>}
    </div>
  );
}
