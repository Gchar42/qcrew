"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { useEffect, useState } from "react";

type RecapData = {
  riotId: string;
  region: string;
  peakRank: string;
  peakTier: string;
  totalGames: number;
  wins: number;
  losses: number;
  winRate: number;
  mostPlayedChampion: { name: string; games: number; winRate: number };
  bestChampion: { name: string; winRate: number; games: number };
  biggestWinStreak: number;
  favoriteRole: string;
  totalHoursPlayed: number;
  mostPlayedWith: string;
};

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

function getSampleRecap(riotId: string, region: string): RecapData {
  return {
    riotId,
    region,
    peakRank: "Gold II",
    peakTier: "GOLD",
    totalGames: 247,
    wins: 134,
    losses: 113,
    winRate: 54,
    mostPlayedChampion: { name: "Jinx", games: 68, winRate: 57 },
    bestChampion: { name: "Caitlyn", winRate: 64, games: 31 },
    biggestWinStreak: 9,
    favoriteRole: "Bot",
    totalHoursPlayed: 142,
    mostPlayedWith: "TestW#NA1",
  };
}

function splashUrl(champion: string): string {
  return `https://ddragon.leagueoflegends.com/cdn/img/champion/splash/${champion}_0.jpg`;
}

function squareUrl(champion: string): string {
  return `https://ddragon.leagueoflegends.com/cdn/15.5.1/img/champion/${champion}.png`;
}

type StatCardProps = {
  label: string;
  value: string;
  context: string;
  color?: string;
  delay: number;
};

function StatCard({ label, value, context, color, delay }: StatCardProps) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), delay);
    return () => clearTimeout(t);
  }, [delay]);

  return (
    <div
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(24px)",
        transition: "opacity 0.7s ease, transform 0.7s ease",
        display: "flex",
        flexDirection: "column",
        gap: 4,
        padding: "20px 24px",
        borderRadius: 12,
        background: "rgba(0,0,0,0.45)",
        border: "1px solid rgba(255,255,255,0.08)",
        backdropFilter: "blur(8px)",
        minWidth: 160,
      }}
    >
      <span
        style={{
          fontSize: 11,
          fontWeight: 700,
          textTransform: "uppercase",
          letterSpacing: "0.12em",
          color: "rgba(255,255,255,0.45)",
        }}
      >
        {label}
      </span>
      <span style={{ fontSize: 32, fontWeight: 800, color: color ?? "#fff", lineHeight: 1.1 }}>
        {value}
      </span>
      <span style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", lineHeight: 1.3 }}>
        {context}
      </span>
    </div>
  );
}

export default function SeasonRecapPage() {
  const params = useParams<{ region: string; riotId: string }>();
  const region = params.region;
  const riotId = decodeURIComponent(params.riotId);

  const recap = getSampleRecap(riotId, region);
  const tierColor = TIER_COLORS[recap.peakTier] ?? "#A1A1AA";

  const [titleVisible, setTitleVisible] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setTitleVisible(true), 200);
    return () => clearTimeout(t);
  }, []);

  const ogUrl = `/api/og/recap/${encodeURIComponent(region)}/${encodeURIComponent(riotId)}`;

  const shareUrl = typeof window !== "undefined"
    ? window.location.href
    : "";

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#0c0c0f",
        color: "#efeff1",
        fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Background splash */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={splashUrl(recap.mostPlayedChampion.name)}
        alt=""
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100vw",
          height: "100vh",
          objectFit: "cover",
          objectPosition: "center 20%",
          opacity: 0.15,
          zIndex: 0,
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100vw",
          height: "100vh",
          background: "linear-gradient(180deg, rgba(12,12,15,0.6) 0%, rgba(12,12,15,0.95) 70%, #0c0c0f 100%)",
          zIndex: 0,
          pointerEvents: "none",
        }}
      />

      <div
        style={{
          position: "relative",
          zIndex: 1,
          maxWidth: 900,
          margin: "0 auto",
          padding: "60px 24px 80px",
        }}
      >
        {/* Header */}
        <div
          style={{
            opacity: titleVisible ? 1 : 0,
            transform: titleVisible ? "translateY(0)" : "translateY(32px)",
            transition: "opacity 0.8s ease, transform 0.8s ease",
            marginBottom: 48,
          }}
        >
          <Link
            href={`/summoner?riotId=${encodeURIComponent(riotId)}&region=${encodeURIComponent(region)}`}
            style={{ color: "rgba(255,255,255,0.4)", textDecoration: "none", fontSize: 13, fontWeight: 500 }}
          >
            &larr; Back to profile
          </Link>
          <h1 style={{ fontSize: 48, fontWeight: 800, margin: "16px 0 8px", letterSpacing: "-0.02em" }}>
            This Season So Far
          </h1>
          <p style={{ fontSize: 16, color: "rgba(255,255,255,0.5)", margin: 0 }}>
            {riotId} &middot; {region.toUpperCase()} &middot; 2025 Season
          </p>
        </div>

        {/* Peak rank hero */}
        <StatCard
          label="Peak Rank"
          value={recap.peakRank}
          context="Your highest rank achieved this season"
          color={tierColor}
          delay={400}
        />

        {/* Stats grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
            gap: 16,
            marginTop: 16,
          }}
        >
          <StatCard
            label="Total Games"
            value={String(recap.totalGames)}
            context={`${recap.wins}W ${recap.losses}L`}
            delay={600}
          />
          <StatCard
            label="Win Rate"
            value={`${recap.winRate}%`}
            context={recap.winRate >= 52 ? "Above average — nice work" : "Room to climb"}
            color={recap.winRate >= 50 ? "#34d399" : "#f87171"}
            delay={800}
          />
          <StatCard
            label="Hours Played"
            value={String(recap.totalHoursPlayed)}
            context="That's almost 6 full days of League"
            delay={1000}
          />
          <StatCard
            label="Win Streak"
            value={String(recap.biggestWinStreak)}
            context="Your longest consecutive wins"
            color="#FACC15"
            delay={1200}
          />
        </div>

        {/* Champion section */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 16 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 16,
              padding: "20px 24px",
              borderRadius: 12,
              background: "rgba(0,0,0,0.45)",
              border: "1px solid rgba(255,255,255,0.08)",
              opacity: 1,
              animation: "fadeSlideIn 0.7s ease 1.4s both",
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={squareUrl(recap.mostPlayedChampion.name)}
              alt={recap.mostPlayedChampion.name}
              style={{ width: 56, height: 56, borderRadius: 8, border: "2px solid rgba(255,255,255,0.1)" }}
            />
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", color: "rgba(255,255,255,0.45)" }}>
                Most Played
              </div>
              <div style={{ fontSize: 22, fontWeight: 700, marginTop: 2 }}>
                {recap.mostPlayedChampion.name}
              </div>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.5)" }}>
                {recap.mostPlayedChampion.games} games &middot; {recap.mostPlayedChampion.winRate}% WR
              </div>
            </div>
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 16,
              padding: "20px 24px",
              borderRadius: 12,
              background: "rgba(0,0,0,0.45)",
              border: "1px solid rgba(255,255,255,0.08)",
              animation: "fadeSlideIn 0.7s ease 1.6s both",
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={squareUrl(recap.bestChampion.name)}
              alt={recap.bestChampion.name}
              style={{ width: 56, height: 56, borderRadius: 8, border: "2px solid rgba(255,255,255,0.1)" }}
            />
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", color: "rgba(255,255,255,0.45)" }}>
                Best Champion
              </div>
              <div style={{ fontSize: 22, fontWeight: 700, marginTop: 2 }}>
                {recap.bestChampion.name}
              </div>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.5)" }}>
                {recap.bestChampion.games} games &middot; {recap.bestChampion.winRate}% WR
              </div>
            </div>
          </div>
        </div>

        {/* More stats */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 16 }}>
          <StatCard
            label="Favorite Role"
            value={recap.favoriteRole}
            context="Where you played the most ranked games"
            delay={1800}
          />
          <StatCard
            label="Top Duo Partner"
            value={recap.mostPlayedWith.split("#")[0]}
            context={`Your most frequent ranked partner`}
            color="#60a5fa"
            delay={2000}
          />
        </div>

        {/* Share button */}
        <div style={{ marginTop: 40, display: "flex", gap: 12, justifyContent: "center" }}>
          <button
            type="button"
            onClick={() => {
              if (navigator.share) {
                navigator.share({ title: `${riotId} — Season Recap`, url: shareUrl });
              } else if (navigator.clipboard) {
                navigator.clipboard.writeText(shareUrl);
              }
            }}
            style={{
              padding: "12px 32px",
              fontSize: 14,
              fontWeight: 700,
              color: "#fff",
              background: "linear-gradient(135deg, #3b82f6, #8b5cf6)",
              border: "none",
              borderRadius: 8,
              cursor: "pointer",
            }}
          >
            Share Recap
          </button>
          <Link
            href={`/summoner?riotId=${encodeURIComponent(riotId)}&region=${encodeURIComponent(region)}`}
            style={{
              padding: "12px 32px",
              fontSize: 14,
              fontWeight: 600,
              color: "rgba(255,255,255,0.6)",
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 8,
              textDecoration: "none",
            }}
          >
            Back to Profile
          </Link>
        </div>

        {/* Disclaimer */}
        <p style={{ marginTop: 32, textAlign: "center", fontSize: 11, color: "rgba(255,255,255,0.25)" }}>
          StatGap.gg &middot; Sample data shown for demo accounts
        </p>
      </div>

      <style>{`
        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateY(24px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
