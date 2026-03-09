"use client";

import Link from "next/link";
import type { RecentlyPlayedWithEntry } from "@/lib/recentlyPlayedWith";
import { addTrackedFriend, isTrackedFriend } from "@/lib/trackedFriends";

export default function RecentlyPlayedWithCard({
  recentlyPlayedWith,
  region,
  onTrackChange,
}: {
  recentlyPlayedWith: RecentlyPlayedWithEntry[];
  region: string;
  onTrackChange?: () => void;
}) {
  const hasEntries = Array.isArray(recentlyPlayedWith) && recentlyPlayedWith.length > 0;

  const handleTrack = (entry: RecentlyPlayedWithEntry) => {
    if (!entry.riotId) return;
    const [gameName, tagLine] = entry.riotId.split("#").map((s) => s.trim());
    if (!gameName || !tagLine) return;
    addTrackedFriend({
      riotId: entry.riotId,
      region,
      label: entry.displayName,
    });
    onTrackChange?.();
  };

  return (
    <div className="profile-rank-card recently-played-with-card">
      <div className="profile-rank-card-title">
        Recently played with
        <Link href="/friends" className="recently-played-with-view-all">
          View tracked
        </Link>
      </div>
      <div className="profile-rank-card-content">
        {!hasEntries ? (
          <p className="recently-played-with-empty">
            Teammates from your recent games will appear here.
          </p>
        ) : (
        <ul className="recently-played-with-list">
          {recentlyPlayedWith.slice(0, 10).map((entry) => {
            const winRate = entry.games > 0 ? Math.round((entry.wins / entry.games) * 100) : 0;
            const tracked = entry.riotId ? isTrackedFriend(entry.riotId, region) : false;
            const profileUrl = entry.riotId
              ? `/summoner?riotId=${encodeURIComponent(entry.riotId)}&region=${encodeURIComponent(region)}`
              : null;

            return (
              <li key={entry.puuid} className="recently-played-with-row">
                <div className="recently-played-with-name-wrap">
                  {profileUrl ? (
                    <Link href={profileUrl} className="recently-played-with-name">
                      {entry.displayName}
                    </Link>
                  ) : (
                    <span className="recently-played-with-name">{entry.displayName}</span>
                  )}
                </div>
                <span className="recently-played-with-wr">{winRate}%</span>
                <span className="recently-played-with-role">{entry.primaryRole}</span>
                <span className="recently-played-with-games">{entry.games} games</span>
                {entry.riotId && (
                  <button
                    type="button"
                    className={`recently-played-with-track${tracked ? " recently-played-with-tracked" : ""}`}
                    onClick={() => handleTrack(entry)}
                    title={tracked ? "Already tracking" : "Add to tracked friends"}
                  >
                    {tracked ? "Tracked" : "Track"}
                  </button>
                )}
              </li>
            );
          })}
        </ul>
        )}
      </div>
    </div>
  );
}
