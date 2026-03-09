"use client";

import Link from "next/link";

export default function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 flex items-center justify-between border-b border-white/10 bg-[#0E0F15]/95 px-6 py-4 backdrop-blur sm:px-12">
      <Link
        href="/"
        className="flex items-center gap-2 font-semibold text-[#E8E9F0] transition hover:opacity-90"
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-md bg-gradient-to-br from-[#5865F2] to-[#7289DA] text-sm">
          📈
        </span>
        <span>
          Stat<span className="text-[#7289DA]">Gap</span>
        </span>
      </Link>
      <nav className="flex items-center gap-7 text-sm text-white/55">
        <Link href="/tierlist" className="transition hover:text-white">
          Tierlist
        </Link>
        <Link href="/leaderboard" className="transition hover:text-white">
          Leaderboard
        </Link>
      </nav>
    </header>
  );
}
