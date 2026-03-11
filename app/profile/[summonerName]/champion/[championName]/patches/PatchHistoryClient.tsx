"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  getChampionSplashUrl,
  getChampionSquareUrl,
} from "@/lib/riotAssets";

type PatchChange = {
  patchVersion: string;
  patchDate: string | null;
  changeType: string | null;
  changes: string;
};

const TYPE_STYLES: Record<string, { bg: string; text: string; border: string; label: string }> = {
  buff: { bg: "bg-emerald-500/10", text: "text-emerald-400", border: "border-emerald-500/20", label: "Buff" },
  nerf: { bg: "bg-red-500/10", text: "text-red-400", border: "border-red-500/20", label: "Nerf" },
  adjust: { bg: "bg-amber-500/10", text: "text-amber-400", border: "border-amber-500/20", label: "Adjust" },
  change: { bg: "bg-blue-500/10", text: "text-blue-400", border: "border-blue-500/20", label: "Change" },
};

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "";
  try {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

const TYPE_TEXT_COLOR: Record<string, string> = {
  buff: "text-emerald-400",
  nerf: "text-red-400",
  adjust: "text-amber-400",
  change: "text-blue-300",
};

function renderChanges(raw: string, changeType: string | null) {
  const parts = raw.split(/\[ABILITY\]/);
  const sections: { ability: string | null; lines: string[] }[] = [];
  const textColor = TYPE_TEXT_COLOR[changeType ?? "change"] ?? "text-white/60";

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
          {sec.ability && (
            <div className={`font-semibold text-sm mb-1.5 ${textColor}`}>{sec.ability}</div>
          )}
          <ul className="space-y-1 pl-1">
            {sec.lines.map((line, li) => {
              const text = line.startsWith("- ") ? line.slice(2) : line;
              if (!text.trim()) return null;

              const arrowIdx = text.indexOf("\u21D2");
              const bulletColor = changeType === "buff" ? "text-emerald-500/40" :
                                  changeType === "nerf" ? "text-red-500/40" : "text-white/20";

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

export default function PatchHistoryClient({
  summonerName,
  championName,
}: {
  summonerName: string;
  championName: string;
}) {
  const [changes, setChanges] = useState<PatchChange[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>("all");

  const fetchChanges = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/champion-changelog?champion=${encodeURIComponent(championName)}&limit=60`
      );
      if (!res.ok) throw new Error("Failed to load patch history");
      const json = await res.json();
      setChanges(json.changes ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }, [championName]);

  useEffect(() => {
    fetchChanges();
  }, [fetchChanges]);

  const filtered = filter === "all" ? changes : changes.filter((c) => c.changeType === filter);

  const counts = {
    all: changes.length,
    buff: changes.filter((c) => c.changeType === "buff").length,
    nerf: changes.filter((c) => c.changeType === "nerf").length,
    adjust: changes.filter((c) => c.changeType === "adjust").length,
    change: changes.filter((c) => c.changeType === "change").length,
  };

  const analysisUrl = `/profile/${encodeURIComponent(summonerName)}/champion/${encodeURIComponent(championName)}`;
  const region = "na1";

  return (
    <div className="min-h-screen bg-[#0a0b10] text-white">
      {/* Hero header */}
      <div className="relative h-48 overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-[center_20%] brightness-[0.2] scale-110"
          style={{ backgroundImage: `url(${getChampionSplashUrl(championName)})` }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0b10] via-transparent to-transparent" />
        <div className="relative z-10 flex h-full items-end px-6 pb-6 sm:px-10 max-w-5xl mx-auto">
          <Link
            href={`/summoner?riotId=${encodeURIComponent(summonerName)}&region=${region}`}
            className="absolute top-6 left-6 sm:left-10 flex items-center gap-1.5 text-sm text-white/40 hover:text-white transition"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" /></svg>
            Back to Profile
          </Link>
          <div className="flex items-end gap-5">
            <img
              src={getChampionSquareUrl(championName)}
              alt={championName}
              className="h-20 w-20 rounded-xl border-2 border-white/20 shadow-lg"
            />
            <div>
              <h1 className="text-3xl font-bold tracking-tight drop-shadow-lg">{championName}</h1>
              <p className="text-white/60 text-sm mt-1">
                <Link
                  href={`/summoner?riotId=${encodeURIComponent(summonerName)}&region=${region}`}
                  className="hover:text-white transition"
                >
                  {summonerName}
                </Link>
                {" - "}Patch History
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <nav className="mx-auto max-w-5xl px-4 sm:px-8 pt-4 flex gap-1">
        <Link
          href={analysisUrl}
          className="inline-block px-5 py-2.5 text-sm font-semibold text-white/40 hover:text-white/70 transition rounded-t-lg"
        >
          Analysis
        </Link>
        <span className="inline-block px-5 py-2.5 text-sm font-bold text-indigo-400 bg-[#151620] border border-white/10 border-b-0 rounded-t-lg">
          Patch History
        </span>
      </nav>

      {/* Content */}
      <div className="mx-auto max-w-5xl px-4 sm:px-8 pb-16 pt-6">
        {loading ? (
          <div className="flex items-center justify-center py-24 gap-3 text-white/40">
            <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.25" />
              <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
            </svg>
            Scraping patch notes for {championName}...
          </div>
        ) : error ? (
          <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-8 text-center">
            <p className="text-red-400">{error}</p>
            <button
              onClick={fetchChanges}
              className="mt-4 px-4 py-2 rounded-lg bg-red-500/20 text-red-400 text-sm font-semibold hover:bg-red-500/30 transition"
            >
              Retry
            </button>
          </div>
        ) : changes.length === 0 ? (
          <div className="rounded-xl border border-white/10 bg-[#151620] p-12 text-center">
            <p className="text-white/40 text-lg">No patch changes found for {championName}</p>
            <p className="text-white/25 text-sm mt-2">This champion hasn&apos;t been changed in recent patches.</p>
          </div>
        ) : (
          <>
            {/* Summary bar */}
            <div className="flex flex-wrap items-center gap-3 mb-6">
              <span className="text-sm text-white/50">
                {changes.length} changes found across recent patches
              </span>
              <span className="text-white/15">|</span>
              <span className="text-xs text-emerald-400 font-semibold">{counts.buff} buffs</span>
              <span className="text-xs text-red-400 font-semibold">{counts.nerf} nerfs</span>
              <span className="text-xs text-amber-400 font-semibold">{counts.adjust} adjustments</span>
            </div>

            {/* Filter tabs */}
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

            {/* Patch entries */}
            <div className="space-y-4">
              {filtered.map((c) => {
                const style = TYPE_STYLES[c.changeType ?? "change"] ?? TYPE_STYLES.change;
                return (
                  <div
                    key={c.patchVersion}
                    className={`rounded-xl border ${style.border} ${style.bg} overflow-hidden`}
                  >
                    <div className="flex items-center gap-3 px-5 py-3 border-b border-white/5">
                      <span className="text-lg font-bold text-white/90">
                        Patch {c.patchVersion}
                      </span>
                      <span
                        className={`rounded-md px-2 py-0.5 text-[11px] font-bold uppercase ${style.bg} ${style.text} border ${style.border}`}
                      >
                        {style.label}
                      </span>
                      {c.patchDate && (
                        <span className="text-xs text-white/30 ml-auto">
                          {formatDate(c.patchDate)}
                        </span>
                      )}
                    </div>
                    <div className="px-5 py-4">
                      {renderChanges(c.changes, c.changeType)}
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
          </>
        )}
      </div>
    </div>
  );
}
