"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { updateRecentLP } from "@/lib/savedSummoners";

type FrequentTeammate = {
  partnerRiotId: string;
  partnerRegion: string;
  gamesTogether: number;
  sameTeamCount: number;
  tier: string | null;
  rank: string | null;
  leaguePoints: number | null;
};

function tierLabel(tier: string | null, rank: string | null) {
  if (!tier) return "";
  const t = tier.toUpperCase();
  if (t === "GRANDMASTER") return "GM";
  if (t === "CHALLENGER") return "C";
  if (t === "MASTER") return "M";
  return (t.charAt(0) + t.slice(1).toLowerCase() + " " + (rank ?? "")).trim();
}

export function ProfileSocialFeatures({
  riotId,
  region,
  tier,
  rank,
  leaguePoints,
  wins,
  losses,
  profileIconId,
  summonerLevel,
}: {
  riotId: string;
  region: string;
  tier?: string;
  rank?: string;
  leaguePoints?: number;
  wins?: number;
  losses?: number;
  profileIconId?: number;
  summonerLevel?: number;
}) {
  const [viewCount, setViewCount] = useState<number | null>(null);
  const [teammates, setTeammates] = useState<FrequentTeammate[]>([]);
  const [pushSupported, setPushSupported] = useState(false);
  const [pushSubscribed, setPushSubscribed] = useState(false);

  useEffect(() => {
    fetch("/api/social/profile-view", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        riotId,
        region,
        tier,
        rank,
        leaguePoints,
        wins,
        losses,
        profileIconId,
        summonerLevel,
      }),
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.viewCount != null) setViewCount(d.viewCount);
      })
      .catch(() => {});

    if (leaguePoints != null) {
      updateRecentLP(riotId, region, leaguePoints, tier, rank);
    }
  }, [riotId, region, tier, rank, leaguePoints, wins, losses, profileIconId, summonerLevel]);

  useEffect(() => {
    fetch(
      `/api/social/frequent-teammates?riotId=${encodeURIComponent(riotId)}&region=${region}`
    )
      .then((r) => (r.ok ? r.json() : { teammates: [] }))
      .then((d: { teammates: FrequentTeammate[] }) =>
        setTeammates(d.teammates?.slice(0, 5) ?? [])
      )
      .catch(() => {});
  }, [riotId, region]);

  useEffect(() => {
    setPushSupported("serviceWorker" in navigator && "PushManager" in window);
  }, []);

  const handlePushSubscribe = useCallback(async () => {
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
      });
      await fetch("/api/social/push-subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subscription: sub.toJSON(),
          riotId,
          region,
        }),
      });
      setPushSubscribed(true);
    } catch {
      /* user denied or error */
    }
  }, [riotId, region]);

  return (
    <div className="space-y-4">
      {/* View count */}
      {viewCount !== null && viewCount > 0 && (
        <div className="text-xs text-white/30">
          Viewed {viewCount} time{viewCount !== 1 ? "s" : ""} this week
        </div>
      )}

      {/* Push notification bell */}
      {pushSupported && !pushSubscribed && (
        <button
          type="button"
          onClick={handlePushSubscribe}
          className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-[#151620] px-3 py-1.5 text-xs text-white/50 hover:text-white transition"
          title={`Notify me when ${riotId} ranks up`}
        >
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
          Notify on rank up
        </button>
      )}
      {pushSubscribed && (
        <div className="flex items-center gap-1.5 text-xs text-emerald-400">
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
          Notifications enabled
        </div>
      )}

      {/* Frequent Teammates */}
      {teammates.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-2">
            Frequent Teammates
          </h3>
          <div className="space-y-1">
            {teammates.map((t) => (
              <Link
                key={t.partnerRiotId}
                href={`/summoner?riotId=${encodeURIComponent(t.partnerRiotId)}&region=${t.partnerRegion}`}
                className="flex items-center justify-between rounded-lg px-3 py-2 hover:bg-white/5 transition"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-sm text-white/80 truncate">
                    {t.partnerRiotId}
                  </span>
                  {t.tier && (
                    <span className="text-[11px] text-indigo-400 shrink-0">
                      {tierLabel(t.tier, t.rank)}
                    </span>
                  )}
                </div>
                <span className="text-xs text-white/30 shrink-0">
                  {t.gamesTogether} game{t.gamesTogether !== 1 ? "s" : ""}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
