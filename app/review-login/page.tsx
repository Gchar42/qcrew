"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";

function ReviewLoginForm() {
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/";
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/review-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Invalid password");
        setLoading(false);
        return;
      }
      window.location.href = next.startsWith("/") ? next : "/";
    } catch {
      setError("Something went wrong");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--background)] px-4">
      <div className="w-full max-w-sm rounded-xl border border-white/10 bg-black/30 p-6">
        <h1 className="text-xl font-bold text-white mb-1">Review access</h1>
        <p className="text-sm text-zinc-400 mb-4">
          This site is gated for verification. Enter the password to continue.
        </p>
        <form onSubmit={onSubmit} className="space-y-4">
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            className="w-full rounded-lg bg-white/5 border border-white/10 px-4 py-3 text-white placeholder-zinc-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            autoFocus
            autoComplete="current-password"
          />
          {error && (
            <p className="text-sm text-amber-400" role="alert">
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-indigo-500 py-3 font-medium text-white hover:bg-indigo-600 disabled:opacity-50 transition-colors"
          >
            {loading ? "Checking…" : "Continue"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function ReviewLoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-[var(--background)]"><p className="text-zinc-400">Loading…</p></div>}>
      <ReviewLoginForm />
    </Suspense>
  );
}
