"use client";

import { useState, useEffect, useCallback } from "react";
import { useFollowing } from "./useFollowing";
import AddFollowForm from "./AddFollowForm";
import FollowCard from "./FollowCard";

export default function FollowingFeed() {
  const { follows, addFollow, removeFollow } = useFollowing();
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const players = params.get("players");
    if (!players) return;
    for (const entry of players.split(",")) {
      const [region, ...rest] = entry.split(":");
      const riotId = decodeURIComponent(rest.join(":"));
      if (region && riotId) addFollow(riotId, region);
    }
  }, [addFollow]);

  const handleShare = useCallback(() => {
    if (follows.length === 0) return;
    const encoded = follows
      .map((f) => `${f.region}:${encodeURIComponent(f.riotId)}`)
      .join(",");
    const url = `${window.location.origin}/following?players=${encoded}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [follows]);

  return (
    <div className="ff-container">
      <div className="ff-header">
        <div className="ff-header-row">
          <div>
            <h1 className="ff-title">Following</h1>
            <p className="ff-subtitle">
              Track your favorite players and see their live stats.
            </p>
          </div>
          {follows.length > 0 && (
            <button className="ff-share-btn" onClick={handleShare}>
              {copied ? "Copied!" : "Share Feed"}
            </button>
          )}
        </div>
      </div>

      <AddFollowForm onAdd={addFollow} />

      {follows.length === 0 ? (
        <div className="ff-empty">
          <div className="ff-empty-icon">👥</div>
          <h2 className="ff-empty-title">No one followed yet</h2>
          <p className="ff-empty-text">
            Follow summoners to see their rank, win rate, and recent matches
            here. Click &quot;+ Follow a Summoner&quot; above to get started.
          </p>
        </div>
      ) : (
        <div className="ff-list">
          {follows.map((f) => (
            <FollowCard
              key={`${f.riotId}:${f.region}`}
              riotId={f.riotId}
              region={f.region}
              onRemove={() => removeFollow(f.riotId, f.region)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
