import type { MatchDto } from "@/types/riot";

export type RecentlyPlayedWithEntry = {
  puuid: string;
  /** Display name: Riot ID (gameName#tagLine) when available, else summonerName */
  displayName: string;
  /** Riot ID for linking (gameName#tagLine) when available */
  riotId: string | null;
  games: number;
  wins: number;
  /** Primary role = most played position in these games */
  primaryRole: string;
  /** Position counts for tooltip/breakdown */
  roleCounts: Record<string, number>;
  /** Profile icon ID when available (e.g. from summoner); fallback to default in UI */
  profileIconId?: number;
};

const POSITION_LABELS: Record<string, string> = {
  TOP: "Top",
  JUNGLE: "Jungle",
  MIDDLE: "Mid",
  BOTTOM: "Bot",
  UTILITY: "Support",
};

/** Normalize team position / individual position for display. */
function normalizePosition(teamPosition?: string, individualPosition?: string): string {
  const raw = teamPosition || individualPosition || "";
  if (raw in POSITION_LABELS) return POSITION_LABELS[raw];
  if (raw.startsWith("MID")) return "Mid";
  if (raw.startsWith("TOP") || raw === "TOP") return "Top";
  if (raw.startsWith("JUNGLE") || raw === "JUNGLE") return "Jungle";
  if (raw.startsWith("BOTTOM") || raw === "BOTTOM") return "Bot";
  if (raw.startsWith("UTILITY") || raw === "UTILITY") return "Support";
  return raw || "—";
}

/**
 * From the viewing user's matches, compute teammates (same team) and aggregate
 * games, wins, and primary role. Excludes the viewing user. Sorted by games desc.
 */
export function computeRecentlyPlayedWith(matches: MatchDto[], myPuuid: string): RecentlyPlayedWithEntry[] {
  const byPuuid = new Map<
    string,
    { displayName: string; riotId: string | null; games: number; wins: number; roleCounts: Record<string, number> }
  >();

  for (const match of matches) {
    const participants = match.info?.participants ?? [];
    const myIndex = participants.findIndex((p) => p.puuid === myPuuid);
    if (myIndex < 0) continue;

    const me = participants[myIndex];
    // Riot: teamId 100 = blue, 200 = red. When missing, assume order 0-4 = blue, 5-9 = red.
    const myTeamId = me.teamId ?? (myIndex < 5 ? 100 : 200);
    const myTeam = participants.filter(
      (p, i) => p.puuid !== myPuuid && (p.teamId ?? (i < 5 ? 100 : 200)) === myTeamId
    );
    for (const p of myTeam) {
      const pos = normalizePosition(p.teamPosition, p.individualPosition);
      const riotId =
        p.riotIdGameName && p.riotIdTagline ? `${p.riotIdGameName}#${p.riotIdTagline}` : null;
      const displayName = riotId ?? p.summonerName ?? p.puuid;

      const existing = byPuuid.get(p.puuid);
      if (existing) {
        existing.games += 1;
        if (p.win) existing.wins += 1;
        existing.roleCounts[pos] = (existing.roleCounts[pos] ?? 0) + 1;
        if (riotId) existing.riotId = riotId;
        if (displayName && displayName !== p.puuid) existing.displayName = displayName;
      } else {
        byPuuid.set(p.puuid, {
          displayName,
          riotId,
          games: 1,
          wins: p.win ? 1 : 0,
          roleCounts: { [pos]: 1 },
        });
      }
    }
  }

  return Array.from(byPuuid.entries())
    .map(([puuid, agg]) => {
      const roles = Object.entries(agg.roleCounts);
      const primary = roles.length
        ? roles.sort((a, b) => b[1] - a[1])[0][0]
        : "—";
      return {
        puuid,
        displayName: agg.displayName,
        riotId: agg.riotId,
        games: agg.games,
        wins: agg.wins,
        primaryRole: primary,
        roleCounts: agg.roleCounts,
      };
    })
    .sort((a, b) => b.games - a.games);
}
