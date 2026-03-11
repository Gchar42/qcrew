"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  getProfileIconUrl,
  getRankEmblemUrl,
  getChampionSquareUrl,
} from "@/lib/riotAssets";
import { REGIONS } from "@/lib/riot-regions";
import type { ProfileBundle } from "@/app/api/riot/profileBundle/route";
import "./compare.css";

type CompareStats = {
  name: string;
  tag: string;
  region: string;
  level: number;
  profileIconId: number;
  soloTier: string;
  soloRank: string;
  soloLp: number;
  soloWins: number;
  soloLosses: number;
  soloWr: number;
  flexTier: string;
  flexRank: string;
  flexLp: number;
  matchCount: number;
  avgKda: string;
  csPerMin: number;
  avgDuration: number;
  avgRankPlayed: string;
  topChamps: { name: string; games: number; winRate: number }[];
  totalKills: number;
  totalDeaths: number;
  totalAssists: number;
  ddragonVersion: string | null;
};

function extractStats(bundle: ProfileBundle, region: string): CompareStats {
  const acc = bundle.profile.account;
  const sum = bundle.profile.summoner;
  const solo = bundle.ranked.solo;
  const flex = bundle.ranked.flex;
  const soloWins = solo?.wins ?? 0;
  const soloLosses = solo?.losses ?? 0;
  const soloTotal = soloWins + soloLosses;

  const matches = bundle.matches ?? [];
  let totalK = 0, totalD = 0, totalA = 0;
  for (const m of matches) {
    const p = m.info?.participants?.find((x) => x.puuid === acc.puuid);
    if (p) { totalK += p.kills; totalD += p.deaths; totalA += p.assists; }
  }

  const champStats = bundle.championStats?.solo?.champions ?? [];
  const topChamps = champStats.slice(0, 5).map((c) => ({
    name: c.championName,
    games: c.games,
    winRate: Math.round(c.winRate),
  }));

  return {
    name: acc.gameName,
    tag: acc.tagLine,
    region,
    level: sum.summonerLevel,
    profileIconId: sum.profileIconId,
    soloTier: solo?.tier ?? "",
    soloRank: solo?.rank ?? "",
    soloLp: solo?.leaguePoints ?? 0,
    soloWins,
    soloLosses,
    soloWr: soloTotal > 0 ? Math.round((soloWins / soloTotal) * 100) : 0,
    flexTier: flex?.tier ?? "",
    flexRank: flex?.rank ?? "",
    flexLp: flex?.leaguePoints ?? 0,
    matchCount: bundle.computed.matchCount,
    avgKda: bundle.computed.avgKda,
    csPerMin: bundle.computed.csPerMin,
    avgDuration: bundle.computed.avgDuration,
    avgRankPlayed: bundle.computed.avgRankPlayedAgainst,
    topChamps,
    totalKills: totalK,
    totalDeaths: totalD,
    totalAssists: totalA,
    ddragonVersion: bundle.ddragonVersion,
  };
}

function formatTier(tier: string, rank: string): string {
  if (!tier) return "Unranked";
  return `${tier.charAt(0)}${tier.slice(1).toLowerCase()} ${rank}`.trim();
}

function StatRow({
  left,
  right,
  label,
  higherIsBetter = true,
}: {
  left: string | number;
  right: string | number;
  label: string;
  higherIsBetter?: boolean;
}) {
  const lNum = typeof left === "number" ? left : parseFloat(String(left));
  const rNum = typeof right === "number" ? right : parseFloat(String(right));
  const lValid = !isNaN(lNum);
  const rValid = !isNaN(rNum);

  let lClass = "neutral";
  let rClass = "neutral";
  if (lValid && rValid && lNum !== rNum) {
    const lBetter = higherIsBetter ? lNum > rNum : lNum < rNum;
    lClass = lBetter ? "better" : "worse";
    rClass = lBetter ? "worse" : "better";
  }

  return (
    <>
      <div className={`compare-stat-value ${lClass}`}>{left}</div>
      <div className="compare-stat-label">{label}</div>
      <div className={`compare-stat-value ${rClass}`}>{right}</div>
    </>
  );
}

function PlayerHeader({ stats }: { stats: CompareStats }) {
  return (
    <div className="compare-player-header">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        className="compare-player-icon"
        src={getProfileIconUrl(stats.profileIconId, stats.ddragonVersion)}
        alt=""
        width={64}
        height={64}
      />
      <div className="compare-player-name">
        {stats.name}
        <span className="compare-player-tag">#{stats.tag}</span>
      </div>
      <div className="compare-player-level">Lv. {stats.level}</div>
    </div>
  );
}

function RankDisplay({ tier, rank, lp }: { tier: string; rank: string; lp: number }) {
  if (!tier) return <div className="compare-rank"><span className="compare-rank-tier">Unranked</span></div>;
  return (
    <div className="compare-rank">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="compare-rank-emblem" src={getRankEmblemUrl(tier)} alt="" width={48} height={48} />
      <span className="compare-rank-tier">{formatTier(tier, rank)}</span>
      <span className="compare-rank-lp">{lp} LP</span>
    </div>
  );
}

function ChampIcons({ champs, version }: { champs: CompareStats["topChamps"]; version: string | null }) {
  if (!champs.length) return <span style={{ color: "var(--muted)", fontSize: 13 }}>No data</span>;
  return (
    <div className="compare-champs">
      {champs.map((c) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={c.name}
          className="compare-champ-icon"
          src={getChampionSquareUrl(c.name, version)}
          alt={c.name}
          title={`${c.name} - ${c.winRate}% WR (${c.games} games)`}
          width={32}
          height={32}
        />
      ))}
    </div>
  );
}

function parseKda(kda: string): { k: number; d: number; a: number; ratio: number } {
  const parts = kda.split("/").map((s) => parseFloat(s.trim()));
  const k = parts[0] || 0;
  const d = parts[1] || 0;
  const a = parts[2] || 0;
  const ratio = d === 0 ? k + a : (k + a) / d;
  return { k, d, a, ratio: Math.round(ratio * 100) / 100 };
}

function CompareInner() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const s1Param = searchParams.get("summoner1") || "";
  const r1Param = searchParams.get("region1") || "na1";
  const s2Param = searchParams.get("summoner2") || "";
  const r2Param = searchParams.get("region2") || "na1";

  const [summoner1, setSummoner1] = useState(s1Param);
  const [region1, setRegion1] = useState(r1Param);
  const [summoner2, setSummoner2] = useState(s2Param);
  const [region2, setRegion2] = useState(r2Param);

  const [stats1, setStats1] = useState<CompareStats | null>(null);
  const [stats2, setStats2] = useState<CompareStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchBundle = useCallback(async (riotId: string, region: string): Promise<ProfileBundle> => {
    const url = `/api/riot/profileBundle?riotId=${encodeURIComponent(riotId)}&region=${encodeURIComponent(region)}&queue=solo`;
    const res = await fetch(url);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error((body as { error?: string }).error || "Failed to load");
    }
    return res.json() as Promise<ProfileBundle>;
  }, []);

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

  const kda1 = stats1 ? parseKda(stats1.avgKda) : null;
  const kda2 = stats2 ? parseKda(stats2.avgKda) : null;

  return (
    <div className="compare-page">
      <div className="compare-container">
        <h1 className="compare-title">Compare Players</h1>

        <form className="compare-picker" onSubmit={handleSubmit}>
          <div className="compare-picker-group">
            <label>Summoner 1</label>
            <input
              type="text"
              placeholder="Name#Tag"
              value={summoner1}
              onChange={(e) => setSummoner1(e.target.value)}
            />
          </div>
          <div className="compare-picker-group">
            <label>Region</label>
            <select value={region1} onChange={(e) => setRegion1(e.target.value)}>
              {REGIONS.map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
          </div>

          <span className="compare-vs">VS</span>

          <div className="compare-picker-group">
            <label>Summoner 2</label>
            <input
              type="text"
              placeholder="Name#Tag"
              value={summoner2}
              onChange={(e) => setSummoner2(e.target.value)}
            />
          </div>
          <div className="compare-picker-group">
            <label>Region</label>
            <select value={region2} onChange={(e) => setRegion2(e.target.value)}>
              {REGIONS.map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
          </div>

          <button type="submit" className="compare-btn" disabled={loading || !summoner1.trim() || !summoner2.trim()}>
            {loading ? "Loading..." : "Compare"}
          </button>
        </form>

        {loading && <div className="compare-loading">Loading profiles...</div>}
        {error && <div className="compare-error">{error}</div>}

        {stats1 && stats2 && (
          <div className="compare-grid">
            {/* Headers */}
            <div className="compare-col compare-col-left">
              <PlayerHeader stats={stats1} />
            </div>
            <div className="compare-labels">
              <div className="compare-player-header" style={{ visibility: "hidden" }}>
                <div style={{ width: 64, height: 64 }} />
                <div>&nbsp;</div>
                <div>&nbsp;</div>
              </div>
            </div>
            <div className="compare-col compare-col-right">
              <PlayerHeader stats={stats2} />
            </div>

            {/* Ranked Solo */}
            <div className="compare-section-title">Ranked Solo</div>
            <div className="compare-col compare-col-left">
              <RankDisplay tier={stats1.soloTier} rank={stats1.soloRank} lp={stats1.soloLp} />
            </div>
            <div className="compare-labels">
              <div className="compare-stat-label">Rank</div>
            </div>
            <div className="compare-col compare-col-right">
              <RankDisplay tier={stats2.soloTier} rank={stats2.soloRank} lp={stats2.soloLp} />
            </div>

            <StatRow left={stats1.soloLp} right={stats2.soloLp} label="LP" />
            <StatRow left={`${stats1.soloWins}W - ${stats1.soloLosses}L`} right={`${stats2.soloWins}W - ${stats2.soloLosses}L`} label="Record" />
            <StatRow left={`${stats1.soloWr}%`} right={`${stats2.soloWr}%`} label="Win Rate" />

            {/* Recent Games */}
            <div className="compare-section-title">Recent Games</div>
            <StatRow left={stats1.matchCount} right={stats2.matchCount} label="Games" />
            <StatRow
              left={kda1 ? `${kda1.k}/${kda1.d}/${kda1.a}` : "-"}
              right={kda2 ? `${kda2.k}/${kda2.d}/${kda2.a}` : "-"}
              label="Avg KDA"
            />
            <StatRow
              left={kda1 ? kda1.ratio.toFixed(2) : "-"}
              right={kda2 ? kda2.ratio.toFixed(2) : "-"}
              label="KDA Ratio"
            />
            <StatRow
              left={stats1.csPerMin.toFixed(1)}
              right={stats2.csPerMin.toFixed(1)}
              label="CS / min"
            />
            <StatRow
              left={`${stats1.avgDuration.toFixed(1)}m`}
              right={`${stats2.avgDuration.toFixed(1)}m`}
              label="Avg Duration"
              higherIsBetter={false}
            />
            <StatRow left={stats1.avgRankPlayed} right={stats2.avgRankPlayed} label="Avg Enemy Rank" />

            {/* Top Champions */}
            <div className="compare-section-title">Top Champions</div>
            <div className="compare-col compare-col-left">
              <ChampIcons champs={stats1.topChamps} version={stats1.ddragonVersion} />
            </div>
            <div className="compare-labels">
              <div className="compare-stat-label">Most Played</div>
            </div>
            <div className="compare-col compare-col-right">
              <ChampIcons champs={stats2.topChamps} version={stats2.ddragonVersion} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ComparePage() {
  return (
    <Suspense fallback={<div className="compare-page"><div className="compare-container"><div className="compare-loading">Loading...</div></div></div>}>
      <CompareInner />
    </Suspense>
  );
}
