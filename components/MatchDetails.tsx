"use client";

import Link from "next/link";
import { mutate as globalMutate } from "swr";
import type { MatchDto } from "@/types/riot";
import { LeagueTooltip } from "@/components/LeagueTooltip";
import {
  getChampionSquareUrl,
  getSummonerSpellIconUrl,
  getSummonerSpellTooltip,
  isValidItemId,
  getItemTooltip,
  DEFAULT_DDRAGON_VERSION,
  type SummonerSpellData,
  type ItemTooltipData,
} from "@/lib/riotAssets";
import { getPerkIconUrl, getStyleIconUrlCd } from "@/lib/runesCd";
import { computeImpactScore } from "@/lib/impactScore";
import { buildProfileHref } from "@/lib/routes";

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
  region = "na1",
  queue = "solo",
  ddragonVersion,
  perksById,
  stylesById,
  rankBadgesByPuuid,
  rankTierByPuuid,
  itemDataById = {},
  perkDataById,
  styleNamesById,
  summonerSpellData,
}: {
  match: MatchDto;
  puuidOfSearchedPlayer: string;
  region?: string;
  queue?: "solo" | "flex";
  ddragonVersion?: string | null;
  perksById: Map<number, string>;
  stylesById: Map<number, string>;
  rankBadgesByPuuid?: Record<string, string>;
  rankTierByPuuid?: Record<string, string>;
  itemDataById?: ItemTooltipData;
  perkDataById?: Map<number, { name?: string; shortDesc?: string; longDesc?: string; iconPath?: string }>;
  styleNamesById?: Map<number, string>;
  summonerSpellData?: SummonerSpellData;
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

  const winDmg = winAgg.damage;
  const loseDmg = loseAgg.damage;
  const winGold = winAgg.gold;
  const loseGold = loseAgg.gold;
  const winImpactAvg =
    winningTeam.length > 0
      ? winningTeam.reduce(
          (s, p) => s + (computeImpactScore(match, p.puuid)?.score ?? 0),
          0
        ) / winningTeam.length
      : 0;
  const loseImpactAvg =
    losingTeam.length > 0
      ? losingTeam.reduce(
          (s, p) => s + (computeImpactScore(match, p.puuid)?.score ?? 0),
          0
        ) / losingTeam.length
      : 0;

  const totalDmg = winDmg + loseDmg;
  const winDmgPct = totalDmg ? winDmg / totalDmg : 0.5;
  const loseDmgPct = totalDmg ? loseDmg / totalDmg : 0.5;
  const totalGold = winGold + loseGold;
  const winGoldPct = totalGold ? winGold / totalGold : 0.5;
  const loseGoldPct = totalGold ? loseGold / totalGold : 0.5;
  const totalImpact = winImpactAvg + loseImpactAvg;
  const winImpactPct = totalImpact ? winImpactAvg / totalImpact : 0.5;
  const loseImpactPct = totalImpact ? loseImpactAvg / totalImpact : 0.5;

  const damageEdge = winDmg - loseDmg;
  const goldEdge = winGold - loseGold;
  const impactEdge = winImpactAvg - loseImpactAvg;
  const damageEdgeText =
    damageEdge >= 0
      ? `Damage edge: TEAM 2 +${formatShortNum(damageEdge)}`
      : `Damage edge: TEAM 1 +${formatShortNum(Math.abs(damageEdge))}`;
  const goldEdgeText =
    goldEdge >= 0
      ? `Gold edge: TEAM 2 +${formatShortNum(goldEdge)}`
      : `Gold edge: TEAM 1 +${formatShortNum(Math.abs(goldEdge))}`;
  const impactEdgeText =
    impactEdge >= 0
      ? `Impact edge: TEAM 2 +${Math.round(impactEdge)}`
      : `Impact edge: TEAM 1 +${Math.round(Math.abs(impactEdge))}`;

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

  /** Rank 1–10 by impact (1 = highest). */
  const impactRankByPuuid = (() => {
    const withScore = parts.map((p) => ({
      puuid: p.puuid,
      score: computeImpactScore(match, p.puuid)?.score ?? 0,
    }));
    withScore.sort((a, b) => b.score - a.score);
    const map = new Map<string, number>();
    withScore.forEach(({ puuid }, i) => map.set(puuid, i + 1));
    return map;
  })();

  function kdaEfficiency(k: number, d: number, a: number): string {
    if (d === 0) return "Perfect";
    const eff = (k + a) / d;
    return eff % 1 === 0 ? eff.toFixed(0) : eff.toFixed(2);
  }

  function rankLabel(rank: number): string {
    if (rank === 1) return "1st";
    if (rank === 2) return "2nd";
    if (rank === 3) return "3rd";
    return `${rank}th`;
  }

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
              <th className="c-ai-score">Impact Score</th>
              <th className="c-kda">KDA</th>
              <th className="c-damage">Damage</th>
              <th className="c-cs">CS</th>
              <th className="c-vision">Vision</th>
              <th className="c-items">Items</th>
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
              const durationMin = duration / 60 || 1;
              const csPerMin = (cs / durationMin).toFixed(1);
              const vision =
                (p as Participant & { visionScore?: number }).visionScore ?? 0;
              const champUrl = getChampionSquareUrl(p.championName, version);
              const impactScore = computeImpactScore(match, p.puuid)?.score ?? 0;
              const rank = impactRankByPuuid.get(p.puuid) ?? 0;

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

              const badge = rankBadgesByPuuid?.[p.puuid];
              const tierFromData = rankTierByPuuid?.[p.puuid]?.toLowerCase();
              // Derive tier from badge text when tier missing so badge always gets a color (e.g. G2→gold, D1→diamond)
              const tierKey =
                tierFromData ||
                (badge && badge.length > 0
                  ? (() => {
                      const c = badge.charAt(0).toUpperCase();
                      if (c === "G") return "gold";
                      if (c === "S") return "silver";
                      if (c === "B") return "bronze";
                      if (c === "I") return "iron";
                      if (c === "P") return "platinum";
                      if (c === "E") return "emerald";
                      if (c === "D") return "diamond";
                      if (c === "M") return "master";
                      if (badge.startsWith("GM")) return "grandmaster";
                      if (c === "C") return "challenger";
                      return "unranked";
                    })()
                  : "unranked");

              return (
                <tr key={p.puuid} className={isMe ? "md-me" : ""}>
                  <td className="c-player">
                    <div className="md-player-inner">
                      <span className="md-champ">
                        {champUrl ? (
                          <img
                            src={champUrl}
                            alt=""
                            width={40}
                            height={40}
                            className="md-champ-icon champ-icon"
                          />
                        ) : (
                          <span className="md-champ-placeholder" />
                        )}
                      </span>
                      <div className="md-spells-runes-grid">
                        {spell1Src && (() => {
                          const st = getSummonerSpellTooltip(summonerSpellData, p.summoner1Id);
                          return (
                            <span className="md-spell-slot">
                              {st ? (
                                <LeagueTooltip title={st.title} body={st.body} icon={st.icon} accentColor="#5b9bd5">
                                  <img src={spell1Src} alt="" width={16} height={16} className="md-spell-icon spell-icon" />
                                </LeagueTooltip>
                              ) : (
                                <img src={spell1Src} alt="" width={16} height={16} className="md-spell-icon spell-icon" />
                              )}
                            </span>
                          );
                        })()}
                        {keystoneSrc && (
                          <span className="md-rune-slot">
                            <LeagueTooltip
                              title={(primaryKeystoneId != null ? (perkDataById?.get(primaryKeystoneId)?.name || `Rune ${primaryKeystoneId}`) : "Rune").trim() || `Rune ${primaryKeystoneId ?? ""}`}
                              icon={keystoneSrc}
                              accentColor="#a78bfa"
                              subtitle={primaryKeystoneId != null ? perkDataById?.get(primaryKeystoneId)?.shortDesc : undefined}
                              subtitleHtml
                              body={primaryKeystoneId != null ? perkDataById?.get(primaryKeystoneId)?.longDesc : undefined}
                              bodyHtml
                            >
                              <img src={keystoneSrc} alt="" width={16} height={16} className="md-rune-icon rune-icon" />
                            </LeagueTooltip>
                          </span>
                        )}
                        {spell2Src && (() => {
                          const st = getSummonerSpellTooltip(summonerSpellData, p.summoner2Id);
                          return (
                            <span className="md-spell-slot">
                              {st ? (
                                <LeagueTooltip title={st.title} body={st.body} icon={st.icon} accentColor="#5b9bd5">
                                  <img src={spell2Src} alt="" width={16} height={16} className="md-spell-icon spell-icon" />
                                </LeagueTooltip>
                              ) : (
                                <img src={spell2Src} alt="" width={16} height={16} className="md-spell-icon spell-icon" />
                              )}
                            </span>
                          );
                        })()}
                        {secondarySrc && (
                          <span className="md-rune-slot">
                            <LeagueTooltip
                              title={(secondaryStyleId != null ? (styleNamesById?.get(secondaryStyleId) || `Style ${secondaryStyleId}`) : "Style").trim() || `Style ${secondaryStyleId ?? ""}`}
                              icon={secondarySrc}
                              accentColor="#a78bfa"
                            >
                              <img src={secondarySrc} alt="" width={16} height={16} className="md-rune-icon rune-icon" />
                            </LeagueTooltip>
                          </span>
                        )}
                      </div>
                      <Link
                        className="md-name player-link"
                        href={buildProfileHref({
                          riotId:
                            p.riotIdGameName && p.riotIdTagline
                              ? `${p.riotIdGameName}#${p.riotIdTagline}`
                              : `${p.summonerName ?? ""}#${p.riotIdTagline ?? "NA1"}`,
                          region,
                          queue: queue === "flex" ? "flex" : "solo",
                        })}
                        prefetch={false}
                        onClick={(e) => e.stopPropagation()}
                        onMouseEnter={() => {
                          const riotId =
                            p.riotIdGameName && p.riotIdTagline
                              ? `${p.riotIdGameName}#${p.riotIdTagline}`
                              : `${p.summonerName ?? ""}#${p.riotIdTagline ?? "NA1"}`;
                          if (!riotId.includes("#")) return;
                          globalMutate(`/api/riot/profileBundle?riotId=${encodeURIComponent(riotId)}&region=${encodeURIComponent(region)}&queue=solo`);
                          globalMutate(`/api/riot/profileBundle?riotId=${encodeURIComponent(riotId)}&region=${encodeURIComponent(region)}&queue=flex`);
                        }}
                        title={participantDisplayName(p)}
                      >
                        {participantDisplayName(p)}
                        {badge ? (
                          <span className={`md-rank-badge md-rank-badge-${tierKey}`}>{badge}</span>
                        ) : null}
                      </Link>
                    </div>
                  </td>

                  <td className="c-ai-score">
                    <div className="md-ai-score-cell">
                      <div className="md-ai-score-val">{Math.round(impactScore)}</div>
                      <div className="md-ai-score-rank">
                        {rank === 1 && <span className="md-crown" aria-hidden>👑</span>}
                        {rankLabel(rank)}
                      </div>
                    </div>
                  </td>

                  <td className="c-kda">
                    <div className="md-kda-cell">
                      <div className="md-kda-ratio">{`${k} / ${d} / ${a}`}</div>
                      <div className={`md-kda-eff ${d === 0 ? "perfect" : ""}`}>{kdaEfficiency(k, d, a)}</div>
                    </div>
                  </td>

                  <td className="c-damage">
                    <div className="md-damage-cell">
                      <div className="md-damage-val">{formatShortNum(damage)}</div>
                      <div className="md-damage-bar-wrap">
                        <div
                          className="md-damage-bar"
                          style={{ width: `${maxDmg ? (damage / maxDmg) * 100 : 0}%` }}
                        />
                      </div>
                    </div>
                  </td>

                  <td className="c-cs">
                    <div className="md-cs-cell">
                      <div className="md-cs-total">{cs}</div>
                      <div className="md-cs-permin">({csPerMin}/m)</div>
                    </div>
                  </td>

                  <td className="c-vision">
                    <div className="md-vision-cell">{vision}</div>
                  </td>

                  <td className="c-items">
                    <div className="md-itemsWrap">
                      <div className="md-itemGrid">
                        {[p.item0, p.item1, p.item2, p.item3, p.item4, p.item5].map(
                          (itemId, i) =>
                            isValidItemId(itemId) ? (
                              (() => {
                                const { title, body, bodyHtml, icon } = getItemTooltip(itemDataById, itemId);
                                return (
                                  <LeagueTooltip key={`${p.puuid}-item-${i}`} title={title} body={body} bodyHtml={bodyHtml} icon={icon}>
                                    <img
                                      src={`https://ddragon.leagueoflegends.com/cdn/${version}/img/item/${itemId}.png`}
                                      alt=""
                                      title={title}
                                      width={20}
                                      height={20}
                                      className="md-item-icon item-icon"
                                    />
                                  </LeagueTooltip>
                                );
                              })()
                            ) : null
                        )}
                      </div>
                      {isValidItemId(p.item6) ? (
                        (() => {
                          const { title, body, bodyHtml, icon } = getItemTooltip(itemDataById, p.item6);
                          return (
                            <div className="md-trinket">
                              <LeagueTooltip title={title} body={body} bodyHtml={bodyHtml} icon={icon}>
                                <img
                                  src={`https://ddragon.leagueoflegends.com/cdn/${version}/img/item/${p.item6}.png`}
                                  alt=""
                                  title={title}
                                  width={18}
                                  height={18}
                                  className="md-item-icon item-icon trinket-icon"
                                />
                              </LeagueTooltip>
                            </div>
                          );
                        })()
                      ) : null}
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
      <div className="statgap-summary">
        <div className="statgap-summary-adv">
          <span>{damageEdgeText}</span>
          <span>{goldEdgeText}</span>
          <span>{impactEdgeText}</span>
        </div>
        <div className="statgap-summary-row">
          <div className="statgap-summary-label">Damage</div>
          <div className="statgap-summary-bar">
            <div className="left" style={{ width: `${winDmgPct * 100}%` }} />
            <div className="right" style={{ width: `${loseDmgPct * 100}%` }} />
          </div>
          <div className="statgap-summary-values">
            <span className="leftVal">{formatShortNum(winDmg)}</span>
            <span className="rightVal">{formatShortNum(loseDmg)}</span>
          </div>
        </div>
        <div className="statgap-summary-row">
          <div className="statgap-summary-label">Gold</div>
          <div className="statgap-summary-bar">
            <div className="left" style={{ width: `${winGoldPct * 100}%` }} />
            <div className="right" style={{ width: `${loseGoldPct * 100}%` }} />
          </div>
          <div className="statgap-summary-values">
            <span className="leftVal">{formatShortNum(winGold)}</span>
            <span className="rightVal">{formatShortNum(loseGold)}</span>
          </div>
        </div>
        <div className="statgap-summary-row">
          <div className="statgap-summary-label">Avg Impact</div>
          <div className="statgap-summary-bar">
            <div className="left" style={{ width: `${winImpactPct * 100}%` }} />
            <div className="right" style={{ width: `${loseImpactPct * 100}%` }} />
          </div>
          <div className="statgap-summary-values">
            <span className="leftVal">{Math.round(winImpactAvg)}</span>
            <span className="rightVal">{Math.round(loseImpactAvg)}</span>
          </div>
        </div>
      </div>
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
