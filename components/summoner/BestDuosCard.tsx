"use client";

import Link from "next/link";

export type DuoPartner = {
  riotId: string;
  games: number;
  wins: number;
};

/** Sample duo data for Demo#NA1 */
const SAMPLE_DUOS_DEMO: DuoPartner[] = [
  { riotId: "TestW#NA1", games: 23, wins: 14 },
  { riotId: "Player3#NA1", games: 18, wins: 11 },
  { riotId: "DuoBuddy#NA1", games: 15, wins: 9 },
  { riotId: "SupportMain#NA1", games: 12, wins: 8 },
  { riotId: "JungleDiff#NA1", games: 8, wins: 5 },
];

export default function BestDuosCard({
  riotId,
  region,
  soloWinRate,
  duos,
}: {
  riotId: string;
  region: string;
  soloWinRate: number;
  duos?: DuoPartner[];
}) {
  const isDemo = riotId?.toLowerCase().includes("demo") && region?.toLowerCase() === "na1";
  const list = (isDemo ? SAMPLE_DUOS_DEMO : duos ?? []).slice(0, 5);

  if (list.length === 0 && !isDemo) return null;

  return (
    <div className="profile-rank-card">
      <div className="profile-rank-card-title">Best Duos</div>
      <div className="profile-rank-card-content">
        <ul className="recently-played-with-list" style={{ listStyle: "none", padding: 0, margin: 0 }}>
          {list.map((d) => {
            const duoWr = d.games > 0 ? Math.round((d.wins / d.games) * 100) : 0;
            const diff = duoWr - soloWinRate;
            const isBetter = diff > 0;
            const profileUrl = `/summoner?riotId=${encodeURIComponent(d.riotId)}&region=${encodeURIComponent(region)}`;
            const compareUrl = `/compare?summoner1=${encodeURIComponent(riotId ?? "")}&region1=${encodeURIComponent(region)}&summoner2=${encodeURIComponent(d.riotId)}&region2=${encodeURIComponent(region)}`;

            return (
              <li
                key={d.riotId}
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  alignItems: "center",
                  gap: "6px 12px",
                  padding: "8px 0",
                  borderBottom: "1px solid rgba(255,255,255,0.05)",
                }}
              >
                <Link
                  href={profileUrl}
                  className="recently-played-with-name"
                  style={{ fontWeight: 600, flex: "1 1 auto", minWidth: 0 }}
                >
                  {d.riotId}
                </Link>
                <span style={{ fontSize: "12px", color: "rgba(255,255,255,0.6)" }}>
                  {d.games} games together
                </span>
                <span
                  style={{
                    fontSize: "12px",
                    fontWeight: 700,
                    color: isBetter ? "#22c55e" : diff < 0 ? "#ef4444" : "rgba(255,255,255,0.8)",
                  }}
                >
                  {duoWr}% duo WR
                  {diff !== 0 && (
                    <span style={{ fontWeight: 500, marginLeft: 4, opacity: 0.9 }}>
                      ({diff > 0 ? "+" : ""}{diff}% vs solo)
                    </span>
                  )}
                </span>
                <Link
                  href={compareUrl}
                  style={{
                    fontSize: "10px",
                    fontWeight: 600,
                    color: "#60a5fa",
                    padding: "2px 6px",
                    borderRadius: 4,
                    border: "1px solid rgba(96,165,250,0.3)",
                    background: "rgba(96,165,250,0.1)",
                    textDecoration: "none",
                  }}
                >
                  Compare
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
