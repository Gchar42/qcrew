"use client";

import { useCallback, useEffect, useState } from "react";

type PatchChange = {
  patchVersion: string;
  patchDate: string | null;
  changeType: string | null;
  changes: string;
};

const TYPE_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  buff: { bg: "bg-emerald-500/10", text: "text-emerald-400", label: "Buff" },
  nerf: { bg: "bg-red-500/10", text: "text-red-400", label: "Nerf" },
  adjust: { bg: "bg-amber-500/10", text: "text-amber-400", label: "Adjust" },
  change: { bg: "bg-blue-500/10", text: "text-blue-400", label: "Change" },
};

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "";
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  } catch {
    return dateStr;
  }
}

export default function ChampionChangelog({ championName }: { championName: string }) {
  const [changes, setChanges] = useState<PatchChange[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);

  const fetchChanges = useCallback(async () => {
    if (changes.length > 0) {
      setExpanded((v) => !v);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/champion-changelog?champion=${encodeURIComponent(championName)}&limit=30`
      );
      if (!res.ok) throw new Error("Failed to load");
      const json = await res.json();
      setChanges(json.changes ?? []);
      setExpanded(true);
    } catch {
      setError("Could not load patch history");
    } finally {
      setLoading(false);
    }
  }, [championName, changes.length]);

  useEffect(() => {
    setChanges([]);
    setExpanded(false);
    setError(null);
  }, [championName]);

  return (
    <div className="mt-4">
      <button
        type="button"
        onClick={fetchChanges}
        disabled={loading}
        className="flex items-center gap-2 text-xs font-semibold text-indigo-400 hover:text-indigo-300 transition disabled:opacity-50"
      >
        {loading ? (
          <>
            <Spinner /> Loading patch history...
          </>
        ) : expanded ? (
          <>
            <ChevronUp /> Hide Patch History
          </>
        ) : (
          <>
            <ChevronDown /> Patch History
          </>
        )}
      </button>

      {error && <p className="mt-2 text-xs text-red-400">{error}</p>}

      {expanded && changes.length > 0 && (
        <div className="mt-3 max-h-[400px] overflow-y-auto rounded-lg border border-white/10 bg-black/20">
          {changes.map((c) => {
            const typeInfo = TYPE_COLORS[c.changeType ?? "change"] ?? TYPE_COLORS.change;
            return (
              <div
                key={c.patchVersion}
                className="border-b border-white/5 last:border-0 px-4 py-3"
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-sm font-bold text-white/80">
                    Patch {c.patchVersion}
                  </span>
                  <span
                    className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${typeInfo.bg} ${typeInfo.text}`}
                  >
                    {typeInfo.label}
                  </span>
                  {c.patchDate && (
                    <span className="text-[11px] text-white/30">
                      {formatDate(c.patchDate)}
                    </span>
                  )}
                </div>
                <div className="text-xs text-white/50 whitespace-pre-wrap leading-relaxed">
                  {c.changes}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {expanded && changes.length === 0 && !loading && !error && (
        <p className="mt-2 text-xs text-white/30">
          No recent patch changes found for {championName}.
        </p>
      )}
    </div>
  );
}

function Spinner() {
  return (
    <svg className="h-3 w-3 animate-spin" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.25" />
      <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

function ChevronDown() {
  return (
    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
    </svg>
  );
}

function ChevronUp() {
  return (
    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
    </svg>
  );
}
