"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { getChampionSquareUrl } from "@/lib/riotAssets";

type RoleKey = "top" | "jungle" | "mid" | "adc" | "support";
type TierKey = "S" | "A" | "B" | "C" | "D" | "F";
type RankFilter = "all" | "iron-silver" | "gold-plat" | "emerald-diamond" | "master+";

type ChampStats = {
  championId: number;
  championName: string;
  games: number;
  wins: number;
  winRate: number;
  pickRate: number;
  banRate?: number;
  score: number;
};

type TierlistResponse = {
  updatedAt: string;
  matchCount: number;
  roles: Record<RoleKey, Record<TierKey, ChampStats[]>>;
};

const ROLE_TABS: Array<{ key: RoleKey; label: string }> = [
  { key: "top", label: "Top" },
  { key: "jungle", label: "Jungle" },
  { key: "mid", label: "Mid" },
  { key: "adc", label: "ADC" },
  { key: "support", label: "Support" },
];

const RANK_FILTERS: Array<{ key: RankFilter; label: string }> = [
  { key: "all", label: "All Ranks" },
  { key: "iron-silver", label: "Iron–Silver" },
  { key: "gold-plat", label: "Gold–Plat" },
  { key: "emerald-diamond", label: "Emerald–Diamond" },
  { key: "master+", label: "Master+" },
];

const TIERS: TierKey[] = ["S", "A", "B", "C", "D", "F"];

function formatTimeAgo(iso: string): string {
  if (!iso) return "—";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function emptyData(): TierlistResponse {
  const emptyRole = { S: [], A: [], B: [], C: [], D: [], F: [] } as Record<TierKey, ChampStats[]>;
  return {
    updatedAt: "",
    matchCount: 0,
    roles: {
      top: { ...emptyRole },
      jungle: { ...emptyRole },
      mid: { ...emptyRole },
      adc: { ...emptyRole },
      support: { ...emptyRole },
    },
  };
}

function ChampionIcon({
  champ,
  version,
  tier,
  index,
}: {
  champ: ChampStats;
  version: string | null;
  tier: TierKey;
  index: number;
}) {
  const [show, setShow] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: boolean; left: number }>({ top: true, left: 0 });

  const handleEnter = () => {
    if (ref.current) {
      const rect = ref.current.getBoundingClientRect();
      const above = rect.top > 160;
      const leftOffset = Math.min(0, window.innerWidth - rect.left - 220);
      setPos({ top: above, left: leftOffset });
    }
    setShow(true);
  };

  return (
    <div
      ref={ref}
      key={`${tier}-${champ.championName}-${index}`}
      className="group relative flex w-14 flex-col items-center"
      onMouseEnter={handleEnter}
      onMouseLeave={() => setShow(false)}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={getChampionSquareUrl(champ.championName, version)}
        alt={champ.championName}
        className="h-14 w-14 rounded-md border border-white/10"
      />
      {show && (
        <div
          className="absolute z-50 w-52 rounded-lg border border-white/20 bg-[#1a1b26] px-3 py-2.5 shadow-xl"
          style={{
            [pos.top ? "bottom" : "top"]: "calc(100% + 8px)",
            left: `calc(50% - 104px + ${pos.left}px)`,
          }}
        >
          <p className="mb-1 text-sm font-bold text-white">{champ.championName}</p>
          <div className="space-y-0.5 text-xs text-white/70">
            <p>
              Win Rate: <span className="text-white">{champ.winRate}%</span>
              {" · "}Pick Rate: <span className="text-white">{champ.pickRate}%</span>
            </p>
            <p>
              Ban Rate: <span className="text-white">{champ.banRate != null ? `${champ.banRate}%` : "—"}</span>
            </p>
            <p>
              Games analyzed:{" "}
              <span className="text-white">
                {champ.games.toLocaleString()}
                {champ.games < 500 && " ⚠"}
              </span>
            </p>
            <p>
              Patch trend: <span className="text-white">→ stable</span>
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export default function TierlistPage() {
  const [activeRole, setActiveRole] = useState<RoleKey>("top");
  const [activeRank, setActiveRank] = useState<RankFilter>("all");
  const [data, setData] = useState<TierlistResponse>(emptyData());
  const [loading, setLoading] = useState(true);
  const [version, setVersion] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/ddragon/version")
      .then((r) => (r.ok ? r.json() : Promise.resolve({ version: null })))
      .then((j) => setVersion((j?.version as string | null) ?? null))
      .catch(() => setVersion(null));

    fetch("/api/tierlist", { cache: "no-store" })
      .then((r) => r.json())
      .then((j) => setData(j as TierlistResponse))
      .catch(() => setData(emptyData()))
      .finally(() => setLoading(false));
  }, []);

  const roleRows = useMemo(() => data.roles?.[activeRole] ?? emptyData().roles.top, [data, activeRole]);

  return (
    <main className="min-h-screen bg-[#0E0F15] text-[#E8E9F0] px-4 py-6 sm:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-5 flex items-center justify-between">
          <h1 className="text-2xl font-bold tracking-tight">Tierlist</h1>
          <Link href="/" className="text-sm text-white/70 hover:text-white">Back to Home</Link>
        </div>

        {/* Role tabs */}
        <div className="mb-3 flex flex-wrap gap-2">
          {ROLE_TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveRole(tab.key)}
              className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
                activeRole === tab.key
                  ? "bg-[#5865F2] text-white"
                  : "bg-[#151620] text-white/70 hover:text-white border border-white/10"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Rank filter */}
        <div className="mb-3 flex flex-wrap gap-2">
          {RANK_FILTERS.map((rf) => (
            <button
              key={rf.key}
              type="button"
              onClick={() => setActiveRank(rf.key)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                activeRank === rf.key
                  ? "bg-[#5865F2] text-white"
                  : "bg-[#151620] text-white/50 hover:text-white/80 border border-white/10"
              }`}
            >
              {rf.label}
            </button>
          ))}
        </div>

        {/* Data freshness bar */}
        {!loading && data.updatedAt && (
          <p className="mb-4 text-center text-xs text-white/40">
            Based on{" "}
            <span className="text-white/60">{data.matchCount.toLocaleString()}</span> games
            {" · "}Patch 16.5
            {" · "}Updated {formatTimeAgo(data.updatedAt)}
          </p>
        )}

        <div className="space-y-3">
          {TIERS.map((tier) => (
            <section
              key={tier}
              className="grid grid-cols-[64px_1fr] items-stretch rounded-xl border border-white/10 bg-[#151620]"
            >
              <div className="flex items-center justify-center border-r border-white/10 text-xl font-extrabold">
                {tier}
              </div>
              <div className="flex flex-wrap gap-2 p-3 min-h-[72px]">
                {roleRows[tier]?.length ? (
                  roleRows[tier].map((c, i) => (
                    <ChampionIcon
                      key={`${tier}-${c.championName}-${i}`}
                      champ={c}
                      version={version}
                      tier={tier}
                      index={i}
                    />
                  ))
                ) : (
                  <span className="self-center text-sm text-white/40">
                    {loading ? "Loading..." : "No champions in this tier"}
                  </span>
                )}
              </div>
            </section>
          ))}
        </div>

      </div>
    </main>
  );
}

