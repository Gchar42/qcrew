"use client";

import { useEffect } from "react";
import Link from "next/link";
import { toast } from "@/lib/toast";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    const msg = error.message || "Something went wrong";
    if (msg.includes("429") || msg.toLowerCase().includes("rate limit")) {
      toast("Rate limit exceeded. Try again in a minute.", "error");
    }
  }, [error.message]);

  return (
    <div className="min-h-screen bg-[var(--background)] flex items-center justify-center px-4">
      <div className="glass rounded-2xl p-8 max-w-md text-center">
        <h2 className="text-xl font-semibold text-white mb-2">Couldn’t load summoner</h2>
        <p className="text-zinc-400 text-sm mb-6">
          {error.message?.includes("429") || error.message?.toLowerCase().includes("rate limit")
            ? "Riot API rate limit hit. Please try again shortly."
            : "Check the Riot ID and region, then try again."}
        </p>
        <div className="flex gap-3 justify-center">
          <button
            type="button"
            onClick={reset}
            className="rounded-lg bg-indigo-500 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-600"
          >
            Try again
          </button>
          <Link
            href="/"
            className="rounded-lg glass px-4 py-2 text-sm font-medium text-white border border-white/10"
          >
            New search
          </Link>
        </div>
      </div>
    </div>
  );
}
