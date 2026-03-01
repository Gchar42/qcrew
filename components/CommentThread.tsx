"use client";

import { useState, useTransition } from "react";
import { addComment } from "@/actions/match";
import { toast } from "@/lib/toast";

interface CommentWithAuthor {
  id: string;
  body: string;
  created_at: string;
  author?: string | null;
}

interface CommentThreadProps {
  matchId: string;
  comments: CommentWithAuthor[];
}

export function CommentThread({ matchId, comments: initialComments }: CommentThreadProps) {
  const [expanded, setExpanded] = useState(false);
  const [body, setBody] = useState("");
  const [pending, startTransition] = useTransition();
  const [comments, setComments] = useState(initialComments);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim()) return;
    startTransition(async () => {
      const result = await addComment(matchId, body.trim());
      if (result?.error) {
        toast(result.error, "error");
        return;
      }
      setComments((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          body: body.trim(),
          created_at: new Date().toISOString(),
          author: null,
        },
      ]);
      setBody("");
    });
  }

  return (
    <div className="mt-3 border-t border-white/10 pt-3">
      <button
        type="button"
        onClick={() => setExpanded((e) => !e)}
        className="text-sm text-zinc-400 hover:text-white"
      >
        {comments.length} comment{comments.length !== 1 ? "s" : ""}
      </button>
      {expanded && (
        <div className="mt-2 space-y-2">
          <ul className="space-y-2 max-h-40 overflow-y-auto">
            {comments.map((c) => (
              <li key={c.id} className="text-sm text-zinc-300">
                <span className="text-zinc-500">
                  {c.author ? `${c.author}: ` : ""}
                </span>
                {c.body}
              </li>
            ))}
          </ul>
          <form onSubmit={handleSubmit} className="flex gap-2">
            <input
              type="text"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Add a comment…"
              className="flex-1 rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm text-white placeholder-zinc-500 focus:border-indigo-500 focus:outline-none"
              disabled={pending}
            />
            <button
              type="submit"
              disabled={pending || !body.trim()}
              className="rounded-lg bg-indigo-500 px-3 py-2 text-sm text-white hover:bg-indigo-600 disabled:opacity-50"
            >
              Post
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
