import { ImageResponse } from "next/og";

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

function splashUrl(champion: string): string {
  return `https://ddragon.leagueoflegends.com/cdn/img/champion/splash/${champion}_0.jpg`;
}

function formatTier(tier: string): string {
  if (tier === "GRANDMASTER") return "Grandmaster";
  if (!tier) return "Unranked";
  return tier.charAt(0) + tier.slice(1).toLowerCase();
}

export async function GET(request: Request) {
  const reqUrl = new URL(request.url);
  const { searchParams } = reqUrl;
  const logoUrl = `${reqUrl.origin}/logos/statgap-logo-dark-clean.png`;

  const name = searchParams.get("name") ?? "Faker#KR1";
  const region = searchParams.get("region") ?? "kr";
  const tier = (searchParams.get("tier") ?? "CHALLENGER").toUpperCase();
  const rank = searchParams.get("rank") ?? "I";
  const lp = searchParams.get("lp") ?? "1247";
  const wins = parseInt(searchParams.get("wins") ?? "58", 10);
  const losses = parseInt(searchParams.get("losses") ?? "24", 10);
  const champion = searchParams.get("champion") ?? "Syndra";
  const ladderRank = searchParams.get("ladderRank") ?? "1";

  const totalGames = wins + losses;
  const winRate = totalGames > 0 ? Math.round((wins / totalGames) * 100) : 0;
  const tierColor = TIER_COLORS[tier] ?? "#A1A1AA";
  const borderColor = TIER_BORDER_COLORS[tier] ?? "#3a3a3d";
  const regionLabel = REGION_LABELS[region.toLowerCase()] ?? region.toUpperCase();
  const tierDisplay = formatTier(tier);
  const showDivision = !["MASTER", "GRANDMASTER", "CHALLENGER"].includes(tier);

  return new ImageResponse(
    (
      <div
        style={{
          width: "1200px",
          height: "630px",
          display: "flex",
          position: "relative",
          overflow: "hidden",
          fontFamily: "sans-serif",
          color: "#efeff1",
        }}
      >
        {/* Splash art background */}
        <img
          src={splashUrl(champion)}
          width={1200}
          height={630}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "1200px",
            height: "630px",
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
            height: "630px",
            background:
              "linear-gradient(135deg, rgba(14,14,16,0.93) 0%, rgba(14,14,16,0.7) 50%, rgba(14,14,16,0.85) 100%)",
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
            padding: "44px 64px",
            width: "100%",
            height: "100%",
            justifyContent: "space-between",
          }}
        >
          {/* Top row: branding + region */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <img
              src={logoUrl}
              height={40}
              style={{ height: "40px", width: "auto" }}
            />
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                padding: "6px 16px",
                borderRadius: "8px",
                background: "rgba(255,255,255,0.08)",
                border: "1px solid rgba(255,255,255,0.1)",
              }}
            >
              <span
                style={{
                  fontSize: "16px",
                  fontWeight: 600,
                  color: "#adadb8",
                  letterSpacing: "0.04em",
                }}
              >
                {regionLabel}
              </span>
            </div>
          </div>

          {/* Middle: player identity */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "8px",
            }}
          >
            {/* Name */}
            <div
              style={{
                fontSize: "72px",
                fontWeight: 800,
                letterSpacing: "-0.02em",
                lineHeight: 1.1,
                maxWidth: "900px",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {name}
            </div>

            {/* Rank row */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "16px",
              }}
            >
              <span
                style={{
                  fontSize: "38px",
                  fontWeight: 700,
                  color: tierColor,
                }}
              >
                {tierDisplay}
                {showDivision ? ` ${rank}` : ""}
              </span>
              <span style={{ fontSize: "30px", color: "#d4d4d8", fontWeight: 500 }}>
                {lp} LP
              </span>
              {ladderRank && (
                <span
                  style={{
                    fontSize: "22px",
                    color: "#adadb8",
                    fontWeight: 500,
                    marginLeft: "8px",
                  }}
                >
                  Rank {ladderRank} in {regionLabel}
                </span>
              )}
            </div>
          </div>

          {/* Bottom: stats cards */}
          <div
            style={{
              display: "flex",
              gap: "24px",
            }}
          >
            {/* Win Rate */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                padding: "20px 36px",
                borderRadius: "12px",
                background: "rgba(0,0,0,0.4)",
                border: "1px solid rgba(255,255,255,0.08)",
              }}
            >
              <span
                style={{
                  fontSize: "44px",
                  fontWeight: 700,
                  color: winRate >= 50 ? "#34d399" : "#f87171",
                }}
              >
                {winRate}%
              </span>
              <span
                style={{
                  fontSize: "13px",
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
                padding: "20px 36px",
                borderRadius: "12px",
                background: "rgba(0,0,0,0.4)",
                border: "1px solid rgba(255,255,255,0.08)",
              }}
            >
              <span style={{ fontSize: "44px", fontWeight: 700 }}>
                {totalGames}
              </span>
              <span
                style={{
                  fontSize: "13px",
                  color: "#6b7280",
                  textTransform: "uppercase",
                  letterSpacing: "0.1em",
                  fontWeight: 600,
                }}
              >
                Games
              </span>
            </div>

            {/* Wins */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                padding: "20px 36px",
                borderRadius: "12px",
                background: "rgba(0,0,0,0.4)",
                border: "1px solid rgba(255,255,255,0.08)",
              }}
            >
              <span style={{ fontSize: "44px", fontWeight: 700, color: "#34d399" }}>
                {wins}
              </span>
              <span
                style={{
                  fontSize: "13px",
                  color: "#6b7280",
                  textTransform: "uppercase",
                  letterSpacing: "0.1em",
                  fontWeight: 600,
                }}
              >
                Wins
              </span>
            </div>

            {/* Losses */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                padding: "20px 36px",
                borderRadius: "12px",
                background: "rgba(0,0,0,0.4)",
                border: "1px solid rgba(255,255,255,0.08)",
              }}
            >
              <span style={{ fontSize: "44px", fontWeight: 700, color: "#f87171" }}>
                {losses}
              </span>
              <span
                style={{
                  fontSize: "13px",
                  color: "#6b7280",
                  textTransform: "uppercase",
                  letterSpacing: "0.1em",
                  fontWeight: 600,
                }}
              >
                Losses
              </span>
            </div>
          </div>
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  );
}
