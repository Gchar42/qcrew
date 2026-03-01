"use client";

import { useState } from "react";
import { SummonerHeader } from "./SummonerHeader";
import { MatchList } from "./MatchList";
import { MatchDetailSlideOver } from "./MatchDetailSlideOver";
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
  const participant = (m: MatchDto) =>
    m.info?.participants?.find((p) => p.puuid === account.puuid);

  const wins = matches.filter((m) => participant(m)?.win).length;
  const total = matches.length;
  const winRate = total ? Math.round((wins / total) * 100) : 0;

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
        />
      </section>

      {detailMatch && (
        <MatchDetailSlideOver
          match={detailMatch}
          puuid={account.puuid}
          onClose={() => setDetailMatch(null)}
        />
      )}
    </>
  );
}
