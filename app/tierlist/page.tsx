"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { getChampionSquareUrl } from "@/lib/riotAssets";

type RoleKey = "top" | "jungle" | "mid" | "adc" | "support";
type TierKey = "S" | "A" | "B" | "C" | "D" | "F";

type ChampStats = {
  championId: number;
  championName: string;
  games: number;
  wins: number;
  winRate: number;
  pickRate: number;
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

const TIERS: TierKey[] = ["S", "A", "B", "C", "D", "F"];

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

export default function TierlistPage() {
  const [activeRole, setActiveRole] = useState<RoleKey>("top");
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

        <div className="mb-4 flex flex-wrap gap-2">
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
                    <div
                      key={`${tier}-${c.championName}-${i}`}
                      className="group relative flex w-14 flex-col items-center"
                      title={`${c.championName} · WR ${c.winRate}% · PR ${c.pickRate}%${c.games ? ` · ${c.games} games` : ""}`}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={getChampionSquareUrl(c.championName, version)}
                        alt={c.championName}
                        className="h-14 w-14 rounded-md border border-white/10"
                      />
                    </div>
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

