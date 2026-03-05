"use client";

import { useState, useEffect } from "react";
import { SummonerHeader } from "./SummonerHeader";
import { MatchList } from "./MatchList";
import { MatchDetailSlideOver } from "./MatchDetailSlideOver";
import { DEFAULT_DDRAGON_VERSION } from "@/lib/riotAssets";
import type { AccountDto, SummonerDto, MatchDto } from "@/types/riot";

export function SummonerProfile({
  region,
  account,
  summoner,
  matches,
}: {
  region: string;
  account: AccountDto;
  summoner?: SummonerDto | null;
  matches: MatchDto[];
}) {
  const [detailMatch, setDetailMatch] = useState<MatchDto | null>(null);
  const [ddragonVersion, setDdragonVersion] = useState<string | null>(null);
  const [itemDataById, setItemDataById] = useState<Record<number, { name: string; plaintext?: string }>>({});

  const participant = (m: MatchDto) =>
    m.info?.participants?.find((p) => p.puuid === account.puuid);

  const wins = matches.filter((m) => participant(m)?.win).length;
  const total = matches.length;
  const winRate = total ? Math.round((wins / total) * 100) : 0;

  useEffect(() => {
    fetch("/api/ddragon/version")
      .then((r) => r.json())
      .then((data: { version?: string }) => setDdragonVersion(data.version ?? null))
      .catch(() => setDdragonVersion(null));
  }, []);

  useEffect(() => {
    const version = ddragonVersion ?? DEFAULT_DDRAGON_VERSION;
    fetch(`/api/ddragon/items?version=${encodeURIComponent(version)}`)
      .then((r) => r.json())
      .then((data: { items?: Record<string, { name?: string; plaintext?: string }> }) => {
        const items = data.items ?? {};
        const byId: Record<number, { name: string; plaintext?: string }> = {};
        Object.entries(items).forEach(([id, entry]) => {
          const num = Number(id);
          if (Number.isFinite(num) && entry?.name) byId[num] = { name: entry.name, plaintext: entry.plaintext };
        });
        setItemDataById(byId);
      })
      .catch(() => {});
  }, [ddragonVersion]);

  return (
    <>
      <SummonerHeader
        account={account}
        summoner={summoner ?? undefined}
        wins={wins}
        total={total}
        winRate={winRate}
      />

      <section className="mt-8">
        <h2 className="text-lg font-semibold text-white mb-4">
          Recent matches {total > 0 && `· ${winRate}% win rate`}
        </h2>
        <MatchList
          matches={matches}
          puuid={account.puuid}
          onMatchClick={setDetailMatch}
          itemDataById={itemDataById}
        />
      </section>

      {detailMatch && (
        <MatchDetailSlideOver
          match={detailMatch}
          puuid={account.puuid}
          onClose={() => setDetailMatch(null)}
          itemDataById={itemDataById}
          ddragonVersion={ddragonVersion}
        />
      )}
    </>
  );
}
