import { ImageResponse } from "next/og";

export const runtime = "edge";

const logoData = fetch(new URL("../statgap-logo.png", import.meta.url)).then(
  (res) => res.arrayBuffer(),
);

export async function GET() {
  const logo = await logoData;

  return new ImageResponse(
    (
      <div
        style={{
          width: "1200px",
          height: "630px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#0c0c0f",
          fontFamily: "sans-serif",
          color: "#efeff1",
        }}
      >
        <img
          src={logo as unknown as string}
          height={80}
          style={{ height: "80px", width: "auto", marginBottom: 24 }}
        />
        <div
          style={{
            fontSize: 32,
            fontWeight: 700,
            color: "#a1a1aa",
            marginBottom: 12,
          }}
        >
          The fastest LoL stats site
        </div>
        <div
          style={{
            fontSize: 22,
            color: "#71717a",
            display: "flex",
            gap: 16,
          }}
        >
          <span>Builds</span>
          <span>·</span>
          <span>Tier Lists</span>
          <span>·</span>
          <span>Match History</span>
          <span>·</span>
          <span>Player Stats</span>
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  );
}
