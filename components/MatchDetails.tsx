"use client";

import type { MatchDto } from "@/types/riot";
import {
  getChampionSquareUrl,
  getSummonerSpellIconUrl,
  isValidItemId,
  DEFAULT_DDRAGON_VERSION,
} from "@/lib/riotAssets";
import { getPerkIconUrl, getStyleIconUrlCd } from "@/lib/runesCd";
import { computeImpactScore } from "@/lib/impactScore";

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

function teamAggregates(team: Participant[]) {
  let kills = 0;
  let deaths = 0;
  let assists = 0;
  let gold = 0;
  let damage = 0;
  let vision = 0;
  team.forEach((p) => {
    kills += p.kills ?? 0;
    deaths += p.deaths ?? 0;
    assists += p.assists ?? 0;
    gold += (p as Participant & { goldEarned?: number }).goldEarned ?? 0;
    damage +=
      (p as Participant & { totalDamageDealtToChampions?: number })
        .totalDamageDealtToChampions ?? 0;
    vision += (p as Participant & { visionScore?: number }).visionScore ?? 0;
  });
  return { kills, deaths, assists, gold, damage, vision };
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
  queue?: "solo" | "flex";
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

  const winAgg = teamAggregates(winningTeam);
  const loseAgg = teamAggregates(losingTeam);

  const renderTeamSection = (
    team: Participant[],
    teamKey: "win" | "lose",
    teamLabel: string,
    agg: { kills: number; gold: number }
  ) => (
    <div key={teamKey} className="match-acc">
      <div className={`match-acc-header match-acc-header-${teamKey}`}>
        <span className="match-acc-label">{teamLabel}</span>
        <span className="match-acc-summary">
          {agg.kills} kills · {agg.gold.toLocaleString()} gold
        </span>
      </div>
      <div className="match-acc-body">
        <table className="md-table">
          <thead>
            <tr>
              <th className="col-player">Player</th>
              <th className="col-items">Items</th>
              <th className="col-impact">Impact</th>
              <th className="col-kda">KDA</th>
              <th className="col-cs">CS</th>
              <th className="col-vision">Vision</th>
              <th className="col-dmg">Dmg</th>
              <th className="col-gold">Gold</th>
            </tr>
          </thead>
          <tbody>
            {team.map((p) => {
              const isMe = p.puuid === puuidOfSearchedPlayer;
              const kda = `${p.kills}/${p.deaths}/${p.assists}`;
              const damage =
                (p as Participant & { totalDamageDealtToChampions?: number })
                  .totalDamageDealtToChampions ?? 0;
              const gold =
                (p as Participant & { goldEarned?: number }).goldEarned ?? 0;
              const cs =
                (p.totalMinionsKilled ?? 0) + (p.neutralMinionsKilled ?? 0);
              const vision =
                (p as Participant & { visionScore?: number }).visionScore ?? 0;
              const champUrl = getChampionSquareUrl(p.championName, version);
              const impactScore = computeImpactScore(match, p.puuid)?.score ?? 0;

              const spell1Src = getSummonerSpellIconUrl(p.summoner1Id, version);
              const spell2Src = getSummonerSpellIconUrl(p.summoner2Id, version);
              const primaryKeystoneId =
                p.perks?.styles?.[0]?.selections?.[0]?.perk;
              const secondaryStyleId = p.perks?.styles?.[1]?.style;
              const keystoneSrc = getPerkIconUrl(primaryKeystoneId, perksById);
              const secondarySrc = getStyleIconUrlCd(
                secondaryStyleId,
                stylesById
              );

              const badge = rankBadgesByPuuid?.[p.puuid] ?? null;

              return (
                <tr
                  key={p.puuid}
                  className={isMe ? "me-row" : ""}
                >
                  <td className="col-player">
                    <div className="md-player-cell">
                      <span className="player-champ">
                        {champUrl ? (
                          <img
                            src={champUrl}
                            alt=""
                            width={40}
                            height={40}
                            className="player-champ-icon"
                          />
                        ) : (
                          <span className="player-champ-placeholder" />
                        )}
                      </span>
                      <div className="player-spells-runes">
                        <div className="player-spells">
                          {spell1Src && (
                            <img
                              src={spell1Src}
                              alt=""
                              width={22}
                              height={22}
                              className="player-spell-icon"
                            />
                          )}
                          {spell2Src && (
                            <img
                              src={spell2Src}
                              alt=""
                              width={22}
                              height={22}
                              className="player-spell-icon"
                            />
                          )}
                        </div>
                        <div className="player-runes">
                          {keystoneSrc && (
                            <img
                              src={keystoneSrc}
                              alt=""
                              width={22}
                              height={22}
                              className="player-rune-icon"
                            />
                          )}
                          {secondarySrc && (
                            <img
                              src={secondarySrc}
                              alt=""
                              width={22}
                              height={22}
                              className="player-rune-icon"
                            />
                          )}
                        </div>
                      </div>
                      <div className="player-name-block">
                        <span className="player-name" title={participantDisplayName(p)}>
                          {participantDisplayName(p)}
                          {badge ? (
                            <span className="rank-badge">{badge}</span>
                          ) : null}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td className="col-items">
                    <div className="player-items">
                      {[0, 1, 2, 3, 4, 5, 6].map((i) => {
                        const itemId = [p.item0, p.item1, p.item2, p.item3, p.item4, p.item5, p.item6][i];
                        return isValidItemId(itemId) ? (
                          <img
                            key={`${p.puuid}-item-${i}`}
                            src={`https://ddragon.leagueoflegends.com/cdn/${version}/img/item/${itemId}.png`}
                            alt=""
                            width={22}
                            height={22}
                            className="player-item-icon"
                          />
                        ) : (
                          <span key={`${p.puuid}-item-${i}`} className="player-item-slot" />
                        );
                      })}
                    </div>
                  </td>
                  <td className="col-impact">{Math.round(impactScore)}</td>
                  <td className="col-kda">{kda}</td>
                  <td className="col-cs">{cs}</td>
                  <td className="col-vision">{vision}</td>
                  <td className="col-dmg">{damage.toLocaleString()}</td>
                  <td className="col-gold">{gold.toLocaleString()}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
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
      <div className="match-details-tables-wrap">
        {renderTeamSection(
          winningTeam,
          "win",
          winningTeam === team100 ? "TEAM 1 (Victory)" : "TEAM 2 (Victory)",
          winAgg
        )}
        {renderTeamSection(
          losingTeam,
          "lose",
          losingTeam === team100 ? "TEAM 1 (Defeat)" : "TEAM 2 (Defeat)",
          loseAgg
        )}
      </div>
    </div>
  );
}
