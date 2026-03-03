export type AccountDto = {
  puuid: string;
  gameName: string;
  tagLine: string;
};

export type SummonerDto = {
  id: string;
  /** Explicit copy of id for League V4; server returns this from summoner-v4 response. */
  encryptedSummonerId?: string;
  accountId: string;
  puuid: string;
  name: string;
  profileIconId: number;
  summonerLevel: number;
  revisionDate?: number;
};

/** League v4 entry (GET /lol/league/v4/entries/by-summoner/{id}). */
export type LeagueEntryDto = {
  queueType: string;
  tier: string;
  rank: string;
  leaguePoints: number;
  wins: number;
  losses: number;
  summonerId: string;
  summonerName?: string;
  [key: string]: unknown;
};

export type MatchListDto = { matchIds: string[] };

/** Server-attached: first match only — raw timeline counts, purchasedByPid[1..10], and pid mapping. */
export type TimelineDiagnosticsDto = {
  totalFrames: number;
  totalEvents: number;
  totalPurchased: number;
  purchasedByPid: number[];
  selectedPuuid: string;
  timelineParticipants: string[];
  computedPid: number | null;
};

export type MatchDto = {
  metadata: { matchId: string; participants?: string[] };
  /** Server-attached: purchase times "m:ss" or null for item slots 0–5 (no trinket). */
  itemPurchaseTimesBySlot?: (string | null)[];
  /** Server-attached: debug counts for first-match UI (totalEvents, totalPurchased, pid, pidPurchased). */
  debugCounts?: {
    totalEvents: number;
    totalPurchased: number;
    pid: number | null;
    pidPurchased: number;
  };
  /** Server-attached: first match only — raw timeline counts and purchasedByPid[1..10]. */
  timelineDiagnostics?: TimelineDiagnosticsDto;
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
      /** Encrypted summoner id (for League v4 by-summoner). Present in Riot match-v5 response. */
      summonerId?: string;
      /** Timeline participantId (1–10) when present in Riot response */
      participantId?: number;
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
      /** Riot ID tagline (optional, from match) */
      riotIdTagline?: string;
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
