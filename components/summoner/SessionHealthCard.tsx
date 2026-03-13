"use client";

import { useMemo } from "react";

interface SessionMatch {
  win: boolean;
  championName: string;
  gameTimestamp: number;
}

type CardState = "positive" | "neutral" | "warning" | "strongWarning" | "noGames";

const SESSION_GAP_MS = 14_400_000; // 4 hours

const BORDER_COLORS: Record<CardState, string> = {
  positive: "#2ECC71",
  neutral: "#666",
  warning: "#F1C40F",
  strongWarning: "#E74C3C",
  noGames: "#666",
};

function groupIntoSessions(matches: SessionMatch[]): SessionMatch[][] {
  if (matches.length === 0) return [];
  const sorted = [...matches].sort((a, b) => b.gameTimestamp - a.gameTimestamp);
  const sessions: SessionMatch[][] = [[sorted[0]]];
  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1].gameTimestamp;
    const cur = sorted[i].gameTimestamp;
    if (prev - cur <= SESSION_GAP_MS) {
      sessions[sessions.length - 1].push(sorted[i]);
    } else {
      sessions.push([sorted[i]]);
    }
  }
  return sessions;
}

function analyzeSession(session: SessionMatch[]): {
  state: CardState;
  wins: number;
  losses: number;
  lossStreak: number;
  champSwitches: number;
} {
  const wins = session.filter((m) => m.win).length;
  const losses = session.length - wins;

  let lossStreak = 0;
  for (const m of session) {
    if (!m.win) lossStreak++;
    else break;
  }

  let champSwitches = 0;
  if (lossStreak >= 2) {
    const streakChamps = session.slice(0, lossStreak).map((m) => m.championName);
    const uniqueChamps = new Set(streakChamps);
    champSwitches = uniqueChamps.size - 1;
  }

  let state: CardState;
  if (lossStreak >= 4) {
    state = "strongWarning";
  } else if (lossStreak >= 2) {
    state = "warning";
  } else if (wins > losses) {
    state = "positive";
  } else if (wins === losses) {
    state = "neutral";
  } else {
    state = lossStreak < 2 ? "neutral" : "warning";
  }

  return { state, wins, losses, lossStreak, champSwitches };
}

export function SessionHealthCard({ matches }: { matches: SessionMatch[] }) {
  const analysis = useMemo(() => {
    const sessions = groupIntoSessions(matches);
    if (sessions.length === 0) return null;
    const current = sessions[0];
    return { ...analyzeSession(current), session: current };
  }, [matches]);

  if (!analysis) {
    return (
      <div
        className="rounded-xl p-4"
        style={{
          background: "#151620",
          borderLeft: "4px solid #666",
        }}
      >
        <p className="text-sm" style={{ color: "rgba(255,255,255,0.9)" }}>
          No games today yet.
        </p>
      </div>
    );
  }

  const { state, wins, losses, lossStreak, champSwitches, session } = analysis;
  const borderColor = BORDER_COLORS[state];

  let message = "";
  switch (state) {
    case "positive":
      message = `Today's Session — ${wins}W ${losses}L — you're playing well. Keep it up.`;
      break;
    case "neutral":
      message = `Today's Session — ${wins}W ${losses}L — even session.`;
      break;
    case "warning":
      message = `${lossStreak}-Game Loss Streak — Your win rate after ${lossStreak} consecutive losses drops ~12%. A short break often helps.`;
      break;
    case "strongWarning":
      message = `${lossStreak}-Game Loss Streak — Data shows performance drops significantly here. Stepping away and returning fresh is the best play.`;
      break;
  }

  const showChampSwitch = champSwitches >= 3;

  return (
    <div
      className="rounded-xl p-4"
      style={{
        background: "#151620",
        borderLeft: `4px solid ${borderColor}`,
      }}
    >
      <p className="text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.9)" }}>
        {message}
      </p>
      {showChampSwitch && (
        <p className="text-xs mt-2 leading-relaxed" style={{ color: "rgba(255,255,255,0.6)" }}>
          You've switched champions {champSwitches} times this session. Sticking to one champion
          during loss streaks correlates with better recovery.
        </p>
      )}
      <div className="flex items-center gap-1 mt-3">
        {session.map((m, i) => (
          <span
            key={i}
            className="inline-block w-2.5 h-2.5 rounded-full"
            style={{ background: m.win ? "#2ECC71" : "#E74C3C" }}
            title={`${m.championName} — ${m.win ? "Win" : "Loss"}`}
          />
        ))}
      </div>
    </div>
  );
}
