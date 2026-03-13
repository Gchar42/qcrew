"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getChampionSquareUrl, getRankEmblemUrl, getSummonerSpellIconUrl } from "@/lib/riotAssets";

/** Data Dragon splash URL for team card backgrounds */
function getDataDragonSplashUrl(championName: string): string {
  const specialKeys: Record<string, string> = {
    "Dr. Mundo": "DrMundo", "Lee Sin": "LeeSin", "Jarvan IV": "JarvanIV",
    "Xin Zhao": "XinZhao", "Master Yi": "MasterYi", "Miss Fortune": "MissFortune",
    "Twisted Fate": "TwistedFate", "Tahm Kench": "TahmKench", "Renata Glasc": "Renata",
    "Kai'Sa": "Kaisa", "Rek'Sai": "RekSai", "Cho'Gath": "Chogath", "Kha'Zix": "Khazix",
    "Vel'Koz": "Velkoz", "Kog'Maw": "KogMaw", "LeBlanc": "Leblanc",
    "Nunu & Willump": "Nunu", "Bel'Veth": "Belveth",
  };
  const key = specialKeys[championName] ?? championName.replace(/\s+/g, "").replace(/'/g, "").replace(/\./g, "");
  return `https://ddragon.leagueoflegends.com/cdn/img/champion/splash/${key}_0.jpg`;
}

/** Data Dragon keystone rune icon URL */
function getKeystoneRuneUrl(path: string, runeName: string): string {
  const key = runeName.replace(/\s+/g, "");
  return `https://ddragon.leagueoflegends.com/cdn/img/perk-images/Styles/${path}/${key}/${key}.png`;
}

/** Official Riot role icon URLs (CommunityDragon) */
const ROLE_ICON_URL: Record<string, string> = {
  top: "https://raw.communitydragon.org/latest/plugins/rcp-fe-lol-clash/global/default/assets/images/position-selector/positions/icon-position-top.png",
  jungle: "https://raw.communitydragon.org/latest/plugins/rcp-fe-lol-clash/global/default/assets/images/position-selector/positions/icon-position-jungle.png",
  mid: "https://raw.communitydragon.org/latest/plugins/rcp-fe-lol-clash/global/default/assets/images/position-selector/positions/icon-position-middle.png",
  bot: "https://raw.communitydragon.org/latest/plugins/rcp-fe-lol-clash/global/default/assets/images/position-selector/positions/icon-position-bottom.png",
  support: "https://raw.communitydragon.org/latest/plugins/rcp-fe-lol-clash/global/default/assets/images/position-selector/positions/icon-position-utility.png",
};

const ICON_FALLBACK_STYLE = { width: 20, height: 20, background: "#555", borderRadius: 2 };

function IconWithFallback({ src, alt, size = 20 }: { src: string; alt?: string; size?: number }) {
  return (
    <div style={{ ...ICON_FALLBACK_STYLE, width: size, height: size, overflow: "hidden", flexShrink: 0 }}>
      <img
        src={src}
        alt={alt ?? ""}
        width={size}
        height={size}
        style={{ borderRadius: 2, display: "block" }}
        onError={(e) => {
          e.currentTarget.style.display = "none";
        }}
      />
    </div>
  );
}

function RoleIcon({ role, size = 20 }: { role: string; size?: number }) {
  const url = ROLE_ICON_URL[role];
  if (!url) return <div style={{ ...ICON_FALLBACK_STYLE, width: size, height: size }} />;
  return <IconWithFallback src={url} size={size} />;
}

import { useFollowing } from "@/components/following/useFollowing";

/* ── Sample data for Demo#NA1 ───────────────────────────────────────────── */

type LivePlayer = {
  summonerName: string;
  championName: string;
  championId: number;
  teamId: 100 | 200;
  role?: "top" | "jungle" | "mid" | "bot" | "support";
  spell1Id?: number;
  spell2Id?: number;
  keystonePath?: string;
  keystoneName?: string;
  rank: string;
  lp: number;
  champWinRate: number;
  champKda: number;
  champGames: number;
  mostPlayedChampion: string | null;
  winsToday: number;
  lossesToday: number;
};

type LiveGameData = {
  gameMode: string;
  gameStartTime: number;
  mapName: string;
  participants: LivePlayer[];
  platformId?: string;
  encryptedSummonerId?: string;
  encryptionKey?: string;
};

const SAMPLE_LIVE_GAME: LiveGameData = {
  gameMode: "Ranked Solo/Duo",
  gameStartTime: Date.now() - 8 * 60 * 1000,
  mapName: "Summoner's Rift",
  platformId: "na1",
  encryptedSummonerId: "DEMO_PLACEHOLDER",
  encryptionKey: "DEMO_KEY",
  participants: [
    { summonerName: "Demo#NA1", championName: "Jinx", championId: 222, teamId: 100, role: "bot", spell1Id: 4, spell2Id: 14, keystonePath: "Precision", keystoneName: "LethalTempo", rank: "Gold II", lp: 67, champWinRate: 54, champKda: 3.2, champGames: 42, mostPlayedChampion: null, winsToday: 3, lossesToday: 1 },
    { summonerName: "TestW#NA1", championName: "Lee Sin", championId: 64, teamId: 100, role: "jungle", spell1Id: 4, spell2Id: 11, keystonePath: "Precision", keystoneName: "Conqueror", rank: "Gold I", lp: 23, champWinRate: 52, champKda: 2.8, champGames: 28, mostPlayedChampion: "Vi", winsToday: 2, lossesToday: 2 },
    { summonerName: "Player3", championName: "Ahri", championId: 103, teamId: 100, role: "mid", spell1Id: 4, spell2Id: 14, keystonePath: "Domination", keystoneName: "Electrocute", rank: "Gold III", lp: 45, champWinRate: 51, champKda: 2.5, champGames: 15, mostPlayedChampion: null, winsToday: 1, lossesToday: 1 },
    { summonerName: "Player4", championName: "Thresh", championId: 412, teamId: 100, role: "support", spell1Id: 4, spell2Id: 3, keystonePath: "Resolve", keystoneName: "Aftershock", rank: "Silver I", lp: 89, champWinRate: 48, champKda: 2.1, champGames: 33, mostPlayedChampion: "Nautilus", winsToday: 2, lossesToday: 0 },
    { summonerName: "Player5", championName: "Darius", championId: 122, teamId: 100, role: "top", spell1Id: 4, spell2Id: 6, keystonePath: "Precision", keystoneName: "Conqueror", rank: "Gold IV", lp: 12, champWinRate: 56, champKda: 3.4, champGames: 19, mostPlayedChampion: null, winsToday: 1, lossesToday: 2 },
    { summonerName: "Player6", championName: "Caitlyn", championId: 51, teamId: 200, role: "bot", spell1Id: 4, spell2Id: 7, keystonePath: "Precision", keystoneName: "LethalTempo", rank: "Gold II", lp: 34, champWinRate: 53, champKda: 2.9, champGames: 24, mostPlayedChampion: null, winsToday: 2, lossesToday: 1 },
    { summonerName: "Player7", championName: "Vi", championId: 254, teamId: 200, role: "jungle", spell1Id: 4, spell2Id: 11, keystonePath: "Precision", keystoneName: "Conqueror", rank: "Gold I", lp: 56, champWinRate: 55, champKda: 3.1, champGames: 31, mostPlayedChampion: null, winsToday: 3, lossesToday: 0 },
    { summonerName: "Player8", championName: "Zed", championId: 238, teamId: 200, role: "mid", spell1Id: 4, spell2Id: 14, keystonePath: "Domination", keystoneName: "Electrocute", rank: "Gold III", lp: 78, champWinRate: 49, champKda: 2.3, champGames: 22, mostPlayedChampion: "Yasuo", winsToday: 0, lossesToday: 2 },
    { summonerName: "Player9", championName: "Lux", championId: 99, teamId: 200, role: "support", spell1Id: 4, spell2Id: 3, keystonePath: "Sorcery", keystoneName: "ArcaneComet", rank: "Silver I", lp: 67, champWinRate: 50, champKda: 2.4, champGames: 18, mostPlayedChampion: null, winsToday: 1, lossesToday: 1 },
    { summonerName: "Player10", championName: "Camille", championId: 164, teamId: 200, role: "top", spell1Id: 4, spell2Id: 12, keystonePath: "Precision", keystoneName: "Conqueror", rank: "Gold IV", lp: 41, champWinRate: 52, champKda: 2.7, champGames: 26, mostPlayedChampion: null, winsToday: 2, lossesToday: 2 },
  ],
};

function formatGameTimer(startTime: number): string {
  const elapsed = Math.floor((Date.now() - startTime) / 1000);
  const m = Math.floor(elapsed / 60);
  const s = elapsed % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function avgRank(players: LivePlayer[]): string {
  const tierOrder: Record<string, number> = {
    Iron: 0, Bronze: 1, Silver: 2, Gold: 3, Platinum: 4,
    Emerald: 5, Diamond: 6, Master: 7, Grandmaster: 8, Challenger: 9,
  };
  const divOrder: Record<string, number> = { IV: 0, III: 1, II: 2, I: 3 };
  let total = 0;
  for (const p of players) {
    const [tier, div] = p.rank.split(" ");
    total += (tierOrder[tier] ?? 3) * 4 + (divOrder[div] ?? 2);
  }
  const avg = total / players.length;
  const tiers = ["Iron", "Bronze", "Silver", "Gold", "Platinum", "Emerald", "Diamond", "Master", "Grandmaster", "Challenger"];
  const divs = ["IV", "III", "II", "I"];
  const tIdx = Math.min(Math.floor(avg / 4), 9);
  const dIdx = Math.min(Math.floor(avg % 4), 3);
  return `${tiers[tIdx]} ${divs[dIdx]}`;
}

function avgChampWr(players: LivePlayer[]): number {
  const total = players.reduce((s, p) => s + p.champWinRate, 0);
  return Math.round(total / players.length);
}

/** Infer role from champion when not in API data */
function inferRoleFromChampion(championName: string): "top" | "jungle" | "mid" | "bot" | "support" {
  const jg = ["Lee Sin", "Vi", "Graves", "Elise", "Rek'Sai", "Hecarim", "Kayn", "Evelynn"];
  const sup = ["Thresh", "Lux", "Nautilus", "Leona", "Blitzcrank", "Morgana", "Janna"];
  if (jg.includes(championName)) return "jungle";
  if (sup.includes(championName)) return "support";
  const adc = ["Jinx", "Caitlyn", "Ezreal", "Kai'Sa", "Ashe", "Jhin", "Varus"];
  if (adc.includes(championName)) return "bot";
  const mid = ["Ahri", "Zed", "Yasuo", "Syndra", "Orianna", "LeBlanc"];
  if (mid.includes(championName)) return "mid";
  return "top";
}

function getSpectatorUrl(game: LiveGameData, region: string): string {
  const platform = game.platformId ?? region.toLowerCase();
  const enc = game.encryptedSummonerId ?? "";
  const key = game.encryptionKey ?? "";
  if (!enc) return "#";
  return `leagueoflegends://spectator/${platform}/${enc}${key ? `/${key}` : ""}`;
}

const TEAM_BLUE = "#4FC3F7";
const TEAM_RED = "#FF4444";

function PlayerRow({
  p,
  region,
  profileUrl,
  addFollow,
  isFollowing,
}: {
  p: LivePlayer;
  region: string;
  profileUrl: (id: string) => string;
  addFollow: (riotId: string, region: string) => void;
  isFollowing: (riotId: string, region: string) => boolean;
}) {
  const following = isFollowing(p.summonerName, region);
  const role = p.role ?? inferRoleFromChampion(p.championName);
  const spell1 = p.spell1Id ?? 4;
  const spell2 = p.spell2Id ?? 14;
  const keystonePath = p.keystonePath ?? "Precision";
  const keystoneName = p.keystoneName ?? "Conqueror";
  const iconSize = 20;
  return (
    <div
      className="live-page-player"
      style={{
        display: "grid",
        gridTemplateColumns: "92px 1fr auto",
        alignItems: "center",
        gap: 12,
        minWidth: 0,
        minHeight: 64,
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
        <img
          src={getChampionSquareUrl(p.championName)}
          alt={p.championName}
          width={48}
          height={48}
          style={{ borderRadius: 8, objectFit: "cover" }}
        />
        <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
          <RoleIcon role={role} size={iconSize} />
          <IconWithFallback src={getSummonerSpellIconUrl(spell1)} size={iconSize} />
          <IconWithFallback src={getSummonerSpellIconUrl(spell2)} size={iconSize} />
          <IconWithFallback src={getKeystoneRuneUrl(keystonePath, keystoneName)} size={iconSize} />
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", justifyContent: "center", gap: 2, minWidth: 0 }}>
        <div className="live-page-champ-name">{p.championName}</div>
        <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 4 }}>
          <Link href={profileUrl(p.summonerName)} className="live-page-summoner-link">
            {p.summonerName}
          </Link>
          {p.mostPlayedChampion && p.mostPlayedChampion !== p.championName && (
            <span style={{ fontSize: 12, opacity: 0.6 }}>
              · Main: {p.mostPlayedChampion}
            </span>
          )}
          <button
            type="button"
            onClick={() => addFollow(p.summonerName, region)}
            disabled={following}
            title={following ? "Following" : "Follow"}
            style={{
              padding: "2px 6px",
              fontSize: 10,
              fontWeight: 600,
              border: "1px solid rgba(255,255,255,0.2)",
              borderRadius: 4,
              background: following ? "rgba(34,197,94,0.2)" : "rgba(255,255,255,0.06)",
              color: following ? "#22c55e" : "rgba(255,255,255,0.8)",
              cursor: following ? "default" : "pointer",
            }}
          >
            {following ? "Following ✓" : "+ Follow"}
          </button>
        </div>
      </div>
      <div style={{ textAlign: "right", fontSize: "0.7rem", color: "rgba(255,255,255,0.6)" }}>
        <div className="live-page-player-rank" style={{ justifyContent: "flex-end" }}>
          <img src={getRankEmblemUrl(p.rank.split(" ")[0])} alt="" className="live-page-rank-icon" />
          {p.rank} {p.lp} LP
        </div>
        <div className="live-page-player-champ-stats">
          {p.champWinRate}% WR · {p.champKda.toFixed(1)} KDA ({p.champGames} games)
        </div>
        <div className="live-page-player-today">
          {p.winsToday}W {p.lossesToday}L today
        </div>
      </div>
    </div>
  );
}

export default function LiveGameView({
  region,
  riotId,
  playerName,
}: {
  region: string;
  riotId: string;
  playerName: string;
}) {
  const [gameData, setGameData] = useState<LiveGameData | null>(null);
  const [lastSeen, setLastSeen] = useState<number | null>(null);
  const [gameTimer, setGameTimer] = useState("0:00");
  const { addFollow, isFollowing } = useFollowing();

  const isDemo = riotId.toLowerCase().includes("demo") && region.toLowerCase() === "na1";

  useEffect(() => {
    if (isDemo) {
      setGameData(SAMPLE_LIVE_GAME);
      setGameTimer(formatGameTimer(SAMPLE_LIVE_GAME.gameStartTime));
    } else {
      setGameData(null);
      setLastSeen(Date.now());
    }
  }, [isDemo]);

  useEffect(() => {
    if (!gameData) return;
    const iv = setInterval(() => {
      setGameTimer(formatGameTimer(gameData.gameStartTime));
    }, 1000);
    return () => clearInterval(iv);
  }, [gameData]);

  useEffect(() => {
    if (!gameData) return;
    const iv = setInterval(() => {
      setGameData((prev) => (prev ? { ...prev } : null));
    }, 30000);
    return () => clearInterval(iv);
  }, [gameData]);

  if (!gameData) {
    return (
      <div className="live-page live-page--not-in-game">
        <Link
          href={`/summoner?riotId=${encodeURIComponent(riotId)}&region=${encodeURIComponent(region)}`}
          style={{ fontSize: 14, color: "rgba(255,255,255,0.7)", textDecoration: "none", marginBottom: 16, display: "inline-block" }}
        >
          ← Back to Profile
        </Link>
        <div className="live-page-card">
          <h1 className="live-page-title">Live Game</h1>
          <p className="live-page-message">
            {playerName} is not currently in a game.
          </p>
          {lastSeen && (
            <p className="live-page-muted">
              Last seen {new Date(lastSeen).toLocaleString()}
            </p>
          )}
        </div>
      </div>
    );
  }

  const blueTeam = gameData.participants.filter((p) => p.teamId === 100);
  const redTeam = gameData.participants.filter((p) => p.teamId === 200);
  const blueAvgWr = avgChampWr(blueTeam);
  const redAvgWr = avgChampWr(redTeam);
  const totalWr = blueAvgWr + redAvgWr;
  const bluePct = totalWr > 0 ? Math.round((blueAvgWr / totalWr) * 100) : 50;
  const redPct = totalWr > 0 ? Math.round((redAvgWr / totalWr) * 100) : 50;
  const isEven = Math.abs(bluePct - redPct) < 5;
  const favored = isEven
    ? "Even Matchup"
    : bluePct > redPct
      ? "Blue Team Favored"
      : "Red Team Favored";
  const confidence = isEven ? 50 : Math.max(bluePct, redPct);
  const verdictColor = isEven ? "#888" : bluePct > redPct ? TEAM_BLUE : TEAM_RED;

  const profileUrlInGame = (riotIdDisplay: string) =>
    `/summoner?riotId=${encodeURIComponent(riotIdDisplay)}&region=${encodeURIComponent(region)}`;

  const blueSplashChamp = blueTeam[0]?.championName ?? "Jinx";
  const redSplashChamp = redTeam[0]?.championName ?? "Caitlyn";

  return (
    <div className="live-page live-page--in-game">
      <div className="live-page-header">
        <div className="live-page-header-top">
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <Link
              href={profileUrlInGame(riotId)}
              style={{
                fontSize: 14,
                color: "rgba(255,255,255,0.7)",
                textDecoration: "none",
              }}
            >
              ← Back to Profile
            </Link>
            <h1 className="live-page-title" style={{ margin: 0 }}>Live Game</h1>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <a
              href={getSpectatorUrl(gameData, region)}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                padding: "8px 16px",
                fontSize: 14,
                fontWeight: 600,
                background: "linear-gradient(135deg, #22c55e 0%, #16a34a 100%)",
                color: "#fff",
                borderRadius: 8,
                textDecoration: "none",
              }}
            >
              Watch Live
            </a>
            <div className="live-page-live-badge">
              <span className="live-page-live-dot" />
              <span>Live</span>
              <span className="live-page-live-muted">Updates every 30s</span>
            </div>
          </div>
        </div>
        <div className="live-page-meta">
          <span>{gameData.gameMode}</span>
          <span className="live-page-timer">{gameTimer}</span>
          <span>{gameData.mapName}</span>
        </div>
      </div>

      <div className="live-page-teams">
        <div
          className="live-page-team live-page-team--blue"
          style={{
            alignSelf: "stretch",
            position: "relative",
            overflow: "hidden",
            borderLeft: `4px solid ${TEAM_BLUE}`,
            borderTop: "1px solid rgba(255,255,255,0.08)",
            borderRight: "1px solid rgba(255,255,255,0.08)",
            borderBottom: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          <div
            style={{
              position: "absolute",
              inset: 0,
              zIndex: 0,
              opacity: 0.12,
              backgroundImage: `url(${getDataDragonSplashUrl(blueSplashChamp)})`,
              backgroundSize: "cover",
              backgroundPosition: "center top",
            }}
          />
          <div
            style={{
              position: "absolute",
              inset: 0,
              zIndex: 0,
              background: "linear-gradient(to bottom, rgba(21,22,32,0.75) 0%, rgba(21,22,32,0.9) 50%, rgba(21,22,32,0.96) 100%)",
              pointerEvents: "none",
            }}
          />
          <div style={{ position: "relative", zIndex: 1 }}>
            <h2 className="live-page-team-title">Blue Team</h2>
            {blueTeam.map((p) => (
              <PlayerRow
                key={p.summonerName}
                p={p}
                region={region}
                profileUrl={profileUrlInGame}
                addFollow={addFollow}
                isFollowing={isFollowing}
              />
            ))}
            <div className="live-page-team-footer">
              Avg rank: {avgRank(blueTeam)} · Avg WR on picks: {blueAvgWr}%
            </div>
          </div>
        </div>

        <div
          className="live-page-verdict"
          style={{
            alignSelf: "center",
            background: isEven ? "#1a1a1a" : `linear-gradient(135deg, ${verdictColor}1a 0%, ${verdictColor}0d 100%)`,
            border: isEven ? "1px solid rgba(255,255,255,0.15)" : `2px solid ${verdictColor}44`,
            borderRadius: 12,
            padding: 24,
          }}
        >
          <div
            className="live-page-verdict-banner"
            style={{
              fontSize: isEven ? 28 : "1.35rem",
              fontWeight: 800,
              color: verdictColor,
              marginBottom: 4,
            }}
          >
            {favored}
          </div>
          {!isEven && (
            <div
              className="live-page-verdict-confidence"
              style={{
                fontSize: "1.1rem",
                fontWeight: 700,
                color: verdictColor,
                marginBottom: 8,
              }}
            >
              {confidence}% likely
            </div>
          )}
          <p className="live-page-verdict-caveat">
            Based on champion win rates only — individual performance varies
          </p>
        </div>

        <div
          className="live-page-team live-page-team--red"
          style={{
            alignSelf: "stretch",
            position: "relative",
            overflow: "hidden",
            borderLeft: `4px solid ${TEAM_RED}`,
            borderTop: "1px solid rgba(255,255,255,0.08)",
            borderRight: "1px solid rgba(255,255,255,0.08)",
            borderBottom: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          <div
            style={{
              position: "absolute",
              inset: 0,
              zIndex: 0,
              opacity: 0.12,
              backgroundImage: `url(${getDataDragonSplashUrl(redSplashChamp)})`,
              backgroundSize: "cover",
              backgroundPosition: "center top",
            }}
          />
          <div
            style={{
              position: "absolute",
              inset: 0,
              zIndex: 0,
              background: "linear-gradient(to bottom, rgba(21,22,32,0.75) 0%, rgba(21,22,32,0.9) 50%, rgba(21,22,32,0.96) 100%)",
              pointerEvents: "none",
            }}
          />
          <div style={{ position: "relative", zIndex: 1 }}>
            <h2 className="live-page-team-title">Red Team</h2>
            {redTeam.map((p) => (
              <PlayerRow
                key={p.summonerName}
                p={p}
                region={region}
                profileUrl={profileUrlInGame}
                addFollow={addFollow}
                isFollowing={isFollowing}
              />
            ))}
            <div className="live-page-team-footer">
              Avg rank: {avgRank(redTeam)} · Avg WR on picks: {redAvgWr}%
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
