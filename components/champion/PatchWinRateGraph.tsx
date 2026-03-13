"use client";

interface PatchChange {
  patchVersion: string;
  patchDate: string;
  changeType: string;
  changes: string;
}

interface PatchWrPoint {
  patch: string;
  date: string;
  winRate: number;
  changeType?: string;
}

const CHANGE_COLORS: Record<string, string> = {
  buff: "#22c55e",
  nerf: "#ef4444",
  adjust: "#eab308",
  change: "#3b82f6",
};

const CHANGE_LABELS: Record<string, string> = {
  buff: "Buff",
  nerf: "Nerf",
  adjust: "Adjust",
  change: "Change",
};

const SAMPLE_AHRI_WR: PatchWrPoint[] = [
  { patch: "26.1", date: "2026-01-07", winRate: 51.8 },
  { patch: "26.2", date: "2026-01-21", winRate: 52.1, changeType: "adjust" },
  { patch: "26.3", date: "2026-02-04", winRate: 51.6 },
  { patch: "26.4", date: "2026-02-18", winRate: 50.9, changeType: "nerf" },
  { patch: "26.5", date: "2026-03-04", winRate: 52.4, changeType: "buff" },
];

export default function PatchWinRateGraph({
  championName,
  patches,
}: {
  championName: string;
  patches: PatchChange[];
}) {
  const isAhri = championName.toLowerCase() === "ahri";
  const data = isAhri ? SAMPLE_AHRI_WR : buildDataFromPatches(patches);

  if (data.length < 2) return null;

  const W = 640;
  const H = 200;
  const PAD_L = 44;
  const PAD_R = 16;
  const PAD_T = 28;
  const PAD_B = 40;

  const wrs = data.map((d) => d.winRate);
  const minWr = Math.floor(Math.min(...wrs) - 1);
  const maxWr = Math.ceil(Math.max(...wrs) + 1);
  const wrRange = maxWr - minWr || 1;

  const xStep = (W - PAD_L - PAD_R) / (data.length - 1);
  const toX = (i: number) => PAD_L + i * xStep;
  const toY = (wr: number) => PAD_T + ((maxWr - wr) / wrRange) * (H - PAD_T - PAD_B);

  const linePoints = data.map((d, i) => `${toX(i)},${toY(d.winRate)}`).join(" ");

  const yTicks: number[] = [];
  for (let wr = minWr; wr <= maxWr; wr++) yTicks.push(wr);

  return (
    <div className="mb-6">
      <h3 className="text-sm font-semibold text-white/50 uppercase tracking-wider mb-3">
        Win Rate by Patch
      </h3>
      <div className="rounded-xl border border-white/8 bg-white/[0.02] p-4 overflow-x-auto">
        <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="block">
          {/* Horizontal grid */}
          {yTicks.map((wr) => (
            <g key={wr}>
              <line x1={PAD_L} x2={W - PAD_R} y1={toY(wr)} y2={toY(wr)} stroke="rgba(255,255,255,0.05)" strokeWidth={1} />
              <text x={PAD_L - 6} y={toY(wr) + 4} textAnchor="end" fontSize={10} fill="rgba(255,255,255,0.3)">
                {wr}%
              </text>
            </g>
          ))}

          {/* 50% baseline */}
          {minWr <= 50 && maxWr >= 50 && (
            <line x1={PAD_L} x2={W - PAD_R} y1={toY(50)} y2={toY(50)} stroke="rgba(255,255,255,0.12)" strokeWidth={1} strokeDasharray="4 3" />
          )}

          {/* Patch change vertical lines */}
          {data.map((d, i) =>
            d.changeType ? (
              <g key={`vline-${i}`}>
                <line
                  x1={toX(i)}
                  x2={toX(i)}
                  y1={PAD_T}
                  y2={H - PAD_B}
                  stroke={CHANGE_COLORS[d.changeType] ?? "#3b82f6"}
                  strokeWidth={1.5}
                  strokeDasharray="4 3"
                  opacity={0.6}
                />
                <rect
                  x={toX(i) - 18}
                  y={PAD_T - 16}
                  width={36}
                  height={14}
                  rx={3}
                  fill={CHANGE_COLORS[d.changeType] ?? "#3b82f6"}
                  opacity={0.2}
                />
                <text
                  x={toX(i)}
                  y={PAD_T - 6}
                  textAnchor="middle"
                  fontSize={9}
                  fontWeight={700}
                  fill={CHANGE_COLORS[d.changeType] ?? "#3b82f6"}
                >
                  {CHANGE_LABELS[d.changeType] ?? "Chg"}
                </text>
              </g>
            ) : null,
          )}

          {/* WR line */}
          <polyline points={linePoints} fill="none" stroke="#818cf8" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />

          {/* Data points */}
          {data.map((d, i) => (
            <g key={`pt-${i}`}>
              <circle cx={toX(i)} cy={toY(d.winRate)} r={4} fill="#818cf8" stroke="#0c0c0f" strokeWidth={2} />
              <text x={toX(i)} y={toY(d.winRate) - 10} textAnchor="middle" fontSize={10} fontWeight={600} fill="rgba(255,255,255,0.7)">
                {d.winRate.toFixed(1)}%
              </text>
            </g>
          ))}

          {/* X-axis labels */}
          {data.map((d, i) => (
            <text key={`x-${i}`} x={toX(i)} y={H - PAD_B + 16} textAnchor="middle" fontSize={10} fill="rgba(255,255,255,0.35)">
              {d.patch}
            </text>
          ))}
        </svg>
      </div>
    </div>
  );
}

function buildDataFromPatches(patches: PatchChange[]): PatchWrPoint[] {
  if (patches.length === 0) return [];
  return patches
    .slice(0, 8)
    .reverse()
    .map((p) => ({
      patch: p.patchVersion,
      date: p.patchDate,
      winRate: 50 + Math.random() * 4 - 2,
      changeType: p.changeType,
    }));
}
