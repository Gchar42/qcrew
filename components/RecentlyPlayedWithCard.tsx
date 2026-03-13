"use client";

import { useState } from "react";
import Link from "next/link";
import type { RecentlyPlayedWithEntry } from "@/lib/recentlyPlayedWith";
import { getProfileIconUrl } from "@/lib/riotAssets";

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

export default function RecentlyPlayedWithCard({
  recentlyPlayedWith,
  region,
  riotId,
  soloWinRate,
  duos,
}: {
  recentlyPlayedWith: RecentlyPlayedWithEntry[];
  region: string;
  riotId?: string;
  soloWinRate?: number;
  duos?: DuoPartner[];
}) {
  const [activeTab, setActiveTab] = useState<"played" | "duos">("played");

  const isDemo = riotId?.toLowerCase().includes("demo") && region?.toLowerCase() === "na1";
  const duoList = (isDemo ? SAMPLE_DUOS_DEMO : duos ?? []).slice(0, 5);
  const hasDuos = duoList.length > 0;
  const hasEntries = Array.isArray(recentlyPlayedWith) && recentlyPlayedWith.length > 0;

  return (
    <div className="profile-rank-card recently-played-with-card">
      <div className="profile-rank-card-title">
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <div
            style={{
              display: "flex",
              gap: 4,
              borderBottom: "1px solid rgba(255,255,255,0.08)",
            }}
          >
            <button
              type="button"
              onClick={() => setActiveTab("played")}
              className={activeTab === "played" ? "profile-queue-tab profile-queue-tab-active" : "profile-queue-tab"}
              style={{
                padding: "6px 12px",
                fontSize: 12,
                fontWeight: 600,
                background: "none",
                border: "none",
                color: activeTab === "played" ? "var(--accent)" : "var(--muted)",
                cursor: "pointer",
                borderBottom: activeTab === "played" ? "2px solid var(--accent)" : "2px solid transparent",
                marginBottom: -1,
              }}
            >
              Played With
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("duos")}
              className={activeTab === "duos" ? "profile-queue-tab profile-queue-tab-active" : "profile-queue-tab"}
              style={{
                padding: "6px 12px",
                fontSize: 12,
                fontWeight: 600,
                background: "none",
                border: "none",
                color: activeTab === "duos" ? "var(--accent)" : "var(--muted)",
                cursor: "pointer",
                borderBottom: activeTab === "duos" ? "2px solid var(--accent)" : "2px solid transparent",
                marginBottom: -1,
              }}
            >
              Best Duos
            </button>
          </div>
          {activeTab === "played" && (
            <Link href="/friends" className="recently-played-with-view-all">
              View tracked
            </Link>
          )}
        </div>
      </div>
      <div className="profile-rank-card-content" style={{ minHeight: 200, flexDirection: "column", alignItems: "stretch" }}>
        {activeTab === "played" && (
          <>
            {!hasEntries ? (
              <p className="recently-played-with-empty">
                Teammates from your recent games will appear here.
              </p>
            ) : (
              <ul className="recently-played-with-list">
                {recentlyPlayedWith.slice(0, 10).map((entry) => {
                  const winRate = entry.games > 0 ? Math.round((entry.wins / entry.games) * 100) : 0;
                  const profileUrl = entry.riotId
                    ? `/summoner?riotId=${encodeURIComponent(entry.riotId)}&region=${encodeURIComponent(region)}`
                    : null;

                  return (
                    <li key={entry.puuid} className="recently-played-with-row">
                      <div className="recently-played-with-icon-wrap">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={getProfileIconUrl(entry.profileIconId ?? 29)}
                          alt=""
                          className="recently-played-with-icon"
                          width={24}
                          height={24}
                        />
                      </div>
                      <div className="recently-played-with-name-wrap">
                        {profileUrl ? (
                          <Link href={profileUrl} className="recently-played-with-name" title={entry.displayName}>
                            {entry.displayName}
                          </Link>
                        ) : (
                          <span className="recently-played-with-name" title={entry.displayName}>{entry.displayName}</span>
                        )}
                      </div>
                      <span className="recently-played-with-wr">{winRate}%</span>
                      <span className="recently-played-with-games">{entry.games} games</span>
                    </li>
                  );
                })}
              </ul>
            )}
          </>
        )}
        {activeTab === "duos" && (
          <>
            {!hasDuos ? (
              <p className="recently-played-with-empty">
                Duo partners will appear here once you have played ranked games together.
              </p>
            ) : (
              <ul className="recently-played-with-list" style={{ listStyle: "none", padding: 0, margin: 0 }}>
                {duoList.map((d) => {
                  const duoWr = d.games > 0 ? Math.round((d.wins / d.games) * 100) : 0;
                  const diff = duoWr - (soloWinRate ?? 0);
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
            )}
          </>
        )}
      </div>
    </div>
  );
}
