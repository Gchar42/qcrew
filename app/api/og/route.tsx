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

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const name = searchParams.get("name") ?? "Summoner";
  const tier = searchParams.get("tier") ?? "";
  const rank = searchParams.get("rank") ?? "";
  const lp = searchParams.get("lp") ?? "0";
  const wr = searchParams.get("wr") ?? "50";
  const games = searchParams.get("games") ?? "0";

  const tierUpper = tier.toUpperCase();
  const tierColor = TIER_COLORS[tierUpper] ?? "#A1A1AA";
  const tierDisplay =
    tierUpper === "GRANDMASTER"
      ? "Grandmaster"
      : tierUpper
        ? tierUpper.charAt(0) + tierUpper.slice(1).toLowerCase()
        : "Unranked";
  const rankDisplay =
    ["MASTER", "GRANDMASTER", "CHALLENGER"].includes(tierUpper)
      ? ""
      : ` ${rank}`;

  return new ImageResponse(
    (
      <div
        style={{
          width: "1200px",
          height: "630px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          background: "linear-gradient(135deg, #0E0F15 0%, #151620 50%, #1a1b2e 100%)",
          fontFamily: "sans-serif",
          color: "#E8E9F0",
        }}
      >
        {/* Logo area */}
        <div style={{ display: "flex", alignItems: "center", marginBottom: "32px" }}>
          <span style={{ fontSize: "24px", color: "#5865F2", fontWeight: 700 }}>
            STATGAP.GG
          </span>
        </div>

        {/* Summoner name */}
        <div
          style={{
            fontSize: "56px",
            fontWeight: 800,
            letterSpacing: "-0.02em",
            marginBottom: "16px",
            maxWidth: "900px",
            textAlign: "center",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {name}
        </div>

        {/* Tier + LP */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "16px",
            marginBottom: "24px",
          }}
        >
          <span
            style={{
              fontSize: "32px",
              fontWeight: 700,
              color: tierColor,
            }}
          >
            {tierDisplay}{rankDisplay}
          </span>
          {tier && (
            <span style={{ fontSize: "28px", color: "#9CA3AF" }}>
              {lp} LP
            </span>
          )}
        </div>

        {/* Stats row */}
        <div
          style={{
            display: "flex",
            gap: "48px",
            padding: "20px 40px",
            borderRadius: "16px",
            border: "1px solid rgba(255,255,255,0.1)",
            background: "rgba(255,255,255,0.03)",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            <span
              style={{
                fontSize: "36px",
                fontWeight: 700,
                color: parseInt(wr) >= 50 ? "#34D399" : "#EF4444",
              }}
            >
              {wr}%
            </span>
            <span style={{ fontSize: "14px", color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.1em" }}>
              Win Rate
            </span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            <span style={{ fontSize: "36px", fontWeight: 700 }}>{games}</span>
            <span style={{ fontSize: "14px", color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.1em" }}>
              Games
            </span>
          </div>
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
