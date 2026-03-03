export type AccountDto = {
  puuid: string;
  gameName: string;
  tagLine: string;
};

export type SummonerDto = {
  id: string;
  accountId: string;
  puuid: string;
  name: string;
  profileIconId: number;
  summonerLevel: number;
  revisionDate?: number;
};

export type MatchListDto = { matchIds: string[] };

export type MatchDto = {
  metadata: { matchId: string; participants?: string[] };
  /** Server-attached: purchase times "m:ss" or null for item slots 0–5 (no trinket). */
  itemPurchaseTimesBySlot?: (string | null)[];
  info: {
    gameDuration: number;
    gameEndTimestamp?: number;
    gameId?: number;
    /** e.g. 420 = Ranked Solo, 440 = Ranked Flex */
    queueId?: number;
    /** e.g. "14.6.xxx.xxx" */
    gameVersion?: string;
    participants: Array<{
      puuid: string;
      summonerName: string;
      championName: string;
      kills: number;
      deaths: number;
      assists: number;
      win: boolean;
      /** 100 = blue, 200 = red */
      teamId?: number;
      teamPosition?: string;
      individualPosition?: string;
      totalMinionsKilled?: number;
      neutralMinionsKilled?: number;
      totalDamageDealtToChampions?: number;
      damageDealtToObjectives?: number;
      damageDealtToTurrets?: number;
      visionScore?: number;
      timeCCingOthers?: number;
      totalHealsOnTeammates?: number;
      totalDamageShieldedOnTeammates?: number;
      item0?: number;
      item1?: number;
      item2?: number;
      item3?: number;
      item4?: number;
      item5?: number;
      item6?: number;
      championId?: number;
      summoner1Id?: number;
      summoner2Id?: number;
      /** Riot ID in-game name (optional, from match) */
      riotIdGameName?: string;
      perks?: {
        styleIds?: number[];
        /** Primary style first, secondary second. selections[0] is keystone. */
        styles?: Array<{ style: number; selections?: Array<{ perk: number }> }>;
        perkIds?: number[];
      };
    }>;
  };
};

/** Match timeline (GET /lol/match/v5/matches/{matchId}/timeline) */
export type MatchTimelineFrameParticipant = {
  participantId?: number;
  item0?: number;
  item1?: number;
  item2?: number;
  item3?: number;
  item4?: number;
  item5?: number;
  item6?: number;
  [key: string]: unknown;
};

export type MatchTimelineEvent = {
  type: string;
  /** Game time in milliseconds from start */
  timestamp?: number;
  participantId?: number;
  itemId?: number;
  /** Item id before undo (ITEM_UNDO) */
  beforeId?: number;
  afterId?: number;
  [key: string]: unknown;
};

export type MatchTimelineFrame = {
  timestamp?: number;
  participantFrames?: Record<string, MatchTimelineFrameParticipant>;
  events?: MatchTimelineEvent[];
};

export type MatchTimelineParticipant = {
  participantId?: number;
  puuid?: string;
  [key: string]: unknown;
};

export type MatchTimelineDto = {
  metadata?: { matchId?: string; participants?: string[] };
  info?: {
    frames?: MatchTimelineFrame[];
    /** When present, use to map puuid -> participantId instead of assuming match order */
    participants?: MatchTimelineParticipant[];
  };
};
