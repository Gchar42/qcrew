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
  onClick,
}: {
  champion: string;
  role: string;
  kda: string;
  cs: number;
  duration: string;
  win: boolean;
  items: number[];
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
        <div
          className={`shrink-0 w-14 h-14 rounded-lg flex items-center justify-center text-lg font-bold ${
            win ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400"
          }`}
        >
          {win ? "W" : "L"}
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
