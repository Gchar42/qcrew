"use client";

import { useState, Suspense } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { toast } from "@/lib/toast";

function AuthForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const tab = searchParams.get("tab");
  const next = searchParams.get("next") ?? "/dashboard";
  const [mode, setMode] = useState<"signin" | "signup">(
    tab === "signup" ? "signup" : "signin"
  );
  const isSignUp = mode === "signup";

  const supabase = createClient();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      if (isSignUp) {
        const origin = typeof window !== "undefined" ? window.location.origin : "";
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: origin ? `${origin}/auth/callback` : undefined,
          },
        });
        if (error) throw error;
        toast("Check your email to confirm your account.", "success");
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        router.push(next);
        router.refresh();
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Something went wrong";
      toast(message, "error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-[var(--background)]">
      <div className="w-full max-w-md">
        <Link
          href="/"
          className="inline-block text-xl font-bold text-white mb-8 hover:text-indigo-400 transition-colors"
        >
          Statgap
        </Link>
        <div className="glass rounded-2xl p-8 hover-lift">
          <h1 className="text-2xl font-bold text-white mb-2">
            {isSignUp ? "Create account" : "Sign in"}
          </h1>
          <p className="text-zinc-400 text-sm mb-6">
            {isSignUp
              ? "We'll send you a confirmation link if needed."
              : "Use your email and password."}
          </p>
          <form onSubmit={handleSubmit} className="space-y-4">
            <label className="block">
              <span className="text-sm text-zinc-400">Email</span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="mt-1 block w-full rounded-lg bg-white/5 border border-white/10 px-4 py-3 text-white placeholder-zinc-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                placeholder="you@example.com"
              />
            </label>
            <label className="block">
              <span className="text-sm text-zinc-400">Password</span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="mt-1 block w-full rounded-lg bg-white/5 border border-white/10 px-4 py-3 text-white placeholder-zinc-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                placeholder="••••••••"
              />
            </label>
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-indigo-500 py-3 font-medium text-white hover:bg-indigo-600 disabled:opacity-50 transition-colors"
            >
              {loading ? "Please wait…" : isSignUp ? "Sign up" : "Sign in"}
            </button>
          </form>
          <button
            type="button"
            onClick={() => setMode((m) => (m === "signup" ? "signin" : "signup"))}
            className="mt-4 text-sm text-zinc-400 hover:text-white transition-colors"
          >
            {isSignUp ? "Already have an account? Sign in" : "No account? Sign up"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AuthPage() {
  return (
    <Suspense fallback={<AuthPageSkeleton />}>
      <AuthForm />
    </Suspense>
  );
}

function AuthPageSkeleton() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-[var(--background)]">
      <div className="w-full max-w-md">
        <div className="h-8 w-24 bg-white/10 rounded animate-pulse mb-8" />
        <div className="glass rounded-2xl p-8 space-y-4">
          <div className="h-8 w-48 bg-white/10 rounded animate-pulse" />
          <div className="h-4 w-64 bg-white/10 rounded animate-pulse" />
          <div className="h-12 bg-white/10 rounded animate-pulse" />
          <div className="h-12 bg-white/10 rounded animate-pulse" />
          <div className="h-12 bg-indigo-500/50 rounded animate-pulse" />
        </div>
      </div>
    </div>
  );
}
