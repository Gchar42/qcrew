"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import TwitchWidget, { type WidgetData } from "@/components/widget/TwitchWidget";
import "./widget.css";

const REFRESH_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

type ProfileBundle = {
  profile: {
    account: { gameName: string; tagLine: string };
  };
  ranked: {
    solo: {
      tier: string;
      rank: string;
      leaguePoints: number;
      wins: number;
      losses: number;
    } | null;
  };
  matches: Array<{
    info: {
      queueId?: number;
      gameEndTimestamp?: number;
      gameDuration: number;
      participants: Array<{
        puuid: string;
        championName: string;
        win: boolean;
        teamPosition?: string;
      }>;
    };
    metadata: { participants?: string[] };
  }>;
  championStats: {
    solo: {
      champions: Array<{
        championName: string;
        games: number;
        winRate: number;
      }>;
    };
  };
};

function extractWidgetData(
  bundle: ProfileBundle,
  region: string,
): WidgetData {
  const name = `${bundle.profile.account.gameName}#${bundle.profile.account.tagLine}`;
  const solo = bundle.ranked.solo;

  const champList = bundle.championStats?.solo?.champions ?? [];
  const topChamp = champList[0] ?? null;
  const topChampions = champList.slice(0, 3).map((c) => ({
    name: c.championName,
    games: c.games,
    winRate: Math.round(c.winRate),
  }));

  const now = Date.now();
  const oneWeekAgo = now - 7 * 24 * 60 * 60 * 1000;

  let playerPuuid = "";
  for (const m of bundle.matches ?? []) {
    const pList = m.metadata?.participants ?? [];
    const participants = m.info?.participants ?? [];
    if (pList.length > 0 && participants.length > 0) {
      for (const p of participants) {
        if (pList.includes(p.puuid)) {
          playerPuuid = p.puuid;
          break;
        }
      }
      if (playerPuuid) break;
    }
  }

  let weekWins = 0;
  let weekLosses = 0;
  let sessionWins = 0;
  let sessionLosses = 0;
  let weekDurationSec = 0;
  const roleCounts: Record<string, number> = {};

  const SESSION_GAP_MS = 4 * 60 * 60 * 1000;
  let lastGameTime = 0;

  for (const m of bundle.matches ?? []) {
    const gameEnd = m.info?.gameEndTimestamp ?? 0;
    const isRanked = m.info?.queueId === 420;
    if (!isRanked) continue;

    const me = m.info.participants?.find((p) => p.puuid === playerPuuid);
    if (!me) continue;

    if (gameEnd > oneWeekAgo) {
      if (me.win) weekWins++;
      else weekLosses++;
      weekDurationSec += m.info.gameDuration;
    }

    if (me.teamPosition) {
      roleCounts[me.teamPosition] = (roleCounts[me.teamPosition] ?? 0) + 1;
    }

    if (lastGameTime === 0 || lastGameTime - gameEnd < SESSION_GAP_MS) {
      if (me.win) sessionWins++;
      else sessionLosses++;
      lastGameTime = gameEnd;
    }
  }

  let favoriteRole: string | null = null;
  let maxRoleCount = 0;
  for (const [role, count] of Object.entries(roleCounts)) {
    if (count > maxRoleCount) {
      maxRoleCount = count;
      favoriteRole = role;
    }
  }

  const hoursPlayed = Math.round(weekDurationSec / 3600);

  return {
    name,
    region,
    tier: solo?.tier ?? null,
    rank: solo?.rank ?? null,
    lp: solo?.leaguePoints ?? null,
    wins: weekWins || (solo?.wins ?? 0),
    losses: weekLosses || (solo?.losses ?? 0),
    topChampion: topChamp
      ? {
          name: topChamp.championName,
          games: topChamp.games,
          winRate: Math.round(topChamp.winRate),
        }
      : null,
    topChampions,
    splashChampion: topChamp?.championName ?? null,
    sessionWins,
    sessionLosses,
    ladderRank: null,
    lpGainToday: null,
    favoriteRole,
    peakTier: null,
    peakRank: null,
    hoursPlayedThisWeek: hoursPlayed > 0 ? hoursPlayed : null,
  };
}

const DEMO_DATA: WidgetData = {
  name: "Faker#KR1",
  region: "kr",
  tier: "CHALLENGER",
  rank: "I",
  lp: 1247,
  wins: 58,
  losses: 24,
  topChampion: { name: "Syndra", games: 34, winRate: 74 },
  topChampions: [
    { name: "Syndra", games: 34, winRate: 74 },
    { name: "Azir", games: 22, winRate: 68 },
    { name: "Orianna", games: 15, winRate: 67 },
  ],
  splashChampion: "Syndra",
  sessionWins: 5,
  sessionLosses: 1,
  ladderRank: 1,
  lpGainToday: 47,
  favoriteRole: "MIDDLE",
  peakTier: "CHALLENGER",
  peakRank: "I",
  hoursPlayedThisWeek: 23,
};

export default function WidgetPage({
  params,
}: {
  params: { region: string; riotId: string };
}) {
  const { region, riotId: riotIdEncoded } = params;
  const riotId = decodeURIComponent(riotIdEncoded);

  const [data, setData] = useState<WidgetData | null>(null);
  const [isDemo, setIsDemo] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const url = `/api/riot/profileBundle?riotId=${encodeURIComponent(riotId)}&region=${encodeURIComponent(region)}&queue=solo`;
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) throw new Error("fetch failed");
      const bundle = (await res.json()) as ProfileBundle;
      setData(extractWidgetData(bundle, region));
      setIsDemo(false);
    } catch {
      setData((prev) => prev ?? DEMO_DATA);
      setIsDemo((prev) => prev || !data);
    }
  }, [riotId, region, data]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setData((prev) => {
        if (prev) return prev;
        setIsDemo(true);
        return DEMO_DATA;
      });
    }, 2000);

    fetchData();
    intervalRef.current = setInterval(fetchData, REFRESH_INTERVAL_MS);
    return () => {
      clearTimeout(timer);
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchData]);

  return <TwitchWidget data={data} isDemo={isDemo} />;
}
