"use client";

import Image from "next/image";
import type { MatchDto } from "@/types/riot";
import { getChampionSquareUrl, isValidItemId, DEFAULT_DDRAGON_VERSION } from "@/lib/riotAssets";

type Participant = NonNullable<MatchDto["info"]>["participants"][number];

function formatDuration(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function queueLabel(queueId: number | undefined): string {
  if (queueId == null) return "Custom";
  const map: Record<number, string> = {
    420: "Ranked Solo",
    440: "Ranked Flex",
    400: "Draft Pick",
    430: "Blind Pick",
    450: "ARAM",
    1020: "One for All",
  };
  return map[queueId] ?? `Queue ${queueId}`;
}

function participantDisplayName(p: Participant): string {
  if (p.riotIdGameName && p.riotIdTagline) {
    return `${p.riotIdGameName}#${p.riotIdTagline}`;
  }
  return p.summonerName ?? "";
}

export function MatchDetails({
  match,
  puuidOfSearchedPlayer,
  queue,
  ddragonVersion,
}: {
  match: MatchDto;
  puuidOfSearchedPlayer: string;
  queue?: "solo" | "flex";
  ddragonVersion?: string | null;
}) {
  const parts = match.info?.participants ?? [];
  const team100 = parts.filter((p) => p.teamId === 100);
  const team200 = parts.filter((p) => p.teamId === 200);
  const team100Win = team100[0]?.win === true;
  const winningTeam = team100Win ? team100 : team200;
  const losingTeam = team100Win ? team200 : team100;

  const duration = match.info?.gameDuration ?? 0;
  const durationStr = formatDuration(duration);
  const queueName = queueLabel(match.info?.queueId);
  const version = ddragonVersion ?? DEFAULT_DDRAGON_VERSION;

  const renderTeam = (team: Participant[], label: string, isWinner: boolean) => (
    <div key={label} className="match-details-team">
      <div className="match-details-team-header team-header">
        {isWinner ? "Victory" : "Defeat"} ({label})
      </div>
      <div className="match-details-table">
        <div className="match-details-table-header player-row">
          <span className="match-details-col-champ" />
          <span className="match-details-col-name">Player</span>
          <span className="match-details-col-kda">KDA</span>
          <span className="match-details-col-damage">Damage</span>
          <span className="match-details-col-gold">Gold</span>
          <span className="match-details-col-cs">CS</span>
          <span className="match-details-col-wards">Wards</span>
          <span className="match-details-col-items">Items</span>
        </div>
        {team.map((p) => {
          const isMe = p.puuid === puuidOfSearchedPlayer;
          const kda = `${p.kills}/${p.deaths}/${p.assists}`;
          const damage = (p as Participant & { totalDamageDealtToChampions?: number }).totalDamageDealtToChampions ?? 0;
          const gold = (p as Participant & { goldEarned?: number }).goldEarned ?? 0;
          const cs = (p.totalMinionsKilled ?? 0) + (p.neutralMinionsKilled ?? 0);
          const wards = (p as Participant & { wardsPlaced?: number }).wardsPlaced ?? 0;
          const itemIds = [p.item0, p.item1, p.item2, p.item3, p.item4, p.item5, p.item6].filter(
            (id): id is number => id != null && id > 0
          );
          const champUrl = getChampionSquareUrl(p.championName, version);

          return (
            <div
              key={p.puuid}
              className={`match-details-player-row player-row${isMe ? " me-row" : ""}`}
            >
              <span className="match-details-col-champ">
                {champUrl ? (
                  <Image
                    src={champUrl}
                    alt=""
                    width={24}
                    height={24}
                    unoptimized
                    className="match-details-champ-icon"
                  />
                ) : (
                  <span className="match-details-champ-placeholder" />
                )}
              </span>
              <span className="match-details-col-name" title={participantDisplayName(p)}>
                {participantDisplayName(p)}
              </span>
              <span className="match-details-col-kda">{kda}</span>
              <span className="match-details-col-damage">{damage.toLocaleString()}</span>
              <span className="match-details-col-gold">{gold.toLocaleString()}</span>
              <span className="match-details-col-cs">{cs}</span>
              <span className="match-details-col-wards">{wards}</span>
              <span className="match-details-col-items">
                {itemIds.map((itemId, i) =>
                  isValidItemId(itemId) ? (
                    <img
                      key={`${p.puuid}-item-${i}`}
                      src={`https://ddragon.leagueoflegends.com/cdn/${version}/img/item/${itemId}.png`}
                      alt=""
                      width={22}
                      height={22}
                      className="match-details-item-icon"
                    />
                  ) : null
                )}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );

  return (
    <div className="match-details-panel">
      <div className="match-details-header-line">
        <span className="match-details-meta">
          {durationStr} · {queueName}
        </span>
      </div>
      {renderTeam(winningTeam, winningTeam === team100 ? "Blue Team" : "Red Team", true)}
      {renderTeam(losingTeam, losingTeam === team100 ? "Blue Team" : "Red Team", false)}
    </div>
  );
}
