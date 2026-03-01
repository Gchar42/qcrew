"use client";

interface MatchDetailPanelProps {
  open: boolean;
  onClose: () => void;
  match: {
    champion_placeholder: string;
    role: string;
    kills: number;
    deaths: number;
    assists: number;
    cs_per_min: number;
    carry_score: number;
    grief_index: number;
    label: string | null;
    played_at: string;
  };
}

export function MatchDetailPanel({ open, onClose, match }: MatchDetailPanelProps) {
  if (!open) return null;

  const kda = `${match.kills}/${match.deaths}/${match.assists}`;
  const played = new Date(match.played_at).toLocaleDateString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });

  return (
    <>
      <div
        className="fixed inset-0 bg-black/40 z-40"
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
          <div className="space-y-4">
            <div>
              <p className="text-sm text-zinc-500">Champion</p>
              <p className="text-white font-medium">{match.champion_placeholder}</p>
            </div>
            <div>
              <p className="text-sm text-zinc-500">Role</p>
              <p className="text-white">{match.role}</p>
            </div>
            <div>
              <p className="text-sm text-zinc-500">KDA</p>
              <p className="text-white font-mono">{kda}</p>
            </div>
            <div>
              <p className="text-sm text-zinc-500">CS/min</p>
              <p className="text-white" title="Creep score per minute">
                {match.cs_per_min}
              </p>
            </div>
            <div>
              <p className="text-sm text-zinc-500">Carry Score</p>
              <p className="text-indigo-400">{match.carry_score}</p>
            </div>
            <div>
              <p className="text-sm text-zinc-500">Grief Index</p>
              <p className="text-amber-400">{match.grief_index}</p>
            </div>
            {match.label && (
              <div>
                <p className="text-sm text-zinc-500">Label</p>
                <p className="text-white">{match.label}</p>
              </div>
            )}
            <div>
              <p className="text-sm text-zinc-500">Played</p>
              <p className="text-zinc-400 text-sm">{played}</p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
