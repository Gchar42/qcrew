"use client";

import Link from "next/link";
import type { RecentlyPlayedWithEntry } from "@/lib/recentlyPlayedWith";
import { getProfileIconUrl } from "@/lib/riotAssets";

export default function RecentlyPlayedWithCard({
  recentlyPlayedWith,
  region,
}: {
  recentlyPlayedWith: RecentlyPlayedWithEntry[];
  region: string;
}) {
  const hasEntries = Array.isArray(recentlyPlayedWith) && recentlyPlayedWith.length > 0;

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
            const profileUrl = entry.riotId
              ? `/summoner?riotId=${encodeURIComponent(entry.riotId)}&region=${encodeURIComponent(region)}`
              : null;

            return (
              <li key={entry.puuid} className="recently-played-with-row">
                <div className="recently-played-with-icon-wrap">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={getProfileIconUrl(entry.profileIconId ?? 29)}
                    alt=""
                    className="recently-played-with-icon"
                    width={24}
                    height={24}
                  />
                </div>
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
              </li>
            );
          })}
        </ul>
        )}
      </div>
    </div>
  );
}
