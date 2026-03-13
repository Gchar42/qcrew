"use client";

import { useEffect, useState } from "react";
import {
  getRankEmblemUrl,
  getChampionSquareUrl,
  getChampionSplashUrl,
} from "@/lib/riotAssets";

const TIER_COLORS: Record<string, string> = {
  CHALLENGER: "#F59E0B",
  GRANDMASTER: "#EF4444",
  MASTER: "#A855F7",
  DIAMOND: "#22D3EE",
  EMERALD: "#34D399",
  PLATINUM: "#2DD4BF",
  GOLD: "#FACC15",
  SILVER: "#A1A1AA",
  BRONZE: "#FB923C",
  IRON: "#78716C",
};

const TIER_BORDER_COLORS: Record<string, string> = {
  CHALLENGER: "#F4C874",
  GRANDMASTER: "#FF4444",
  MASTER: "#9B59B6",
  DIAMOND: "#4FC3F7",
  EMERALD: "#2ECC71",
  PLATINUM: "#1ABC9C",
  GOLD: "#C89B3C",
  SILVER: "#AAB8C2",
  BRONZE: "#CD7F32",
  IRON: "#8B7355",
};

const REGION_LABELS: Record<string, string> = {
  na1: "NA",
  euw1: "EUW",
  eun1: "EUNE",
  kr: "KR",
  jp1: "JP",
  br1: "BR",
  la1: "LAN",
  la2: "LAS",
  oc1: "OCE",
  tr1: "TR",
  ru: "RU",
};

type CardData = {
  name: string;
  tier: string | null;
  rank: string | null;
  lp: number | null;
  wins: number;
  losses: number;
  topChampion: string | null;
  lastMatch: {
    champion: string;
    win: boolean;
    kills: number;
    deaths: number;
    assists: number;
  } | null;
};

function extractCardData(bundle: {
  profile: { account: { gameName: string; tagLine: string } };
  ranked: {
    solo: {
      tier: string;
      rank: string;
      leaguePoints: number;
      wins: number;
      losses: number;
    } | null;
  };
  matches: Array<{
    info: {
      participants: Array<{
        puuid: string;
        championName: string;
        win: boolean;
        kills: number;
        deaths: number;
        assists: number;
      }>;
    };
    metadata: { participants?: string[] };
  }>;
  championStats: {
    solo: { champions: Array<{ championName: string }> };
  };
}): CardData {
  const name = `${bundle.profile.account.gameName}#${bundle.profile.account.tagLine}`;
  const solo = bundle.ranked.solo;
  const topChamp = bundle.championStats?.solo?.champions?.[0]?.championName ?? null;

  let lastMatch: CardData["lastMatch"] = null;
  const m = bundle.matches?.[0];
  if (m) {
    const pList = m.metadata?.participants ?? [];
    const participants = m.info?.participants ?? [];
    for (const p of participants) {
      if (pList.includes(p.puuid)) {
        lastMatch = {
          champion: p.championName,
          win: p.win,
          kills: p.kills,
          deaths: p.deaths,
          assists: p.assists,
        };
        break;
      }
    }
  }

  return {
    name,
    tier: solo?.tier ?? null,
    rank: solo?.rank ?? null,
    lp: solo?.leaguePoints ?? null,
    wins: solo?.wins ?? 0,
    losses: solo?.losses ?? 0,
    topChampion: topChamp,
    lastMatch,
  };
}

export default function FollowCard({
  riotId,
  region,
  onRemove,
}: {
  riotId: string;
  region: string;
  onRemove: () => void;
}) {
  const [data, setData] = useState<CardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const regionLabel = REGION_LABELS[region.toLowerCase()] ?? region.toUpperCase();

  useEffect(() => {
    let cancelled = false;
    async function fetchData() {
      try {
        const url = `/api/riot/profileBundle?riotId=${encodeURIComponent(riotId)}&region=${encodeURIComponent(region)}&queue=solo`;
        const res = await fetch(url, { cache: "no-store" });
        if (!res.ok) throw new Error("fetch failed");
        const bundle = await res.json();
        if (!cancelled) {
          setData(extractCardData(bundle));
          setError(false);
        }
      } catch {
        if (!cancelled) setError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchData();
    return () => {
      cancelled = true;
    };
  }, [riotId, region]);

  const tierColor = data?.tier
    ? (TIER_COLORS[data.tier.toUpperCase()] ?? "#A1A1AA")
    : "#A1A1AA";
  const totalGames = (data?.wins ?? 0) + (data?.losses ?? 0);
  const winRate =
    totalGames > 0 ? Math.round(((data?.wins ?? 0) / totalGames) * 100) : 0;
  const rankLabel =
    data?.tier && data?.rank
      ? `${data.tier} ${data.rank}`
      : (data?.tier ?? "Unranked");

  const borderColor = data?.tier
    ? (TIER_BORDER_COLORS[data.tier.toUpperCase()] ?? "rgba(255,255,255,0.08)")
    : "rgba(255,255,255,0.08)";

  const profileUrl = `/summoner?riotId=${encodeURIComponent(riotId)}&region=${encodeURIComponent(region)}`;

  return (
    <div
      className="ff-card"
      style={{
        borderLeftWidth: "4px",
        borderLeftStyle: "solid",
        borderLeftColor: borderColor,
        boxShadow: data?.tier
          ? `inset 4px 0 8px -4px ${borderColor}66`
          : undefined,
      }}
    >
      {data?.topChampion && (
        <div
          className="ff-card-splash"
          style={{
            backgroundImage: `url(${getChampionSplashUrl(data.topChampion)})`,
          }}
        />
      )}
      <div className="ff-card-overlay" />

      <div className="ff-card-content">
        {loading ? (
          <div className="ff-card-loading">
            <span className="ff-spinner" />
            <span className="ff-loading-name">{riotId}</span>
          </div>
        ) : error ? (
          <div className="ff-card-error">
            <span className="ff-error-name">{riotId}</span>
            <span className="ff-error-text">Failed to load</span>
            <button className="ff-remove-btn" onClick={onRemove}>
              Unfollow
            </button>
          </div>
        ) : data ? (
          <>
            {/* Top row: name + region */}
            <div className="ff-card-header">
              <a href={profileUrl} className="ff-card-name">
                {data.name}
              </a>
              <span className="ff-card-region">{regionLabel}</span>
            </div>

            {/* Rank row */}
            <div className="ff-rank-row">
              {data.tier && (
                <img
                  src={getRankEmblemUrl(data.tier)}
                  alt={data.tier}
                  className="ff-rank-icon"
                  width={36}
                  height={36}
                />
              )}
              <div className="ff-rank-info">
                <span className="ff-rank-label" style={{ color: tierColor }}>
                  {rankLabel}
                </span>
                {data.lp != null && (
                  <span className="ff-lp">{data.lp} LP</span>
                )}
              </div>
              <div className="ff-wr-info">
                <span
                  className={`ff-wr ${winRate >= 50 ? "ff-wr-pos" : "ff-wr-neg"}`}
                >
                  {winRate}%
                </span>
                <span className="ff-games">{totalGames}G</span>
              </div>
            </div>

            {/* Last match */}
            {data.lastMatch && (
              <div className="ff-last-match">
                <img
                  src={getChampionSquareUrl(data.lastMatch.champion)}
                  alt={data.lastMatch.champion}
                  className="ff-match-champ"
                  width={20}
                  height={20}
                />
                <span
                  className={`ff-match-result ${data.lastMatch.win ? "ff-win" : "ff-loss"}`}
                >
                  {data.lastMatch.win ? "Victory" : "Defeat"}
                </span>
                <span className="ff-match-kda">
                  {data.lastMatch.kills}/{data.lastMatch.deaths}/
                  {data.lastMatch.assists}
                </span>
              </div>
            )}

            {/* Actions */}
            <div className="ff-card-actions">
              <a href={profileUrl} className="ff-view-btn">
                View Profile
              </a>
              <button className="ff-remove-btn" onClick={onRemove}>
                Unfollow
              </button>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
