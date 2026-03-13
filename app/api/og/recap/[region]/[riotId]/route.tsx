import { ImageResponse } from "next/og";
import { DEFAULT_DDRAGON_VERSION } from "@/lib/riotAssets";

export const runtime = "edge";

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

function splashUrl(champion: string): string {
  return `https://ddragon.leagueoflegends.com/cdn/img/champion/splash/${champion}_0.jpg`;
}

function squareUrl(champion: string): string {
  return `https://ddragon.leagueoflegends.com/cdn/${DEFAULT_DDRAGON_VERSION}/img/champion/${champion}.png`;
}

type RecapSample = {
  peakRank: string;
  peakTier: string;
  totalGames: number;
  wins: number;
  losses: number;
  winRate: number;
  mostPlayedChampion: string;
  mostPlayedGames: number;
  bestChampion: string;
  bestChampionWr: number;
  hoursPlayed: number;
  winStreak: number;
};

function getSampleRecap(): RecapSample {
  return {
    peakRank: "Gold II",
    peakTier: "GOLD",
    totalGames: 247,
    wins: 134,
    losses: 113,
    winRate: 54,
    mostPlayedChampion: "Jinx",
    mostPlayedGames: 68,
    bestChampion: "Caitlyn",
    bestChampionWr: 64,
    hoursPlayed: 142,
    winStreak: 9,
  };
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ region: string; riotId: string }> },
) {
  const { region, riotId: riotIdEnc } = await params;
  const riotId = decodeURIComponent(riotIdEnc);

  const recap = getSampleRecap();
  const tierColor = TIER_COLORS[recap.peakTier] ?? "#A1A1AA";
  const borderColor = TIER_BORDER_COLORS[recap.peakTier] ?? "#3a3a3d";

  return new ImageResponse(
    (
      <div
        style={{
          width: "1200px",
          height: "800px",
          display: "flex",
          position: "relative",
          overflow: "hidden",
          fontFamily: "sans-serif",
          color: "#efeff1",
        }}
      >
        {/* Splash background */}
        <img
          src={splashUrl(recap.mostPlayedChampion)}
          width={1200}
          height={800}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "1200px",
            height: "800px",
            objectFit: "cover",
            objectPosition: "center 20%",
          }}
        />

        {/* Dark overlay */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "1200px",
            height: "800px",
            background:
              "linear-gradient(135deg, rgba(12,12,15,0.92) 0%, rgba(12,12,15,0.65) 40%, rgba(12,12,15,0.88) 100%)",
          }}
        />

        {/* Top accent bar */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "1200px",
            height: "4px",
            background: `linear-gradient(90deg, transparent 0%, ${borderColor} 15%, ${tierColor} 50%, ${borderColor} 85%, transparent 100%)`,
          }}
        />

        {/* Bottom accent bar */}
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            width: "1200px",
            height: "4px",
            background: `linear-gradient(90deg, transparent 0%, ${borderColor}66 20%, ${borderColor} 50%, ${borderColor}66 80%, transparent 100%)`,
          }}
        />

        {/* Content */}
        <div
          style={{
            position: "relative",
            display: "flex",
            flexDirection: "column",
            padding: "48px 64px",
            width: "100%",
            height: "100%",
            justifyContent: "space-between",
          }}
        >
          {/* Title row */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <span
                style={{
                  fontSize: 14,
                  fontWeight: 600,
                  textTransform: "uppercase",
                  letterSpacing: "0.15em",
                  color: "rgba(255,255,255,0.4)",
                }}
              >
                My 2025 Season — StatGap.gg
              </span>
              <span
                style={{
                  fontSize: 52,
                  fontWeight: 800,
                  letterSpacing: "-0.02em",
                  marginTop: 8,
                  maxWidth: 700,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {riotId}
              </span>
              <span style={{ fontSize: 18, color: "rgba(255,255,255,0.5)", marginTop: 4 }}>
                {region.toUpperCase()} &middot; Season 2025
              </span>
            </div>
            {/* Champion square */}
            <img
              src={squareUrl(recap.mostPlayedChampion)}
              width={80}
              height={80}
              style={{
                width: 80,
                height: 80,
                borderRadius: 12,
                border: `3px solid ${tierColor}`,
              }}
            />
          </div>

          {/* Peak rank */}
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <span
              style={{
                fontSize: 56,
                fontWeight: 800,
                color: tierColor,
              }}
            >
              {recap.peakRank}
            </span>
            <span style={{ fontSize: 20, color: "rgba(255,255,255,0.5)", fontWeight: 500 }}>
              Peak Rank
            </span>
          </div>

          {/* Stats row */}
          <div style={{ display: "flex", gap: 28 }}>
            {/* Win Rate */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                padding: "20px 40px",
                borderRadius: 12,
                background: "rgba(0,0,0,0.45)",
                border: "1px solid rgba(255,255,255,0.08)",
              }}
            >
              <span
                style={{
                  fontSize: 44,
                  fontWeight: 700,
                  color: recap.winRate >= 50 ? "#34d399" : "#f87171",
                }}
              >
                {recap.winRate}%
              </span>
              <span
                style={{
                  fontSize: 12,
                  color: "#6b7280",
                  textTransform: "uppercase",
                  letterSpacing: "0.1em",
                  fontWeight: 600,
                }}
              >
                Win Rate
              </span>
            </div>

            {/* Games */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                padding: "20px 40px",
                borderRadius: 12,
                background: "rgba(0,0,0,0.45)",
                border: "1px solid rgba(255,255,255,0.08)",
              }}
            >
              <span style={{ fontSize: 44, fontWeight: 700 }}>
                {recap.totalGames}
              </span>
              <span
                style={{
                  fontSize: 12,
                  color: "#6b7280",
                  textTransform: "uppercase",
                  letterSpacing: "0.1em",
                  fontWeight: 600,
                }}
              >
                Games
              </span>
            </div>

            {/* Hours */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                padding: "20px 40px",
                borderRadius: 12,
                background: "rgba(0,0,0,0.45)",
                border: "1px solid rgba(255,255,255,0.08)",
              }}
            >
              <span style={{ fontSize: 44, fontWeight: 700 }}>
                {recap.hoursPlayed}h
              </span>
              <span
                style={{
                  fontSize: 12,
                  color: "#6b7280",
                  textTransform: "uppercase",
                  letterSpacing: "0.1em",
                  fontWeight: 600,
                }}
              >
                Hours Played
              </span>
            </div>

            {/* Win Streak */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                padding: "20px 40px",
                borderRadius: 12,
                background: "rgba(0,0,0,0.45)",
                border: "1px solid rgba(255,255,255,0.08)",
              }}
            >
              <span style={{ fontSize: 44, fontWeight: 700, color: "#FACC15" }}>
                {recap.winStreak}
              </span>
              <span
                style={{
                  fontSize: 12,
                  color: "#6b7280",
                  textTransform: "uppercase",
                  letterSpacing: "0.1em",
                  fontWeight: 600,
                }}
              >
                Win Streak
              </span>
            </div>
          </div>

          {/* Footer */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 14, color: "rgba(255,255,255,0.25)" }}>
              statgap.gg/recap/{region}/{encodeURIComponent(riotId)}
            </span>
            <span style={{ fontSize: 13, color: "rgba(255,255,255,0.2)" }}>
              StatGap.gg
            </span>
          </div>
        </div>
      </div>
    ),
    { width: 1200, height: 800 },
  );
}
