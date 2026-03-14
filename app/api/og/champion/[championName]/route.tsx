import { ImageResponse } from "next/og";
import { CURRENT_PATCH } from "@/lib/seo";

export const runtime = "edge";

const logoData = fetch(new URL("../../statgap-logo.png", import.meta.url)).then(
  (res) => res.arrayBuffer(),
);

function splashUrl(champion: string): string {
  return `https://ddragon.leagueoflegends.com/cdn/img/champion/splash/${champion}_0.jpg`;
}

function championKeyToName(key: string): string {
  const formatted = key.replace(/([A-Z])/g, " $1").trim();
  return formatted.charAt(0).toUpperCase() + formatted.slice(1).toLowerCase();
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ championName: string }> }
) {
  const { championName } = await params;
  const decoded = decodeURIComponent(championName);
  const displayName = championKeyToName(decoded);
  const logo = await logoData;

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
        <img
          src={splashUrl(decoded)}
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
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "1200px",
            height: "630px",
            background:
              "linear-gradient(135deg, rgba(14,14,16,0.92) 0%, rgba(14,14,16,0.6) 100%)",
          }}
        />
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
          <img
            src={logo as unknown as string}
            height={40}
            style={{ height: "40px", width: "auto" }}
          />
          <div>
            <div
              style={{
                fontSize: 64,
                fontWeight: 800,
                letterSpacing: "-0.02em",
                marginBottom: 8,
              }}
            >
              {displayName}
            </div>
            <div style={{ fontSize: 24, color: "#a1a1aa" }}>
              Build, Runes & Stats — Patch {CURRENT_PATCH}
            </div>
          </div>
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  );
}
