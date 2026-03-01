"use client";

import { useTransition } from "react";
import { addReaction, removeReaction } from "@/actions/match";
import { toast } from "@/lib/toast";

const REACTIONS = [
  { type: "like", label: "Like", emoji: "👍" },
  { type: "fire", label: "Fire", emoji: "🔥" },
  { type: "sad", label: "Sad", emoji: "😢" },
];

interface ReactionBarProps {
  matchId: string;
  userReactions: string[];
  counts: Record<string, number>;
}

export function ReactionBar({
  matchId,
  userReactions,
  counts,
}: ReactionBarProps) {
  const [pending, startTransition] = useTransition();

  function handleReaction(type: string) {
    startTransition(async () => {
      const isActive = userReactions.includes(type);
      const result = isActive
        ? await removeReaction(matchId, type)
        : await addReaction(matchId, type);
      if (result?.error) toast(result.error, "error");
    });
  }

  return (
    <div className="flex items-center gap-1 flex-wrap">
      {REACTIONS.map(({ type, label, emoji }) => {
        const active = userReactions.includes(type);
        const count = counts[type] ?? 0;
        return (
          <button
            key={type}
            type="button"
            onClick={() => handleReaction(type)}
            disabled={pending}
            title={label}
            className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm transition-colors ${
              active
                ? "bg-indigo-500/30 text-indigo-300 border border-indigo-500/50"
                : "bg-white/5 text-zinc-400 hover:bg-white/10 hover:text-white border border-transparent"
            }`}
          >
            <span>{emoji}</span>
            {count > 0 && <span>{count}</span>}
          </button>
        );
      })}
    </div>
  );
}
