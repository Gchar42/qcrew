"use client";

import Image from "next/image";
import { getChampionSplashUrl, getItemIconUrl } from "@/lib/riotAssets";
import { getBadgeCategory } from "@/lib/matchBadges";

function badgeChipClass(badge: string): string {
  const cat = getBadgeCategory(badge);
  switch (cat) {
    case "gold":
      return "border-amber-500/50 bg-amber-500/15 text-amber-700 dark:text-amber-400";
    case "positive":
      return "border-emerald-500/40 bg-emerald-500/15 text-emerald-700 dark:text-emerald-400";
    case "negative":
      return "border-red-500/40 bg-red-500/12 text-red-600 dark:text-red-400";
    default:
      return "border-white/15 bg-white/10 text-zinc-400";
  }
}

export function MatchCard({
  champion,
  role,
  kda,
  cs,
  duration,
  win,
  items,
  impactScore,
  badge,
  badgeReason,
  onClick,
}: {
  champion: string;
  role: string;
  kda: string;
  cs: number;
  duration: string;
  win: boolean;
  items: number[];
  impactScore?: number;
  badge?: string;
  badgeReason?: string;
  onClick: () => void;
}) {
  const splash = getChampionSplashUrl(champion);

  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full relative rounded-2xl border border-white/10 bg-black/30 text-left hover:border-white/20 transition-all hover-lift"
    >
      {splash && (
        <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl">
          <Image
            src={splash}
            alt={champion}
            fill
            priority={false}
            className="object-cover opacity-25"
          />
        </div>
      )}
      <div className="relative p-4 flex items-center gap-4 badgeArea socialBadgeWrap">
        <div className="shrink-0 flex flex-col items-center gap-0.5">
          <div
            className={`w-14 h-14 rounded-lg flex items-center justify-center text-lg font-bold ${
              win ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400"
            }`}
          >
            {win ? "W" : "L"}
          </div>
        <div className="flex flex-row items-center gap-2 flex-wrap justify-center">
            {impactScore != null && (
              <span className="inline-flex items-baseline gap-1 rounded-md border-[1.5px] border-white/20 bg-white/5 px-2.5 py-1 shadow-sm">
                <span className="text-[10px] font-medium uppercase tracking-wide text-zinc-400">Impact</span>
                <span className="text-sm font-bold text-white">{impactScore}</span>
              </span>
            )}
            {badge && (
              <span
                className={`inline-flex items-center justify-center overflow-visible rounded-[10px] border px-3.5 pt-2 pb-2.5 min-h-[36px] text-sm font-semibold leading-[1.4] whitespace-nowrap socialBadge ${badgeChipClass(
                  badge
                )}`}
                title={badgeReason ?? badge}
              >
                <span className="socialBadgeText noClipText">
                  {badge}
                </span>
              </span>
            )}
          </div>
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-semibold text-white">{champion}</div>
          <div className="text-sm text-zinc-400">
            {role} · KDA {kda} · {cs} CS · {duration}
          </div>
        </div>
        <div className="flex gap-1 shrink-0">
          {items.slice(0, 6).map((id) => {
            const iconUrl = getItemIconUrl(id);
            if (!iconUrl) return null;
            return (
              <img
                key={id}
                src={iconUrl}
                alt=""
                className="w-8 h-8 rounded bg-white/5"
                title={`Item ${id}`}
              />
            );
          })}
        </div>
      </div>
    </button>
  );
}
