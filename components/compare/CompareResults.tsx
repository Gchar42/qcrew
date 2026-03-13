"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import {
  getRankEmblemUrl,
  getChampionSquareUrl,
  getChampionSplashUrl,
  getProfileIconUrl,
} from "@/lib/riotAssets";

/* ── Types ──────────────────────────────────────────────── */

export type QueueStats = {
  tier: string;
  rank: string;
  lp: number;
  wins: number;
  losses: number;
  wr: number;
  topChamps: { name: string; games: number; winRate: number }[];
};

export type CompareStats = {
  name: string;
  tag: string;
  region: string;
  level: number;
  profileIconId: number;
  solo: QueueStats;
  flex: QueueStats;
  matchCount: number;
  avgKda: string;
  csPerMin: number;
  avgDuration: number;
  avgRankPlayed: string;
  totalKills: number;
  totalDeaths: number;
  totalAssists: number;
  ddragonVersion: string | null;
  recentForm: boolean[];
  roleDistribution: { role: string; count: number; pct: number }[];
  avgDamage: number;
  avgGold: number;
  avgVision: number;
  avgObjDamage: number;
  streak: { type: "win" | "loss"; count: number };
};

/* ── Constants ──────────────────────────────────────────── */

const TIER_ORDER: Record<string, number> = {
  CHALLENGER: 9, GRANDMASTER: 8, MASTER: 7, DIAMOND: 6,
  EMERALD: 5, PLATINUM: 4, GOLD: 3, SILVER: 2, BRONZE: 1, IRON: 0,
};

const TIER_COLORS: Record<string, string> = {
  CHALLENGER: "#F59E0B", GRANDMASTER: "#EF4444", MASTER: "#A855F7",
  DIAMOND: "#22D3EE", EMERALD: "#34D399", PLATINUM: "#2DD4BF",
  GOLD: "#FACC15", SILVER: "#A1A1AA", BRONZE: "#FB923C", IRON: "#78716C",
};

const ROLE_LABELS: Record<string, string> = {
  TOP: "Top", JUNGLE: "Jungle", MIDDLE: "Mid", BOTTOM: "ADC", UTILITY: "Support",
};
const ROLE_ORDER = ["TOP", "JUNGLE", "MIDDLE", "BOTTOM", "UTILITY"];

const REGION_LABELS: Record<string, string> = {
  na1: "NA", euw1: "EUW", eun1: "EUNE", kr: "KR", jp1: "JP",
  br1: "BR", la1: "LAN", la2: "LAS", oc1: "OCE", tr1: "TR", ru: "RU",
};

/* ── Helpers ────────────────────────────────────────────── */

function formatTier(tier: string, rank: string): string {
  if (!tier) return "Unranked";
  return `${tier.charAt(0)}${tier.slice(1).toLowerCase()} ${rank}`.trim();
}

function parseKda(kda: string) {
  const parts = kda.split("/").map((s) => parseFloat(s.trim()));
  const k = parts[0] || 0;
  const d = parts[1] || 0;
  const a = parts[2] || 0;
  const ratio = d === 0 ? k + a : (k + a) / d;
  return { k, d, a, ratio: Math.round(ratio * 100) / 100 };
}

function tierScore(tier: string, rank: string, lp: number): number {
  const base = (TIER_ORDER[tier.toUpperCase()] ?? -1) * 400;
  const rankBonus: Record<string, number> = { IV: 0, III: 100, II: 200, I: 300 };
  return base + (rankBonus[rank] ?? 0) + lp;
}

type VerdictCategory = {
  label: string;
  winner: 0 | 1 | 2;
  v1: number;
  v2: number;
  d1: string;
  d2: string;
};

function computeVerdict(
  s1: CompareStats,
  s2: CompareStats,
  queue: "solo" | "flex",
): { categories: VerdictCategory[]; p1Score: number; p2Score: number } {
  const q1 = s1[queue];
  const q2 = s2[queue];
  const kda1 = parseKda(s1.avgKda);
  const kda2 = parseKda(s2.avgKda);
  const recent1 = s1.recentForm.slice(0, 10).filter(Boolean).length;
  const recent2 = s2.recentForm.slice(0, 10).filter(Boolean).length;

  const pairs: [string, number, number, string, string][] = [
    ["Rank", tierScore(q1.tier, q1.rank, q1.lp), tierScore(q2.tier, q2.rank, q2.lp), formatTier(q1.tier, q1.rank), formatTier(q2.tier, q2.rank)],
    ["Win Rate", q1.wr, q2.wr, `${q1.wr}%`, `${q2.wr}%`],
    ["KDA", kda1.ratio, kda2.ratio, kda1.ratio.toFixed(2), kda2.ratio.toFixed(2)],
    ["CS/min", s1.csPerMin, s2.csPerMin, s1.csPerMin.toFixed(1), s2.csPerMin.toFixed(1)],
    ["Damage", s1.avgDamage, s2.avgDamage, s1.avgDamage > 0 ? `${(s1.avgDamage / 1000).toFixed(1)}k` : "\u2014", s2.avgDamage > 0 ? `${(s2.avgDamage / 1000).toFixed(1)}k` : "\u2014"],
    ["Vision", s1.avgVision, s2.avgVision, s1.avgVision.toFixed(1), s2.avgVision.toFixed(1)],
    ["Form", recent1, recent2, `${recent1}/10`, `${recent2}/10`],
    ["Gold", s1.avgGold, s2.avgGold, s1.avgGold > 0 ? `${(s1.avgGold / 1000).toFixed(1)}k` : "\u2014", s2.avgGold > 0 ? `${(s2.avgGold / 1000).toFixed(1)}k` : "\u2014"],
  ];

  let p1Score = 0;
  let p2Score = 0;
  const categories: VerdictCategory[] = pairs.map(([label, v1, v2, d1, d2]) => {
    const winner: 0 | 1 | 2 = v1 > v2 ? 1 : v2 > v1 ? 2 : 0;
    if (winner === 1) p1Score++;
    if (winner === 2) p2Score++;
    return { label, winner, v1, v2, d1, d2 };
  });

  return { categories, p1Score, p2Score };
}

function generateVerdictSentence(
  categories: VerdictCategory[],
  name1: string,
  name2: string,
): string {
  const withGap = categories
    .filter((c) => c.winner !== 0)
    .map((c) => {
      const avg = (c.v1 + c.v2) / 2;
      const relGap = avg > 0 ? Math.abs(c.v1 - c.v2) / avg : 0;
      return { ...c, relGap };
    })
    .sort((a, b) => b.relGap - a.relGap);

  if (withGap.length === 0) {
    return "Statistically identical \u2014 nothing separates these two.";
  }

  const top = withGap[0];
  const topWinner = top.winner === 1 ? name1 : name2;
  const topBetter = top.winner === 1 ? top.d1 : top.d2;
  const topWorse = top.winner === 1 ? top.d2 : top.d1;

  if (withGap.length === 1) {
    return `Nearly identical stats \u2014 the gap is in ${top.label}: ${topBetter} vs ${topWorse}.`;
  }

  const second = withGap[1];
  const secondWinner = second.winner === 1 ? name1 : name2;
  const secondBetter = second.winner === 1 ? second.d1 : second.d2;
  const secondWorse = second.winner === 1 ? second.d2 : second.d1;

  if (top.winner === second.winner) {
    return `${topWinner} pulls ahead in ${top.label} (${topBetter} vs ${topWorse}) and ${second.label} (${secondBetter} vs ${secondWorse}).`;
  }

  return `${topWinner} has better ${top.label} (${topBetter} vs ${topWorse}) but ${secondWinner} edges in ${second.label} (${secondBetter} vs ${secondWorse}).`;
}

function activityDotColor(pct: number): string {
  if (pct >= 50) return "#22c55e";
  if (pct >= 30) return "#facc15";
  return "#6b7a90";
}

function getViewerInfo(): { riotId: string; region: string } | null {
  try {
    const raw = localStorage.getItem("statgap_recent");
    if (!raw) return null;
    const arr = JSON.parse(raw);
    if (Array.isArray(arr) && arr.length > 0 && arr[0].riotId && arr[0].region) {
      return { riotId: arr[0].riotId, region: arr[0].region };
    }
  } catch {
    /* ignore */
  }
  return null;
}

/* ── Sub-Components ─────────────────────────────────────── */

function PlayerHeader({ stats }: { stats: CompareStats }) {
  const region = REGION_LABELS[stats.region.toLowerCase()] ?? stats.region.toUpperCase();
  return (
    <div className="cr-player-header">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        className="cr-player-icon"
        src={getProfileIconUrl(stats.profileIconId, stats.ddragonVersion)}
        alt=""
        width={72}
        height={72}
      />
      <div className="cr-player-name">
        {stats.name}
        <span className="cr-player-tag">#{stats.tag}</span>
      </div>
      <div className="cr-player-meta">
        <span className="cr-player-level">Lv. {stats.level}</span>
        <span className="cr-player-region">{region}</span>
      </div>
      {stats.streak.count >= 3 && (
        <div className={`cr-streak cr-streak-${stats.streak.type}`}>
          {stats.streak.type === "win" ? "🔥" : "💀"} {stats.streak.count}
          {stats.streak.type === "win" ? "W streak" : "L streak"}
        </div>
      )}
    </div>
  );
}

function RankDisplay({
  tier,
  rank,
  lp,
}: {
  tier: string;
  rank: string;
  lp: number;
}) {
  const color = TIER_COLORS[tier.toUpperCase()] ?? "#6b7a90";
  if (!tier)
    return (
      <div className="cr-rank">
        <span className="cr-rank-tier" style={{ color: "#6b7a90" }}>
          Unranked
        </span>
      </div>
    );
  return (
    <div className="cr-rank">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        className="cr-rank-emblem"
        src={getRankEmblemUrl(tier)}
        alt=""
        width={56}
        height={56}
      />
      <span className="cr-rank-tier" style={{ color }}>
        {formatTier(tier, rank)}
      </span>
      <span className="cr-rank-lp">{lp} LP</span>
    </div>
  );
}

function StatRow({
  left,
  right,
  label,
  higherIsBetter = true,
}: {
  left: string | number;
  right: string | number;
  label: string;
  higherIsBetter?: boolean;
}) {
  const lNum = typeof left === "number" ? left : parseFloat(String(left));
  const rNum = typeof right === "number" ? right : parseFloat(String(right));
  const lValid = !isNaN(lNum);
  const rValid = !isNaN(rNum);

  let lClass = "neutral";
  let rClass = "neutral";
  if (lValid && rValid && lNum !== rNum) {
    const lBetter = higherIsBetter ? lNum > rNum : lNum < rNum;
    lClass = lBetter ? "better" : "worse";
    rClass = lBetter ? "worse" : "better";
  }

  return (
    <div className="cr-stat-row">
      <div className={`cr-stat-value cr-stat-left ${lClass}`}>{left}</div>
      <div className="cr-stat-label">{label}</div>
      <div className={`cr-stat-value cr-stat-right ${rClass}`}>{right}</div>
    </div>
  );
}

function FormDots({ form }: { form: boolean[] }) {
  const recent = form.slice(0, 10);
  const wins = recent.filter(Boolean).length;
  const losses = recent.length - wins;
  return (
    <div className="cr-form">
      <div className="cr-form-dots">
        {recent.map((w, i) => (
          <span
            key={i}
            className={`cr-form-dot ${w ? "cr-dot-win" : "cr-dot-loss"}`}
          />
        ))}
        {recent.length === 0 && (
          <span className="cr-no-data">No recent games</span>
        )}
      </div>
      {recent.length > 0 && (
        <div className="cr-form-summary">
          <span className="cr-form-wins">{wins}W</span>
          <span className="cr-form-losses">{losses}L</span>
        </div>
      )}
    </div>
  );
}

function RoleBar({ role, pct }: { role: string; pct: number }) {
  return (
    <div className="cr-role-row">
      <span className="cr-role-name">{ROLE_LABELS[role] ?? role}</span>
      <div className="cr-role-track">
        <div
          className="cr-role-fill"
          style={{
            width: `${Math.min(pct, 100)}%`,
            background: activityDotColor(pct),
          }}
        />
      </div>
      <span className="cr-role-pct">{pct}%</span>
    </div>
  );
}

function ChampRow({
  champ,
  version,
}: {
  champ: { name: string; games: number; winRate: number };
  version: string | null;
}) {
  return (
    <div className="cr-champ-row">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        className="cr-champ-icon"
        src={getChampionSquareUrl(champ.name, version)}
        alt={champ.name}
        title={`${champ.name} — ${champ.winRate}% WR (${champ.games} games)`}
        width={32}
        height={32}
      />
      <span className="cr-champ-name">{champ.name}</span>
      <span
        className={`cr-champ-wr ${champ.winRate >= 50 ? "cr-wr-pos" : "cr-wr-neg"}`}
      >
        {champ.winRate}%
      </span>
      <span className="cr-champ-games">{champ.games}G</span>
    </div>
  );
}

/* ── Main Component ─────────────────────────────────────── */

export default function CompareResults({
  stats1,
  stats2,
}: {
  stats1: CompareStats;
  stats2: CompareStats;
}) {
  const [queue, setQueue] = useState<"solo" | "flex">("solo");
  const [copied, setCopied] = useState(false);
  const [viewerInfo, setViewerInfo] = useState<{
    riotId: string;
    region: string;
  } | null>(null);

  useEffect(() => {
    setViewerInfo(getViewerInfo());
  }, []);

  const q1 = stats1[queue];
  const q2 = stats2[queue];
  const kda1 = useMemo(() => parseKda(stats1.avgKda), [stats1.avgKda]);
  const kda2 = useMemo(() => parseKda(stats2.avgKda), [stats2.avgKda]);
  const verdict = useMemo(
    () => computeVerdict(stats1, stats2, queue),
    [stats1, stats2, queue],
  );

  const p1Roles = useMemo(
    () => new Map(stats1.roleDistribution.map((r) => [r.role, r])),
    [stats1.roleDistribution],
  );
  const p2Roles = useMemo(
    () => new Map(stats2.roleDistribution.map((r) => [r.role, r])),
    [stats2.roleDistribution],
  );

  const handleShare = useCallback(() => {
    const params = new URLSearchParams({
      summoner1: `${stats1.name}#${stats1.tag}`,
      region1: stats1.region,
      summoner2: `${stats2.name}#${stats2.tag}`,
      region2: stats2.region,
    });
    const url = `${window.location.origin}/compare?${params.toString()}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [stats1, stats2]);

  const verdictSentence = useMemo(
    () =>
      generateVerdictSentence(
        verdict.categories,
        `${stats1.name}#${stats1.tag}`,
        `${stats2.name}#${stats2.tag}`,
      ),
    [verdict.categories, stats1.name, stats1.tag, stats2.name, stats2.tag],
  );

  const winnerSide =
    verdict.p1Score > verdict.p2Score
      ? "left"
      : verdict.p2Score > verdict.p1Score
        ? "right"
        : "tie";

  const tierColor1 = TIER_COLORS[q1.tier.toUpperCase()] ?? "#2a3345";
  const tierColor2 = TIER_COLORS[q2.tier.toUpperCase()] ?? "#2a3345";
  const splash1 = q1.topChamps[0]?.name
    ? getChampionSplashUrl(q1.topChamps[0].name)
    : null;
  const splash2 = q2.topChamps[0]?.name
    ? getChampionSplashUrl(q2.topChamps[0].name)
    : null;

  const p1Full = `${stats1.name}#${stats1.tag}`.toLowerCase();
  const p2Full = `${stats2.name}#${stats2.tag}`.toLowerCase();
  const viewerAlreadyIn =
    viewerInfo &&
    (viewerInfo.riotId.toLowerCase() === p1Full ||
      viewerInfo.riotId.toLowerCase() === p2Full);
  const challengeUrl =
    viewerInfo && !viewerAlreadyIn
      ? `/compare?summoner1=${encodeURIComponent(viewerInfo.riotId)}&region1=${encodeURIComponent(viewerInfo.region)}&summoner2=${encodeURIComponent(`${stats2.name}#${stats2.tag}`)}&region2=${encodeURIComponent(stats2.region)}`
      : null;

  return (
    <div className="cr-results">
      {/* ── Queue Tabs ───────────────────────────────── */}
      <div className="cr-tabs">
        <button
          className={`cr-tab ${queue === "solo" ? "active" : ""}`}
          onClick={() => setQueue("solo")}
        >
          Ranked Solo
        </button>
        <button
          className={`cr-tab ${queue === "flex" ? "active" : ""}`}
          onClick={() => setQueue("flex")}
        >
          Ranked Flex
        </button>
      </div>

      {/* ── Player Headers with splash backgrounds ──── */}
      <div className="cr-header-row">
        <div
          className="cr-player-col"
          style={{
            borderLeftColor: tierColor1,
            boxShadow: `inset 4px 0 12px -4px ${tierColor1}44`,
          }}
        >
          {splash1 && (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <div
                className="cr-header-splash"
                style={{ backgroundImage: `url(${splash1})` }}
              />
              <div className="cr-header-overlay" />
            </>
          )}
          <PlayerHeader stats={stats1} />
        </div>
        <div className="cr-vs-badge">VS</div>
        <div
          className="cr-player-col"
          style={{
            borderLeftColor: tierColor2,
            boxShadow: `inset 4px 0 12px -4px ${tierColor2}44`,
          }}
        >
          {splash2 && (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <div
                className="cr-header-splash"
                style={{ backgroundImage: `url(${splash2})` }}
              />
              <div className="cr-header-overlay" />
            </>
          )}
          <PlayerHeader stats={stats2} />
        </div>
      </div>

      {/* ── Verdict Banner ───────────────────────────── */}
      <div className={`cr-verdict cr-verdict-${winnerSide}`}>
        <div className="cr-verdict-icon">
          {winnerSide === "tie" ? "🤝" : "🏆"}
        </div>
        <div className="cr-verdict-text">{verdictSentence}</div>
        <div className="cr-verdict-chips">
          {verdict.categories.map((c) => (
            <span
              key={c.label}
              className={`cr-chip ${c.winner === 1 ? "cr-chip-p1" : c.winner === 2 ? "cr-chip-p2" : "cr-chip-tie"}`}
            >
              {c.label}
            </span>
          ))}
        </div>
      </div>

      {/* ── Ranked ───────────────────────────────────── */}
      <div className="cr-section">
        <div className="cr-section-title">
          {queue === "solo" ? "Ranked Solo/Duo" : "Ranked Flex"}
        </div>
        <div className="cr-side-by-side">
          <div className="cr-side-panel">
            <RankDisplay tier={q1.tier} rank={q1.rank} lp={q1.lp} />
          </div>
          <div className="cr-side-divider" />
          <div className="cr-side-panel">
            <RankDisplay tier={q2.tier} rank={q2.rank} lp={q2.lp} />
          </div>
        </div>
        <div className="cr-stats-block">
          <StatRow left={q1.lp} right={q2.lp} label="LP" />
          <StatRow
            left={`${q1.wins}W ${q1.losses}L`}
            right={`${q2.wins}W ${q2.losses}L`}
            label="Record"
          />
          <StatRow left={`${q1.wr}%`} right={`${q2.wr}%`} label="Win Rate" />
        </div>
      </div>

      {/* ── Recent Form ──────────────────────────────── */}
      <div className="cr-section">
        <div className="cr-section-title">Recent Form</div>
        <div className="cr-side-by-side">
          <div className="cr-side-panel">
            <FormDots form={stats1.recentForm} />
          </div>
          <div className="cr-side-divider" />
          <div className="cr-side-panel">
            <FormDots form={stats2.recentForm} />
          </div>
        </div>
      </div>

      {/* ── Performance ──────────────────────────────── */}
      <div className="cr-section">
        <div className="cr-section-title">Performance</div>
        <div className="cr-stats-block">
          <StatRow
            left={stats1.matchCount}
            right={stats2.matchCount}
            label="Games Played"
          />
          <StatRow
            left={`${kda1.k}/${kda1.d}/${kda1.a}`}
            right={`${kda2.k}/${kda2.d}/${kda2.a}`}
            label="Avg KDA"
          />
          <StatRow
            left={kda1.ratio.toFixed(2)}
            right={kda2.ratio.toFixed(2)}
            label="KDA Ratio"
          />
          <StatRow
            left={stats1.csPerMin.toFixed(1)}
            right={stats2.csPerMin.toFixed(1)}
            label="CS / min"
          />
          <StatRow
            left={`${stats1.avgDuration.toFixed(1)}m`}
            right={`${stats2.avgDuration.toFixed(1)}m`}
            label="Avg Duration"
            higherIsBetter={false}
          />
          <StatRow
            left={stats1.avgRankPlayed}
            right={stats2.avgRankPlayed}
            label="Avg Lobby Rank"
          />
        </div>
      </div>

      {/* ── Damage & Objectives ──────────────────────── */}
      <div className="cr-section">
        <div className="cr-section-title">Damage &amp; Objectives</div>
        <div className="cr-stats-block">
          <StatRow
            left={
              stats1.avgDamage > 0
                ? `${(stats1.avgDamage / 1000).toFixed(1)}k`
                : "\u2014"
            }
            right={
              stats2.avgDamage > 0
                ? `${(stats2.avgDamage / 1000).toFixed(1)}k`
                : "\u2014"
            }
            label="Avg Damage"
          />
          <StatRow
            left={
              stats1.avgObjDamage > 0
                ? `${(stats1.avgObjDamage / 1000).toFixed(1)}k`
                : "\u2014"
            }
            right={
              stats2.avgObjDamage > 0
                ? `${(stats2.avgObjDamage / 1000).toFixed(1)}k`
                : "\u2014"
            }
            label="Obj Damage"
          />
          <StatRow
            left={
              stats1.avgGold > 0
                ? `${(stats1.avgGold / 1000).toFixed(1)}k`
                : "\u2014"
            }
            right={
              stats2.avgGold > 0
                ? `${(stats2.avgGold / 1000).toFixed(1)}k`
                : "\u2014"
            }
            label="Gold / Game"
          />
          <StatRow
            left={stats1.avgVision > 0 ? stats1.avgVision.toFixed(1) : "\u2014"}
            right={
              stats2.avgVision > 0 ? stats2.avgVision.toFixed(1) : "\u2014"
            }
            label="Vision Score"
          />
        </div>
      </div>

      {/* ── Role Distribution ────────────────────────── */}
      <div className="cr-section">
        <div className="cr-section-title">Role Distribution</div>
        <div className="cr-side-by-side cr-roles-area">
          <div className="cr-side-panel">
            {ROLE_ORDER.map((r) => (
              <RoleBar key={r} role={r} pct={p1Roles.get(r)?.pct ?? 0} />
            ))}
          </div>
          <div className="cr-side-divider" />
          <div className="cr-side-panel">
            {ROLE_ORDER.map((r) => (
              <RoleBar key={r} role={r} pct={p2Roles.get(r)?.pct ?? 0} />
            ))}
          </div>
        </div>
      </div>

      {/* ── Top Champions ────────────────────────────── */}
      <div className="cr-section">
        <div className="cr-section-title">Top Champions</div>
        <div className="cr-side-by-side">
          <div className="cr-side-panel cr-champs-panel">
            {q1.topChamps.length > 0 ? (
              q1.topChamps.map((c) => (
                <ChampRow
                  key={c.name}
                  champ={c}
                  version={stats1.ddragonVersion}
                />
              ))
            ) : (
              <span className="cr-no-data">No data</span>
            )}
          </div>
          <div className="cr-side-divider" />
          <div className="cr-side-panel cr-champs-panel">
            {q2.topChamps.length > 0 ? (
              q2.topChamps.map((c) => (
                <ChampRow
                  key={c.name}
                  champ={c}
                  version={stats2.ddragonVersion}
                />
              ))
            ) : (
              <span className="cr-no-data">No data</span>
            )}
          </div>
        </div>
      </div>

      {/* ── Share + Challenge ────────────────────────── */}
      <div className="cr-share-row">
        <button className="cr-share-btn" onClick={handleShare}>
          {copied ? "Link Copied!" : "Share Comparison"}
        </button>
      </div>
      {challengeUrl && (
        <div className="cr-challenge-line">
          Think you can do better?{" "}
          <a href={challengeUrl} className="cr-challenge-link">
            Search yourself vs {stats2.name}
          </a>
        </div>
      )}
    </div>
  );
}
