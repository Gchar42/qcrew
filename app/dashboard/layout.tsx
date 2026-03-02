import Link from "next/link";
import { Suspense } from "react";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[var(--background)]">
      <header className="border-b border-white/10 px-4 sm:px-6 py-3">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Link
            href="/"
            className="text-lg font-bold text-white hover:text-indigo-400 transition-colors"
          >
            Qcrew
          </Link>
          <Link
            href="/"
            className="text-sm text-zinc-400 hover:text-white transition-colors"
          >
            ← Home
          </Link>
        </div>
      </header>
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-6">
        <Suspense fallback={<div className="text-zinc-400 py-8">Loading...</div>}>
          {children}
        </Suspense>
      </main>
    </div>
  );
}
