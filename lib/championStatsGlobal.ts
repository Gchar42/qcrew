export type StatCategory = {
  id: string;
  label: string;
  group: string;
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
  { id: "fullClearTime", label: "Full Clear Time", group: "jungle" },
  { id: "objectiveControl", label: "Objective Control %", group: "jungle" },
  { id: "firstDragonRate", label: "First Dragon Rate", group: "jungle" },
  { id: "scuttleControl", label: "Scuttle Control", group: "jungle" },
  { id: "counterJungleCs", label: "Counter Jungle CS", group: "jungle" },
  { id: "gankSuccessRate", label: "Gank Success Rate", group: "jungle" },

  { id: "kda", label: "KDA", group: "combat" },
  { id: "killParticipation", label: "Kill Participation", group: "combat" },
  { id: "soloKills", label: "Solo Kills / Game", group: "combat" },
  { id: "firstBloodRate", label: "First Blood Rate", group: "combat" },
  { id: "deathsPerGame", label: "Deaths / Game", group: "combat" },
  { id: "damagePerMin", label: "Damage / min", group: "combat" },

  { id: "winRate", label: "Win Rate", group: "game" },
  { id: "pickRate", label: "Pick Rate", group: "game" },
  { id: "banRate", label: "Ban Rate", group: "game" },
  { id: "avgGameDuration", label: "Avg Game Duration", group: "game" },
  { id: "goldPerMin", label: "Gold / min", group: "game" },

  { id: "csPerMin", label: "CS / min", group: "lane" },
  { id: "csAt15", label: "CS @ 15 min", group: "lane" },
  { id: "goldAt15", label: "Gold @ 15 min", group: "lane" },
  { id: "plateTaken", label: "Plates Taken / Game", group: "lane" },
  { id: "xpAt15", label: "XP @ 15 min", group: "lane" },
];

function fmt(secs: number): string {
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${m}m${s.toString().padStart(2, "0")}s`;
}

type RawEntry = { name: string; val: number; games: number; extra?: Record<string, string> };

function buildStat(
  raw: RawEntry[],
  formatter: (v: number) => string,
  lowerIsBetter = false
): ChampionStatEntry[] {
  const sorted = [...raw].sort((a, b) => lowerIsBetter ? a.val - b.val : b.val - a.val);
  return sorted.map((r) => ({
    championName: r.name,
    value: r.val,
    displayValue: formatter(r.val),
    extra: r.extra,
    games: r.games,
  }));
}

function pct(v: number) { return v.toFixed(1) + "%"; }
function dec(v: number) { return v.toFixed(2); }
function dec1(v: number) { return v.toFixed(1); }
function int(v: number) { return Math.round(v).toLocaleString(); }

const JG_CLEAR_TIMES: RawEntry[] = [
  { name: "Ivern", val: 142, games: 78000, extra: { blueSide: fmt(142), redSide: fmt(142) } },
  { name: "Zyra", val: 150, games: 70000, extra: { blueSide: fmt(149), redSide: fmt(151) } },
  { name: "Karthus", val: 152, games: 89000, extra: { blueSide: fmt(152), redSide: fmt(153) } },
  { name: "DrMundo", val: 157, games: 253000, extra: { blueSide: fmt(156), redSide: fmt(158) } },
  { name: "Zed", val: 157, games: 144000, extra: { blueSide: fmt(158), redSide: fmt(157) } },
  { name: "Fiddlesticks", val: 159, games: 184000, extra: { blueSide: fmt(160), redSide: fmt(158) } },
  { name: "Hecarim", val: 162, games: 241000, extra: { blueSide: fmt(161), redSide: fmt(164) } },
  { name: "Udyr", val: 163, games: 105000, extra: { blueSide: fmt(163), redSide: fmt(164) } },
  { name: "Fizz", val: 163, games: 99000, extra: { blueSide: fmt(163), redSide: fmt(164) } },
  { name: "Shaco", val: 164, games: 282000, extra: { blueSide: fmt(164), redSide: fmt(165) } },
  { name: "JarvanIV", val: 164, games: 392000, extra: { blueSide: fmt(163), redSide: fmt(166) } },
  { name: "Ambessa", val: 165, games: 235000, extra: { blueSide: fmt(164), redSide: fmt(166) } },
  { name: "Shyvana", val: 165, games: 74000, extra: { blueSide: fmt(165), redSide: fmt(166) } },
  { name: "Sejuani", val: 166, games: 134000, extra: { blueSide: fmt(165), redSide: fmt(166) } },
  { name: "Diana", val: 166, games: 346000, extra: { blueSide: fmt(166), redSide: fmt(166) } },
  { name: "Viego", val: 166, games: 788000, extra: { blueSide: fmt(165), redSide: fmt(167) } },
  { name: "Evelynn", val: 166, games: 151000, extra: { blueSide: fmt(165), redSide: fmt(167) } },
  { name: "Graves", val: 167, games: 437000, extra: { blueSide: fmt(166), redSide: fmt(168) } },
  { name: "Volibear", val: 167, games: 189000, extra: { blueSide: fmt(166), redSide: fmt(167) } },
  { name: "Vi", val: 167, games: 345000, extra: { blueSide: fmt(166), redSide: fmt(168) } },
  { name: "Kayn", val: 168, games: 655000, extra: { blueSide: fmt(167), redSide: fmt(169) } },
  { name: "Nocturne", val: 168, games: 215000, extra: { blueSide: fmt(167), redSide: fmt(169) } },
  { name: "LeeSin", val: 170, games: 890000, extra: { blueSide: fmt(169), redSide: fmt(171) } },
  { name: "Warwick", val: 170, games: 312000, extra: { blueSide: fmt(169), redSide: fmt(171) } },
  { name: "XinZhao", val: 170, games: 195000, extra: { blueSide: fmt(170), redSide: fmt(171) } },
  { name: "Amumu", val: 171, games: 285000, extra: { blueSide: fmt(170), redSide: fmt(172) } },
  { name: "Lillia", val: 168, games: 340000, extra: { blueSide: fmt(167), redSide: fmt(169) } },
  { name: "Nidalee", val: 172, games: 178000, extra: { blueSide: fmt(171), redSide: fmt(173) } },
  { name: "Elise", val: 174, games: 165000, extra: { blueSide: fmt(173), redSide: fmt(175) } },
  { name: "RekSai", val: 173, games: 120000, extra: { blueSide: fmt(172), redSide: fmt(174) } },
];

const OBJ_CONTROL: RawEntry[] = [
  { name: "Viego", val: 62.3, games: 788000 },
  { name: "Kayn", val: 61.1, games: 655000 },
  { name: "LeeSin", val: 60.8, games: 890000 },
  { name: "JarvanIV", val: 59.9, games: 392000 },
  { name: "Hecarim", val: 59.5, games: 241000 },
  { name: "Graves", val: 59.2, games: 437000 },
  { name: "Vi", val: 58.8, games: 345000 },
  { name: "Diana", val: 58.4, games: 346000 },
  { name: "Shyvana", val: 58.1, games: 74000 },
  { name: "Udyr", val: 57.9, games: 105000 },
  { name: "Volibear", val: 57.5, games: 189000 },
  { name: "Nocturne", val: 57.2, games: 215000 },
  { name: "Warwick", val: 56.8, games: 312000 },
  { name: "Amumu", val: 56.5, games: 285000 },
  { name: "Sejuani", val: 56.2, games: 134000 },
  { name: "Fiddlesticks", val: 55.8, games: 184000 },
  { name: "Lillia", val: 55.4, games: 340000 },
  { name: "Karthus", val: 55.1, games: 89000 },
  { name: "RekSai", val: 54.8, games: 120000 },
  { name: "XinZhao", val: 54.5, games: 195000 },
];

const FIRST_DRAGON: RawEntry[] = [
  { name: "Shyvana", val: 71.2, games: 74000 },
  { name: "Viego", val: 65.8, games: 788000 },
  { name: "Kayn", val: 64.3, games: 655000 },
  { name: "Hecarim", val: 63.5, games: 241000 },
  { name: "Graves", val: 62.9, games: 437000 },
  { name: "Diana", val: 62.4, games: 346000 },
  { name: "Udyr", val: 61.8, games: 105000 },
  { name: "Vi", val: 61.2, games: 345000 },
  { name: "Volibear", val: 60.5, games: 189000 },
  { name: "Karthus", val: 60.1, games: 89000 },
  { name: "Warwick", val: 59.5, games: 312000 },
  { name: "LeeSin", val: 59.0, games: 890000 },
  { name: "JarvanIV", val: 58.5, games: 392000 },
  { name: "Nocturne", val: 57.9, games: 215000 },
  { name: "Amumu", val: 57.3, games: 285000 },
  { name: "Fiddlesticks", val: 56.8, games: 184000 },
  { name: "Lillia", val: 56.2, games: 340000 },
  { name: "RekSai", val: 55.5, games: 120000 },
  { name: "Sejuani", val: 54.9, games: 134000 },
  { name: "XinZhao", val: 54.1, games: 195000 },
];

const SCUTTLE: RawEntry[] = [
  { name: "LeeSin", val: 72.5, games: 890000 },
  { name: "Graves", val: 71.2, games: 437000 },
  { name: "Viego", val: 70.8, games: 788000 },
  { name: "Kayn", val: 69.5, games: 655000 },
  { name: "Hecarim", val: 68.9, games: 241000 },
  { name: "Udyr", val: 68.2, games: 105000 },
  { name: "Lillia", val: 67.5, games: 340000 },
  { name: "JarvanIV", val: 66.8, games: 392000 },
  { name: "Vi", val: 66.1, games: 345000 },
  { name: "Diana", val: 65.4, games: 346000 },
  { name: "Warwick", val: 64.8, games: 312000 },
  { name: "Nocturne", val: 64.1, games: 215000 },
  { name: "XinZhao", val: 63.5, games: 195000 },
  { name: "RekSai", val: 62.8, games: 120000 },
  { name: "Elise", val: 62.1, games: 165000 },
  { name: "Nidalee", val: 61.5, games: 178000 },
  { name: "Volibear", val: 60.8, games: 189000 },
  { name: "Sejuani", val: 59.2, games: 134000 },
  { name: "Amumu", val: 58.5, games: 285000 },
  { name: "Fiddlesticks", val: 57.1, games: 184000 },
];

const COUNTER_JG: RawEntry[] = [
  { name: "Shaco", val: 14.2, games: 282000 },
  { name: "Graves", val: 12.8, games: 437000 },
  { name: "LeeSin", val: 12.5, games: 890000 },
  { name: "Nidalee", val: 12.1, games: 178000 },
  { name: "Viego", val: 11.8, games: 788000 },
  { name: "Kayn", val: 11.5, games: 655000 },
  { name: "Udyr", val: 10.9, games: 105000 },
  { name: "Hecarim", val: 10.5, games: 241000 },
  { name: "RekSai", val: 10.2, games: 120000 },
  { name: "Elise", val: 9.8, games: 165000 },
  { name: "Warwick", val: 9.5, games: 312000 },
  { name: "Vi", val: 9.1, games: 345000 },
  { name: "JarvanIV", val: 8.8, games: 392000 },
  { name: "Nocturne", val: 8.4, games: 215000 },
  { name: "Diana", val: 8.1, games: 346000 },
  { name: "XinZhao", val: 7.8, games: 195000 },
  { name: "Lillia", val: 7.5, games: 340000 },
  { name: "Volibear", val: 7.1, games: 189000 },
  { name: "Amumu", val: 6.5, games: 285000 },
  { name: "Sejuani", val: 6.0, games: 134000 },
];

const GANK_SUCCESS: RawEntry[] = [
  { name: "Elise", val: 68.5, games: 165000 },
  { name: "LeeSin", val: 66.2, games: 890000 },
  { name: "JarvanIV", val: 65.8, games: 392000 },
  { name: "Vi", val: 65.1, games: 345000 },
  { name: "RekSai", val: 64.5, games: 120000 },
  { name: "Nocturne", val: 63.8, games: 215000 },
  { name: "Hecarim", val: 63.2, games: 241000 },
  { name: "Amumu", val: 62.5, games: 285000 },
  { name: "Sejuani", val: 61.9, games: 134000 },
  { name: "XinZhao", val: 61.2, games: 195000 },
  { name: "Warwick", val: 60.8, games: 312000 },
  { name: "Volibear", val: 60.1, games: 189000 },
  { name: "Viego", val: 59.5, games: 788000 },
  { name: "Kayn", val: 58.8, games: 655000 },
  { name: "Shaco", val: 58.1, games: 282000 },
  { name: "Graves", val: 57.5, games: 437000 },
  { name: "Diana", val: 56.8, games: 346000 },
  { name: "Lillia", val: 55.2, games: 340000 },
  { name: "Udyr", val: 54.5, games: 105000 },
  { name: "Fiddlesticks", val: 53.8, games: 184000 },
];

const KDA_DATA: RawEntry[] = [
  { name: "Ivern", val: 3.85, games: 78000 },
  { name: "Lillia", val: 3.21, games: 340000 },
  { name: "Karthus", val: 3.15, games: 89000 },
  { name: "Fiddlesticks", val: 3.08, games: 184000 },
  { name: "Diana", val: 2.95, games: 346000 },
  { name: "Hecarim", val: 2.88, games: 241000 },
  { name: "Viego", val: 2.82, games: 788000 },
  { name: "Graves", val: 2.78, games: 437000 },
  { name: "Kayn", val: 2.75, games: 655000 },
  { name: "Vi", val: 2.72, games: 345000 },
  { name: "Amumu", val: 2.68, games: 285000 },
  { name: "Sejuani", val: 2.65, games: 134000 },
  { name: "JarvanIV", val: 2.58, games: 392000 },
  { name: "LeeSin", val: 2.52, games: 890000 },
  { name: "Warwick", val: 2.48, games: 312000 },
  { name: "Nocturne", val: 2.45, games: 215000 },
  { name: "Udyr", val: 2.42, games: 105000 },
  { name: "Volibear", val: 2.38, games: 189000 },
  { name: "XinZhao", val: 2.35, games: 195000 },
  { name: "Shaco", val: 2.31, games: 282000 },
  { name: "RekSai", val: 2.28, games: 120000 },
  { name: "Nidalee", val: 2.25, games: 178000 },
  { name: "Elise", val: 2.22, games: 165000 },
  { name: "Evelynn", val: 2.95, games: 151000 },
  { name: "Zed", val: 2.18, games: 144000 },
];

const KILL_PART: RawEntry[] = [
  { name: "Ivern", val: 72.1, games: 78000 },
  { name: "Amumu", val: 68.5, games: 285000 },
  { name: "Sejuani", val: 67.8, games: 134000 },
  { name: "JarvanIV", val: 66.2, games: 392000 },
  { name: "Hecarim", val: 65.5, games: 241000 },
  { name: "LeeSin", val: 64.8, games: 890000 },
  { name: "Vi", val: 64.2, games: 345000 },
  { name: "Elise", val: 63.5, games: 165000 },
  { name: "Diana", val: 62.8, games: 346000 },
  { name: "Viego", val: 62.1, games: 788000 },
  { name: "Kayn", val: 61.5, games: 655000 },
  { name: "Fiddlesticks", val: 60.8, games: 184000 },
  { name: "Volibear", val: 60.1, games: 189000 },
  { name: "Warwick", val: 59.5, games: 312000 },
  { name: "Nocturne", val: 58.8, games: 215000 },
  { name: "XinZhao", val: 58.1, games: 195000 },
  { name: "Graves", val: 57.5, games: 437000 },
  { name: "Udyr", val: 56.8, games: 105000 },
  { name: "Shaco", val: 55.2, games: 282000 },
  { name: "Karthus", val: 54.5, games: 89000 },
];

const SOLO_KILLS: RawEntry[] = [
  { name: "LeeSin", val: 1.82, games: 890000 },
  { name: "Graves", val: 1.65, games: 437000 },
  { name: "Viego", val: 1.58, games: 788000 },
  { name: "Kayn", val: 1.52, games: 655000 },
  { name: "Nidalee", val: 1.48, games: 178000 },
  { name: "Shaco", val: 1.45, games: 282000 },
  { name: "Evelynn", val: 1.42, games: 151000 },
  { name: "Elise", val: 1.38, games: 165000 },
  { name: "Warwick", val: 1.35, games: 312000 },
  { name: "Udyr", val: 1.31, games: 105000 },
  { name: "Vi", val: 1.28, games: 345000 },
  { name: "Nocturne", val: 1.25, games: 215000 },
  { name: "RekSai", val: 1.22, games: 120000 },
  { name: "Diana", val: 1.18, games: 346000 },
  { name: "Hecarim", val: 1.15, games: 241000 },
  { name: "JarvanIV", val: 1.08, games: 392000 },
  { name: "XinZhao", val: 1.05, games: 195000 },
  { name: "Volibear", val: 1.02, games: 189000 },
  { name: "Amumu", val: 0.85, games: 285000 },
  { name: "Sejuani", val: 0.72, games: 134000 },
];

const FIRST_BLOOD: RawEntry[] = [
  { name: "LeeSin", val: 28.5, games: 890000 },
  { name: "Elise", val: 27.2, games: 165000 },
  { name: "JarvanIV", val: 25.8, games: 392000 },
  { name: "Shaco", val: 25.1, games: 282000 },
  { name: "Vi", val: 24.5, games: 345000 },
  { name: "Nidalee", val: 23.8, games: 178000 },
  { name: "RekSai", val: 23.1, games: 120000 },
  { name: "Hecarim", val: 22.5, games: 241000 },
  { name: "XinZhao", val: 22.1, games: 195000 },
  { name: "Warwick", val: 21.5, games: 312000 },
  { name: "Viego", val: 20.8, games: 788000 },
  { name: "Nocturne", val: 20.2, games: 215000 },
  { name: "Kayn", val: 19.5, games: 655000 },
  { name: "Graves", val: 18.8, games: 437000 },
  { name: "Udyr", val: 18.2, games: 105000 },
  { name: "Diana", val: 17.5, games: 346000 },
  { name: "Volibear", val: 16.8, games: 189000 },
  { name: "Evelynn", val: 16.2, games: 151000 },
  { name: "Amumu", val: 14.5, games: 285000 },
  { name: "Karthus", val: 12.8, games: 89000 },
];

const DEATHS: RawEntry[] = [
  { name: "Ivern", val: 4.2, games: 78000 },
  { name: "Karthus", val: 5.1, games: 89000 },
  { name: "Lillia", val: 5.3, games: 340000 },
  { name: "Fiddlesticks", val: 5.5, games: 184000 },
  { name: "Graves", val: 5.6, games: 437000 },
  { name: "Diana", val: 5.8, games: 346000 },
  { name: "Evelynn", val: 5.8, games: 151000 },
  { name: "Viego", val: 5.9, games: 788000 },
  { name: "Kayn", val: 6.0, games: 655000 },
  { name: "Hecarim", val: 6.1, games: 241000 },
  { name: "Vi", val: 6.2, games: 345000 },
  { name: "Amumu", val: 6.3, games: 285000 },
  { name: "LeeSin", val: 6.4, games: 890000 },
  { name: "Nocturne", val: 6.5, games: 215000 },
  { name: "JarvanIV", val: 6.5, games: 392000 },
  { name: "Warwick", val: 6.6, games: 312000 },
  { name: "Sejuani", val: 6.7, games: 134000 },
  { name: "Udyr", val: 6.8, games: 105000 },
  { name: "Volibear", val: 6.9, games: 189000 },
  { name: "XinZhao", val: 7.0, games: 195000 },
];

const DMG_PER_MIN: RawEntry[] = [
  { name: "Karthus", val: 1285, games: 89000 },
  { name: "Kayn", val: 1195, games: 655000 },
  { name: "Diana", val: 1180, games: 346000 },
  { name: "Evelynn", val: 1165, games: 151000 },
  { name: "Graves", val: 1148, games: 437000 },
  { name: "Viego", val: 1125, games: 788000 },
  { name: "Hecarim", val: 1098, games: 241000 },
  { name: "Shaco", val: 1075, games: 282000 },
  { name: "LeeSin", val: 1052, games: 890000 },
  { name: "Lillia", val: 1045, games: 340000 },
  { name: "Fiddlesticks", val: 1038, games: 184000 },
  { name: "Vi", val: 1015, games: 345000 },
  { name: "Nocturne", val: 998, games: 215000 },
  { name: "JarvanIV", val: 975, games: 392000 },
  { name: "Warwick", val: 958, games: 312000 },
  { name: "Udyr", val: 942, games: 105000 },
  { name: "XinZhao", val: 925, games: 195000 },
  { name: "Volibear", val: 908, games: 189000 },
  { name: "Amumu", val: 895, games: 285000 },
  { name: "Sejuani", val: 768, games: 134000 },
];

const WIN_RATES: RawEntry[] = [
  { name: "Ambessa", val: 54.2, games: 235000 },
  { name: "Viego", val: 52.8, games: 788000 },
  { name: "Hecarim", val: 52.5, games: 241000 },
  { name: "Shyvana", val: 52.3, games: 74000 },
  { name: "Volibear", val: 52.1, games: 189000 },
  { name: "Amumu", val: 51.9, games: 285000 },
  { name: "Warwick", val: 51.8, games: 312000 },
  { name: "Diana", val: 51.5, games: 346000 },
  { name: "Fiddlesticks", val: 51.2, games: 184000 },
  { name: "Vi", val: 51.0, games: 345000 },
  { name: "Kayn", val: 50.8, games: 655000 },
  { name: "JarvanIV", val: 50.5, games: 392000 },
  { name: "Graves", val: 50.2, games: 437000 },
  { name: "Udyr", val: 50.0, games: 105000 },
  { name: "Lillia", val: 49.8, games: 340000 },
  { name: "Sejuani", val: 49.5, games: 134000 },
  { name: "LeeSin", val: 49.2, games: 890000 },
  { name: "Nocturne", val: 49.0, games: 215000 },
  { name: "Karthus", val: 48.8, games: 89000 },
  { name: "XinZhao", val: 48.5, games: 195000 },
  { name: "Shaco", val: 48.2, games: 282000 },
  { name: "RekSai", val: 48.0, games: 120000 },
  { name: "Elise", val: 47.5, games: 165000 },
  { name: "Nidalee", val: 47.2, games: 178000 },
  { name: "Evelynn", val: 49.5, games: 151000 },
];

const PICK_RATES: RawEntry[] = [
  { name: "LeeSin", val: 14.8, games: 890000 },
  { name: "Viego", val: 12.2, games: 788000 },
  { name: "Kayn", val: 10.5, games: 655000 },
  { name: "Graves", val: 8.2, games: 437000 },
  { name: "JarvanIV", val: 7.5, games: 392000 },
  { name: "Diana", val: 6.8, games: 346000 },
  { name: "Vi", val: 6.5, games: 345000 },
  { name: "Lillia", val: 5.9, games: 340000 },
  { name: "Warwick", val: 5.5, games: 312000 },
  { name: "Amumu", val: 5.1, games: 285000 },
  { name: "Shaco", val: 4.8, games: 282000 },
  { name: "DrMundo", val: 4.5, games: 253000 },
  { name: "Ambessa", val: 4.2, games: 235000 },
  { name: "Hecarim", val: 4.0, games: 241000 },
  { name: "Nocturne", val: 3.8, games: 215000 },
  { name: "XinZhao", val: 3.5, games: 195000 },
  { name: "Volibear", val: 3.2, games: 189000 },
  { name: "Fiddlesticks", val: 3.0, games: 184000 },
  { name: "Nidalee", val: 2.8, games: 178000 },
  { name: "Elise", val: 2.5, games: 165000 },
];

const BAN_RATES: RawEntry[] = [
  { name: "Ambessa", val: 32.5, games: 235000 },
  { name: "Viego", val: 18.2, games: 788000 },
  { name: "Shaco", val: 15.8, games: 282000 },
  { name: "Kayn", val: 12.5, games: 655000 },
  { name: "LeeSin", val: 10.2, games: 890000 },
  { name: "Hecarim", val: 8.5, games: 241000 },
  { name: "Graves", val: 7.8, games: 437000 },
  { name: "Diana", val: 6.2, games: 346000 },
  { name: "Evelynn", val: 5.8, games: 151000 },
  { name: "Fiddlesticks", val: 4.5, games: 184000 },
  { name: "Vi", val: 3.8, games: 345000 },
  { name: "JarvanIV", val: 3.2, games: 392000 },
  { name: "Warwick", val: 2.8, games: 312000 },
  { name: "Nocturne", val: 2.5, games: 215000 },
  { name: "Lillia", val: 2.2, games: 340000 },
  { name: "Volibear", val: 1.8, games: 189000 },
  { name: "Udyr", val: 1.5, games: 105000 },
  { name: "Amumu", val: 1.2, games: 285000 },
  { name: "Sejuani", val: 0.8, games: 134000 },
  { name: "XinZhao", val: 0.5, games: 195000 },
];

const GAME_DUR: RawEntry[] = [
  { name: "Shaco", val: 1620, games: 282000 },
  { name: "Elise", val: 1650, games: 165000 },
  { name: "LeeSin", val: 1668, games: 890000 },
  { name: "Nidalee", val: 1680, games: 178000 },
  { name: "RekSai", val: 1695, games: 120000 },
  { name: "JarvanIV", val: 1710, games: 392000 },
  { name: "Vi", val: 1725, games: 345000 },
  { name: "Hecarim", val: 1740, games: 241000 },
  { name: "Nocturne", val: 1755, games: 215000 },
  { name: "Viego", val: 1770, games: 788000 },
  { name: "Graves", val: 1785, games: 437000 },
  { name: "Kayn", val: 1800, games: 655000 },
  { name: "Diana", val: 1815, games: 346000 },
  { name: "Warwick", val: 1830, games: 312000 },
  { name: "Udyr", val: 1845, games: 105000 },
  { name: "XinZhao", val: 1860, games: 195000 },
  { name: "Amumu", val: 1875, games: 285000 },
  { name: "Volibear", val: 1890, games: 189000 },
  { name: "Fiddlesticks", val: 1905, games: 184000 },
  { name: "Karthus", val: 1920, games: 89000 },
];

const GOLD_PM: RawEntry[] = [
  { name: "Graves", val: 425, games: 437000 },
  { name: "Karthus", val: 418, games: 89000 },
  { name: "Viego", val: 412, games: 788000 },
  { name: "Kayn", val: 408, games: 655000 },
  { name: "Diana", val: 402, games: 346000 },
  { name: "Evelynn", val: 398, games: 151000 },
  { name: "LeeSin", val: 395, games: 890000 },
  { name: "Shyvana", val: 392, games: 74000 },
  { name: "Hecarim", val: 388, games: 241000 },
  { name: "Lillia", val: 385, games: 340000 },
  { name: "Udyr", val: 382, games: 105000 },
  { name: "Nidalee", val: 378, games: 178000 },
  { name: "Vi", val: 375, games: 345000 },
  { name: "Nocturne", val: 372, games: 215000 },
  { name: "JarvanIV", val: 368, games: 392000 },
  { name: "Warwick", val: 365, games: 312000 },
  { name: "XinZhao", val: 362, games: 195000 },
  { name: "Volibear", val: 358, games: 189000 },
  { name: "Amumu", val: 342, games: 285000 },
  { name: "Sejuani", val: 328, games: 134000 },
];

const CS_PM: RawEntry[] = [
  { name: "Karthus", val: 7.85, games: 89000 },
  { name: "Lillia", val: 7.42, games: 340000 },
  { name: "Graves", val: 7.28, games: 437000 },
  { name: "Shyvana", val: 7.15, games: 74000 },
  { name: "Diana", val: 6.95, games: 346000 },
  { name: "Udyr", val: 6.82, games: 105000 },
  { name: "Hecarim", val: 6.68, games: 241000 },
  { name: "Kayn", val: 6.55, games: 655000 },
  { name: "Viego", val: 6.42, games: 788000 },
  { name: "Fiddlesticks", val: 6.28, games: 184000 },
  { name: "Volibear", val: 6.15, games: 189000 },
  { name: "Amumu", val: 6.05, games: 285000 },
  { name: "JarvanIV", val: 5.92, games: 392000 },
  { name: "Vi", val: 5.85, games: 345000 },
  { name: "Nocturne", val: 5.72, games: 215000 },
  { name: "LeeSin", val: 5.65, games: 890000 },
  { name: "Warwick", val: 5.52, games: 312000 },
  { name: "XinZhao", val: 5.42, games: 195000 },
  { name: "Sejuani", val: 5.28, games: 134000 },
  { name: "Elise", val: 5.15, games: 165000 },
];

const CS_15: RawEntry[] = [
  { name: "Karthus", val: 112, games: 89000 },
  { name: "Lillia", val: 108, games: 340000 },
  { name: "Graves", val: 105, games: 437000 },
  { name: "Shyvana", val: 103, games: 74000 },
  { name: "Diana", val: 100, games: 346000 },
  { name: "Udyr", val: 98, games: 105000 },
  { name: "Hecarim", val: 96, games: 241000 },
  { name: "Kayn", val: 94, games: 655000 },
  { name: "Viego", val: 92, games: 788000 },
  { name: "Fiddlesticks", val: 90, games: 184000 },
  { name: "Volibear", val: 88, games: 189000 },
  { name: "Amumu", val: 86, games: 285000 },
  { name: "JarvanIV", val: 84, games: 392000 },
  { name: "Vi", val: 82, games: 345000 },
  { name: "Nocturne", val: 80, games: 215000 },
  { name: "LeeSin", val: 78, games: 890000 },
  { name: "Warwick", val: 76, games: 312000 },
  { name: "XinZhao", val: 74, games: 195000 },
  { name: "Sejuani", val: 72, games: 134000 },
  { name: "Elise", val: 68, games: 165000 },
];

const GOLD_15: RawEntry[] = [
  { name: "Graves", val: 5850, games: 437000 },
  { name: "Karthus", val: 5780, games: 89000 },
  { name: "Viego", val: 5720, games: 788000 },
  { name: "Kayn", val: 5680, games: 655000 },
  { name: "Diana", val: 5640, games: 346000 },
  { name: "Shyvana", val: 5610, games: 74000 },
  { name: "LeeSin", val: 5580, games: 890000 },
  { name: "Hecarim", val: 5540, games: 241000 },
  { name: "Lillia", val: 5500, games: 340000 },
  { name: "Udyr", val: 5480, games: 105000 },
  { name: "Evelynn", val: 5450, games: 151000 },
  { name: "Nidalee", val: 5420, games: 178000 },
  { name: "Vi", val: 5380, games: 345000 },
  { name: "Nocturne", val: 5340, games: 215000 },
  { name: "JarvanIV", val: 5300, games: 392000 },
  { name: "Warwick", val: 5260, games: 312000 },
  { name: "XinZhao", val: 5220, games: 195000 },
  { name: "Volibear", val: 5180, games: 189000 },
  { name: "Amumu", val: 5120, games: 285000 },
  { name: "Sejuani", val: 5040, games: 134000 },
];

const PLATES: RawEntry[] = [
  { name: "LeeSin", val: 0.42, games: 890000 },
  { name: "Vi", val: 0.38, games: 345000 },
  { name: "JarvanIV", val: 0.35, games: 392000 },
  { name: "Hecarim", val: 0.32, games: 241000 },
  { name: "Viego", val: 0.30, games: 788000 },
  { name: "Volibear", val: 0.28, games: 189000 },
  { name: "Warwick", val: 0.25, games: 312000 },
  { name: "Nocturne", val: 0.22, games: 215000 },
  { name: "XinZhao", val: 0.20, games: 195000 },
  { name: "Kayn", val: 0.18, games: 655000 },
  { name: "Graves", val: 0.15, games: 437000 },
  { name: "Diana", val: 0.12, games: 346000 },
  { name: "Udyr", val: 0.10, games: 105000 },
  { name: "Elise", val: 0.08, games: 165000 },
  { name: "Amumu", val: 0.05, games: 285000 },
  { name: "Sejuani", val: 0.05, games: 134000 },
  { name: "Fiddlesticks", val: 0.04, games: 184000 },
  { name: "Karthus", val: 0.02, games: 89000 },
  { name: "Lillia", val: 0.02, games: 340000 },
  { name: "Ivern", val: 0.01, games: 78000 },
];

const XP_15: RawEntry[] = [
  { name: "Karthus", val: 8450, games: 89000 },
  { name: "Lillia", val: 8320, games: 340000 },
  { name: "Graves", val: 8280, games: 437000 },
  { name: "Shyvana", val: 8220, games: 74000 },
  { name: "Diana", val: 8180, games: 346000 },
  { name: "Udyr", val: 8120, games: 105000 },
  { name: "Hecarim", val: 8050, games: 241000 },
  { name: "Kayn", val: 7980, games: 655000 },
  { name: "Viego", val: 7920, games: 788000 },
  { name: "Fiddlesticks", val: 7860, games: 184000 },
  { name: "Vi", val: 7780, games: 345000 },
  { name: "JarvanIV", val: 7720, games: 392000 },
  { name: "Amumu", val: 7650, games: 285000 },
  { name: "Nocturne", val: 7580, games: 215000 },
  { name: "LeeSin", val: 7520, games: 890000 },
  { name: "Warwick", val: 7450, games: 312000 },
  { name: "Volibear", val: 7380, games: 189000 },
  { name: "XinZhao", val: 7320, games: 195000 },
  { name: "Sejuani", val: 7250, games: 134000 },
  { name: "Elise", val: 7180, games: 165000 },
];

export function getStatData(statId: string): ChampionStatEntry[] {
  switch (statId) {
    case "fullClearTime": return buildStat(JG_CLEAR_TIMES, fmt, true);
    case "objectiveControl": return buildStat(OBJ_CONTROL, pct);
    case "firstDragonRate": return buildStat(FIRST_DRAGON, pct);
    case "scuttleControl": return buildStat(SCUTTLE, pct);
    case "counterJungleCs": return buildStat(COUNTER_JG, dec1);
    case "gankSuccessRate": return buildStat(GANK_SUCCESS, pct);
    case "kda": return buildStat(KDA_DATA, dec);
    case "killParticipation": return buildStat(KILL_PART, pct);
    case "soloKills": return buildStat(SOLO_KILLS, dec);
    case "firstBloodRate": return buildStat(FIRST_BLOOD, pct);
    case "deathsPerGame": return buildStat(DEATHS, dec1, true);
    case "damagePerMin": return buildStat(DMG_PER_MIN, int);
    case "winRate": return buildStat(WIN_RATES, pct);
    case "pickRate": return buildStat(PICK_RATES, pct);
    case "banRate": return buildStat(BAN_RATES, pct);
    case "avgGameDuration": return buildStat(GAME_DUR, fmt, true);
    case "goldPerMin": return buildStat(GOLD_PM, int);
    case "csPerMin": return buildStat(CS_PM, dec);
    case "csAt15": return buildStat(CS_15, int);
    case "goldAt15": return buildStat(GOLD_15, (v) => v.toLocaleString());
    case "plateTaken": return buildStat(PLATES, dec);
    case "xpAt15": return buildStat(XP_15, (v) => v.toLocaleString());
    default: return buildStat(JG_CLEAR_TIMES, fmt, true);
  }
}

export function formatGames(n: number): string {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + "M";
  if (n >= 1000) return Math.round(n / 1000) + "K";
  return n.toString();
}
