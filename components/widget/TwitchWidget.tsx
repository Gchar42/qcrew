"use client";

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

const ROLE_LABELS: Record<string, string> = {
  TOP: "TOP",
  JUNGLE: "JNG",
  MIDDLE: "MID",
  BOTTOM: "BOT",
  UTILITY: "SUP",
};

export type WidgetData = {
  name: string;
  region: string;
  tier: string | null;
  rank: string | null;
  lp: number | null;
  wins: number;
  losses: number;
  topChampion: { name: string; games: number; winRate: number } | null;
  topChampions: { name: string; games: number; winRate: number }[];
  splashChampion: string | null;
  sessionWins: number;
  sessionLosses: number;
  ladderRank: number | null;
  lpGainToday: number | null;
  favoriteRole: string | null;
  peakTier: string | null;
  peakRank: string | null;
  hoursPlayedThisWeek: number | null;
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
    topChampions,
    splashChampion,
    sessionWins,
    sessionLosses,
    ladderRank,
    lpGainToday,
    favoriteRole,
    peakTier,
    peakRank,
    hoursPlayedThisWeek,
  } = data;

  const totalGames = wins + losses;
  const winRate = totalGames > 0 ? Math.round((wins / totalGames) * 100) : 0;
  const tierColor = tier
    ? (TIER_COLORS[tier.toUpperCase()] ?? "#A1A1AA")
    : "#A1A1AA";
  const regionLabel =
    REGION_LABELS[region.toLowerCase()] ?? region.toUpperCase();
  const rankLabel = tier && rank ? `${tier} ${rank}` : (tier ?? "Unranked");
  const lpLabel = lp != null ? `${lp} LP` : "";
  const sessionNet = sessionWins - sessionLosses;
  const roleLabel = favoriteRole
    ? (ROLE_LABELS[favoriteRole] ?? favoriteRole)
    : null;
  const peakLabel = peakTier
    ? peakRank
      ? `${peakTier} ${peakRank}`
      : peakTier
    : null;
  const peakColor = peakTier
    ? (TIER_COLORS[peakTier.toUpperCase()] ?? "#d4d4d8")
    : "#d4d4d8";
  const tierUpper = tier?.toUpperCase() ?? "";
  const isChallenger = tierUpper === "CHALLENGER";
  const isGrandmaster = tierUpper === "GRANDMASTER";
  const hasSpinBorder = isChallenger || isGrandmaster;
  const borderColor = tier
    ? (TIER_BORDER_COLORS[tierUpper] ?? "#3a3a3d")
    : "#3a3a3d";

  const widgetStyle: React.CSSProperties = hasSpinBorder
    ? {
        boxShadow: isChallenger
          ? "0 0 15px rgba(244, 200, 116, 0.9), 0 0 30px rgba(244, 200, 116, 0.5)"
          : "0 0 8px rgba(255, 68, 68, 0.8), 0 0 20px rgba(255, 140, 0, 0.4)",
      }
    : {
        borderColor,
        boxShadow: `0 0 8px ${borderColor}66`,
      };

  const widgetEl = (
    <div
      className={`tw-widget${hasSpinBorder ? " tw-spin-card" : ""}`}
      style={widgetStyle}
    >
      {splashChampion && (
        <div
          className="tw-splash"
          style={{
            backgroundImage: `url(${getChampionSplashUrl(splashChampion)})`,
          }}
        />
      )}
      <div className="tw-overlay" />
      <div className="tw-orb-glow" />

      <div className="tw-content">
        {/* ── Top: name + rank ── */}
        <div className="tw-top">
          <div className="tw-header">
            <span className="tw-name">{name}</span>
            <span className="tw-region">{regionLabel}</span>
          </div>

          <div className="tw-rank-row">
            {tier ? (
              <img
                src={getRankEmblemUrl(tier)}
                alt={tier}
                className="tw-rank-icon"
                width={52}
                height={52}
              />
            ) : (
              <div className="tw-rank-icon-placeholder" />
            )}
            <div className="tw-rank-info">
              <span className="tw-rank-label" style={{ color: tierColor }}>
                {rankLabel}
              </span>
              <div className="tw-rank-details">
                {lpLabel && <span className="tw-lp">{lpLabel}</span>}
                {lpGainToday != null && (
                  <span
                    className={`tw-lp-gain ${lpGainToday >= 0 ? "tw-positive" : "tw-negative"}`}
                  >
                    {lpGainToday >= 0 ? "↑" : "↓"}{" "}
                    {lpGainToday >= 0 ? "+" : ""}
                    {lpGainToday} LP
                  </span>
                )}
              </div>
              {ladderRank != null && (
                <span className="tw-ladder">
                  Rank {ladderRank} in {regionLabel}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="tw-divider" />

        {/* ── Bottom: stats ── */}
        <div className="tw-bottom">
          <div className="tw-stats-line">
            <span className="tw-wr">{winRate}% WR</span>
            <span className="tw-record">
              {wins}W {losses}L
            </span>
            {hoursPlayedThisWeek != null && (
              <span className="tw-hours">{hoursPlayedThisWeek}h this week</span>
            )}
          </div>

          {(topChampions.length > 0 || roleLabel) && (
            <div className="tw-champs-role-row">
              {topChampions.length > 0 && (
                <div className="tw-champ-icons">
                  {topChampions.slice(0, 3).map((c) => (
                    <img
                      key={c.name}
                      src={getChampionSquareUrl(c.name)}
                      alt={c.name}
                      className="tw-champ-icon"
                      width={26}
                      height={26}
                    />
                  ))}
                </div>
              )}
              {roleLabel && <span className="tw-role-badge">{roleLabel}</span>}
            </div>
          )}

          {peakLabel && (
            <div className="tw-peak">
              <span className="tw-peak-label">Peak:</span>
              <span className="tw-peak-value" style={{ color: peakColor }}>
                {peakLabel}
              </span>
            </div>
          )}

          {(sessionWins > 0 || sessionLosses > 0) && (
            <div className="tw-session">
              <span className="tw-session-label">Session:</span>
              <span
                className={`tw-session-result ${sessionNet > 0 ? "tw-positive" : sessionNet < 0 ? "tw-negative" : "tw-neutral"}`}
              >
                {sessionWins}W {sessionLosses}L{" "}
                {sessionNet > 0 ? "↑" : sessionNet < 0 ? "↓" : "→"}
              </span>
            </div>
          )}

          <div className="tw-footer">
            <img
              src="/logos/statgap-logo-transparent.png"
              alt="StatGap"
              className="tw-brand-logo"
            />
          </div>
        </div>

        {isDemo && <span className="tw-demo-badge">Demo</span>}
      </div>
    </div>
  );

  if (hasSpinBorder) {
    const spinGradient = isChallenger
      ? "conic-gradient(#F4C874, #FFFFFF, #C8922A, #FFFFFF, #F4C874)"
      : "conic-gradient(#FF4444, #FF8C00, #FF4444, #FF8C00, #FF4444)";
    return (
      <div
        className="tw-spin-wrap"
        style={{ "--tw-spin-bg": spinGradient } as React.CSSProperties}
      >
        {widgetEl}
      </div>
    );
  }

  return widgetEl;
}
