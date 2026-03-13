"use client";

import { useFollowing } from "./useFollowing";
import AddFollowForm from "./AddFollowForm";
import FollowCard from "./FollowCard";

export default function FollowingFeed() {
  const { follows, addFollow, removeFollow } = useFollowing();

  return (
    <div className="ff-container">
      <div className="ff-header">
        <h1 className="ff-title">Following</h1>
        <p className="ff-subtitle">
          Track your favorite players and see their live stats.
        </p>
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
