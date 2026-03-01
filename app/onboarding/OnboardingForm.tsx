"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { setUsername } from "@/actions/onboarding";

export function OnboardingForm() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const form = e.currentTarget;
    const formData = new FormData(form);
    setLoading(true);
    try {
      const result = await setUsername(formData);
      if (result.error) {
        setError(result.error);
        return;
      }
      if (result.ok) {
        router.push("/dashboard");
        router.refresh();
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <label className="block">
        <span className="text-sm text-zinc-400">Username</span>
        <input
          name="username"
          type="text"
          autoComplete="username"
          required
          minLength={3}
          maxLength={20}
          pattern="[a-zA-Z0-9_]{3,20}"
          title="3–20 characters: letters, numbers, underscores only"
          className="mt-1 block w-full rounded-lg bg-white/5 border border-white/10 px-4 py-3 text-white placeholder-zinc-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          placeholder="cool_player"
          disabled={loading}
        />
      </label>
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
        {loading ? "Saving…" : "Continue"}
      </button>
    </form>
  );
}
