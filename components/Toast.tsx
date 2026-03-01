"use client";

import { useEffect, useState } from "react";
import { getToasts, subscribe, dismiss } from "@/lib/toast";

export function Toaster() {
  const [toasts, setToasts] = useState(getToasts());

  useEffect(() => {
    return subscribe(setToasts);
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div
      className="fixed bottom-4 right-4 z-50 flex flex-col gap-2"
      aria-live="polite"
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          className="glass rounded-lg px-4 py-3 flex items-center justify-between gap-4 min-w-[280px] max-w-md shadow-lg border border-white/10"
          role="alert"
        >
          <span
            className={
              t.type === "error"
                ? "text-red-400"
                : t.type === "success"
                  ? "text-emerald-400"
                  : "text-white"
            }
          >
            {t.message}
          </span>
          <button
            type="button"
            onClick={() => dismiss(t.id)}
            className="text-zinc-400 hover:text-white shrink-0"
            aria-label="Dismiss"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}
