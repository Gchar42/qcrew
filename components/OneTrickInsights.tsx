"use client";

import { useEffect, useState } from "react";

interface Insight {
  metric: string;
  oneTrickAvg: string;
  averageAvg: string;
  diff: string;
  icon: string;
}

interface InsightsData {
  championName: string;
  class: string;
  insights: Insight[];
}

export default function OneTrickInsights({
  championName,
}: {
  championName: string;
}) {
  const [data, setData] = useState<InsightsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!championName) return;
    setLoading(true);
    setError(null);

    fetch(`/api/champions/${encodeURIComponent(championName)}/insights`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch insights");
        return res.json();
      })
      .then((d: InsightsData) => setData(d))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [championName]);

  if (loading) {
    return (
      <div className="glass rounded-2xl p-5 animate-pulse">
        <div className="h-5 w-48 bg-zinc-700/50 rounded mb-4" />
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-12 bg-zinc-700/30 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="glass rounded-2xl p-5">
        <p className="text-sm text-red-400">
          {error ?? "Could not load insights"}
        </p>
      </div>
    );
  }

  return (
    <div className="glass rounded-2xl p-5">
      <h3 className="text-lg font-semibold text-zinc-100 mb-1 flex items-center gap-2">
        <span className="text-indigo-400">🎯</span>
        One-Trick Insights
      </h3>
      <p className="text-xs text-zinc-500 mb-4">
        How {data.championName} mains ({data.class}) outperform the average
        player
      </p>

      <div className="grid gap-2">
        {data.insights.map((insight) => {
          const isPositiveDiff =
            insight.diff.startsWith("+") || insight.diff.startsWith("-");
          const diffColor = insight.diff.startsWith("-")
            ? insight.metric.includes("Death") ||
              insight.metric.includes("Positioning") ||
              insight.metric.includes("Time") ||
              insight.metric.includes("Timer")
              ? "text-emerald-400"
              : "text-red-400"
            : "text-emerald-400";

          return (
            <div
              key={insight.metric}
              className="flex items-center justify-between rounded-xl bg-white/[0.03] px-4 py-3 border border-white/5"
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className="text-lg shrink-0">{insight.icon}</span>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-zinc-200 truncate">
                    {insight.metric}
                  </p>
                  <p className="text-xs text-zinc-500">
                    Avg:&nbsp;
                    <span className="text-zinc-400">{insight.averageAvg}</span>
                  </p>
                </div>
              </div>
              <div className="text-right shrink-0 ml-4">
                <p className="text-sm font-semibold text-indigo-400">
                  {insight.oneTrickAvg}
                </p>
                {isPositiveDiff && (
                  <p className={`text-xs font-medium ${diffColor}`}>
                    {insight.diff}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
