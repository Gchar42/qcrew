"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { REGIONS } from "@/lib/riot-regions";
import type { ProfileBundle } from "@/app/api/riot/profileBundle/route";
import SummonerAutocomplete from "@/components/SummonerAutocomplete";
import CompareResults from "@/components/compare/CompareResults";
import type { CompareStats, QueueStats } from "@/components/compare/CompareResults";
import "./compare.css";

/* ── Data extraction helpers ────────────────────────────── */

function extractQueueStats(
  entry: {
    tier: string;
    rank: string;
    leaguePoints: number;
    wins: number;
    losses: number;
  } | null,
  champs: { championName: string; games: number; winRate: number }[],
): QueueStats {
  const wins = entry?.wins ?? 0;
  const losses = entry?.losses ?? 0;
  const total = wins + losses;
  return {
    tier: entry?.tier ?? "",
    rank: entry?.rank ?? "",
    lp: entry?.leaguePoints ?? 0,
    wins,
    losses,
    wr: total > 0 ? Math.round((wins / total) * 100) : 0,
    topChamps: champs.slice(0, 5).map((c) => ({
      name: c.championName,
      games: c.games,
      winRate: Math.round(c.winRate),
    })),
  };
}

function extractStats(bundle: ProfileBundle, region: string): CompareStats {
  const acc = bundle.profile.account;
  const sum = bundle.profile.summoner;
  const matches = bundle.matches ?? [];

  let totalK = 0;
  let totalD = 0;
  let totalA = 0;
  let totalDamage = 0;
  let totalGold = 0;
  let totalVision = 0;
  let totalObjDmg = 0;
  let matchesWithAdvanced = 0;

  const roleCounts = new Map<string, number>();
  const recentForm: boolean[] = [];
  const playerPuuid = acc.puuid;

  const sortedMatches = [...matches].sort(
    (a, b) => (b.info?.gameEndTimestamp ?? 0) - (a.info?.gameEndTimestamp ?? 0),
  );

  for (const m of sortedMatches) {
    const p = m.info?.participants?.find((x) => x.puuid === playerPuuid);
    if (!p) continue;

    totalK += p.kills;
    totalD += p.deaths;
    totalA += p.assists;

    if (p.totalDamageDealtToChampions != null) {
      totalDamage += p.totalDamageDealtToChampions;
      totalGold += p.goldEarned ?? 0;
      totalVision += p.visionScore ?? 0;
      totalObjDmg += p.damageDealtToObjectives ?? 0;
      matchesWithAdvanced++;
    }

    const role = p.teamPosition || p.individualPosition || "";
    if (role) {
      roleCounts.set(role, (roleCounts.get(role) ?? 0) + 1);
    }

    if (m.info?.queueId === 420 || m.info?.queueId === 440) {
      recentForm.push(p.win);
    }
  }

  const totalRoles = Array.from(roleCounts.values()).reduce((a, b) => a + b, 0);
  const roleDistribution = Array.from(roleCounts.entries())
    .map(([role, count]) => ({
      role,
      count,
      pct: totalRoles > 0 ? Math.round((count / totalRoles) * 100) : 0,
    }))
    .sort((a, b) => b.count - a.count);

  let streakType: "win" | "loss" = recentForm[0] ? "win" : "loss";
  let streakCount = 0;
  for (const w of recentForm) {
    if ((w && streakType === "win") || (!w && streakType === "loss")) {
      streakCount++;
    } else {
      break;
    }
  }

  const soloChamps = bundle.championStats?.solo?.champions ?? [];
  const flexChamps = bundle.championStats?.flex?.champions ?? [];

  return {
    name: acc.gameName,
    tag: acc.tagLine,
    region,
    level: sum.summonerLevel,
    profileIconId: sum.profileIconId,
    solo: extractQueueStats(bundle.ranked.solo, soloChamps),
    flex: extractQueueStats(bundle.ranked.flex, flexChamps),
    matchCount: bundle.computed.matchCount,
    avgKda: bundle.computed.avgKda,
    csPerMin: bundle.computed.csPerMin,
    avgDuration: bundle.computed.avgDuration,
    avgRankPlayed: bundle.computed.avgRankPlayedAgainst,
    totalKills: totalK,
    totalDeaths: totalD,
    totalAssists: totalA,
    ddragonVersion: bundle.ddragonVersion,
    recentForm,
    roleDistribution,
    avgDamage:
      matchesWithAdvanced > 0
        ? Math.round(totalDamage / matchesWithAdvanced)
        : 0,
    avgGold:
      matchesWithAdvanced > 0
        ? Math.round(totalGold / matchesWithAdvanced)
        : 0,
    avgVision:
      matchesWithAdvanced > 0
        ? Math.round((totalVision / matchesWithAdvanced) * 10) / 10
        : 0,
    avgObjDamage:
      matchesWithAdvanced > 0
        ? Math.round(totalObjDmg / matchesWithAdvanced)
        : 0,
    streak: { type: streakType, count: streakCount },
  };
}

/* ── Page inner (needs Suspense for useSearchParams) ────── */

function CompareInner() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const s1Param =
    searchParams.get("summoner1") || searchParams.get("p1") || "";
  const r1Param =
    searchParams.get("region1") || searchParams.get("r1") || "na1";
  const s2Param =
    searchParams.get("summoner2") || searchParams.get("p2") || "";
  const r2Param =
    searchParams.get("region2") || searchParams.get("r2") || "na1";

  const [summoner1, setSummoner1] = useState(s1Param);
  const [region1, setRegion1] = useState(r1Param);
  const [summoner2, setSummoner2] = useState(s2Param);
  const [region2, setRegion2] = useState(r2Param);

  const [stats1, setStats1] = useState<CompareStats | null>(null);
  const [stats2, setStats2] = useState<CompareStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchBundle = useCallback(
    async (riotId: string, region: string): Promise<ProfileBundle> => {
      const url = `/api/riot/profileBundle?riotId=${encodeURIComponent(riotId)}&region=${encodeURIComponent(region)}&queue=solo`;
      const res = await fetch(url);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(
          (body as { error?: string }).error || "Failed to load",
        );
      }
      return res.json() as Promise<ProfileBundle>;
    },
    [],
  );

  const doCompare = useCallback(async () => {
    if (!summoner1.trim() || !summoner2.trim()) return;
    setLoading(true);
    setError(null);
    setStats1(null);
    setStats2(null);

    const params = new URLSearchParams({
      summoner1: summoner1.trim(),
      region1,
      summoner2: summoner2.trim(),
      region2,
    });
    router.replace(`/compare?${params.toString()}`);

    try {
      const [b1, b2] = await Promise.all([
        fetchBundle(summoner1.trim(), region1),
        fetchBundle(summoner2.trim(), region2),
      ]);
      setStats1(extractStats(b1, region1));
      setStats2(extractStats(b2, region2));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load profiles");
    } finally {
      setLoading(false);
    }
  }, [summoner1, region1, summoner2, region2, fetchBundle, router]);

  useEffect(() => {
    if (s1Param && s2Param) {
      setSummoner1(s1Param);
      setRegion1(r1Param);
      setSummoner2(s2Param);
      setRegion2(r2Param);
    }
  }, [s1Param, r1Param, s2Param, r2Param]);

  useEffect(() => {
    if (s1Param && s2Param) {
      doCompare();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    doCompare();
  };

  return (
    <div className="compare-page">
      <div className="compare-container">
        <h1 className="compare-title">Compare Players</h1>

        <form className="compare-picker" onSubmit={handleSubmit}>
          <div className="compare-picker-group">
            <label>Summoner 1</label>
            <SummonerAutocomplete
              value={summoner1}
              onChange={setSummoner1}
              onSelect={setSummoner1}
              placeholder="Name#Tag"
              inputClassName="compare-input"
            />
          </div>
          <div className="compare-picker-group">
            <label>Region</label>
            <select
              value={region1}
              onChange={(e) => setRegion1(e.target.value)}
            >
              {REGIONS.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>

          <span className="compare-vs">VS</span>

          <div className="compare-picker-group">
            <label>Summoner 2</label>
            <SummonerAutocomplete
              value={summoner2}
              onChange={setSummoner2}
              onSelect={setSummoner2}
              placeholder="Name#Tag"
              inputClassName="compare-input"
            />
          </div>
          <div className="compare-picker-group">
            <label>Region</label>
            <select
              value={region2}
              onChange={(e) => setRegion2(e.target.value)}
            >
              {REGIONS.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>

          <button
            type="submit"
            className="compare-btn"
            disabled={loading || !summoner1.trim() || !summoner2.trim()}
          >
            {loading ? "Loading..." : "Compare"}
          </button>
        </form>

        {loading && (
          <div className="compare-loading">Loading profiles...</div>
        )}
        {error && <div className="compare-error">{error}</div>}

        {stats1 && stats2 && (
          <CompareResults stats1={stats1} stats2={stats2} />
        )}
      </div>
    </div>
  );
}

export default function ComparePage() {
  return (
    <Suspense
      fallback={
        <div className="compare-page">
          <div className="compare-container">
            <div className="compare-loading">Loading...</div>
          </div>
        </div>
      }
    >
      <CompareInner />
    </Suspense>
  );
}
