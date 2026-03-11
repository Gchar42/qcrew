/**
 * Matches table: one row per (match_id, puuid). Used for match history and season champion stats.
 */
import type { MatchDto } from "@/types/riot";

export type MatchRow = {
  match_id: string;
  puuid: string;
  queue_id: number;
  champion_id: number;
  kills: number;
  deaths: number;
  assists: number;
  win: boolean;
  cs: number;
  damage: number;
  game_duration: number;
  game_creation: number;
  champion_name: string | null;
};

export function matchDtoToRow(matchId: string, dto: MatchDto, puuid: string): MatchRow | null {
  const participant = dto.info?.participants?.find((p) => p.puuid === puuid);
  if (!participant) return null;
  const cs = (participant.totalMinionsKilled ?? 0) + (participant.neutralMinionsKilled ?? 0);
  const damage = participant.totalDamageDealtToChampions ?? 0;
  const gameDuration = dto.info?.gameDuration ?? 0;
  const gameCreation =
    (dto.info as { gameCreation?: number }).gameCreation ??
    dto.info?.gameEndTimestamp ??
    0;
  return {
    match_id: matchId,
    puuid,
    queue_id: dto.info?.queueId ?? 420,
    champion_id: participant.championId ?? 0,
    kills: participant.kills ?? 0,
    deaths: participant.deaths ?? 0,
    assists: participant.assists ?? 0,
    win: participant.win ?? false,
    cs,
    damage,
    game_duration: gameDuration,
    game_creation: gameCreation,
    champion_name: participant.championName ?? null,
  };
}
