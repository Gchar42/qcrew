"use client";

import { useEffect, useMemo } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { toast } from "@/lib/toast";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string; status?: number };
  reset: () => void;
}) {
  const pathname = usePathname();
  const router = useRouter();

  const lastSearchInput = useMemo(() => {
    const segments = pathname?.split("/").filter(Boolean) ?? [];
    const nameEnc = segments[2];
    const tagEnc = segments[3];
    return nameEnc && tagEnc
      ? `${decodeURIComponent(nameEnc)}#${decodeURIComponent(tagEnc)}`
      : "";
  }, [pathname]);

  useEffect(() => {
    const msg = error.message || "Something went wrong";
    if (msg.includes("429") || msg.toLowerCase().includes("rate limit")) {
      toast("Rate limit exceeded. Try again in a minute.", "error");
    }
  }, [error.message]);

  function handleTryAgain() {
    if (!pathname || !lastSearchInput) return;
    router.push(pathname);
  }

  const displayMessage = error.message || "Something went wrong";

  return (
    <div className="min-h-screen bg-[var(--background)] flex items-center justify-center px-4">
      <div className="glass rounded-2xl p-8 max-w-md text-center">
        <h2 className="text-xl font-semibold text-white mb-2">Couldn’t load summoner</h2>
        <p className="text-zinc-400 text-sm">
          {displayMessage.includes("429") || displayMessage.toLowerCase().includes("rate limit")
            ? "Riot API rate limit hit. Please try again shortly."
            : "Check the Riot ID and region, then try again."}
        </p>
        <p className="text-red-300/90 text-xs mt-1 break-all">{displayMessage}</p>
        <div className="flex gap-3 justify-center mt-6">
          <button
            type="button"
            onClick={handleTryAgain}
            disabled={!lastSearchInput}
            className="rounded-lg bg-indigo-500 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed"
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
