export type StatCategory = {
  id: string;
  label: string;
  group: string;
  lowerIsBetter?: boolean;
  suffix?: string;
  format?: "time" | "pct" | "dec1" | "dec2" | "int" | "gold" | "timeLong";
};

export type ChampionStatEntry = {
  championName: string;
  value: number;
  displayValue: string;
  extra?: Record<string, string>;
  games: number;
};

export const STAT_GROUPS = [
  { id: "jungle", label: "JUNGLE" },
  { id: "combat", label: "COMBAT" },
  { id: "game", label: "GAME" },
  { id: "lane", label: "LANE" },
] as const;

export const STAT_CATEGORIES: StatCategory[] = [
  { id: "fullClearTime", label: "Full Clear Time", group: "jungle", lowerIsBetter: true, format: "time" },
  { id: "objectiveControl", label: "Objective Control %", group: "jungle", format: "pct" },
  { id: "firstDragonRate", label: "First Dragon Rate", group: "jungle", format: "pct" },
  { id: "scuttleControl", label: "Scuttle Control", group: "jungle", format: "pct" },
  { id: "counterJungleCs", label: "Counter Jungle CS", group: "jungle", format: "dec1" },
  { id: "gankSuccessRate", label: "Gank Success Rate", group: "jungle", format: "pct" },

  { id: "kda", label: "KDA", group: "combat", format: "dec2" },
  { id: "killParticipation", label: "Kill Participation", group: "combat", format: "pct" },
  { id: "soloKills", label: "Solo Kills / Game", group: "combat", format: "dec2" },
  { id: "firstBloodRate", label: "First Blood Rate", group: "combat", format: "pct" },
  { id: "deathsPerGame", label: "Deaths / Game", group: "combat", lowerIsBetter: true, format: "dec1" },
  { id: "damagePerMin", label: "Damage / min", group: "combat", format: "int" },

  { id: "winRate", label: "Win Rate", group: "game", format: "pct" },
  { id: "pickRate", label: "Pick Rate", group: "game", format: "pct" },
  { id: "banRate", label: "Ban Rate", group: "game", format: "pct" },
  { id: "avgGameDuration", label: "Avg Game Duration", group: "game", lowerIsBetter: true, format: "timeLong" },
  { id: "goldPerMin", label: "Gold / min", group: "game", format: "int" },

  { id: "csPerMin", label: "CS / min", group: "lane", format: "dec2" },
  { id: "csAt15", label: "CS @ 15 min", group: "lane", format: "int" },
  { id: "goldAt15", label: "Gold @ 15 min", group: "lane", format: "gold" },
  { id: "plateTaken", label: "Plates Taken / Game", group: "lane", format: "dec2" },
  { id: "xpAt15", label: "XP @ 15 min", group: "lane", format: "gold" },
];

export const RANK_OPTIONS = ["All Ranks", "Iron+", "Bronze+", "Silver+", "Gold+", "Platinum+", "Emerald+", "Diamond+", "Master+", "Grandmaster+", "Challenger"];
export const REGION_OPTIONS = ["ALL", "NA", "EUW", "EUNE", "KR", "JP", "BR", "LAN", "LAS", "OCE", "TR", "RU", "PH", "SG", "TH", "TW", "VN"];
export const PERIOD_OPTIONS = ["7 days", "14 days", "30 days", "90 days"];

type JunglerData = {
  name: string;
  games: number;
  clearTime: number;
  blueSide: number;
  redSide: number;
  objControl: number;
  firstDragon: number;
  scuttle: number;
  counterJg: number;
  gankSuccess: number;
  kda: number;
  killPart: number;
  soloKills: number;
  firstBlood: number;
  deaths: number;
  dmgPerMin: number;
  winRate: number;
  pickRate: number;
  banRate: number;
  gameDuration: number;
  goldPerMin: number;
  csPerMin: number;
  cs15: number;
  gold15: number;
  plates: number;
  xp15: number;
};

const JUNGLERS: JunglerData[] = [
  { name: "Ivern", games: 78000, clearTime: 142, blueSide: 142, redSide: 142, objControl: 54.2, firstDragon: 52.1, scuttle: 55.2, counterJg: 4.8, gankSuccess: 58.5, kda: 3.85, killPart: 72.1, soloKills: 0.45, firstBlood: 10.2, deaths: 4.2, dmgPerMin: 485, winRate: 51.8, pickRate: 1.5, banRate: 0.3, gameDuration: 1860, goldPerMin: 312, csPerMin: 5.05, cs15: 72, gold15: 4820, plates: 0.01, xp15: 7450 },
  { name: "Zyra", games: 70000, clearTime: 150, blueSide: 149, redSide: 151, objControl: 53.8, firstDragon: 54.5, scuttle: 52.1, counterJg: 5.2, gankSuccess: 55.8, kda: 2.95, killPart: 58.2, soloKills: 0.72, firstBlood: 12.5, deaths: 5.8, dmgPerMin: 1095, winRate: 50.2, pickRate: 1.2, banRate: 0.8, gameDuration: 1890, goldPerMin: 358, csPerMin: 6.12, cs15: 88, gold15: 5180, plates: 0.02, xp15: 7680 },
  { name: "Karthus", games: 89000, clearTime: 152, blueSide: 152, redSide: 153, objControl: 55.1, firstDragon: 60.1, scuttle: 54.5, counterJg: 5.8, gankSuccess: 48.2, kda: 3.15, killPart: 54.5, soloKills: 0.65, firstBlood: 12.8, deaths: 5.1, dmgPerMin: 1285, winRate: 48.8, pickRate: 1.8, banRate: 1.5, gameDuration: 1920, goldPerMin: 418, csPerMin: 7.85, cs15: 112, gold15: 5780, plates: 0.02, xp15: 8450 },
  { name: "DrMundo", games: 253000, clearTime: 157, blueSide: 156, redSide: 158, objControl: 56.2, firstDragon: 58.5, scuttle: 55.8, counterJg: 6.2, gankSuccess: 52.5, kda: 2.52, killPart: 55.8, soloKills: 0.92, firstBlood: 14.8, deaths: 5.9, dmgPerMin: 892, winRate: 52.1, pickRate: 4.5, banRate: 3.2, gameDuration: 1845, goldPerMin: 385, csPerMin: 6.55, cs15: 94, gold15: 5420, plates: 0.08, xp15: 7920 },
  { name: "Zed", games: 144000, clearTime: 157, blueSide: 158, redSide: 157, objControl: 52.5, firstDragon: 51.2, scuttle: 58.5, counterJg: 11.2, gankSuccess: 57.8, kda: 2.18, killPart: 52.8, soloKills: 1.95, firstBlood: 22.5, deaths: 6.5, dmgPerMin: 1125, winRate: 47.5, pickRate: 2.5, banRate: 8.5, gameDuration: 1710, goldPerMin: 398, csPerMin: 5.82, cs15: 82, gold15: 5520, plates: 0.15, xp15: 7580 },
  { name: "Fiddlesticks", games: 184000, clearTime: 159, blueSide: 160, redSide: 158, objControl: 55.8, firstDragon: 56.8, scuttle: 57.1, counterJg: 5.5, gankSuccess: 53.8, kda: 3.08, killPart: 60.8, soloKills: 0.58, firstBlood: 11.5, deaths: 5.5, dmgPerMin: 1038, winRate: 51.2, pickRate: 3.0, banRate: 4.5, gameDuration: 1905, goldPerMin: 365, csPerMin: 6.28, cs15: 90, gold15: 5280, plates: 0.04, xp15: 7860 },
  { name: "Hecarim", games: 241000, clearTime: 162, blueSide: 161, redSide: 164, objControl: 59.5, firstDragon: 63.5, scuttle: 68.9, counterJg: 10.5, gankSuccess: 63.2, kda: 2.88, killPart: 65.5, soloKills: 1.15, firstBlood: 22.5, deaths: 6.1, dmgPerMin: 1098, winRate: 52.5, pickRate: 4.0, banRate: 8.5, gameDuration: 1740, goldPerMin: 388, csPerMin: 6.68, cs15: 96, gold15: 5540, plates: 0.32, xp15: 8050 },
  { name: "Udyr", games: 105000, clearTime: 163, blueSide: 163, redSide: 164, objControl: 57.9, firstDragon: 61.8, scuttle: 68.2, counterJg: 10.9, gankSuccess: 54.5, kda: 2.42, killPart: 56.8, soloKills: 1.31, firstBlood: 18.2, deaths: 6.8, dmgPerMin: 942, winRate: 50.0, pickRate: 1.8, banRate: 1.5, gameDuration: 1845, goldPerMin: 382, csPerMin: 6.82, cs15: 98, gold15: 5480, plates: 0.10, xp15: 8120 },
  { name: "Fizz", games: 99000, clearTime: 163, blueSide: 163, redSide: 164, objControl: 52.8, firstDragon: 53.5, scuttle: 56.2, counterJg: 7.8, gankSuccess: 60.5, kda: 2.65, killPart: 57.5, soloKills: 1.52, firstBlood: 18.8, deaths: 6.2, dmgPerMin: 1052, winRate: 48.5, pickRate: 1.5, banRate: 2.2, gameDuration: 1755, goldPerMin: 378, csPerMin: 5.65, cs15: 80, gold15: 5320, plates: 0.08, xp15: 7520 },
  { name: "Shaco", games: 282000, clearTime: 164, blueSide: 164, redSide: 165, objControl: 53.5, firstDragon: 55.2, scuttle: 60.5, counterJg: 14.2, gankSuccess: 58.1, kda: 2.31, killPart: 55.2, soloKills: 1.45, firstBlood: 25.1, deaths: 6.8, dmgPerMin: 1075, winRate: 48.2, pickRate: 4.8, banRate: 15.8, gameDuration: 1620, goldPerMin: 375, csPerMin: 5.52, cs15: 78, gold15: 5280, plates: 0.12, xp15: 7380 },
  { name: "JarvanIV", games: 392000, clearTime: 164, blueSide: 163, redSide: 166, objControl: 59.9, firstDragon: 58.5, scuttle: 66.8, counterJg: 8.8, gankSuccess: 65.8, kda: 2.58, killPart: 66.2, soloKills: 1.08, firstBlood: 25.8, deaths: 6.5, dmgPerMin: 975, winRate: 50.5, pickRate: 7.5, banRate: 3.2, gameDuration: 1710, goldPerMin: 368, csPerMin: 5.92, cs15: 84, gold15: 5300, plates: 0.35, xp15: 7720 },
  { name: "Ambessa", games: 235000, clearTime: 165, blueSide: 164, redSide: 166, objControl: 57.5, firstDragon: 59.2, scuttle: 64.5, counterJg: 10.8, gankSuccess: 61.2, kda: 2.72, killPart: 62.5, soloKills: 1.38, firstBlood: 21.5, deaths: 6.0, dmgPerMin: 1085, winRate: 54.2, pickRate: 4.2, banRate: 32.5, gameDuration: 1725, goldPerMin: 395, csPerMin: 6.18, cs15: 88, gold15: 5450, plates: 0.22, xp15: 7850 },
  { name: "Shyvana", games: 74000, clearTime: 165, blueSide: 165, redSide: 166, objControl: 58.1, firstDragon: 71.2, scuttle: 58.5, counterJg: 7.5, gankSuccess: 49.2, kda: 2.55, killPart: 52.8, soloKills: 1.08, firstBlood: 12.5, deaths: 5.8, dmgPerMin: 985, winRate: 52.3, pickRate: 1.2, banRate: 0.8, gameDuration: 1875, goldPerMin: 392, csPerMin: 7.15, cs15: 103, gold15: 5610, plates: 0.05, xp15: 8220 },
  { name: "Sejuani", games: 134000, clearTime: 166, blueSide: 165, redSide: 166, objControl: 56.2, firstDragon: 54.9, scuttle: 59.2, counterJg: 6.0, gankSuccess: 61.9, kda: 2.65, killPart: 67.8, soloKills: 0.72, firstBlood: 15.2, deaths: 6.7, dmgPerMin: 768, winRate: 49.5, pickRate: 2.2, banRate: 0.8, gameDuration: 1875, goldPerMin: 328, csPerMin: 5.28, cs15: 72, gold15: 5040, plates: 0.05, xp15: 7250 },
  { name: "Diana", games: 346000, clearTime: 166, blueSide: 166, redSide: 166, objControl: 58.4, firstDragon: 62.4, scuttle: 65.4, counterJg: 8.1, gankSuccess: 56.8, kda: 2.95, killPart: 62.8, soloKills: 1.18, firstBlood: 17.5, deaths: 5.8, dmgPerMin: 1180, winRate: 51.5, pickRate: 6.8, banRate: 6.2, gameDuration: 1815, goldPerMin: 402, csPerMin: 6.95, cs15: 100, gold15: 5640, plates: 0.12, xp15: 8180 },
  { name: "Viego", games: 788000, clearTime: 166, blueSide: 165, redSide: 167, objControl: 62.3, firstDragon: 65.8, scuttle: 70.8, counterJg: 11.8, gankSuccess: 59.5, kda: 2.82, killPart: 62.1, soloKills: 1.58, firstBlood: 20.8, deaths: 5.9, dmgPerMin: 1125, winRate: 52.8, pickRate: 12.2, banRate: 18.2, gameDuration: 1770, goldPerMin: 412, csPerMin: 6.42, cs15: 92, gold15: 5720, plates: 0.30, xp15: 7920 },
  { name: "Evelynn", games: 151000, clearTime: 166, blueSide: 165, redSide: 167, objControl: 53.2, firstDragon: 54.8, scuttle: 52.5, counterJg: 7.2, gankSuccess: 62.8, kda: 2.95, killPart: 55.5, soloKills: 1.42, firstBlood: 16.2, deaths: 5.8, dmgPerMin: 1165, winRate: 49.5, pickRate: 2.8, banRate: 5.8, gameDuration: 1800, goldPerMin: 398, csPerMin: 6.22, cs15: 88, gold15: 5450, plates: 0.05, xp15: 7780 },
  { name: "Graves", games: 437000, clearTime: 167, blueSide: 166, redSide: 168, objControl: 59.2, firstDragon: 62.9, scuttle: 71.2, counterJg: 12.8, gankSuccess: 57.5, kda: 2.78, killPart: 57.5, soloKills: 1.65, firstBlood: 18.8, deaths: 5.6, dmgPerMin: 1148, winRate: 50.2, pickRate: 8.2, banRate: 7.8, gameDuration: 1785, goldPerMin: 425, csPerMin: 7.28, cs15: 105, gold15: 5850, plates: 0.15, xp15: 8280 },
  { name: "Volibear", games: 189000, clearTime: 167, blueSide: 166, redSide: 167, objControl: 57.5, firstDragon: 60.5, scuttle: 60.8, counterJg: 7.1, gankSuccess: 60.1, kda: 2.38, killPart: 60.1, soloKills: 1.02, firstBlood: 16.8, deaths: 6.9, dmgPerMin: 908, winRate: 52.1, pickRate: 3.2, banRate: 1.8, gameDuration: 1890, goldPerMin: 358, csPerMin: 6.15, cs15: 88, gold15: 5180, plates: 0.28, xp15: 7380 },
  { name: "Vi", games: 345000, clearTime: 167, blueSide: 166, redSide: 168, objControl: 58.8, firstDragon: 61.2, scuttle: 66.1, counterJg: 9.1, gankSuccess: 65.1, kda: 2.72, killPart: 64.2, soloKills: 1.28, firstBlood: 24.5, deaths: 6.2, dmgPerMin: 1015, winRate: 51.0, pickRate: 6.5, banRate: 3.8, gameDuration: 1725, goldPerMin: 375, csPerMin: 5.85, cs15: 82, gold15: 5380, plates: 0.38, xp15: 7780 },
  { name: "Kayn", games: 655000, clearTime: 168, blueSide: 167, redSide: 169, objControl: 61.1, firstDragon: 64.3, scuttle: 69.5, counterJg: 11.5, gankSuccess: 58.8, kda: 2.75, killPart: 61.5, soloKills: 1.52, firstBlood: 19.5, deaths: 6.0, dmgPerMin: 1195, winRate: 50.8, pickRate: 10.5, banRate: 12.5, gameDuration: 1800, goldPerMin: 408, csPerMin: 6.55, cs15: 94, gold15: 5680, plates: 0.18, xp15: 7980 },
  { name: "Nocturne", games: 215000, clearTime: 168, blueSide: 167, redSide: 169, objControl: 57.2, firstDragon: 57.9, scuttle: 64.1, counterJg: 8.4, gankSuccess: 63.8, kda: 2.45, killPart: 58.8, soloKills: 1.25, firstBlood: 20.2, deaths: 6.5, dmgPerMin: 998, winRate: 49.0, pickRate: 3.8, banRate: 2.5, gameDuration: 1755, goldPerMin: 372, csPerMin: 5.72, cs15: 80, gold15: 5340, plates: 0.22, xp15: 7580 },
  { name: "Lillia", games: 340000, clearTime: 168, blueSide: 167, redSide: 169, objControl: 55.4, firstDragon: 56.2, scuttle: 67.5, counterJg: 7.5, gankSuccess: 55.2, kda: 3.21, killPart: 58.5, soloKills: 0.85, firstBlood: 13.2, deaths: 5.3, dmgPerMin: 1045, winRate: 49.8, pickRate: 5.9, banRate: 2.2, gameDuration: 1860, goldPerMin: 385, csPerMin: 7.42, cs15: 108, gold15: 5500, plates: 0.02, xp15: 8320 },
  { name: "LeeSin", games: 890000, clearTime: 170, blueSide: 169, redSide: 171, objControl: 60.8, firstDragon: 59.0, scuttle: 72.5, counterJg: 12.5, gankSuccess: 66.2, kda: 2.52, killPart: 64.8, soloKills: 1.82, firstBlood: 28.5, deaths: 6.4, dmgPerMin: 1052, winRate: 49.2, pickRate: 14.8, banRate: 10.2, gameDuration: 1668, goldPerMin: 395, csPerMin: 5.65, cs15: 78, gold15: 5580, plates: 0.42, xp15: 7520 },
  { name: "Warwick", games: 312000, clearTime: 170, blueSide: 169, redSide: 171, objControl: 56.8, firstDragon: 59.5, scuttle: 64.8, counterJg: 9.5, gankSuccess: 60.8, kda: 2.48, killPart: 59.5, soloKills: 1.35, firstBlood: 21.5, deaths: 6.6, dmgPerMin: 958, winRate: 51.8, pickRate: 5.5, banRate: 2.8, gameDuration: 1830, goldPerMin: 365, csPerMin: 5.52, cs15: 76, gold15: 5260, plates: 0.25, xp15: 7450 },
  { name: "XinZhao", games: 195000, clearTime: 170, blueSide: 170, redSide: 171, objControl: 54.5, firstDragon: 54.1, scuttle: 63.5, counterJg: 7.8, gankSuccess: 61.2, kda: 2.35, killPart: 58.1, soloKills: 1.05, firstBlood: 22.1, deaths: 7.0, dmgPerMin: 925, winRate: 48.5, pickRate: 3.5, banRate: 0.5, gameDuration: 1860, goldPerMin: 362, csPerMin: 5.42, cs15: 74, gold15: 5220, plates: 0.20, xp15: 7320 },
  { name: "Amumu", games: 285000, clearTime: 171, blueSide: 170, redSide: 172, objControl: 56.5, firstDragon: 57.3, scuttle: 58.5, counterJg: 6.5, gankSuccess: 62.5, kda: 2.68, killPart: 68.5, soloKills: 0.85, firstBlood: 14.5, deaths: 6.3, dmgPerMin: 895, winRate: 51.9, pickRate: 5.1, banRate: 1.2, gameDuration: 1875, goldPerMin: 342, csPerMin: 6.05, cs15: 86, gold15: 5120, plates: 0.05, xp15: 7650 },
  { name: "Nidalee", games: 178000, clearTime: 172, blueSide: 171, redSide: 173, objControl: 54.2, firstDragon: 53.5, scuttle: 61.5, counterJg: 12.1, gankSuccess: 56.5, kda: 2.25, killPart: 56.8, soloKills: 1.48, firstBlood: 23.8, deaths: 6.8, dmgPerMin: 1015, winRate: 47.2, pickRate: 2.8, banRate: 1.2, gameDuration: 1680, goldPerMin: 378, csPerMin: 5.85, cs15: 82, gold15: 5420, plates: 0.10, xp15: 7680 },
  { name: "RekSai", games: 120000, clearTime: 173, blueSide: 172, redSide: 174, objControl: 54.8, firstDragon: 55.5, scuttle: 62.8, counterJg: 10.2, gankSuccess: 64.5, kda: 2.28, killPart: 60.5, soloKills: 1.22, firstBlood: 23.1, deaths: 6.8, dmgPerMin: 885, winRate: 48.0, pickRate: 2.0, banRate: 0.5, gameDuration: 1695, goldPerMin: 355, csPerMin: 5.48, cs15: 76, gold15: 5180, plates: 0.18, xp15: 7420 },
  { name: "Elise", games: 165000, clearTime: 174, blueSide: 173, redSide: 175, objControl: 53.5, firstDragon: 52.8, scuttle: 62.1, counterJg: 9.8, gankSuccess: 68.5, kda: 2.22, killPart: 63.5, soloKills: 1.38, firstBlood: 27.2, deaths: 6.9, dmgPerMin: 945, winRate: 47.5, pickRate: 2.5, banRate: 1.0, gameDuration: 1650, goldPerMin: 368, csPerMin: 5.15, cs15: 68, gold15: 5280, plates: 0.08, xp15: 7180 },
  // --- New champions below ---
  { name: "Ekko", games: 425000, clearTime: 165, blueSide: 164, redSide: 166, objControl: 56.8, firstDragon: 58.2, scuttle: 62.5, counterJg: 8.5, gankSuccess: 62.2, kda: 2.88, killPart: 60.2, soloKills: 1.52, firstBlood: 19.8, deaths: 5.8, dmgPerMin: 1145, winRate: 51.5, pickRate: 7.8, banRate: 6.5, gameDuration: 1755, goldPerMin: 405, csPerMin: 6.45, cs15: 92, gold15: 5580, plates: 0.12, xp15: 7920 },
  { name: "Briar", games: 310000, clearTime: 160, blueSide: 159, redSide: 161, objControl: 57.2, firstDragon: 60.5, scuttle: 63.8, counterJg: 9.5, gankSuccess: 60.8, kda: 2.45, killPart: 59.8, soloKills: 1.62, firstBlood: 22.8, deaths: 6.5, dmgPerMin: 1065, winRate: 52.8, pickRate: 5.5, banRate: 14.2, gameDuration: 1740, goldPerMin: 388, csPerMin: 6.32, cs15: 90, gold15: 5420, plates: 0.18, xp15: 7850 },
  { name: "KhaZix", games: 520000, clearTime: 169, blueSide: 168, redSide: 170, objControl: 56.5, firstDragon: 57.8, scuttle: 65.2, counterJg: 13.5, gankSuccess: 61.5, kda: 2.62, killPart: 57.8, soloKills: 1.78, firstBlood: 24.2, deaths: 6.2, dmgPerMin: 1118, winRate: 51.2, pickRate: 9.2, banRate: 11.5, gameDuration: 1725, goldPerMin: 402, csPerMin: 6.08, cs15: 86, gold15: 5520, plates: 0.12, xp15: 7720 },
  { name: "Kindred", games: 198000, clearTime: 171, blueSide: 170, redSide: 172, objControl: 58.5, firstDragon: 61.8, scuttle: 68.2, counterJg: 11.8, gankSuccess: 55.5, kda: 2.72, killPart: 58.2, soloKills: 1.35, firstBlood: 17.5, deaths: 5.8, dmgPerMin: 1095, winRate: 49.5, pickRate: 3.5, banRate: 2.2, gameDuration: 1785, goldPerMin: 408, csPerMin: 6.75, cs15: 98, gold15: 5680, plates: 0.15, xp15: 8050 },
  { name: "BelVeth", games: 185000, clearTime: 163, blueSide: 162, redSide: 164, objControl: 60.2, firstDragon: 64.5, scuttle: 62.5, counterJg: 8.2, gankSuccess: 55.8, kda: 2.55, killPart: 56.5, soloKills: 1.25, firstBlood: 15.8, deaths: 6.2, dmgPerMin: 985, winRate: 50.5, pickRate: 3.2, banRate: 4.8, gameDuration: 1830, goldPerMin: 398, csPerMin: 6.85, cs15: 99, gold15: 5620, plates: 0.20, xp15: 8120 },
  { name: "MasterYi", games: 380000, clearTime: 164, blueSide: 163, redSide: 165, objControl: 57.8, firstDragon: 62.2, scuttle: 59.5, counterJg: 7.8, gankSuccess: 52.8, kda: 2.52, killPart: 50.2, soloKills: 1.55, firstBlood: 15.5, deaths: 6.0, dmgPerMin: 1055, winRate: 50.8, pickRate: 6.5, banRate: 8.8, gameDuration: 1815, goldPerMin: 415, csPerMin: 6.62, cs15: 95, gold15: 5650, plates: 0.15, xp15: 8080 },
  { name: "Rengar", games: 275000, clearTime: 170, blueSide: 169, redSide: 171, objControl: 55.2, firstDragon: 56.5, scuttle: 63.5, counterJg: 13.2, gankSuccess: 59.2, kda: 2.35, killPart: 55.5, soloKills: 1.85, firstBlood: 26.5, deaths: 6.5, dmgPerMin: 1082, winRate: 49.2, pickRate: 4.8, banRate: 5.5, gameDuration: 1695, goldPerMin: 392, csPerMin: 5.95, cs15: 84, gold15: 5480, plates: 0.12, xp15: 7650 },
  { name: "Rammus", games: 165000, clearTime: 175, blueSide: 174, redSide: 176, objControl: 55.8, firstDragon: 55.2, scuttle: 58.8, counterJg: 5.8, gankSuccess: 63.5, kda: 2.82, killPart: 65.8, soloKills: 0.62, firstBlood: 14.5, deaths: 5.5, dmgPerMin: 685, winRate: 52.5, pickRate: 2.8, banRate: 3.5, gameDuration: 1830, goldPerMin: 322, csPerMin: 5.18, cs15: 70, gold15: 4920, plates: 0.08, xp15: 7150 },
  { name: "Nunu", games: 245000, clearTime: 172, blueSide: 171, redSide: 173, objControl: 62.5, firstDragon: 68.5, scuttle: 70.2, counterJg: 8.5, gankSuccess: 62.8, kda: 2.72, killPart: 66.8, soloKills: 0.72, firstBlood: 16.5, deaths: 6.0, dmgPerMin: 755, winRate: 51.5, pickRate: 4.2, banRate: 3.2, gameDuration: 1800, goldPerMin: 335, csPerMin: 5.42, cs15: 75, gold15: 5080, plates: 0.15, xp15: 7380 },
  { name: "Gragas", games: 155000, clearTime: 170, blueSide: 169, redSide: 171, objControl: 55.5, firstDragon: 56.2, scuttle: 60.2, counterJg: 7.5, gankSuccess: 60.5, kda: 2.68, killPart: 62.8, soloKills: 0.95, firstBlood: 16.8, deaths: 6.2, dmgPerMin: 895, winRate: 49.8, pickRate: 2.5, banRate: 1.5, gameDuration: 1770, goldPerMin: 358, csPerMin: 5.75, cs15: 82, gold15: 5220, plates: 0.10, xp15: 7580 },
  { name: "Jax", games: 225000, clearTime: 168, blueSide: 167, redSide: 169, objControl: 56.8, firstDragon: 58.8, scuttle: 62.8, counterJg: 8.8, gankSuccess: 57.5, kda: 2.55, killPart: 56.2, soloKills: 1.42, firstBlood: 18.5, deaths: 6.2, dmgPerMin: 968, winRate: 50.5, pickRate: 3.8, banRate: 5.2, gameDuration: 1815, goldPerMin: 392, csPerMin: 6.12, cs15: 88, gold15: 5420, plates: 0.18, xp15: 7820 },
  { name: "Skarner", games: 142000, clearTime: 169, blueSide: 168, redSide: 170, objControl: 57.2, firstDragon: 57.8, scuttle: 61.5, counterJg: 6.8, gankSuccess: 62.2, kda: 2.62, killPart: 65.2, soloKills: 0.82, firstBlood: 15.8, deaths: 6.0, dmgPerMin: 785, winRate: 50.8, pickRate: 2.5, banRate: 4.2, gameDuration: 1800, goldPerMin: 348, csPerMin: 5.65, cs15: 80, gold15: 5150, plates: 0.12, xp15: 7520 },
  { name: "Maokai", games: 128000, clearTime: 174, blueSide: 173, redSide: 175, objControl: 56.8, firstDragon: 56.5, scuttle: 57.8, counterJg: 5.2, gankSuccess: 60.2, kda: 2.78, killPart: 66.5, soloKills: 0.55, firstBlood: 12.2, deaths: 5.8, dmgPerMin: 685, winRate: 50.2, pickRate: 2.2, banRate: 2.8, gameDuration: 1860, goldPerMin: 318, csPerMin: 5.22, cs15: 72, gold15: 4950, plates: 0.03, xp15: 7280 },
  { name: "Pantheon", games: 115000, clearTime: 176, blueSide: 175, redSide: 177, objControl: 53.2, firstDragon: 52.5, scuttle: 60.5, counterJg: 8.2, gankSuccess: 66.8, kda: 2.28, killPart: 63.8, soloKills: 1.35, firstBlood: 28.2, deaths: 7.2, dmgPerMin: 985, winRate: 47.8, pickRate: 2.0, banRate: 2.2, gameDuration: 1665, goldPerMin: 362, csPerMin: 5.08, cs15: 68, gold15: 5180, plates: 0.28, xp15: 7120 },
  { name: "Poppy", games: 95000, clearTime: 175, blueSide: 174, redSide: 176, objControl: 54.8, firstDragon: 54.2, scuttle: 59.5, counterJg: 6.5, gankSuccess: 61.8, kda: 2.72, killPart: 63.2, soloKills: 0.78, firstBlood: 15.5, deaths: 5.8, dmgPerMin: 725, winRate: 49.2, pickRate: 1.5, banRate: 1.2, gameDuration: 1800, goldPerMin: 332, csPerMin: 5.32, cs15: 74, gold15: 5050, plates: 0.08, xp15: 7280 },
  { name: "Brand", games: 88000, clearTime: 158, blueSide: 157, redSide: 159, objControl: 54.5, firstDragon: 56.8, scuttle: 53.8, counterJg: 5.5, gankSuccess: 54.2, kda: 2.85, killPart: 57.2, soloKills: 0.78, firstBlood: 13.5, deaths: 5.8, dmgPerMin: 1225, winRate: 50.5, pickRate: 1.5, banRate: 2.5, gameDuration: 1875, goldPerMin: 368, csPerMin: 6.18, cs15: 88, gold15: 5250, plates: 0.02, xp15: 7720 },
  { name: "Gwen", games: 108000, clearTime: 168, blueSide: 167, redSide: 169, objControl: 55.2, firstDragon: 57.5, scuttle: 58.2, counterJg: 7.2, gankSuccess: 53.5, kda: 2.42, killPart: 52.5, soloKills: 1.38, firstBlood: 14.8, deaths: 6.5, dmgPerMin: 1025, winRate: 48.8, pickRate: 1.8, banRate: 2.8, gameDuration: 1830, goldPerMin: 388, csPerMin: 6.28, cs15: 90, gold15: 5380, plates: 0.08, xp15: 7850 },
  { name: "Sylas", games: 145000, clearTime: 172, blueSide: 171, redSide: 173, objControl: 54.8, firstDragon: 55.2, scuttle: 59.8, counterJg: 7.8, gankSuccess: 59.5, kda: 2.58, killPart: 59.5, soloKills: 1.35, firstBlood: 18.2, deaths: 6.5, dmgPerMin: 1055, winRate: 49.2, pickRate: 2.5, banRate: 4.5, gameDuration: 1785, goldPerMin: 378, csPerMin: 5.72, cs15: 80, gold15: 5320, plates: 0.10, xp15: 7580 },
  { name: "Zac", games: 175000, clearTime: 171, blueSide: 170, redSide: 172, objControl: 56.2, firstDragon: 56.8, scuttle: 59.2, counterJg: 5.8, gankSuccess: 63.8, kda: 2.85, killPart: 67.5, soloKills: 0.62, firstBlood: 13.8, deaths: 5.5, dmgPerMin: 725, winRate: 51.5, pickRate: 3.0, banRate: 2.5, gameDuration: 1830, goldPerMin: 328, csPerMin: 5.38, cs15: 74, gold15: 5020, plates: 0.05, xp15: 7350 },
  { name: "Trundle", games: 135000, clearTime: 166, blueSide: 165, redSide: 167, objControl: 58.5, firstDragon: 62.5, scuttle: 64.8, counterJg: 9.8, gankSuccess: 56.2, kda: 2.42, killPart: 56.8, soloKills: 1.18, firstBlood: 17.5, deaths: 6.2, dmgPerMin: 868, winRate: 51.2, pickRate: 2.2, banRate: 1.5, gameDuration: 1830, goldPerMin: 375, csPerMin: 6.22, cs15: 90, gold15: 5380, plates: 0.22, xp15: 7780 },
  { name: "Taliyah", games: 118000, clearTime: 170, blueSide: 169, redSide: 171, objControl: 54.5, firstDragon: 55.8, scuttle: 58.5, counterJg: 6.8, gankSuccess: 57.8, kda: 2.75, killPart: 58.8, soloKills: 0.92, firstBlood: 14.8, deaths: 5.8, dmgPerMin: 1065, winRate: 49.8, pickRate: 2.0, banRate: 1.8, gameDuration: 1785, goldPerMin: 372, csPerMin: 6.12, cs15: 86, gold15: 5350, plates: 0.05, xp15: 7720 },
  { name: "Talon", games: 162000, clearTime: 167, blueSide: 166, redSide: 168, objControl: 54.2, firstDragon: 54.8, scuttle: 62.8, counterJg: 10.5, gankSuccess: 60.5, kda: 2.32, killPart: 56.2, soloKills: 1.68, firstBlood: 24.8, deaths: 6.8, dmgPerMin: 1085, winRate: 48.5, pickRate: 2.8, banRate: 3.5, gameDuration: 1695, goldPerMin: 388, csPerMin: 6.02, cs15: 85, gold15: 5420, plates: 0.18, xp15: 7650 },
  { name: "Olaf", games: 125000, clearTime: 164, blueSide: 163, redSide: 165, objControl: 57.5, firstDragon: 60.2, scuttle: 65.5, counterJg: 10.2, gankSuccess: 58.5, kda: 2.28, killPart: 57.2, soloKills: 1.28, firstBlood: 20.5, deaths: 6.8, dmgPerMin: 935, winRate: 49.5, pickRate: 2.2, banRate: 1.2, gameDuration: 1785, goldPerMin: 375, csPerMin: 6.28, cs15: 90, gold15: 5380, plates: 0.22, xp15: 7850 },
  { name: "Mordekaiser", games: 98000, clearTime: 172, blueSide: 171, redSide: 173, objControl: 55.5, firstDragon: 58.2, scuttle: 56.8, counterJg: 6.5, gankSuccess: 52.8, kda: 2.48, killPart: 52.8, soloKills: 1.22, firstBlood: 13.8, deaths: 6.2, dmgPerMin: 985, winRate: 49.8, pickRate: 1.5, banRate: 5.8, gameDuration: 1860, goldPerMin: 372, csPerMin: 5.95, cs15: 84, gold15: 5280, plates: 0.08, xp15: 7620 },
  { name: "Naafiri", games: 92000, clearTime: 169, blueSide: 168, redSide: 170, objControl: 54.2, firstDragon: 54.5, scuttle: 60.8, counterJg: 9.2, gankSuccess: 59.5, kda: 2.35, killPart: 56.5, soloKills: 1.55, firstBlood: 22.2, deaths: 6.5, dmgPerMin: 1045, winRate: 48.2, pickRate: 1.5, banRate: 1.8, gameDuration: 1710, goldPerMin: 382, csPerMin: 5.82, cs15: 82, gold15: 5320, plates: 0.12, xp15: 7520 },
  { name: "Wukong", games: 168000, clearTime: 168, blueSide: 167, redSide: 169, objControl: 56.5, firstDragon: 57.2, scuttle: 62.5, counterJg: 8.5, gankSuccess: 60.8, kda: 2.52, killPart: 62.8, soloKills: 1.12, firstBlood: 19.2, deaths: 6.2, dmgPerMin: 955, winRate: 50.5, pickRate: 2.8, banRate: 1.8, gameDuration: 1770, goldPerMin: 368, csPerMin: 5.78, cs15: 82, gold15: 5280, plates: 0.18, xp15: 7580 },
  { name: "Rumble", games: 72000, clearTime: 166, blueSide: 165, redSide: 167, objControl: 54.8, firstDragon: 56.5, scuttle: 55.8, counterJg: 6.2, gankSuccess: 55.2, kda: 2.58, killPart: 57.5, soloKills: 0.95, firstBlood: 14.5, deaths: 6.0, dmgPerMin: 1125, winRate: 49.2, pickRate: 1.2, banRate: 1.0, gameDuration: 1815, goldPerMin: 378, csPerMin: 6.25, cs15: 90, gold15: 5380, plates: 0.05, xp15: 7820 },
  { name: "Darius", games: 85000, clearTime: 173, blueSide: 172, redSide: 174, objControl: 55.2, firstDragon: 56.8, scuttle: 60.2, counterJg: 7.8, gankSuccess: 57.8, kda: 2.25, killPart: 54.8, soloKills: 1.35, firstBlood: 18.8, deaths: 7.0, dmgPerMin: 945, winRate: 48.5, pickRate: 1.5, banRate: 8.2, gameDuration: 1830, goldPerMin: 368, csPerMin: 5.58, cs15: 78, gold15: 5180, plates: 0.15, xp15: 7420 },
  { name: "Morgana", games: 82000, clearTime: 161, blueSide: 160, redSide: 162, objControl: 54.2, firstDragon: 56.2, scuttle: 54.5, counterJg: 5.2, gankSuccess: 58.8, kda: 2.92, killPart: 62.5, soloKills: 0.52, firstBlood: 11.8, deaths: 5.2, dmgPerMin: 875, winRate: 50.5, pickRate: 1.2, banRate: 6.5, gameDuration: 1860, goldPerMin: 348, csPerMin: 6.35, cs15: 92, gold15: 5220, plates: 0.02, xp15: 7780 },
];

function fmt(secs: number): string {
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${m}m${s.toString().padStart(2, "0")}s`;
}

function fmtLong(secs: number): string {
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

type Formatter = (v: number) => string;

const FORMATTERS: Record<string, Formatter> = {
  time: fmt,
  timeLong: fmtLong,
  pct: (v) => v.toFixed(1) + "%",
  dec1: (v) => v.toFixed(1),
  dec2: (v) => v.toFixed(2),
  int: (v) => Math.round(v).toLocaleString(),
  gold: (v) => v.toLocaleString(),
};

type StatExtractor = (j: JunglerData) => { value: number; extra?: Record<string, string> };

const EXTRACTORS: Record<string, StatExtractor> = {
  fullClearTime: (j) => ({ value: j.clearTime, extra: { blueSide: fmt(j.blueSide), redSide: fmt(j.redSide) } }),
  objectiveControl: (j) => ({ value: j.objControl }),
  firstDragonRate: (j) => ({ value: j.firstDragon }),
  scuttleControl: (j) => ({ value: j.scuttle }),
  counterJungleCs: (j) => ({ value: j.counterJg }),
  gankSuccessRate: (j) => ({ value: j.gankSuccess }),
  kda: (j) => ({ value: j.kda }),
  killParticipation: (j) => ({ value: j.killPart }),
  soloKills: (j) => ({ value: j.soloKills }),
  firstBloodRate: (j) => ({ value: j.firstBlood }),
  deathsPerGame: (j) => ({ value: j.deaths }),
  damagePerMin: (j) => ({ value: j.dmgPerMin }),
  winRate: (j) => ({ value: j.winRate }),
  pickRate: (j) => ({ value: j.pickRate }),
  banRate: (j) => ({ value: j.banRate }),
  avgGameDuration: (j) => ({ value: j.gameDuration }),
  goldPerMin: (j) => ({ value: j.goldPerMin }),
  csPerMin: (j) => ({ value: j.csPerMin }),
  csAt15: (j) => ({ value: j.cs15 }),
  goldAt15: (j) => ({ value: j.gold15 }),
  plateTaken: (j) => ({ value: j.plates }),
  xpAt15: (j) => ({ value: j.xp15 }),
};

export function getStatData(statId: string): ChampionStatEntry[] {
  const cat = STAT_CATEGORIES.find((c) => c.id === statId);
  if (!cat) return [];

  const extractor = EXTRACTORS[statId];
  if (!extractor) return [];

  const formatter = FORMATTERS[cat.format ?? "dec1"];
  const lowerIsBetter = cat.lowerIsBetter ?? false;

  const entries = JUNGLERS.map((j) => {
    const { value, extra } = extractor(j);
    return {
      championName: j.name,
      value,
      displayValue: formatter(value),
      extra,
      games: j.games,
    };
  });

  entries.sort((a, b) => lowerIsBetter ? a.value - b.value : b.value - a.value);
  return entries;
}

export function formatGames(n: number): string {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + "M";
  if (n >= 1000) return Math.round(n / 1000) + "K";
  return n.toString();
}
