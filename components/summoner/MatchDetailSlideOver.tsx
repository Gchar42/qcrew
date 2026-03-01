"use client";

import type { MatchDto } from "@/types/riot";

function formatDuration(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

const ITEM_ICON_BASE = "https://ddragon.leagueoflegends.com/cdn/14.6.1/img/item";

export function MatchDetailSlideOver({
  match,
  puuid,
  onClose,
}: {
  match: MatchDto;
  puuid: string;
  onClose: () => void;
}) {
  const p = match.info?.participants?.find((x) => x.puuid === puuid);
  if (!p) return null;

  const duration = formatDuration(match.info?.gameDuration ?? 0);
  const cs = (p.totalMinionsKilled ?? 0) + (p.neutralMinionsKilled ?? 0);
  const items = [p.item0, p.item1, p.item2, p.item3, p.item4, p.item5, p.item6].filter(
    (i): i is number => i != null && i > 0
  );

  return (
    <>
      <div
        className="fixed inset-0 bg-black/50 z-40"
        onClick={onClose}
        aria-hidden
      />
      <aside
        className="fixed top-0 right-0 h-full w-full max-w-md glass border-l border-white/10 z-50 shadow-xl overflow-y-auto"
        role="dialog"
        aria-label="Match details"
      >
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-white">Match details</h2>
            <button
              type="button"
              onClick={onClose}
              className="text-zinc-400 hover:text-white p-1"
              aria-label="Close"
            >
              ×
            </button>
          </div>
          <div
            className={`inline-block px-3 py-1 rounded-lg font-semibold mb-4 ${
              p.win ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400"
            }`}
          >
            {p.win ? "Victory" : "Defeat"}
          </div>
          <dl className="space-y-3 text-sm">
            <div>
              <dt className="text-zinc-500">Champion</dt>
              <dd className="text-white font-medium">{p.championName}</dd>
            </div>
            <div>
              <dt className="text-zinc-500">Position</dt>
              <dd className="text-white">{p.teamPosition || "—"}</dd>
            </div>
            <div>
              <dt className="text-zinc-500">KDA</dt>
              <dd className="text-white font-mono">{p.kills}/{p.deaths}/{p.assists}</dd>
            </div>
            <div>
              <dt className="text-zinc-500">CS</dt>
              <dd className="text-white">{cs}</dd>
            </div>
            <div>
              <dt className="text-zinc-500">Duration</dt>
              <dd className="text-white">{duration}</dd>
            </div>
            <div>
              <dt className="text-zinc-500 mb-2">Build</dt>
              <dd className="flex flex-wrap gap-2">
                {items.map((id) => (
                  <img
                    key={id}
                    src={`${ITEM_ICON_BASE}/${id}.png`}
                    alt=""
                    className="w-10 h-10 rounded bg-white/5"
                  />
                ))}
              </dd>
            </div>
          </dl>
          <p className="text-zinc-500 text-xs mt-4">
            Match ID: {match.metadata?.matchId?.slice(0, 12)}…
          </p>
        </div>
      </aside>
    </>
  );
}
