\"use client\";

import Image from \"next/image\";
import type { MatchDto } from \"@/types/riot\";
import {
  getChampionSquareUrl,
  getSummonerSpellIconUrl,
  isValidItemId,
  DEFAULT_DDRAGON_VERSION,
} from \"@/lib/riotAssets\";
import { getPerkIconUrl, getStyleIconUrlCd } from \"@/lib/runesCd\";
import { computeImpactScore } from \"@/lib/impactScore\";

type Participant = NonNullable<MatchDto[\"info\"]>[\"participants\"][number];

function formatDuration(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, \"0\")}`;
}

function queueLabel(queueId: number | undefined): string {
  if (queueId == null) return \"Custom\";
  const map: Record<number, string> = {
    420: \"Ranked Solo\",
    440: \"Ranked Flex\",
    400: \"Draft Pick\",
    430: \"Blind Pick\",
    450: \"ARAM\",
    1020: \"One for All\",
  };
  return map[queueId] ?? `Queue ${queueId}`;
}

function participantDisplayName(p: Participant): string {
  if (p.riotIdGameName && p.riotIdTagline) {
    return `${p.riotIdGameName}#${p.riotIdTagline}`;
  }
  return p.summonerName ?? \"\";
}

export function MatchDetails({
  match,
  puuidOfSearchedPlayer,
  queue,
  ddragonVersion,
  perksById,
  stylesById,
  rankBadgesByPuuid,
}: {
  match: MatchDto;
  puuidOfSearchedPlayer: string;
  queue?: \"solo\" | \"flex\";
  ddragonVersion?: string | null;
  perksById: Map<number, string>;
  stylesById: Map<number, string>;
  rankBadgesByPuuid?: Record<string, string | null>;
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
          <span className="match-details-col-impact">Impact</span>
          <span className="match-details-col-kda">KDA</span>
          <span className="match-details-col-damage">Damage</span>
          <span className="match-details-col-gold">Gold</span>
          <span className="match-details-col-cs">CS</span>
          <span className="match-details-col-vision">Vision</span>
          <span className="match-details-col-items">Items</span>
        </div>
        {team.map((p) => {
          const isMe = p.puuid === puuidOfSearchedPlayer;
          const kda = `${p.kills}/${p.deaths}/${p.assists}`;
          const damage =
            (p as Participant & { totalDamageDealtToChampions?: number })
              .totalDamageDealtToChampions ?? 0;
          const gold = (p as Participant & { goldEarned?: number }).goldEarned ?? 0;
          const cs = (p.totalMinionsKilled ?? 0) + (p.neutralMinionsKilled ?? 0);
          const vision = (p as Participant & { visionScore?: number }).visionScore ?? 0;
          const itemIds = [
            p.item0,
            p.item1,
            p.item2,
            p.item3,
            p.item4,
            p.item5,
            p.item6,
          ].filter((id): id is number => id != null && id > 0);
          const champUrl = getChampionSquareUrl(p.championName, version);
          const impactScore = computeImpactScore(match, p.puuid)?.score ?? 0;

          const spell1Src = getSummonerSpellIconUrl(p.summoner1Id, version);
          const spell2Src = getSummonerSpellIconUrl(p.summoner2Id, version);
          const primaryKeystoneId =
            p.perks?.styles?.[0]?.selections?.[0]?.perk;
          const secondaryStyleId = p.perks?.styles?.[1]?.style;
          const keystoneSrc = getPerkIconUrl(primaryKeystoneId, perksById);
          const secondarySrc = getStyleIconUrlCd(secondaryStyleId, stylesById);

          const badge = rankBadgesByPuuid?.[p.puuid] ?? null;

          return (
            <div
              key={p.puuid}
              className={`match-details-player-row player-row${isMe ? " me-row" : ""}`}
            >
              <span className="match-details-col-champ">
                <div className="match-details-champ-block">
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
                  <div className="match-details-spells-runes">
                    <div className="match-details-spells">
                      {spell1Src && (
                        <img
                          src={spell1Src}
                          alt=""
                          width={18}
                          height={18}
                          className="match-details-spell-icon"
                        />
                      )}
                      {spell2Src && (
                        <img
                          src={spell2Src}
                          alt=""
                          width={18}
                          height={18}
                          className="match-details-spell-icon"
                        />
                      )}
                    </div>
                    <div className="match-details-runes">
                      {keystoneSrc && (
                        <img
                          src={keystoneSrc}
                          alt=""
                          width={18}
                          height={18}
                          className="match-details-rune-icon"
                        />
                      )}
                      {secondarySrc && (
                        <img
                          src={secondarySrc}
                          alt=""
                          width={18}
                          height={18}
                          className="match-details-rune-icon"
                        />
                      )}
                    </div>
                  </div>
                </div>
              </span>
              <span className="match-details-col-name" title={participantDisplayName(p)}>
                {participantDisplayName(p)}
                {badge ? <span className="rank-badge">{badge}</span> : null}
              </span>
              <span className="match-details-col-impact">
                {Math.round(impactScore)}
              </span>
              <span className="match-details-col-kda">{kda}</span>
              <span className="match-details-col-damage">
                {damage.toLocaleString()}
              </span>
              <span className="match-details-col-gold">
                {gold.toLocaleString()}
              </span>
              <span className="match-details-col-cs">{cs}</span>
              <span className="match-details-col-vision">{vision}</span>
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
