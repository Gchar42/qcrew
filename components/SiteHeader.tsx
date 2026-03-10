"use client";

import Link from "next/link";

export default function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 flex items-center justify-between border-b border-white/10 bg-[#0E0F15]/95 px-6 py-4 backdrop-blur sm:px-12">
      <Link
        href="/"
        className="inline-flex items-center bg-transparent font-semibold text-[#E8E9F0] transition hover:opacity-90 focus:outline-none focus:ring-0"
      >
        <img
          src="/logos/statgap-logo-transparent.png"
          alt="StatGap"
          className="h-8 w-auto object-contain"
          width={120}
          height={32}
        />
      </Link>
      <nav className="flex items-center gap-7 text-sm text-white/55">
        <Link href="/search" className="transition hover:text-white">
          Search summoner
        </Link>
        <Link href="/favorites" className="transition hover:text-white">
          Favorites
        </Link>
        <Link href="/tierlist" className="transition hover:text-white">
          Tierlist
        </Link>
        <Link href="/leaderboard" className="transition hover:text-white">
          Leaderboard
        </Link>
        <Link href="/settings" className="transition hover:text-white">
          Settings
        </Link>
        <Link href="/settings" className="transition hover:text-white">
          Link Discord
        </Link>
      </nav>
    </header>
  );
}
