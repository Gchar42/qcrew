"use client";

const ITEM_ICON_BASE = "https://ddragon.leagueoflegends.com/cdn/14.6.1/img/item";

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
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full glass rounded-xl p-4 flex items-center gap-4 text-left hover-lift transition-all"
    >
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
        {items.slice(0, 6).map((id) => (
          <img
            key={id}
            src={`${ITEM_ICON_BASE}/${id}.png`}
            alt=""
            className="w-8 h-8 rounded bg-white/5"
            title={`Item ${id}`}
          />
        ))}
      </div>
    </button>
  );
}
