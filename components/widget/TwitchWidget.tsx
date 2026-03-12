"use client";

import { getRankEmblemUrl } from "@/lib/riotAssets";

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

function splashUrl(championName: string): string {
  return `https://ddragon.leagueoflegends.com/cdn/img/champion/splash/${championName}_0.jpg`;
}

export type WidgetData = {
  name: string;
  region: string;
  tier: string | null;
  rank: string | null;
  lp: number | null;
  wins: number;
  losses: number;
  topChampion: { name: string; games: number; winRate: number } | null;
  splashChampion: string | null;
  sessionWins: number;
  sessionLosses: number;
};

export default function TwitchWidget({
  data,
  isDemo = false,
}: {
  data: WidgetData | null;
  isDemo?: boolean;
}) {
  if (!data) {
    return (
      <div className="tw-widget tw-widget-loading">
        <span className="tw-spinner" />
        <span className="tw-loading-text">Loading...</span>
      </div>
    );
  }

  const {
    name,
    region,
    tier,
    rank,
    lp,
    wins,
    losses,
    topChampion,
    splashChampion,
    sessionWins,
    sessionLosses,
  } = data;

  const totalGames = wins + losses;
  const winRate = totalGames > 0 ? Math.round((wins / totalGames) * 100) : 0;
  const tierColor = tier ? TIER_COLORS[tier.toUpperCase()] ?? "#A1A1AA" : "#A1A1AA";
  const regionLabel = REGION_LABELS[region.toLowerCase()] ?? region.toUpperCase();
  const rankLabel = tier && rank ? `${tier} ${rank}` : tier ?? "Unranked";
  const lpLabel = lp != null ? `${lp} LP` : "";
  const sessionNet = sessionWins - sessionLosses;

  return (
    <div className="tw-widget">
      {/* Splash art background with Ken Burns animation */}
      {splashChampion && (
        <div
          className="tw-splash"
          style={{ backgroundImage: `url(${splashUrl(splashChampion)})` }}
        />
      )}
      <div className="tw-overlay" />

      {/* Content layer */}
      <div className="tw-content">
        {/* Player name + region */}
        <div className="tw-header">
          <span className="tw-name">{name}</span>
          <span className="tw-region">{regionLabel}</span>
        </div>

        {/* Rank display */}
        <div className="tw-rank-row">
          {tier ? (
            <img
              src={getRankEmblemUrl(tier)}
              alt={tier}
              className="tw-rank-icon"
              width={56}
              height={56}
            />
          ) : (
            <div className="tw-rank-icon-placeholder" />
          )}
          <div className="tw-rank-info">
            <span className="tw-rank-label" style={{ color: tierColor }}>
              {rankLabel}
            </span>
            {lpLabel && <span className="tw-lp">{lpLabel}</span>}
          </div>
        </div>

        <div className="tw-divider" />

        {/* This Week section */}
        <div className="tw-section">
          <span className="tw-section-title">This Week</span>
          <div className="tw-stats-row">
            <span className="tw-wr">{winRate}% WR</span>
            <span className="tw-record">
              {wins}W {losses}L
            </span>
          </div>
          {topChampion && (
            <div className="tw-champ-row">
              <span className="tw-champ-wr">
                {topChampion.winRate}% · {topChampion.games}G
              </span>
            </div>
          )}
        </div>

        {/* Last session */}
        {(sessionWins > 0 || sessionLosses > 0) && (
          <div className="tw-session">
            <span className="tw-session-label">Last session:</span>
            <span
              className={`tw-session-result ${sessionNet > 0 ? "tw-positive" : sessionNet < 0 ? "tw-negative" : "tw-neutral"}`}
            >
              {sessionWins}W {sessionLosses}L{" "}
              {sessionNet > 0 ? "↑" : sessionNet < 0 ? "↓" : "→"}
            </span>
          </div>
        )}

        {/* Branding */}
        <div className="tw-footer">
          <span className="tw-brand">statgap.gg</span>
        </div>

        {isDemo && <span className="tw-demo-badge">Demo</span>}
      </div>
    </div>
  );
}
