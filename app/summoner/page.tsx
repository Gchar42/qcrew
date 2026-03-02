"use client";

import Link from "next/link";
import Image from "next/image";
import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { fetchJsonWithRetry, mapWithConcurrency } from "@/lib/fetchUtils";
import { MatchDetailSlideOver } from "@/components/summoner/MatchDetailSlideOver";
import {
  getChampionSplashUrl,
  getChampionSplashUrlWithSkin,
  getChampionSquareUrl,
} from "@/lib/riotAssets";
import type { AccountDto, SummonerDto, MatchDto } from "@/types/riot";

const REGION = "na1";

type Participant = NonNullable<MatchDto["info"]>["participants"][number];

const POSITION_ORDER: Record<string, number> = {
  TOP: 0,
  JUNGLE: 1,
  MIDDLE: 2,
  MID: 2,
  BOTTOM: 3,
  BOT: 3,
  UTILITY: 4,
  SUPPORT: 4,
};

/** Split participants into blue (100) and red (200), ordered by role */
function getTeams(m: MatchDto): { blue: Participant[]; red: Participant[] } {
  const participants = m.info?.participants ?? [];
  const byPos = (a: Participant, b: Participant) =>
    (POSITION_ORDER[a.teamPosition ?? ""] ?? 5) -
    (POSITION_ORDER[b.teamPosition ?? ""] ?? 5);
  const blue = participants
    .filter((p) => p.teamId === 100)
    .sort(byPos);
  const red = participants
    .filter((p) => p.teamId === 200)
    .sort(byPos);
  return { blue, red };
}

/** Queue ID to short label */
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

function isRankedQueue(queueId: number | undefined): boolean {
  return queueId === 420 || queueId === 440;
}

/** "14.6.xxx.xxx" -> "14.6" */
function patchFromVersion(gameVersion: string | undefined): string | null {
  if (!gameVersion) return null;
  const parts = gameVersion.split(".");
  if (parts.length >= 2) return `${parts[0]}.${parts[1]}`;
  return null;
}

function ChampIcon({
  championName,
  summonerName,
  ddragonVersion,
}: {
  championName: string;
  summonerName: string;
  ddragonVersion: string | null;
}) {
  const squareUrl = getChampionSquareUrl(championName, ddragonVersion);
  const [failed, setFailed] = useState(false);
  if (failed || !squareUrl) {
    return (
      <span
        className="profile-match-team-champ profile-match-team-champ-fallback"
        title={`${summonerName} · ${championName}`}
      >
        <span className="profile-match-team-champ-placeholder" aria-hidden />
      </span>
    );
  }
  return (
    <span
      className="profile-match-team-champ"
      title={`${summonerName} · ${championName}`}
    >
      <Image
        src={squareUrl}
        alt=""
        width={24}
        height={24}
        unoptimized={false}
        onError={() => setFailed(true)}
      />
    </span>
  );
}

function parseRiotIdFromQuery(riotIdParam: string | null) {
  if (!riotIdParam || typeof riotIdParam !== "string") return null;
  try {
    const decoded = decodeURIComponent(riotIdParam.trim());
    if (!decoded.includes("#")) return null;
    const parts = decoded.split("#");
    const gameName = parts[0]?.trim();
    const tagLine = parts[1]?.trim();
    if (!gameName || !tagLine) return null;
    return { gameName, tagLine };
  } catch {
    return null;
  }
}

function formatDuration(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

/** Map teamPosition to display label */
function roleLabel(pos: string | undefined): string {
  if (!pos) return "—";
  const upper = pos.toUpperCase();
  if (upper === "JUNGLE") return "Jungle";
  if (upper === "TOP") return "Top";
  if (upper === "MIDDLE" || upper === "MID") return "Mid";
  if (upper === "BOTTOM" || upper === "BOT") return "Bot";
  if (upper === "UTILITY" || upper === "SUPPORT") return "Support";
  return pos;
}

/** Most frequent teamPosition in matches for the given puuid */
function primaryRole(matches: MatchDto[], puuid: string): string {
  const counts: Record<string, number> = {};
  matches.forEach((m) => {
    const p = m.info?.participants?.find((x) => x.puuid === puuid);
    const pos = p?.teamPosition ?? "";
    if (pos) counts[pos] = (counts[pos] ?? 0) + 1;
  });
  const entries = Object.entries(counts);
  if (entries.length === 0) return "";
  entries.sort((a, b) => b[1] - a[1]);
  return roleLabel(entries[0][0]);
}

function SummonerProfileContent() {
  const searchParams = useSearchParams();
  const riotIdParam = searchParams.get("riotId");
  const parsed = parseRiotIdFromQuery(riotIdParam);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [account, setAccount] = useState<AccountDto | null>(null);
  const [summoner, setSummoner] = useState<SummonerDto | null>(null);
  const [matches, setMatches] = useState<MatchDto[]>([]);
  const [detailMatch, setDetailMatch] = useState<MatchDto | null>(null);
  const [ddragonVersion, setDdragonVersion] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/ddragon/version")
      .then((r) => r.json())
      .then((data: { version?: string }) => setDdragonVersion(data.version ?? null))
      .catch(() => setDdragonVersion(null));
  }, []);

  const fetchProfile = useCallback(async () => {
    if (!parsed) {
      setLoading(false);
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const accountRes = await fetchJsonWithRetry<AccountDto>(
        `/api/riot/account?gameName=${encodeURIComponent(parsed.gameName)}&tagLine=${encodeURIComponent(parsed.tagLine)}&region=${REGION}`,
        2
      );
      setAccount(accountRes);

      const [summonerRes, matchListRes] = await Promise.all([
        fetchJsonWithRetry<SummonerDto>(
          `/api/riot/summoner?puuid=${encodeURIComponent(accountRes.puuid)}&region=${REGION}`,
          2
        ),
        fetchJsonWithRetry<{ matchIds: string[] }>(
          `/api/riot/matches?puuid=${encodeURIComponent(accountRes.puuid)}&region=${REGION}&count=20`,
          2
        ),
      ]);
      setSummoner(summonerRes);

      const matchDetails = await mapWithConcurrency(
        matchListRes.matchIds.slice(0, 20),
        3,
        async (matchId) =>
          fetchJsonWithRetry<MatchDto>(
            `/api/riot/match?matchId=${encodeURIComponent(matchId)}&region=${REGION}`,
            3
          )
      );
      setMatches(matchDetails);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load summoner"
      );
      setAccount(null);
      setSummoner(null);
      setMatches([]);
    } finally {
      setLoading(false);
    }
  }, [parsed?.gameName, parsed?.tagLine]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  if (!riotIdParam) {
    return (
      <div className="profile-empty">
        <p>Missing Riot ID. Open a profile from search results.</p>
        <Link href="/search">Go to search</Link>
      </div>
    );
  }

  if (!parsed) {
    return (
      <div className="profile-empty">
        <p>Invalid Riot ID in URL. Use format GameName#Tag.</p>
        <Link href="/search">Go to search</Link>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="profile-loading">
        <div className="profile-loading-spinner" />
        <p className="mt-4">Loading profile...</p>
      </div>
    );
  }

  if (error || !account) {
    return (
      <div className="profile-empty">
        <p>{error ?? "Failed to load summoner"}</p>
        <button type="button" onClick={fetchProfile} className="mt-4 underline">
          Try again
        </button>
      </div>
    );
  }

  const participant = (m: MatchDto) =>
    m.info?.participants?.find((p) => p.puuid === account.puuid);
  const wins = matches.filter((m) => participant(m)?.win).length;
  const total = matches.length;
  const winRate = total ? Math.round((wins / total) * 100) : 0;

  const last10 = matches.slice(0, 10);
  let avgKills = 0,
    avgDeaths = 0,
    avgAssists = 0,
    totalCs = 0,
    totalDurationSec = 0;
  last10.forEach((m) => {
    const p = participant(m);
    if (p) {
      avgKills += p.kills;
      avgDeaths += p.deaths;
      avgAssists += p.assists;
      totalCs += (p.totalMinionsKilled ?? 0) + (p.neutralMinionsKilled ?? 0);
    }
    totalDurationSec += m.info?.gameDuration ?? 0;
  });
  const n = last10.length || 1;
  avgKills = Math.round((avgKills / n) * 10) / 10;
  avgDeaths = Math.round((avgDeaths / n) * 10) / 10;
  avgAssists = Math.round((avgAssists / n) * 10) / 10;
  const avgDurationMin = totalDurationSec / 60 / n;
  const avgCsPerMin =
    totalDurationSec > 0 ? totalCs / (totalDurationSec / 60) : 0;

  const role = primaryRole(matches, account.puuid);
  const level = summoner?.summonerLevel ?? 0;

  return (
    <>
      <section className="profile-hero">
        <div className="profile-hero-left">
          <div className="profile-hero-eyebrow">
            Summoner Profile · NA
          </div>
          <h1 className="profile-hero-name">
            {account.gameName}
            <span className="tag-part"> #{account.tagLine}</span>
          </h1>
          <div className="profile-hero-badges">
            <span className="profile-badge profile-badge-na">NA</span>
            {role && (
              <span className="profile-badge profile-badge-role">{role}</span>
            )}
            <span className="profile-badge profile-badge-level">
              Lv.{level}
            </span>
          </div>
        </div>
        <div className="profile-hero-right">
          <div className="profile-winrate-number">
            {winRate}<span className="pct">%</span>
          </div>
          <div className="profile-winrate-record">
            <span className="w">{wins}W</span> <span className="l">{total - wins}L</span>
          </div>
        </div>
      </section>

      <div className="profile-win-bar-wrap">
        <div
          className="profile-win-bar-fill"
          style={{ width: `${winRate}%` }}
        />
      </div>

      <div className="profile-stats-row">
        <div className="profile-stat-cell">
          <div className="profile-stat-label">Avg KDA</div>
          <div className="profile-stat-value blue">
            {avgKills} / {avgDeaths} / {avgAssists}
          </div>
        </div>
        <div className="profile-stat-cell">
          <div className="profile-stat-label">CS / Min</div>
          <div className="profile-stat-value">{avgCsPerMin.toFixed(1)}</div>
        </div>
        <div className="profile-stat-cell">
          <div className="profile-stat-label">Avg Duration</div>
          <div className="profile-stat-value">
            {avgDurationMin.toFixed(1)}<span className="unit">m</span>
          </div>
        </div>
        <div className="profile-stat-cell">
          <div className="profile-stat-label">Rank</div>
          <div className="profile-stat-value pending">Data coming soon</div>
        </div>
      </div>

      <div className="profile-matches-header">
        <h2 className="profile-matches-title">Recent Matches</h2>
        <span className="profile-matches-winrate">
          {total > 0 && `${winRate}% win rate`}
        </span>
      </div>
      <div className="profile-matches-list">
        {matches.map((m, matchIndex) => {
          const p = participant(m);
          if (!p) return null;
          const win = p.win;
          const duration = formatDuration(m.info?.gameDuration ?? 0);
          const durationShort = `${Math.floor((m.info?.gameDuration ?? 0) / 60)}m`;
          const cs = (p.totalMinionsKilled ?? 0) + (p.neutralMinionsKilled ?? 0);
          const rolePos = roleLabel(p.teamPosition);
          const { blue, red } = getTeams(m);
          const queue = queueLabel(m.info?.queueId);
          const patch = patchFromVersion(m.info?.gameVersion);
          const showLp = isRankedQueue(m.info?.queueId);

          // Verify participant.skin: log once for first match (browser console)
          if (matchIndex === 0 && typeof window !== "undefined") {
            console.log("[profile] First match participant.skin:", p.skin);
            console.log(
              "[profile] First match participant keys:",
              Object.keys(p).sort().join(", ")
            );
          }

          const skinNumber =
            p.skin != null && p.skin > 0 ? p.skin : null;
          const portraitSkinUrl =
            skinNumber != null
              ? getChampionSplashUrlWithSkin(p.championName, skinNumber)
              : null;
          const portraitBaseUrl = getChampionSplashUrl(p.championName);
          const champSquareUrl = getChampionSquareUrl(
            p.championName,
            ddragonVersion
          );
          const initialPortraitSrc = portraitSkinUrl ?? portraitBaseUrl;
          const portraitTitle =
            skinNumber != null
              ? `Skin ${skinNumber}`
              : "Skin data unavailable from match payload.";

          return (
            <button
              key={m.metadata?.matchId ?? ""}
              type="button"
              className={`profile-match-row ${win ? "win" : "loss"}`}
              onClick={() => setDetailMatch(m)}
            >
              <span className={`profile-outcome-pill ${win ? "win" : "loss"}`}>
                {win ? "W" : "L"}
              </span>
              <span className={`profile-verdict-line ${win ? "win" : "loss"}`} />
              <div className="profile-match-main">
                <div className="profile-match-portrait-meta">
                  <div className="profile-match-portrait-wrap">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={initialPortraitSrc}
                      alt=""
                      className="profile-match-portrait"
                      width={64}
                      height={64}
                      title={portraitTitle}
                      onError={(e) => {
                        const target = e.currentTarget;
                        if (
                          portraitSkinUrl &&
                          target.src === portraitSkinUrl
                        ) {
                          target.src = portraitBaseUrl;
                        } else if (target.src === portraitBaseUrl) {
                          target.src = champSquareUrl;
                        } else {
                          target.style.display = "none";
                        }
                      }}
                    />
                  </div>
                  <div className="profile-match-meta-col">
                    <div className="profile-match-meta-row">
                      <span>{rolePos}</span> · {duration} · {cs} CS
                    </div>
                    <div className="profile-match-queue-patch">
                      {queue}, {durationShort}
                      {patch != null && `, Patch ${patch}`}
                    </div>
                    {showLp && (
                      <div className="profile-match-lp">LP data coming soon</div>
                    )}
                  </div>
                </div>
                <div className="profile-match-teams">
                  <div className="profile-match-team" aria-label="Blue team">
                    {blue.slice(0, 5).map((part) => (
                      <ChampIcon
                        key={part.puuid}
                        championName={part.championName}
                        summonerName={part.summonerName}
                        ddragonVersion={ddragonVersion}
                      />
                    ))}
                  </div>
                  <div className="profile-match-vs">vs</div>
                  <div className="profile-match-team" aria-label="Red team">
                    {red.slice(0, 5).map((part) => (
                      <ChampIcon
                        key={part.puuid}
                        championName={part.championName}
                        summonerName={part.summonerName}
                        ddragonVersion={ddragonVersion}
                      />
                    ))}
                  </div>
                </div>
              </div>
              <div>
                <div className="profile-kda-display">
                  <span className="k">{p.kills}</span> /{" "}
                  <span className="d">{p.deaths}</span> /{" "}
                  <span className="a">{p.assists}</span>
                </div>
                <div className="profile-kda-label">K / D / A</div>
              </div>
              <div className="profile-cs-display">
                <div className="cs-main">{cs}</div>
                <div className="cs-sub">CS</div>
              </div>
            </button>
          );
        })}
      </div>

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

export default function SummonerPage() {
  return (
    <Suspense
      fallback={
        <div className="profile-loading">
          <div className="profile-loading-spinner" />
          <p className="mt-4">Loading...</p>
        </div>
      }
    >
      <SummonerProfileContent />
    </Suspense>
  );
}
