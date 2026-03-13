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

function formatTier(tier: string): string {
  if (tier === "GRANDMASTER") return "Grandmaster";
  if (!tier) return "Unranked";
  return tier.charAt(0) + tier.slice(1).toLowerCase();
}

function emblemUrl(tier: string): string {
  const key = tier.toLowerCase();
  const file = `Emblem_${key.charAt(0).toUpperCase()}${key.slice(1)}`;
  return `https://cdn.jsdelivr.net/gh/magisteriis/lol-icons-and-emblems@master/ranked-emblems/${file}.png`;
}

type SampleData = {
  name: string;
  tier: string;
  rank: string;
  lp: number;
};

function getSampleData(riotId: string): SampleData {
  return {
    name: riotId,
    tier: "GOLD",
    rank: "II",
    lp: 67,
  };
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ region: string; riotId: string }> },
) {
  const { region, riotId: riotIdEnc } = await params;
  const riotId = decodeURIComponent(riotIdEnc);
  const { searchParams } = new URL(request.url);
  const isMini = searchParams.get("size") === "mini";

  const data = getSampleData(riotId);
  const tierColor = TIER_COLORS[data.tier] ?? "#A1A1AA";
  const tierDisplay = formatTier(data.tier);
  const showDivision = !["MASTER", "GRANDMASTER", "CHALLENGER"].includes(data.tier);

  const W = isMini ? 200 : 400;
  const H = isMini ? 40 : 80;
  const iconSize = isMini ? 20 : 32;
  const accentW = isMini ? 3 : 4;
  const nameFontSize = isMini ? 11 : 16;
  const rankFontSize = isMini ? 10 : 13;
  const watermarkFontSize = isMini ? 7 : 10;
  const pad = isMini ? 8 : 16;

  const label = `${tierDisplay}${showDivision ? ` ${data.rank}` : ""} · ${data.lp} LP`;

  return new ImageResponse(
    (
      <div
        style={{
          width: `${W}px`,
          height: `${H}px`,
          display: "flex",
          alignItems: "center",
          background: "#0d0d0d",
          fontFamily: "sans-serif",
          color: "#efeff1",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Tier accent bar */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: `${accentW}px`,
            height: `${H}px`,
            background: tierColor,
          }}
        />

        {/* Emblem */}
        <div style={{ display: "flex", alignItems: "center", marginLeft: pad + accentW }}>
          <img
            src={emblemUrl(data.tier)}
            width={iconSize}
            height={iconSize}
            style={{ width: iconSize, height: iconSize }}
          />
        </div>

        {/* Text */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            marginLeft: isMini ? 6 : 12,
            flex: 1,
            minWidth: 0,
          }}
        >
          <span
            style={{
              fontSize: nameFontSize,
              fontWeight: 700,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              lineHeight: 1.2,
            }}
          >
            {data.name}
          </span>
          <span
            style={{
              fontSize: rankFontSize,
              fontWeight: 500,
              color: tierColor,
              lineHeight: 1.2,
            }}
          >
            {label}
          </span>
        </div>

        {/* Watermark */}
        <span
          style={{
            fontSize: watermarkFontSize,
            color: "rgba(255,255,255,0.2)",
            marginRight: pad,
            whiteSpace: "nowrap",
          }}
        >
          statgap.gg
        </span>
      </div>
    ),
    {
      width: W,
      height: H,
      headers: {
        "Cache-Control": "public, max-age=300, s-maxage=300",
      },
    },
  );
}
