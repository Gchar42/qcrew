"use client";

import { useEffect } from "react";

export function SignInRedirect({ code }: { code: string }) {
  useEffect(() => {
    const url = `/auth/callback?code=${encodeURIComponent(code)}`;
    window.location.href = url;
  }, [code]);

  return (
    <div className="min-h-screen bg-[var(--background)] flex items-center justify-center">
      <p className="text-zinc-400">Finishing sign in…</p>
    </div>
  );
}
