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

const TIER_WEIGHT: Record<string, number> = {
  IRON: 0,
  BRONZE: 1,
  SILVER: 2,
  GOLD: 3,
  PLATINUM: 4,
  EMERALD: 5,
  DIAMOND: 6,
  MASTER: 7,
  GRANDMASTER: 8,
  CHALLENGER: 9,
};

const DIVISION_WEIGHT: Record<string, number> = {
  IV: 1,
  III: 2,
  II: 3,
  I: 4,
};

/* ------------------------------------------------------------------ */
/*  Sort score helpers (tier_weight × 10000 + division_weight × 1000 + LP) */
/* ------------------------------------------------------------------ */

function tierRankLpToSortScore(tier: string, rank: string, lp: number): number {
  const t = tier.toUpperCase();
  const tw = TIER_WEIGHT[t] ?? 0;
  const r = rank?.toUpperCase() ?? "IV";
  const dw = DIVISION_WEIGHT[r] ?? 1;
  return tw * 10000 + dw * 1000 + Math.max(0, Math.min(99, lp));
}

/** Convert sort score back to readable string: "Gold II 67 LP" */
function sortScoreToDisplay(score: number): string {
  if (score >= 90000) return `Challenger ${score - 90000} LP`;
  if (score >= 80000) return `Grandmaster ${score - 80000} LP`;
  if (score >= 70000) return `Master ${score - 70000} LP`;

  const tierIdx = Math.floor(score / 10000);
  const remainder = score - tierIdx * 10000;
  const divIdx = Math.floor(remainder / 1000);
  const lp = Math.min(99, Math.max(0, Math.round(remainder % 1000)));

  const tiers = ["Iron", "Bronze", "Silver", "Gold", "Platinum", "Emerald", "Diamond"];
  const divisions = ["IV", "III", "II", "I"];
  const tierName = tiers[tierIdx] ?? "Iron";
  const divName = divisions[divIdx] ?? "IV";

  return `${tierName} ${divName} ${lp} LP`;
}

/** Get tier+division only (for boundary labels when LP is 0) */
function sortScoreToTierDivision(score: number): string {
  if (score >= 90000) return "Challenger";
  if (score >= 80000) return "Grandmaster";
  if (score >= 70000) return "Master";

  const tierIdx = Math.floor(score / 10000);
  const remainder = score - tierIdx * 10000;
  const divIdx = Math.floor(remainder / 1000);

  const tiers = ["Iron", "Bronze", "Silver", "Gold", "Platinum", "Emerald", "Diamond"];
  const divisions = ["IV", "III", "II", "I"];
  const tierName = tiers[tierIdx] ?? "Iron";
  const divName = divisions[divIdx] ?? "IV";

  return `${tierName} ${divName}`;
}

/** Snap to division boundary (every 1000) */
function snapToDivisionBoundary(score: number): number {
  return Math.round(score / 1000) * 1000;
}

function shortDate(ts: number, range: string): string {
  const d = new Date(ts);
  const rangeMs = TIME_RANGES.find((r) => r.label === range)?.ms ?? TIME_RANGES[1].ms;

  if (range === "24h") {
    return d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  }
  if (range === "90d") {
    return d.toLocaleDateString(undefined, { month: "short" });
  }
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function tooltipDate(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
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

const PAD_TOP = 20;
const PAD_RIGHT = 16;
const PAD_BOTTOM = 40;
const PAD_LEFT = 60;

export function LpHistoryGraph({ matches, currentLp, tier, rank }: LpHistoryGraphProps) {
  const useSample = matches.length === 0;
  const effectiveTier = useSample && !tier ? "GOLD" : tier;
  const effectiveRank = useSample && !rank ? "I" : rank;
  const effectiveLp = useSample && currentLp === 0 ? 67 : currentLp;
  const effectiveMatches = useSample ? SAMPLE_MATCHES : matches;
  const [range, setRange] = useState<string>("7d");
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  const currentSortScore = useMemo(
    () => tierRankLpToSortScore(effectiveTier, effectiveRank, effectiveLp),
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

    let lp = currentSortScore;
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
  }, [effectiveMatches, range, currentSortScore]);

  if (!effectiveTier || !effectiveRank) return null;

  const notEnough = dataPoints.length < 3;

  const lpValues = dataPoints.map((d) => d.lp);
  const minLp = Math.min(...lpValues);
  const maxLp = Math.max(...lpValues);
  const lpRange = maxLp - minLp || 1;
  const trend = dataPoints.length >= 2 ? dataPoints[dataPoints.length - 1].lp - dataPoints[0].lp : 0;
  const lineColor = trend > 0 ? "#2ECC71" : trend < 0 ? "#E74C3C" : "#666";

  const svgW = 400;
  const svgH = 200;
  const plotW = svgW - PAD_LEFT - PAD_RIGHT;
  const plotH = svgH - PAD_TOP - PAD_BOTTOM;

  const coords = dataPoints.map((d, i) => ({
    x: PAD_LEFT + (dataPoints.length > 1 ? (i / (dataPoints.length - 1)) * plotW : plotW / 2),
    y: PAD_TOP + plotH - ((d.lp - minLp) / lpRange) * plotH,
  }));

  const polylinePoints = coords.map((c) => `${c.x},${c.y}`).join(" ");

  /* Y-axis ticks: 4-5 max, snap to division boundaries or LP within division */
  const yTicks = useMemo(() => {
    const minBound = snapToDivisionBoundary(minLp);
    const maxBound = snapToDivisionBoundary(maxLp);
    const sameDivision = Math.floor(minLp / 1000) === Math.floor(maxLp / 1000);

    if (sameDivision && maxBound - minBound < 1000) {
      const base = Math.floor(minLp / 1000) * 1000;
      const ticks: Array<{ score: number; label: string }> = [];
      for (const lp of [0, 25, 50, 75, 100]) {
        const s = base + lp;
        if (s >= minLp - 50 && s <= maxLp + 50) ticks.push({ score: s, label: `${lp} LP` });
      }
      if (ticks.length < 2) {
        ticks.length = 0;
        const step = Math.max(1, Math.ceil((maxLp - minLp) / 4));
        for (let s = minLp; s <= maxLp; s += step) {
          ticks.push({ score: s, label: `${Math.round(s % 1000)} LP` });
        }
      }
      return ticks.length > 0 ? ticks : [{ score: minLp, label: `${Math.round(minLp % 1000)} LP` }];
    }

    const spanDivisions = (maxBound - minBound) / 1000;
    const step = Math.max(1, Math.ceil(spanDivisions / 4));
    const ticks: Array<{ score: number; label: string }> = [];
    for (let b = minBound; b <= maxBound; b += step * 1000) {
      ticks.push({ score: b, label: sortScoreToTierDivision(b) });
    }
    return ticks;
  }, [minLp, maxLp]);

  /* X-axis labels: 4-6 evenly spaced */
  const xLabels = useMemo(() => {
    if (dataPoints.length <= 1) return [];
    const count = Math.min(6, Math.max(4, Math.floor(dataPoints.length / 4)));
    const step = (dataPoints.length - 1) / (count - 1);
    const labels: Array<{ x: number; label: string }> = [];
    const seen = new Set<string>();
    for (let i = 0; i < count; i++) {
      const idx = Math.round(i * step);
      const ts = dataPoints[idx]?.ts ?? 0;
      const label = shortDate(ts, range);
      if (!seen.has(label)) {
        seen.add(label);
        labels.push({ x: coords[idx]?.x ?? 0, label });
      }
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
          height: 220,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#666",
          fontSize: 13,
        }}>
          Not enough data for this time range
        </div>
      ) : (
        <div style={{ position: "relative", width: "100%", height: 220, overflow: "visible" }}>
          <svg
            viewBox={`0 0 ${svgW} ${svgH}`}
            preserveAspectRatio="xMidYMid meet"
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
                points={`${coords[0].x},${svgH - PAD_BOTTOM} ${polylinePoints} ${coords[coords.length - 1].x},${svgH - PAD_BOTTOM}`}
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

            {/* Y-axis labels */}
            {yTicks.map((tick, i) => {
              const y = PAD_TOP + plotH - ((tick.score - minLp) / lpRange) * plotH;
              if (y < PAD_TOP - 2 || y > svgH - PAD_BOTTOM + 2) return null;
              return (
                <g key={i}>
                  <line
                    x1={PAD_LEFT}
                    y1={y}
                    x2={PAD_LEFT + plotW}
                    y2={y}
                    stroke="rgba(255,255,255,0.06)"
                    strokeWidth="1"
                    strokeDasharray="2 2"
                  />
                  <text
                    x={PAD_LEFT - 6}
                    y={y + 4}
                    fontSize="10"
                    fill="#888"
                    textAnchor="end"
                  >
                    {tick.label}
                  </text>
                </g>
              );
            })}

            {/* X-axis labels */}
            {xLabels.map((l, i) => (
              <text
                key={i}
                x={l.x}
                y={svgH - PAD_BOTTOM + 14}
                fontSize="9"
                fill="#666"
                textAnchor="middle"
              >
                {l.label}
              </text>
            ))}
          </svg>

          {hoverIdx !== null && dataPoints[hoverIdx] && (() => {
            const d = dataPoints[hoverIdx];
            const c = coords[hoverIdx];
            const isRightHalf = c.x > svgW / 2;
            const rankStr = sortScoreToDisplay(d.lp);
            const wl = d.win ? "W" : "L";
            const lpStr = d.lpChange > 0 ? `+${d.lpChange} LP` : `${d.lpChange} LP`;
            const tooltipLine = d.champion
              ? `${tooltipDate(d.ts)} · ${wl} · ${d.champion} · ${lpStr} · ${rankStr}`
              : `${tooltipDate(d.ts)} · Current · ${rankStr}`;

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
                {tooltipLine}
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
}
