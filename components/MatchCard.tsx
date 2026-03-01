"use client";

import { useState } from "react";
import { ReactionBar } from "@/components/ReactionBar";
import { CommentThread } from "@/components/CommentThread";
import { MatchDetailPanel } from "@/components/MatchDetailPanel";
import type { Match } from "@/types/database";

interface MatchCardProps {
  match: Match;
  userReactions: string[];
  reactionCounts: Record<string, number>;
  comments: { id: string; body: string; created_at: string; author?: string | null }[];
}

export function MatchCard({
  match,
  userReactions,
  reactionCounts,
  comments,
}: MatchCardProps) {
  const [detailOpen, setDetailOpen] = useState(false);
  const kda = `${match.kills}/${match.deaths}/${match.assists}`;

  return (
    <>
      <article className="glass rounded-xl p-5 hover-lift">
        <div className="flex gap-4">
          <div
            className="w-14 h-14 rounded-xl bg-white/10 flex items-center justify-center text-2xl shrink-0"
            title="Champion placeholder"
          >
            🎮
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-medium text-white">
                {match.champion_placeholder}
              </span>
              <span className="text-xs px-2 py-0.5 rounded bg-white/10 text-zinc-400">
                {match.role}
              </span>
              {match.label && (
                <span className="text-xs px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300">
                  {match.label}
                </span>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-3 mt-2 text-sm">
              <span
                className="text-zinc-400 font-mono"
                title="Kills / Deaths / Assists"
              >
                KDA {kda}
              </span>
              <span
                className="text-zinc-500"
                title="Creep score per minute"
              >
                CS/min {match.cs_per_min}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2 mt-2">
              <span
                className="text-xs px-2 py-1 rounded bg-emerald-500/20 text-emerald-400"
                title="Carry Score"
              >
                Carry {match.carry_score}
              </span>
              <span
                className="text-xs px-2 py-1 rounded bg-amber-500/20 text-amber-400"
                title="Grief Index"
              >
                Grief {match.grief_index}
              </span>
            </div>
          </div>
        </div>
        <div className="mt-4 flex items-center justify-between flex-wrap gap-2">
          <ReactionBar
            matchId={match.id}
            userReactions={userReactions}
            counts={reactionCounts}
          />
          <button
            type="button"
            onClick={() => setDetailOpen(true)}
            className="text-sm text-indigo-400 hover:text-indigo-300"
          >
            Details
          </button>
        </div>
        <CommentThread matchId={match.id} comments={comments} />
      </article>
      <MatchDetailPanel
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        match={match}
      />
    </>
  );
}
