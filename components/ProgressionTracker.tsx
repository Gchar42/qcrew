"use client";

import { useMemo } from "react";

interface ProgressionTrackerProps {
  riotId: string;
  region: string;
}

interface WeekData {
  label: string;
  winRate: number;
  csPerMin: number;
  kda: number;
  visionScore: number;
}

function generateMockData(riotId: string): WeekData[] {
  let seed = 0;
  for (let i = 0; i < riotId.length; i++) seed += riotId.charCodeAt(i);
  const r = () => {
    seed = (seed * 16807 + 0) % 2147483647;
    return (seed & 0x7fffffff) / 0x7fffffff;
  };

  const base = { winRate: 46 + r() * 8, csPerMin: 5.5 + r() * 1.5, kda: 2.0 + r(), visionScore: 14 + r() * 8 };
  const weeks: WeekData[] = [];

  for (let w = 0; w < 8; w++) {
    const drift = (w / 7) * (r() > 0.3 ? 1 : -0.5);
    weeks.push({
      label: `W${w + 1}`,
      winRate: Math.min(72, Math.max(30, base.winRate + drift * 8 + (r() - 0.4) * 3)),
      csPerMin: Math.min(9.5, Math.max(4, base.csPerMin + drift * 1.2 + (r() - 0.4) * 0.4)),
      kda: Math.min(6, Math.max(1, base.kda + drift * 1.0 + (r() - 0.4) * 0.3)),
      visionScore: Math.min(35, Math.max(8, base.visionScore + drift * 5 + (r() - 0.4) * 2)),
    });
  }
  return weeks;
}

function Sparkline({
  data,
  format,
  width = 200,
  height = 60,
}: {
  data: number[];
  format: (v: number) => string;
  width?: number;
  height?: number;
}) {
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const padY = 6;
  const padX = 4;
  const innerW = width - padX * 2;
  const innerH = height - padY * 2;

  const points = data.map((v, i) => ({
    x: padX + (i / (data.length - 1)) * innerW,
    y: padY + innerH - ((v - min) / range) * innerH,
  }));

  const trending = data[data.length - 1] >= data[0];
  const strokeColor = trending ? "#34d399" : "#f87171";
  const fillId = `grad-${Math.random().toString(36).slice(2, 8)}`;

  const pathD = points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ");
  const areaD = `${pathD} L${points[points.length - 1].x},${height} L${points[0].x},${height} Z`;

  const first = data[0];
  const last = data[data.length - 1];

  return (
    <div className="relative">
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        className="overflow-visible"
      >
        <defs>
          <linearGradient id={fillId} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor={strokeColor} stopOpacity="0.25" />
            <stop offset="100%" stopColor={strokeColor} stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={areaD} fill={`url(#${fillId})`} />
        <path d={pathD} fill="none" stroke={strokeColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        {points.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r="2.5" fill={strokeColor} opacity={i === data.length - 1 ? 1 : 0.4} />
        ))}
      </svg>
      <div className="flex justify-between mt-1">
        <span className="text-[10px] text-zinc-500">{format(first)}</span>
        <span className={`text-[10px] font-medium ${trending ? "text-emerald-400" : "text-red-400"}`}>
          {format(last)}
        </span>
      </div>
    </div>
  );
}

const METRICS: {
  key: keyof Omit<WeekData, "label">;
  title: string;
  format: (v: number) => string;
}[] = [
  { key: "winRate", title: "Win Rate", format: (v) => `${v.toFixed(1)}%` },
  { key: "csPerMin", title: "CS / Min", format: (v) => v.toFixed(1) },
  { key: "kda", title: "Avg KDA", format: (v) => v.toFixed(2) },
  { key: "visionScore", title: "Vision Score", format: (v) => v.toFixed(0) },
];

export default function ProgressionTracker({
  riotId,
  region,
}: ProgressionTrackerProps) {
  const weeks = useMemo(() => generateMockData(riotId + region), [riotId, region]);

  return (
    <div className="glass rounded-2xl p-5">
      <h3 className="text-lg font-semibold text-zinc-100 mb-1 flex items-center gap-2">
        <span className="text-indigo-400">📈</span>
        Progression Tracker
      </h3>
      <p className="text-xs text-zinc-500 mb-4">
        8-week trend for <span className="text-zinc-300">{riotId}</span>{" "}
        <span className="text-zinc-600">({region})</span>
      </p>

      <div className="grid grid-cols-2 gap-3">
        {METRICS.map(({ key, title, format }) => {
          const values = weeks.map((w) => w[key]);
          const trending = values[values.length - 1] >= values[0];

          return (
            <div
              key={key}
              className="rounded-xl bg-white/[0.03] border border-white/5 p-3"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-zinc-400">
                  {title}
                </span>
                <span
                  className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                    trending
                      ? "bg-emerald-500/10 text-emerald-400"
                      : "bg-red-500/10 text-red-400"
                  }`}
                >
                  {trending ? "↑ UP" : "↓ DOWN"}
                </span>
              </div>
              <Sparkline data={values} format={format} />
            </div>
          );
        })}
      </div>
    </div>
  );
}
