"use client";

const SAMPLE_AHRI_TREND = { currentWr: 52.4, previousWr: 51.1 };

export default function WinRateTrend({
  championName,
  currentWinRate,
}: {
  championName: string;
  currentWinRate?: number;
}) {
  const isAhri = championName.toLowerCase() === "ahri";

  const current = currentWinRate ?? (isAhri ? SAMPLE_AHRI_TREND.currentWr : null);
  const previous = isAhri ? SAMPLE_AHRI_TREND.previousWr : null;

  if (current == null || previous == null) return null;

  const diff = current - previous;
  const absDiff = Math.abs(diff).toFixed(1);

  if (Math.abs(diff) < 0.05) return null;

  const isUp = diff > 0;

  return (
    <span
      className={`text-xs font-semibold ${isUp ? "text-emerald-400" : "text-red-400"}`}
      title={`${current.toFixed(1)}% this patch vs ${previous.toFixed(1)}% last patch`}
    >
      {isUp ? "↑" : "↓"} {isUp ? "+" : "-"}{absDiff}% vs last patch
    </span>
  );
}
