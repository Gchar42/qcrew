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
      totalMinionsKilled?: number;
      neutralMinionsKilled?: number;
      item0?: number;
      item1?: number;
      item2?: number;
      item3?: number;
      item4?: number;
      item5?: number;
      item6?: number;
      championId?: number;
    }>;
  };
};
