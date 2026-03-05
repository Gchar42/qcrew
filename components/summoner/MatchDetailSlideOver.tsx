"use client";

import type { MatchDto } from "@/types/riot";
import { isValidItemId, DEFAULT_DDRAGON_VERSION } from "@/lib/riotAssets";
import { LeagueTooltip } from "@/components/LeagueTooltip";

function formatDuration(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function MatchDetailSlideOver({
  match,
  puuid,
  onClose,
  itemDataById = {},
  ddragonVersion,
}: {
  match: MatchDto;
  puuid: string;
  onClose: () => void;
  itemDataById?: Record<number, { name: string; plaintext?: string }>;
  ddragonVersion?: string | null;
}) {
  const p = match.info?.participants?.find((x) => x.puuid === puuid);
  if (!p) return null;

  const duration = formatDuration(match.info?.gameDuration ?? 0);
  const cs = (p.totalMinionsKilled ?? 0) + (p.neutralMinionsKilled ?? 0);
  const itemSlots = [p.item0, p.item1, p.item2, p.item3, p.item4, p.item5, p.item6];

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
                {itemSlots.map((itemId, idx) =>
                  isValidItemId(itemId) ? (
                    <LeagueTooltip
                      key={itemId}
                      title={(itemDataById[itemId]?.name || `Item ${itemId}`).trim() || `Item ${itemId}`}
                      body={itemDataById[itemId]?.plaintext}
                    >
                      <img
                        src={`https://ddragon.leagueoflegends.com/cdn/${ddragonVersion ?? DEFAULT_DDRAGON_VERSION}/img/item/${itemId}.png`}
                        alt={`Item ${itemId}`}
                        loading="lazy"
                        decoding="async"
                        className="w-10 h-10 rounded bg-white/5"
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).style.display = "none";
                        }}
                      />
                    </LeagueTooltip>
                  ) : (
                    <div key={idx} className="item-slot-empty w-10 h-10 rounded bg-white/5" />
                  )
                )}
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
