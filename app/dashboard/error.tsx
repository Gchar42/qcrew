"use client";

import Link from "next/link";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-screen bg-[var(--background)] flex items-center justify-center px-4">
      <div className="glass rounded-2xl p-8 max-w-md text-center">
        <h2 className="text-xl font-semibold text-white mb-2">Error</h2>
        <p className="text-red-300/90 text-sm break-all mb-6">
          {error.message ?? "Something went wrong"}
        </p>
        <div className="flex gap-3 justify-center">
          <button
            type="button"
            onClick={reset}
            className="rounded-lg bg-indigo-500 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-600"
          >
            Reset
          </button>
          <Link
            href="/dashboard"
            className="rounded-lg glass px-4 py-2 text-sm font-medium text-white border border-white/10"
          >
            Back to dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
