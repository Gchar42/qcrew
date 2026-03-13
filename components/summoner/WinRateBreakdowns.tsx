"use client";

import { useMemo } from "react";
import Image from "next/image";
import { getChampionSquareUrl } from "@/lib/riotAssets";

type BreakdownMatch = {
  win: boolean;
  championName: string;
  gameTimestamp: number;
  patch?: string;
};

interface Props {
  matches: BreakdownMatch[];
}

const TIME_BUCKETS = [
  { label: "Morning", start: 6, end: 12 },
  { label: "Afternoon", start: 12, end: 18 },
  { label: "Evening", start: 18, end: 23 },
  { label: "Late Night", start: 23, end: 6 },
] as const;

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;
const DAY_FULL: Record<string, string> = {
  Mon: "Mondays",
  Tue: "Tuesdays",
  Wed: "Wednesdays",
  Thu: "Thursdays",
  Fri: "Fridays",
  Sat: "Saturdays",
  Sun: "Sundays",
};

function getBucket(hour: number): number {
  if (hour >= 6 && hour < 12) return 0;
  if (hour >= 12 && hour < 18) return 1;
  if (hour >= 18 && hour < 23) return 2;
  return 3;
}

function wr(wins: number, total: number): number {
  return total === 0 ? 0 : Math.round((wins / total) * 100);
}

function barColor(
  val: number,
  highest: number,
  lowest: number,
  total: number,
): string {
  if (total === 0) return "#555";
  if (val === highest) return "#2ECC71";
  if (val === lowest) return "#E74C3C";
  return "rgba(88,101,242,0.6)";
}

function HBar({
  label,
  pct,
  color,
  games,
}: {
  label: string;
  pct: number;
  color: string;
  games: number;
}) {
  return (
    <div className="flex items-center gap-3 text-xs">
      <span className="w-20 shrink-0 text-white/60">{label}</span>
      <div className="flex-1 h-5 rounded bg-white/5 overflow-hidden relative">
        <div
          className="h-full rounded transition-all duration-300"
          style={{ width: `${Math.max(pct, 2)}%`, backgroundColor: color }}
        />
      </div>
      <span className="w-20 shrink-0 text-right text-white/80 tabular-nums">
        {pct}% ({games})
      </span>
    </div>
  );
}

export function WinRateBreakdowns({ matches }: Props) {
  const tz = useMemo(
    () => new Intl.DateTimeFormat().resolvedOptions().timeZone,
    [],
  );

  const timeBucketStats = useMemo(() => {
    const buckets = Array.from({ length: 4 }, () => ({ wins: 0, total: 0 }));
    for (const m of matches) {
      const d = new Date(m.gameTimestamp);
      const hour = parseInt(
        new Intl.DateTimeFormat("en-US", {
          hour: "numeric",
          hour12: false,
          timeZone: tz,
        }).format(d),
        10,
      );
      const idx = getBucket(hour);
      buckets[idx].total++;
      if (m.win) buckets[idx].wins++;
    }
    return buckets.map((b) => ({ ...b, wr: wr(b.wins, b.total) }));
  }, [matches, tz]);

  const dayStats = useMemo(() => {
    const days = Array.from({ length: 7 }, () => ({ wins: 0, total: 0 }));
    for (const m of matches) {
      const d = new Date(m.gameTimestamp);
      const localDay = new Intl.DateTimeFormat("en-US", {
        weekday: "short",
        timeZone: tz,
      }).format(d);
      const map: Record<string, number> = {
        Mon: 0,
        Tue: 1,
        Wed: 2,
        Thu: 3,
        Fri: 4,
        Sat: 5,
        Sun: 6,
      };
      const idx = map[localDay] ?? 0;
      days[idx].total++;
      if (m.win) days[idx].wins++;
    }
    return days.map((b) => ({ ...b, wr: wr(b.wins, b.total) }));
  }, [matches, tz]);

  const championStats = useMemo(() => {
    const byChamp: Record<
      string,
      { wins: number; total: number; patchWins: number; patchTotal: number }
    > = {};
    const hasPatchData = matches.some((m) => m.patch);
    for (const m of matches) {
      if (!m.championName) continue;
      if (!byChamp[m.championName])
        byChamp[m.championName] = {
          wins: 0,
          total: 0,
          patchWins: 0,
          patchTotal: 0,
        };
      const c = byChamp[m.championName];
      c.total++;
      if (m.win) c.wins++;
      const isCurrentPatch = !hasPatchData || m.patch?.startsWith("16.5");
      if (isCurrentPatch) {
        c.patchTotal++;
        if (m.win) c.patchWins++;
      }
    }
    return Object.entries(byChamp)
      .map(([name, s]) => {
        const wrAll = wr(s.wins, s.total);
        const wrPatch = wr(s.patchWins, s.patchTotal);
        const wrOther =
          s.total - s.patchTotal > 0
            ? wr(s.wins - s.patchWins, s.total - s.patchTotal)
            : wrPatch;
        const diff = wrPatch - wrOther;
        const trend: "up" | "down" | "stable" =
          diff > 2 ? "up" : diff < -2 ? "down" : "stable";
        return {
          name,
          wrAll,
          wrPatch,
          patchGames: s.patchTotal,
          allGames: s.total,
          trend,
        };
      })
      .sort((a, b) => b.patchGames - a.patchGames);
  }, [matches]);

  if (matches.length === 0) return null;

  const timeWrs = timeBucketStats.map((b) => b.wr);
  const withGames = timeBucketStats
    .map((b, i) => ({ ...b, i }))
    .filter((b) => b.total > 0);
  const timeHigh =
    withGames.length > 0
      ? withGames.reduce((a, b) => (b.wr > a.wr ? b : a)).wr
      : 0;
  const timeLow =
    withGames.length > 0
      ? withGames.reduce((a, b) => (b.wr < a.wr ? b : a)).wr
      : 0;
  const bestTimeBucket =
    withGames.length > 0
      ? TIME_BUCKETS[withGames.reduce((a, b) => (b.wr > a.wr ? b : a)).i]
          .label
      : "";
  const worstTimeBucket =
    withGames.length > 0
      ? TIME_BUCKETS[withGames.reduce((a, b) => (b.wr < a.wr ? b : a)).i]
          .label
      : "";

  const dayWrs = dayStats.map((d) => d.wr);
  const daysWithGames = dayStats
    .map((d, i) => ({ ...d, i }))
    .filter((d) => d.total > 0);
  const dayHigh =
    daysWithGames.length > 0
      ? daysWithGames.reduce((a, b) => (b.wr > a.wr ? b : a)).wr
      : 0;
  const dayLow =
    daysWithGames.length > 0
      ? daysWithGames.reduce((a, b) => (b.wr < a.wr ? b : a)).wr
      : 0;
  const bestDay =
    daysWithGames.length > 0
      ? DAYS[daysWithGames.reduce((a, b) => (b.wr > a.wr ? b : a)).i]
      : "";
  const worstDay =
    daysWithGames.length > 0
      ? DAYS[daysWithGames.reduce((a, b) => (b.wr < a.wr ? b : a)).i]
      : "";

  return (
    <div className="space-y-6 mt-6">
      {/* Time of Day */}
      <section className="rounded-xl border border-white/10 bg-[#151620] p-5">
        <h3 className="text-sm font-bold text-white/90 mb-4">
          Win Rate by Time of Day
        </h3>
        <div className="space-y-2">
          {TIME_BUCKETS.map((bucket, i) => (
            <HBar
              key={bucket.label}
              label={bucket.label}
              pct={timeWrs[i]}
              games={timeBucketStats[i].total}
              color={barColor(
                timeWrs[i],
                timeHigh,
                timeLow,
                timeBucketStats[i].total,
              )}
            />
          ))}
        </div>
        {bestTimeBucket && (
          <p className="text-xs text-white/50 mt-3">
            You win{" "}
            {timeWrs[TIME_BUCKETS.findIndex((b) => b.label === bestTimeBucket)]}
            % of games in the {bestTimeBucket.toLowerCase()}. Your lowest win
            rate is {worstTimeBucket.toLowerCase()} (
            {
              timeWrs[
                TIME_BUCKETS.findIndex((b) => b.label === worstTimeBucket)
              ]
            }
            %).
          </p>
        )}
      </section>

      {/* Day of Week */}
      <section className="rounded-xl border border-white/10 bg-[#151620] p-5">
        <h3 className="text-sm font-bold text-white/90 mb-4">
          Win Rate by Day of Week
        </h3>
        <div className="space-y-2">
          {DAYS.map((day, i) => (
            <HBar
              key={day}
              label={day}
              pct={dayWrs[i]}
              games={dayStats[i].total}
              color={barColor(dayWrs[i], dayHigh, dayLow, dayStats[i].total)}
            />
          ))}
        </div>
        {bestDay && (
          <p className="text-xs text-white/50 mt-3">
            Your best day is {DAY_FULL[bestDay]} ({dayWrs[DAYS.indexOf(bestDay)]}
            % WR). Avoid ranked on {DAY_FULL[worstDay]} (
            {dayWrs[DAYS.indexOf(worstDay)]}% WR).
          </p>
        )}
      </section>

      {/* Champion WR Table */}
      <section className="rounded-xl border border-white/10 bg-[#151620] p-5">
        <h3 className="text-sm font-bold text-white/90 mb-4">
          Win Rate by Champion (This Patch)
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-white/40 border-b border-white/10">
                <th className="text-left py-2 pr-2" />
                <th className="text-left py-2 pr-4">Champion</th>
                <th className="text-center py-2 px-2">WR (Patch)</th>
                <th className="text-center py-2 px-2">Games</th>
                <th className="text-center py-2 px-2">WR (All)</th>
                <th className="text-center py-2 px-2">Trend</th>
              </tr>
            </thead>
            <tbody>
              {championStats.map((c) => {
                const rowBg =
                  c.wrPatch > 52
                    ? "bg-green-500/10"
                    : c.wrPatch < 48
                      ? "bg-red-500/10"
                      : "";
                return (
                  <tr
                    key={c.name}
                    className={`border-b border-white/5 ${rowBg}`}
                  >
                    <td className="py-1.5 pr-2">
                      <Image
                        src={getChampionSquareUrl(c.name)}
                        alt={c.name}
                        width={24}
                        height={24}
                        className="rounded"
                        unoptimized
                      />
                    </td>
                    <td className="py-1.5 pr-4 text-white/80">{c.name}</td>
                    <td className="py-1.5 text-center text-white/80 tabular-nums">
                      {c.wrPatch}%
                    </td>
                    <td className="py-1.5 text-center text-white/50 tabular-nums">
                      {c.patchGames}
                    </td>
                    <td className="py-1.5 text-center text-white/50 tabular-nums">
                      {c.wrAll}%
                    </td>
                    <td className="py-1.5 text-center">
                      <span
                        className={
                          c.trend === "up"
                            ? "text-green-400"
                            : c.trend === "down"
                              ? "text-red-400"
                              : "text-white/30"
                        }
                      >
                        {c.trend === "up"
                          ? "↑"
                          : c.trend === "down"
                            ? "↓"
                            : "→"}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
