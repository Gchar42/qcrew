"use client";

import Image from "next/image";
import { getChampionSplashUrl, getItemIconUrl } from "@/lib/riotAssets";

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
      className="w-full relative overflow-hidden rounded-2xl border border-white/10 bg-black/30 text-left hover:border-white/20 transition-all hover-lift"
    >
      {splash && (
        <Image
          src={splash}
          alt={champion}
          fill
          priority={false}
          className="object-cover opacity-25"
        />
      )}
      <div className="relative p-4 flex items-center gap-4">
        <div className="shrink-0 flex flex-col items-center gap-0.5">
          <div
            className={`w-14 h-14 rounded-lg flex items-center justify-center text-lg font-bold ${
              win ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400"
            }`}
          >
            {win ? "W" : "L"}
          </div>
          <div className="flex flex-row items-center gap-1.5 flex-wrap justify-center">
            {impactScore != null && (
              <span className="text-xs text-zinc-400">Impact {impactScore}</span>
            )}
            {badge && (
              <span
                className="text-[10px] px-1.5 py-0.5 rounded bg-white/10 text-zinc-300 max-w-[72px] truncate"
                title={badgeReason ?? badge}
              >
                {badge}
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
