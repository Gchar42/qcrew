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

/** Damage/gold: one decimal + "k" when >= 10000, else full number */
function formatShortNum(n: number): string {
  if (n >= 10000) return `${(n / 1000).toFixed(1)}k`;
  return n.toLocaleString();
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

  const maxDamage = Math.max(
    0,
    ...parts.map(
      (p) =>
        (p as Participant & { totalDamageDealtToChampions?: number })
          .totalDamageDealtToChampions ?? 0
    )
  );
  const maxImpact = Math.max(
    0,
    ...parts.map((p) => computeImpactScore(match, p.puuid)?.score ?? 0)
  );

  const renderTeamSection = (
    team: Participant[],
    teamKey: "win" | "lose",
    teamLabel: string,
    agg: { kills: number; gold: number },
    maxDmg: number,
    maxImp: number
  ) => (
    <div key={teamKey} className="md-team">
      <div className={`md-team-header team-header md-team-header-${teamKey}`}>
        <span className="md-team-label">{teamLabel}</span>
        <span className="md-team-summary">
          {agg.kills} kills · {agg.gold.toLocaleString()} gold
        </span>
      </div>

      <div className="md-scroll">
        <table className="md-table">
          <thead>
            <tr>
              <th className="c-player">Player</th>
              <th className="c-items">Items</th>
              <th className="c-stats">Stats</th>
            </tr>
          </thead>
          <tbody>
            {team.map((p) => {
              const isMe = p.puuid === puuidOfSearchedPlayer;
              const k = p.kills ?? 0;
              const d = p.deaths ?? 0;
              const a = p.assists ?? 0;
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
                <tr key={p.puuid} className={isMe ? "md-me" : ""}>
                  <td className="c-player">
                    <div className="md-player-inner">
                      <span className="md-champ">
                        {champUrl ? (
                          <img
                            src={champUrl}
                            alt=""
                            width={36}
                            height={36}
                            className="md-champ-icon champ-icon"
                          />
                        ) : (
                          <span className="md-champ-placeholder" />
                        )}
                      </span>
                      <div className="md-spells-runes">
                        <div className="md-spells">
                          {spell1Src && (
                            <img
                              src={spell1Src}
                              alt=""
width={18}
                            height={18}
                            className="md-spell-icon spell-icon"
                            />
                          )}
                          {spell2Src && (
                            <img
                              src={spell2Src}
                              alt=""
width={18}
                            height={18}
                            className="md-spell-icon spell-icon"
                            />
                          )}
                        </div>
                        <div className="md-runes">
                          {keystoneSrc && (
                            <img
                              src={keystoneSrc}
                              alt=""
                              width={18}
                              height={18}
                              className="md-rune-icon rune-icon"
                            />
                          )}
                          {secondarySrc && (
                            <img
                              src={secondarySrc}
                              alt=""
                              width={18}
                              height={18}
                              className="md-rune-icon rune-icon"
                            />
                          )}
                        </div>
                      </div>
                      <span className="md-name" title={participantDisplayName(p)}>
                        {participantDisplayName(p)}
                        {badge ? (
                          <span className="md-rank-badge">{badge}</span>
                        ) : null}
                      </span>
                    </div>
                  </td>

                  <td className="c-items">
                    <div className="md-items">
                      {[0, 1, 2, 3, 4, 5, 6].map((i) => {
                        const itemId = [
                          p.item0,
                          p.item1,
                          p.item2,
                          p.item3,
                          p.item4,
                          p.item5,
                          p.item6,
                        ][i];
                        return isValidItemId(itemId) ? (
                          <img
                            key={`${p.puuid}-item-${i}`}
                            src={`https://ddragon.leagueoflegends.com/cdn/${version}/img/item/${itemId}.png`}
                            alt=""
                            width={22}
                            height={22}
                            className="md-item-icon item-icon"
                          />
                        ) : (
                          <span
                            key={`${p.puuid}-item-${i}`}
                            className="md-item-slot"
                          />
                        );
                      })}
                    </div>
                  </td>

                  <td className="c-stats">
                    <div className="md-stats">
                      <div className="md-stat">
                        <div className="md-stat-label">Impact</div>
                        <div className="md-stat-val impact">{Math.round(impactScore)}</div>
                        <div className="md-bar impact">
                          <span
                            style={{
                              width: `${maxImp ? (impactScore / maxImp) * 100 : 0}%`,
                            }}
                          />
                        </div>
                      </div>
                      <div className="md-stat">
                        <div className="md-stat-label">KDA</div>
                        <div className="md-stat-val kda">{`${k}/${d}/${a}`}</div>
                      </div>
                      <div className="md-stat">
                        <div className="md-stat-label">CS</div>
                        <div className="md-stat-val">{cs}</div>
                      </div>
                      <div className="md-stat">
                        <div className="md-stat-label">VS</div>
                        <div className="md-stat-val vision">{vision}</div>
                      </div>
                      <div className="md-stat">
                        <div className="md-stat-label">Dmg</div>
                        <div className="md-stat-val damage">{formatShortNum(damage)}</div>
                        <div className="md-bar damage">
                          <span
                            style={{
                              width: `${maxDmg ? (damage / maxDmg) * 100 : 0}%`,
                            }}
                          />
                        </div>
                      </div>
                      <div className="md-stat">
                        <div className="md-stat-label">Gold</div>
                        <div className="md-stat-val gold">{formatShortNum(gold)}</div>
                      </div>
                    </div>
                  </td>
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
      {renderTeamSection(
        winningTeam,
        "win",
        winningTeam === team100 ? "TEAM 1 (Victory)" : "TEAM 2 (Victory)",
        winAgg,
        maxDamage,
        maxImpact
      )}
      {renderTeamSection(
        losingTeam,
        "lose",
        losingTeam === team100 ? "TEAM 1 (Defeat)" : "TEAM 2 (Defeat)",
        loseAgg,
        maxDamage,
        maxImpact
      )}
    </div>
  );
}
