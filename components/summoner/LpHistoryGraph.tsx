"use client";

import { useMemo, useState } from "react";

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

interface MatchEntry {
  win: boolean;
  gameTimestamp: number;
  championName: string;
}

interface LpHistoryGraphProps {
  matches: MatchEntry[];
  currentLp: number;
  tier: string;
  rank: string;
}

/* ------------------------------------------------------------------ */
/*  Constants                                                         */
/* ------------------------------------------------------------------ */

const TIME_RANGES = [
  { label: "24h", ms: 24 * 60 * 60 * 1000 },
  { label: "7d", ms: 7 * 24 * 60 * 60 * 1000 },
  { label: "14d", ms: 14 * 24 * 60 * 60 * 1000 },
  { label: "30d", ms: 30 * 24 * 60 * 60 * 1000 },
  { label: "90d", ms: 90 * 24 * 60 * 60 * 1000 },
] as const;

const LP_WIN = 22;
const LP_LOSS = 18;

const TIER_ORDER: Record<string, number> = {
  IRON: 0,
  BRONZE: 1,
  SILVER: 2,
  GOLD: 3,
  PLATINUM: 4,
  EMERALD: 5,
  DIAMOND: 6,
};

const RANK_OFFSET: Record<string, number> = { IV: 0, III: 100, II: 200, I: 300 };

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

function tierRankLpToAbsolute(tier: string, rank: string, lp: number): number {
  const t = tier.toUpperCase();
  if (t === "MASTER") return 7000 + lp;
  if (t === "GRANDMASTER") return 8000 + lp;
  if (t === "CHALLENGER") return 9000 + lp;
  const tierBase = (TIER_ORDER[t] ?? 0) * 400;
  const rankBase = RANK_OFFSET[rank?.toUpperCase()] ?? 0;
  return tierBase + rankBase + lp;
}

/**
 * Convert sort score to short rank label for Y-axis.
 * User formula: tier = floor(score/10000), division = floor((score%10000)/1000)
 * Division: 1="IV", 2="III", 3="II", 4="I"
 * Also handles original 0-4000 scale (tier*400 + rank*100 + lp).
 */
function sortScoreToRankLabel(score: number): string {
  if (score >= 9000) return "Challenger";
  if (score >= 8000) return "Grandmaster";
  if (score >= 7000) return "Master";

  const tiers = ["Iron", "Bronze", "Silver", "Gold", "Platinum", "Emerald", "Diamond"];
  const divisions = ["IV", "III", "II", "I"]; // division 1->IV, 2->III, 3->II, 4->I

  if (score >= 10000) {
    const tierIdx = Math.floor(score / 10000);
    const divIdx = Math.floor((score % 10000) / 1000); // 0-9
    const tierName = tiers[Math.min(tierIdx, tiers.length - 1)] ?? "Iron";
    const divName = divisions[Math.min(Math.max(0, divIdx - 1), 3)] ?? "IV";
    return `${tierName} ${divName}`;
  }

  const tierIdx = Math.min(Math.floor(score / 400), tiers.length - 1);
  const inTier = score - tierIdx * 400;
  const divIdx = Math.min(Math.floor(inTier / 100), 3); // 0=IV, 1=III, 2=II, 3=I
  const tierName = tiers[tierIdx] ?? "Iron";
  const divName = divisions[divIdx] ?? "IV";
  return `${tierName} ${divName}`;
}

function shortDate(ts: number, range: string): string {
  const d = new Date(ts);
  if (range === "24h") {
    return d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  }
  if (range === "90d") {
    return d.toLocaleDateString(undefined, { month: "short" });
  }
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function fullDate(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

/* ------------------------------------------------------------------ */
/*  Sample data — realistic 7-day climb Gold II → Gold I for Demo#NA1 */
/* ------------------------------------------------------------------ */

function buildSampleMatches(): MatchEntry[] {
  const now = Date.now();
  const DAY = 86_400_000;
  const GAME = 2_400_000;
  const sequence: Array<{ dayOffset: number; gameIdx: number; win: boolean; champ: string }> = [
    { dayOffset: 7, gameIdx: 0, win: true, champ: "Jinx" },
    { dayOffset: 7, gameIdx: 1, win: true, champ: "Jinx" },
    { dayOffset: 7, gameIdx: 2, win: false, champ: "Caitlyn" },
    { dayOffset: 6, gameIdx: 0, win: true, champ: "Jinx" },
    { dayOffset: 6, gameIdx: 1, win: false, champ: "Jinx" },
    { dayOffset: 6, gameIdx: 2, win: true, champ: "Kai'Sa" },
    { dayOffset: 6, gameIdx: 3, win: true, champ: "Jinx" },
    { dayOffset: 5, gameIdx: 0, win: false, champ: "Jinx" },
    { dayOffset: 5, gameIdx: 1, win: false, champ: "Caitlyn" },
    { dayOffset: 5, gameIdx: 2, win: true, champ: "Jinx" },
    { dayOffset: 4, gameIdx: 0, win: true, champ: "Jinx" },
    { dayOffset: 4, gameIdx: 1, win: true, champ: "Jinx" },
    { dayOffset: 4, gameIdx: 2, win: true, champ: "Kai'Sa" },
    { dayOffset: 4, gameIdx: 3, win: false, champ: "Jinx" },
    { dayOffset: 3, gameIdx: 0, win: true, champ: "Jinx" },
    { dayOffset: 3, gameIdx: 1, win: false, champ: "Caitlyn" },
    { dayOffset: 3, gameIdx: 2, win: true, champ: "Jinx" },
    { dayOffset: 2, gameIdx: 0, win: true, champ: "Jinx" },
    { dayOffset: 2, gameIdx: 1, win: true, champ: "Kai'Sa" },
    { dayOffset: 2, gameIdx: 2, win: false, champ: "Jinx" },
    { dayOffset: 2, gameIdx: 3, win: true, champ: "Jinx" },
    { dayOffset: 1, gameIdx: 0, win: true, champ: "Jinx" },
    { dayOffset: 1, gameIdx: 1, win: false, champ: "Caitlyn" },
    { dayOffset: 1, gameIdx: 2, win: true, champ: "Jinx" },
    { dayOffset: 0, gameIdx: 0, win: true, champ: "Jinx" },
    { dayOffset: 0, gameIdx: 1, win: true, champ: "Kai'Sa" },
  ];
  return sequence.map((s) => ({
    win: s.win,
    gameTimestamp: now - s.dayOffset * DAY - s.gameIdx * GAME,
    championName: s.champ,
  }));
}

const SAMPLE_MATCHES = buildSampleMatches();

/* ------------------------------------------------------------------ */
/*  Component                                                         */
/* ------------------------------------------------------------------ */

export function LpHistoryGraph({ matches, currentLp, tier, rank }: LpHistoryGraphProps) {
  const useSample = matches.length === 0;
  const effectiveTier = useSample && !tier ? "GOLD" : tier;
  const effectiveRank = useSample && !rank ? "I" : rank;
  const effectiveLp = useSample && currentLp === 0 ? 67 : currentLp;
  const effectiveMatches = useSample ? SAMPLE_MATCHES : matches;
  const [range, setRange] = useState<string>("7d");
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  const currentAbsLp = useMemo(
    () => tierRankLpToAbsolute(effectiveTier, effectiveRank, effectiveLp),
    [effectiveTier, effectiveRank, effectiveLp],
  );

  const dataPoints = useMemo(() => {
    const rangeMs = TIME_RANGES.find((r) => r.label === range)?.ms ?? TIME_RANGES[1].ms;
    const cutoff = Date.now() - rangeMs;

    const sorted = [...effectiveMatches]
      .filter((m) => m.gameTimestamp >= cutoff)
      .sort((a, b) => b.gameTimestamp - a.gameTimestamp);

    if (sorted.length === 0) return [];

    const points: Array<{
      ts: number;
      lp: number;
      win: boolean;
      champion: string;
      lpChange: number;
    }> = [];

    let lp = currentAbsLp;
    points.push({ ts: Date.now(), lp, win: true, champion: "", lpChange: 0 });

    for (const m of sorted) {
      const change = m.win ? LP_WIN : -LP_LOSS;
      lp -= change;
      points.push({
        ts: m.gameTimestamp,
        lp,
        win: m.win,
        champion: m.championName,
        lpChange: change,
      });
    }

    points.reverse();
    return points;
  }, [effectiveMatches, range, currentAbsLp]);

  if (!effectiveTier || !effectiveRank) return null;

  const notEnough = dataPoints.length < 3;

  const lpValues = dataPoints.map((d) => d.lp);
  const minLp = Math.min(...lpValues);
  const maxLp = Math.max(...lpValues);
  const lpRange = maxLp - minLp || 1;
  const trend = dataPoints.length >= 2 ? dataPoints[dataPoints.length - 1].lp - dataPoints[0].lp : 0;
  const lineColor = trend > 0 ? "#2ECC71" : trend < 0 ? "#E74C3C" : "#666";

  const svgW = 400;
  const svgH = 160;
  const padX = 10;
  const padY = 16;
  const plotW = svgW - padX * 2;
  const plotH = svgH - padY * 2;

  const coords = dataPoints.map((d, i) => ({
    x: padX + (dataPoints.length > 1 ? (i / (dataPoints.length - 1)) * plotW : plotW / 2),
    y: padY + plotH - ((d.lp - minLp) / lpRange) * plotH,
  }));

  const polylinePoints = coords.map((c) => `${c.x},${c.y}`).join(" ");

  const xLabels = useMemo(() => {
    if (dataPoints.length <= 1) return [];
    const count = Math.min(5, dataPoints.length);
    const step = (dataPoints.length - 1) / (count - 1);
    const labels: Array<{ x: number; label: string }> = [];
    for (let i = 0; i < count; i++) {
      const idx = Math.round(i * step);
      labels.push({ x: coords[idx]?.x ?? 0, label: shortDate(dataPoints[idx]?.ts ?? 0, range) });
    }
    return labels;
  }, [dataPoints, coords, range]);

  return (
    <div style={{
      borderRadius: 12,
      border: "1px solid rgba(255,255,255,0.1)",
      background: "#151620",
      padding: 16,
      marginTop: 12,
    }}>
      <div style={{ marginBottom: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ opacity: 0.7 }}>
            <polyline points="1,14 5,8 9,10 15,2" stroke="#5865F2" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span style={{ fontSize: 14, fontWeight: 600, color: "#e0e0e0" }}>LP History</span>
        </div>
        <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
          {TIME_RANGES.map((r) => (
            <button
              key={r.label}
              type="button"
              onClick={() => setRange(r.label)}
              style={{
                fontSize: 11,
                padding: "4px 8px",
                borderRadius: 9999,
                border: "none",
                cursor: "pointer",
                background: range === r.label ? "#5865F2" : "rgba(255,255,255,0.06)",
                color: range === r.label ? "#fff" : "#888",
                fontWeight: range === r.label ? 600 : 400,
                transition: "background 0.15s, color 0.15s",
              }}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {notEnough ? (
        <div style={{
          height: 192,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#666",
          fontSize: 13,
        }}>
          Not enough data for this time range
        </div>
      ) : (
        <div style={{ position: "relative", width: "100%", height: 196, paddingBottom: 4 }}>
          <svg
            viewBox={`0 0 ${svgW} ${svgH}`}
            preserveAspectRatio="none"
            style={{ width: "100%", height: "100%", overflow: "visible" }}
          >
            <defs>
              <linearGradient id="lpFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={lineColor} stopOpacity={0.25} />
                <stop offset="100%" stopColor={lineColor} stopOpacity={0} />
              </linearGradient>
            </defs>

            {coords.length > 1 && (
              <polygon
                points={`${coords[0].x},${svgH - padY} ${polylinePoints} ${coords[coords.length - 1].x},${svgH - padY}`}
                fill="url(#lpFill)"
              />
            )}

            <polyline
              points={polylinePoints}
              fill="none"
              stroke={lineColor}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {coords.map((c, i) => (
              <circle
                key={i}
                cx={c.x}
                cy={c.y}
                r={hoverIdx === i ? 5 : 3}
                fill={hoverIdx === i ? "#fff" : lineColor}
                stroke={hoverIdx === i ? lineColor : "none"}
                strokeWidth={hoverIdx === i ? 2 : 0}
                style={{ cursor: "pointer", transition: "r 0.1s" }}
                onMouseEnter={() => setHoverIdx(i)}
                onMouseLeave={() => setHoverIdx(null)}
              />
            ))}

            <text x={padX} y={padY - 4} fontSize="10" fill="#888" textAnchor="start">
              {sortScoreToRankLabel(maxLp)}
            </text>
            <text x={padX} y={svgH - padY + 12} fontSize="10" fill="#888" textAnchor="start">
              {sortScoreToRankLabel(minLp)}
            </text>

            {xLabels.map((l, i) => (
              <text key={i} x={l.x} y={svgH - 2} fontSize="9" fill="#666" textAnchor="middle">
                {l.label}
              </text>
            ))}
          </svg>

          {hoverIdx !== null && dataPoints[hoverIdx] && (() => {
            const d = dataPoints[hoverIdx];
            const c = coords[hoverIdx];
            const isRightHalf = c.x > svgW / 2;
            return (
              <div
                style={{
                  position: "absolute",
                  top: `${(c.y / svgH) * 100}%`,
                  left: isRightHalf ? undefined : `${(c.x / svgW) * 100 + 3}%`,
                  right: isRightHalf ? `${100 - (c.x / svgW) * 100 + 3}%` : undefined,
                  transform: "translateY(-50%)",
                  background: "#1a1b26",
                  border: "1px solid rgba(255,255,255,0.12)",
                  borderRadius: 8,
                  padding: "6px 10px",
                  fontSize: 11,
                  color: "#ccc",
                  lineHeight: 1.5,
                  pointerEvents: "none",
                  zIndex: 10,
                  whiteSpace: "nowrap",
                }}
              >
                <div style={{ color: "#999" }}>{fullDate(d.ts)}</div>
                {d.champion && (
                  <>
                    <div>
                      <span style={{ color: d.win ? "#2ECC71" : "#E74C3C", fontWeight: 600 }}>
                        {d.win ? "Win" : "Loss"}
                      </span>
                      {" — "}{d.champion}
                    </div>
                    <div style={{ color: d.lpChange > 0 ? "#2ECC71" : "#E74C3C" }}>
                      ~{d.lpChange > 0 ? "+" : ""}{d.lpChange} LP
                    </div>
                  </>
                )}
                {!d.champion && <div style={{ color: "#888" }}>Current</div>}
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
}
