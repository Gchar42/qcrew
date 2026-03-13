"use client";

import { useState } from "react";
import Link from "next/link";

const NAV_LINKS = [
  { href: "/search", label: "Search summoner" },
  { href: "/favorites", label: "Favorites" },
  { href: "/following", label: "Following" },
  { href: "/tierlist", label: "Tierlist" },
  { href: "/leaderboard", label: "Leaderboard" },
  { href: "/champions", label: "Champions" },
  { href: "/jungle-stats", label: "Jungle Stats" },
  { href: "/guides", label: "Guides" },
];

export default function SiteHeader() {
  const [menuOpen, setMenuOpen] = useState(false);
  return (
    <header className="sticky top-0 z-50 flex flex-col border-b border-white/10 bg-[#0E0F15]/95 backdrop-blur">
      <div className="flex items-center justify-between px-4 py-3 sm:px-6 sm:py-4 md:px-12">
        <Link
          href="/"
          className="inline-flex items-center bg-transparent font-semibold text-[#E8E9F0] transition hover:opacity-90 focus:outline-none focus:ring-0"
        >
          <img
            src="/logos/statgap-logo-transparent.png"
            alt="StatGap"
            className="h-7 w-auto object-contain sm:h-8"
            width={120}
            height={32}
          />
        </Link>
        <nav className="hidden md:flex items-center gap-6 lg:gap-7 text-sm text-white/55">
          {NAV_LINKS.map(({ href, label }) => (
            <Link key={href} href={href} className="transition hover:text-white whitespace-nowrap">
              {label}
            </Link>
          ))}
          <Link
            href="/dashboard"
            className="flex items-center justify-center text-white/55 transition hover:text-white"
            aria-label="Discord"
          >
            <svg className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
              <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
            </svg>
          </Link>
        </nav>
        <button
          type="button"
          onClick={() => setMenuOpen((o) => !o)}
          className="md:hidden p-2 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition"
          aria-label="Toggle menu"
        >
          {menuOpen ? (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          ) : (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
          )}
        </button>
      </div>
      {menuOpen && (
        <div className="md:hidden border-t border-white/10 bg-[#0E0F15] px-4 py-3 flex flex-col gap-1">
          {NAV_LINKS.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              onClick={() => setMenuOpen(false)}
              className="py-2.5 px-2 text-sm text-white/70 hover:text-white transition rounded-lg hover:bg-white/5"
            >
              {label}
            </Link>
          ))}
          <Link
            href="/dashboard"
            onClick={() => setMenuOpen(false)}
            className="py-2.5 px-2 text-sm text-white/70 hover:text-white transition rounded-lg hover:bg-white/5 flex items-center gap-2"
          >
            Discord
          </Link>
        </div>
      )}
    </header>
  );
}
