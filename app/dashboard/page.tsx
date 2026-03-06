"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  getChampionSplashUrl,
  getProfileIconUrl,
  isValidItemId,
  DEFAULT_DDRAGON_VERSION,
} from "@/lib/riotAssets";
import { fetchJsonWithRetry, mapWithConcurrency } from "@/lib/fetchUtils";
import { computeImpactScore } from "@/lib/impactScore";
import { getMatchBadges, getBadgeCategory } from "@/lib/matchBadges";

type SearchState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "error"; message: string; statusCode?: number }
  | { status: "ready" };

type AccountDto = {
  puuid: string;
  gameName: string;
  tagLine: string;
};

type SummonerDto = {
  id: string;
  accountId: string;
  puuid: string;
  name: string;
  profileIconId: number;
  summonerLevel: number;
};

type MatchListDto = {
  matchIds: string[];
};

type ParticipantDto = {
  puuid: string;
  summonerName: string;
  championName: string;
  kills: number;
  deaths: number;
  assists: number;
  win: boolean;
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
};

type MatchDto = {
  metadata: { matchId: string };
  info: {
    gameDuration: number;
    participants: ParticipantDto[];
  };
};

function parseRiotId(input: string) {
  const trimmed = input.trim();
  const parts = trimmed.split("#");
  if (parts.length !== 2) return null;

  const gameName = parts[0].trim();
  const tagLine = parts[1].trim();

  if (!gameName || !tagLine) return null;
  return { gameName, tagLine, riotId: `${gameName}#${tagLine}` };
}

function formatDuration(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  const ss = s.toString().padStart(2, "0");
  return `${m}:${ss}`;
}

function getCs(p: ParticipantDto) {
  const lane = p.totalMinionsKilled || 0;
  const jungle = p.neutralMinionsKilled || 0;
  return lane + jungle;
}

function dashboardBadgeChipClass(badge: string): string {
  const cat = getBadgeCategory(badge);
  switch (cat) {
    case "gold":
      return "border-amber-500/50 bg-amber-500/15 text-amber-700";
    case "positive":
      return "border-emerald-500/40 bg-emerald-500/15 text-emerald-700";
    case "negative":
      return "border-red-500/40 bg-red-500/12 text-red-600";
    default:
      return "border-white/15 bg-white/10 text-zinc-400";
  }
}

export default function DashboardRiotSearchPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const riotIdFromUrl = searchParams.get("riotId");
  const parsedRiotIdFromUrl = (() => {
    if (!riotIdFromUrl) return null;
    try {
      const decoded = decodeURIComponent(riotIdFromUrl);
      if (!decoded.includes("#")) return null;
      return parseRiotId(decoded);
    } catch {
      return null;
    }
  })();
  const invalidQueryRiotId = Boolean(riotIdFromUrl) && !parsedRiotIdFromUrl;

  const [riotId, setRiotId] = useState(() => parsedRiotIdFromUrl?.riotId ?? "");
  const [state, setState] = useState<SearchState>({ status: "idle" });

  const [account, setAccount] = useState<AccountDto | null>(null);
  const [summoner, setSummoner] = useState<SummonerDto | null>(null);
  const [matches, setMatches] = useState<MatchDto[]>([]);

  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [saveHistoryError, setSaveHistoryError] = useState<string | null>(null);
  const debounceRef = useRef<number | null>(null);
  const activeFetchRef = useRef(0);
  const hasRunQueryRef = useRef(false);

  const winStats = useMemo(() => {
    if (!account || matches.length === 0) return null;

    let wins = 0;
    for (const m of matches) {
      const p = m.info.participants.find((x) => x.puuid === account.puuid);
      if (p?.win) wins += 1;
    }
    const total = matches.length;
    const rate = total ? Math.round((wins / total) * 100) : 0;
    return { wins, total, rate };
  }, [account, matches]);

  const trackSuccessfulSearch = useCallback(
    async (
      parsed: { riotId: string; gameName: string; tagLine: string },
      puuid: string,
      profileIconId?: number,
      summonerLevel?: number
    ) => {
      try {
        const res = await fetch("/api/search/suggestions", {
          method: "POST",
          headers: { "content-type": "application/json" },
          cache: "no-store",
          body: JSON.stringify({
            riotId: parsed.riotId,
            gameName: parsed.gameName,
            tagLine: parsed.tagLine,
            puuid,
            profileIconId,
            summonerLevel,
          }),
        });
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        if (!res.ok) {
          console.warn(
            "[dashboard] Failed to save search to history:",
            res.status,
            body
          );
          setSaveHistoryError(body?.error ?? `HTTP ${res.status}`);
        } else {
          setSaveHistoryError(null);
        }
      } catch (err) {
        console.warn("[dashboard] Error saving search to history:", err);
        setSaveHistoryError(err instanceof Error ? err.message : "Network error");
      }
    },
    []
  );

  const doSearch = useCallback(
    async (riotIdInput: string) => {
      const parsed = parseRiotId(riotIdInput);
      if (!parsed) {
        setState({ status: "error", message: "Enter both name and tag" });
        return;
      }

      setShowSuggestions(false);
      setSaveHistoryError(null);
      setState({ status: "loading" });
      setAccount(null);
      setSummoner(null);
      setMatches([]);

      try {
        const accountJson = await fetchJsonWithRetry<AccountDto>(
          `/api/riot/account?gameName=${encodeURIComponent(parsed.gameName)}&tagLine=${encodeURIComponent(parsed.tagLine)}`,
          2
        );
        setAccount(accountJson);

        const summonerJson = await fetchJsonWithRetry<SummonerDto>(
          `/api/riot/summoner?puuid=${encodeURIComponent(accountJson.puuid)}`,
          2
        );
        setSummoner(summonerJson);

        const matchListJson = await fetchJsonWithRetry<MatchListDto>(
          `/api/riot/matches?puuid=${encodeURIComponent(accountJson.puuid)}&count=20`,
          2
        );

        const matchDetails = await mapWithConcurrency(
          matchListJson.matchIds,
          3,
          async (matchId) => {
            return await fetchJsonWithRetry<MatchDto>(
              `/api/riot/match?matchId=${encodeURIComponent(matchId)}`,
              3
            );
          }
        );

        setMatches(matchDetails);

        await trackSuccessfulSearch(
          parsed,
          accountJson.puuid,
          summonerJson.profileIconId,
          summonerJson.summonerLevel
        );

        setState({ status: "ready" });
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Unknown error";
        const statusCode = (err as Error & { status?: number })?.status;
        setState({
          status: "error",
          message,
          statusCode,
        });
      }
    },
    [trackSuccessfulSearch]
  );

  useEffect(() => {
    if (!riotIdFromUrl) {
      hasRunQueryRef.current = false;
      return;
    }
    if (hasRunQueryRef.current) return;
    if (!parsedRiotIdFromUrl) return;
    hasRunQueryRef.current = true;
    const id = parsedRiotIdFromUrl.riotId;
    const t = window.setTimeout(() => {
      void doSearch(id);
    }, 0);
    return () => window.clearTimeout(t);
  }, [riotIdFromUrl, parsedRiotIdFromUrl, doSearch]);

  useEffect(() => {
    const trimmed = riotId.trim();
    if (trimmed.length < 2) {
      activeFetchRef.current += 1;
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
      return;
    }

    if (debounceRef.current) window.clearTimeout(debounceRef.current);

    debounceRef.current = window.setTimeout(async () => {
      const id = activeFetchRef.current + 1;
      activeFetchRef.current = id;

      try {
        const res = await fetch(
          `/api/search/suggestions?q=${encodeURIComponent(trimmed)}`,
          { cache: "no-store" }
        );
        if (!res.ok) return;
        const json = await res.json();
        if (activeFetchRef.current !== id) return;

        const list = json.suggestions || [];
        setSuggestions(
          list.map((r: { riotId?: string }) =>
            typeof r === "string" ? r : (r?.riotId ?? "")
          )
        );
      } catch {
        // ignore
      }
    }, 180);

    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
  }, [riotId]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (riotId.includes("#")) {
      await doSearch(riotId);
      return;
    }

    const trimmed = riotId.trim();
    if (trimmed.length < 2) {
      setState({
        status: "error",
        message: "Enter at least 2 characters to search.",
      });
      return;
    }

    router.push(`/search?q=${encodeURIComponent(trimmed)}`);
  }

  function pickSuggestion(s: string) {
    setRiotId(s);
    setShowSuggestions(false);
    void doSearch(s);
  }

  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">League Match History</h1>
          <p className="mt-2 text-sm text-zinc-400">
            Search by game name or full Riot ID (GameName#Tag).
          </p>
        </div>
        <Link
          href="/search"
          className="shrink-0 rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm font-medium text-white hover:bg-white/10"
        >
          Search again
        </Link>
      </div>

      <form onSubmit={onSubmit} className="relative mt-5 flex gap-2">
        <div className="relative w-full">
          <input
            value={riotId}
            onChange={(e) => {
              setRiotId(e.target.value);
              setShowSuggestions(true);
            }}
            onFocus={() => setShowSuggestions(true)}
            placeholder="GameName#Tag"
            className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white placeholder-zinc-500 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
          />

          {showSuggestions && suggestions.length > 0 && (
            <div className="absolute z-20 mt-2 w-full overflow-hidden rounded-xl border border-white/10 bg-zinc-900">
              {suggestions.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => pickSuggestion(s)}
                  className="flex w-full items-center justify-between px-4 py-3 text-left text-sm text-white hover:bg-white/10"
                >
                  <span>{s}</span>
                  <span className="text-zinc-500">suggestion</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <button
          type="submit"
          disabled={state.status === "loading"}
          className="rounded-xl border border-white/10 bg-indigo-500 px-4 py-3 font-semibold text-white hover:bg-indigo-600 disabled:opacity-60"
        >
          {state.status === "loading" ? "Searching..." : "Search"}
        </button>
      </form>

      {state.status === "error" && (
        <div className="mt-5 rounded-2xl border border-red-500/20 bg-red-500/10 p-4">
          <div className="font-semibold text-red-200">Error</div>
          <div className="mt-1 text-sm text-red-300/90">
            {state.statusCode === 401
              ? "Riot dev key expired."
              : state.statusCode === 429
                ? "Rate limited. Reduce match detail concurrency."
                : state.statusCode === 403 &&
                    process.env.NODE_ENV === "production"
                  ? "Dev key cannot be used on public deployment."
                  : state.message}
          </div>
          {state.statusCode != null && (
            <div className="mt-2 text-xs text-zinc-400">
              Status: {state.statusCode}
            </div>
          )}
        </div>
      )}

      {invalidQueryRiotId && (
        <p className="mt-4 text-sm text-amber-400">
          Invalid Riot ID in URL. Use format GameName#Tag.
        </p>
      )}
      {saveHistoryError && (
        <p className="mt-4 text-sm text-amber-400">
          Search history could not be saved: {saveHistoryError}
        </p>
      )}
      {account && summoner && (
        <div className="mt-6 flex items-center justify-between gap-4 rounded-2xl border border-white/10 glass p-5">
          <Link
            href={`/summoner?riotId=${encodeURIComponent(`${account.gameName}#${account.tagLine}`)}&region=na1`}
            className="flex items-center gap-4 min-w-0 flex-1 hover:opacity-90 transition-opacity"
          >
            <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-white/10">
              <Image
                src={getProfileIconUrl(summoner.profileIconId || 29)}
                alt=""
                fill
                className="object-cover"
                unoptimized
              />
            </div>

            <div className="min-w-0">
              <div className="text-xl font-bold text-white">
                {account.gameName}#{account.tagLine}
              </div>
              <div className="mt-1 text-sm text-zinc-400">
                Level {summoner.summonerLevel}
              </div>
              <div className="mt-1 text-xs text-indigo-400">
                View full profile →
              </div>
            </div>
          </Link>

          {winStats && (
            <div className="text-right">
              <div className="text-lg font-bold text-white">
                {winStats.rate}% win rate
              </div>
              <div className="mt-1 text-sm text-zinc-400">
                {winStats.wins}W {winStats.total - winStats.wins}L (last{" "}
                {winStats.total})
              </div>
            </div>
          )}
        </div>
      )}

      {matches.length > 0 && account && (
        <div className="mt-6">
          <div className="mb-3 text-sm font-semibold text-zinc-300">
            Recent matches {winStats ? `• ${winStats.rate}% win rate` : ""}
          </div>

          <div className="grid gap-3">
            {matches.map((m) => {
              const p = m.info.participants.find(
                (x) => x.puuid === account.puuid
              );
              if (!p) return null;

              const splash = getChampionSplashUrl(p.championName);
              const result = p.win ? "W" : "L";
              const duration = formatDuration(m.info.gameDuration);
              const cs = getCs(p);
              const impact = computeImpactScore(m, account.puuid);
              const badges = getMatchBadges(m);
              const badgeInfo = badges.get(account.puuid);

              const itemSlots = [
                p.item0,
                p.item1,
                p.item2,
                p.item3,
                p.item4,
                p.item5,
                p.item6,
              ];

              return (
                <div
                  key={m.metadata.matchId}
                  className="relative rounded-2xl border border-white/10 bg-black/30"
                >
                  {splash && (
                    <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl">
                      <Image
                        src={splash}
                        alt={p.championName}
                        fill
                        className="object-cover opacity-25"
                      />
                    </div>
                  )}

                  <div className="relative flex items-center justify-between gap-4 p-4 badgeArea socialBadgeWrap">
                    <div className="flex items-center gap-4">
                      <div className="flex flex-col items-center gap-0.5 shrink-0">
                        <div
                          className={`flex h-12 w-12 items-center justify-center rounded-xl font-bold ${
                            p.win
                              ? "bg-emerald-500/20 text-emerald-200"
                              : "bg-red-500/20 text-red-200"
                          }`}
                        >
                          {result}
                        </div>
                        <div className="flex flex-row items-center gap-2 flex-wrap justify-center">
                          {impact != null && (
                            <span className="inline-flex items-baseline gap-1 rounded-md border-[1.5px] border-white/20 bg-white/5 px-2.5 py-1 shadow-sm">
                              <span className="text-[10px] font-medium uppercase tracking-wide text-zinc-400">Impact</span>
                              <span className="text-sm font-bold text-white">{impact.score}</span>
                            </span>
                          )}
                          {badgeInfo && (
                            <span
                              className={`socialBadge ${dashboardBadgeChipClass(
                                badgeInfo.badge
                              )}`}
                              title={badgeInfo.reason}
                            >
                              <span className="socialBadgeText">
                                {badgeInfo.badge}
                              </span>
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="min-w-0">
                        <div className="text-base font-bold text-white">
                          {p.championName}
                        </div>
                        <div className="mt-1 text-sm text-zinc-400">
                          {(p.teamPosition || "UNKNOWN").toUpperCase()} · KDA{" "}
                          {p.kills}/{p.deaths}/{p.assists} · {cs} CS · {duration}
                        </div>
                      </div>
                    </div>

                    <div className="flex shrink-0 items-center gap-2">
                      {itemSlots.slice(0, 7).map((itemId, idx) =>
                        isValidItemId(itemId) ? (
                          <img
                            key={itemId}
                            src={`https://ddragon.leagueoflegends.com/cdn/${DEFAULT_DDRAGON_VERSION}/img/item/${itemId}.png`}
                            alt={`Item ${itemId}`}
                            loading="lazy"
                            decoding="async"
                            className="h-9 w-9 rounded-lg border border-white/10 bg-black/30 object-cover"
                            onError={(e) => {
                              (e.currentTarget as HTMLImageElement).style.display = "none";
                            }}
                          />
                        ) : (
                          <div
                            key={idx}
                            className="item-slot-empty h-9 w-9 rounded-lg border border-white/10 bg-black/30"
                          />
                        )
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
