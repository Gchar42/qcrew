"use client";

import Link from "next/link";
import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { fetchJsonWithRetry, mapWithConcurrency } from "@/lib/fetchUtils";
import { SummonerHeader } from "@/components/summoner/SummonerHeader";
import { MatchList } from "@/components/summoner/MatchList";
import { MatchDetailSlideOver } from "@/components/summoner/MatchDetailSlideOver";
import type { AccountDto, SummonerDto, MatchDto } from "@/types/riot";

const REGION = "na1";

function parseRiotIdFromQuery(riotIdParam: string | null) {
  if (!riotIdParam || typeof riotIdParam !== "string") return null;
  try {
    const decoded = decodeURIComponent(riotIdParam.trim());
    if (!decoded.includes("#")) return null;
    const parts = decoded.split("#");
    const gameName = parts[0]?.trim();
    const tagLine = parts[1]?.trim();
    if (!gameName || !tagLine) return null;
    return { gameName, tagLine };
  } catch {
    return null;
  }
}

function SummonerProfileContent() {
  const searchParams = useSearchParams();
  const riotIdParam = searchParams.get("riotId");
  const parsed = parseRiotIdFromQuery(riotIdParam);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [account, setAccount] = useState<AccountDto | null>(null);
  const [summoner, setSummoner] = useState<SummonerDto | null>(null);
  const [matches, setMatches] = useState<MatchDto[]>([]);
  const [detailMatch, setDetailMatch] = useState<MatchDto | null>(null);

  const fetchProfile = useCallback(async () => {
    if (!parsed) {
      setLoading(false);
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const accountRes = await fetchJsonWithRetry<AccountDto>(
        `/api/riot/account?gameName=${encodeURIComponent(parsed.gameName)}&tagLine=${encodeURIComponent(parsed.tagLine)}&region=${REGION}`,
        2
      );
      setAccount(accountRes);

      const [summonerRes, matchListRes] = await Promise.all([
        fetchJsonWithRetry<SummonerDto>(
          `/api/riot/summoner?puuid=${encodeURIComponent(accountRes.puuid)}&region=${REGION}`,
          2
        ),
        fetchJsonWithRetry<{ matchIds: string[] }>(
          `/api/riot/matches?puuid=${encodeURIComponent(accountRes.puuid)}&region=${REGION}&count=20`,
          2
        ),
      ]);
      setSummoner(summonerRes);

      const matchDetails = await mapWithConcurrency(
        matchListRes.matchIds.slice(0, 20),
        3,
        async (matchId) =>
          fetchJsonWithRetry<MatchDto>(
            `/api/riot/match?matchId=${encodeURIComponent(matchId)}&region=${REGION}`,
            3
          )
      );
      setMatches(matchDetails);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load summoner"
      );
      setAccount(null);
      setSummoner(null);
      setMatches([]);
    } finally {
      setLoading(false);
    }
  }, [parsed?.gameName, parsed?.tagLine]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  if (!riotIdParam) {
    return (
      <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-6 text-center">
        <p className="text-amber-200">Missing Riot ID. Open a profile from search results.</p>
        <Link href="/search" className="mt-4 inline-block text-indigo-400 hover:underline">
          Go to search
        </Link>
      </div>
    );
  }

  if (!parsed) {
    return (
      <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-6 text-center">
        <p className="text-amber-200">Invalid Riot ID in URL. Use format GameName#Tag.</p>
        <Link href="/search" className="mt-4 inline-block text-indigo-400 hover:underline">
          Go to search
        </Link>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-zinc-400">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
        <p className="mt-4">Loading profile...</p>
      </div>
    );
  }

  if (error || !account) {
    return (
      <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-6 text-center">
        <p className="text-red-200">{error ?? "Failed to load summoner"}</p>
        <button
          type="button"
          onClick={fetchProfile}
          className="mt-4 rounded-lg bg-indigo-500 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-600"
        >
          Try again
        </button>
      </div>
    );
  }

  const wins = matches.filter((m) =>
    m.info?.participants?.find((p) => p.puuid === account.puuid)?.win
  ).length;
  const total = matches.length;
  const winRate = total ? Math.round((wins / total) * 100) : 0;

  const last10 = matches.slice(0, 10);
  const participant = (m: MatchDto) =>
    m.info?.participants?.find((p) => p.puuid === account.puuid);
  let avgKills = 0,
    avgDeaths = 0,
    avgAssists = 0,
    totalCs = 0,
    totalDurationSec = 0;
  last10.forEach((m) => {
    const p = participant(m);
    if (p) {
      avgKills += p.kills;
      avgDeaths += p.deaths;
      avgAssists += p.assists;
      totalCs += (p.totalMinionsKilled ?? 0) + (p.neutralMinionsKilled ?? 0);
    }
    totalDurationSec += m.info?.gameDuration ?? 0;
  });
  const n = last10.length || 1;
  avgKills = Math.round((avgKills / n) * 10) / 10;
  avgDeaths = Math.round((avgDeaths / n) * 10) / 10;
  avgAssists = Math.round((avgAssists / n) * 10) / 10;
  const avgDurationMin = totalDurationSec / 60 / n;
  const avgCsPerMin = totalDurationSec > 0 ? (totalCs / (totalDurationSec / 60)) : 0;

  return (
    <>
      <SummonerHeader
        account={account}
        summoner={summoner ?? undefined}
        wins={wins}
        total={total}
        winRate={winRate}
      />

      <section className="mt-8">
        <h2 className="text-lg font-semibold text-white mb-4">Summary (last 10 games)</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="rounded-xl border border-white/10 bg-black/30 p-4">
            <div className="text-xs text-zinc-500 uppercase tracking-wide">Avg KDA</div>
            <div className="text-lg font-semibold text-white mt-1">
              {avgKills} / {avgDeaths} / {avgAssists}
            </div>
          </div>
          <div className="rounded-xl border border-white/10 bg-black/30 p-4">
            <div className="text-xs text-zinc-500 uppercase tracking-wide">Avg CS/min</div>
            <div className="text-lg font-semibold text-white mt-1">
              {avgCsPerMin.toFixed(1)}
            </div>
          </div>
          <div className="rounded-xl border border-white/10 bg-black/30 p-4">
            <div className="text-xs text-zinc-500 uppercase tracking-wide">Avg duration</div>
            <div className="text-lg font-semibold text-white mt-1">
              {avgDurationMin.toFixed(1)} min
            </div>
          </div>
          <div className="rounded-xl border border-white/10 bg-black/30 p-4">
            <div className="text-xs text-zinc-500 uppercase tracking-wide">Rank</div>
            <div className="text-sm text-zinc-400 mt-1">Rank data coming soon</div>
          </div>
        </div>
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-semibold text-white mb-4">
          Recent matches {total > 0 && `· ${winRate}% win rate`}
        </h2>
        <MatchList
          matches={matches}
          puuid={account.puuid}
          onMatchClick={setDetailMatch}
        />
      </section>

      {detailMatch && (
        <MatchDetailSlideOver
          match={detailMatch}
          puuid={account.puuid}
          onClose={() => setDetailMatch(null)}
        />
      )}
    </>
  );
}

export default function SummonerPage() {
  return (
    <div className="min-h-screen bg-[var(--background)]">
      <header className="border-b border-white/10 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <Link
            href="/"
            className="text-xl font-bold text-white hover:text-indigo-400 transition-colors"
          >
            Qcrew
          </Link>
          <Link
            href="/search"
            className="text-sm text-zinc-400 hover:text-white transition-colors"
          >
            ← Search
          </Link>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6">
        <Suspense
          fallback={
            <div className="flex flex-col items-center justify-center py-16 text-zinc-400">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
              <p className="mt-4">Loading...</p>
            </div>
          }
        >
          <SummonerProfileContent />
        </Suspense>
      </main>
    </div>
  );
}
