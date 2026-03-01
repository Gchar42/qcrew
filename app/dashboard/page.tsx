"use client";

import { useState } from "react";

type Account = { puuid: string; gameName: string; tagLine: string };

type MatchParticipant = {
  puuid: string;
  championName: string;
  kills: number;
  deaths: number;
  assists: number;
  win: boolean;
  totalMinionsKilled?: number;
  neutralMinionsKilled?: number;
};

type Match = {
  metadata: { matchId: string };
  info: {
    gameDuration: number;
    participants: MatchParticipant[];
  };
};

function parseRiotId(input: string): { gameName: string; tagLine: string } | null {
  const trimmed = input.trim();
  const hash = trimmed.indexOf("#");
  if (hash === -1) return null;
  const gameName = trimmed.slice(0, hash).trim();
  const tagLine = trimmed.slice(hash + 1).trim();
  return gameName && tagLine ? { gameName, tagLine } : null;
}

function formatDuration(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function DashboardPage() {
  const [riotId, setRiotId] = useState("");
  const [region] = useState("na1");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [account, setAccount] = useState<Account | null>(null);
  const [matches, setMatches] = useState<Match[]>([]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setAccount(null);
    setMatches([]);

    const parsed = parseRiotId(riotId);
    if (!parsed) {
      setError("Use format GameName#Tag");
      return;
    }

    setLoading(true);
    try {
      const accountRes = await fetch(
        `/api/riot/account?region=${encodeURIComponent(region)}&riotId=${encodeURIComponent(parsed.gameName + "#" + parsed.tagLine)}`
      );
      if (!accountRes.ok) {
        const err = await accountRes.json().catch(() => ({}));
        throw new Error((err as { error?: string }).error ?? "Account lookup failed");
      }
      const accountData = (await accountRes.json()) as Account;
      setAccount(accountData);

      const matchesRes = await fetch(
        `/api/riot/matches?region=${encodeURIComponent(region)}&puuid=${encodeURIComponent(accountData.puuid)}&count=10`
      );
      if (!matchesRes.ok) {
        const err = await matchesRes.json().catch(() => ({}));
        throw new Error((err as { error?: string }).error ?? "Match list failed");
      }
      const { matchIds } = (await matchesRes.json()) as { matchIds: string[] };
      if (!matchIds?.length) {
        setMatches([]);
        return;
      }

      const matchDetails: Match[] = [];
      for (const matchId of matchIds) {
        const matchRes = await fetch(
          `/api/riot/match?region=${encodeURIComponent(region)}&matchId=${encodeURIComponent(matchId)}`
        );
        if (!matchRes.ok) continue;
        const matchData = (await matchRes.json()) as Match;
        matchDetails.push(matchData);
      }
      setMatches(matchDetails);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  const wins = matches.filter((m) => {
    const p = m.info?.participants?.find((x) => x.puuid === account?.puuid);
    return p?.win;
  }).length;
  const total = matches.length;
  const winRate = total ? Math.round((wins / total) * 100) : 0;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">Match history</h1>

      <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3">
        <input
          type="text"
          value={riotId}
          onChange={(e) => setRiotId(e.target.value)}
          placeholder="GameName#Tag"
          className="flex-1 rounded-lg bg-white/5 border border-white/10 px-4 py-3 text-white placeholder-zinc-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          disabled={loading}
        />
        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-indigo-500 px-6 py-3 font-medium text-white hover:bg-indigo-600 disabled:opacity-50 transition-colors shrink-0"
        >
          {loading ? "Searching…" : "Search"}
        </button>
      </form>

      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-red-300 text-sm">
          {error}
        </div>
      )}

      {account && (
        <>
          <div className="glass rounded-xl p-4 flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="text-lg font-semibold text-white">
                {account.gameName}#{account.tagLine}
              </div>
              <div className="text-zinc-400 text-sm mt-0.5">Riot ID</div>
            </div>
            {total > 0 && (
              <div className="text-right">
                <div className="text-xl font-bold text-white">{winRate}% WR</div>
                <div className="text-zinc-400 text-sm">
                  {wins}W {total - wins}L · Last {total}
                </div>
              </div>
            )}
          </div>

          {matches.length > 0 ? (
            <div className="space-y-2">
              <h2 className="text-sm font-medium text-zinc-400 uppercase tracking-wide">
                Recent matches
              </h2>
              <ul className="space-y-2">
                {matches.map((match) => {
                  const p = match.info?.participants?.find(
                    (x) => x.puuid === account.puuid
                  );
                  if (!p) return null;
                  const duration = formatDuration(match.info?.gameDuration ?? 0);
                  const kda = `${p.kills}/${p.deaths}/${p.assists}`;
                  return (
                    <li
                      key={match.metadata?.matchId ?? ""}
                      className="glass rounded-xl p-4 flex items-center gap-4 hover:border-white/20 border border-transparent transition-colors"
                    >
                      <div
                        className={`shrink-0 w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold ${
                          p.win
                            ? "bg-emerald-500/20 text-emerald-400"
                            : "bg-red-500/20 text-red-400"
                        }`}
                      >
                        {p.win ? "W" : "L"}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold text-white">
                          {p.championName}
                        </div>
                        <div className="text-zinc-400 text-sm">
                          {kda} K/D/A · {duration}
                        </div>
                      </div>
                      <div
                        className={`shrink-0 text-sm font-medium ${
                          p.win ? "text-emerald-400" : "text-red-400"
                        }`}
                      >
                        {p.win ? "Victory" : "Defeat"}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          ) : (
            !loading && (
              <div className="glass rounded-xl p-8 text-center text-zinc-400 text-sm">
                No recent matches found.
              </div>
            )
          )}
        </>
      )}

      {loading && (
        <div className="glass rounded-xl p-8 flex items-center justify-center gap-2 text-zinc-400">
          <span className="animate-pulse">Loading matches…</span>
        </div>
      )}
    </div>
  );
}
