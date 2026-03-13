/* Sample data for the top 15 junglers — Prompt 28 */

export type JunglerTier = "S" | "A" | "B" | "C" | "D";

export interface JunglerStats {
  id: string;
  name: string;
  winRate: number;
  pickRate: number;
  banRate: number;
  tier: JunglerTier;
  games: number;
}

export interface ClearSpeedEntry {
  id: string;
  name: string;
  avgClearTime: string;
  avgHpAfterClear: number;
  paths: { icons: string; label: string }[];
  games: number;
}

export interface ObjectiveEntry {
  id: string;
  name: string;
  icon: string;
  wrWhenAchieved: number;
  wrWhenNot: number;
  delta: number;
}

export interface GankEntry {
  id: string;
  name: string;
  avgFirstGankTime: string;
  gankSuccessRate: number;
  mostGankedLane: string;
  games: number;
}

export interface ScuttleEntry {
  id: string;
  name: string;
  scuttleContestRate: number;
  counterJungleRate: number;
  earlyKillRate: number;
  games: number;
}

export interface MatchupEntry {
  enemyId: string;
  enemyName: string;
  wrAgainst: number;
  games: number;
  earlyAdvantageScore: number;
  tip: string;
  startSide: string;
  spikeNote: string;
}

export const JUNGLERS: JunglerStats[] = [
  { id: "LeeSin", name: "Lee Sin", winRate: 49.8, pickRate: 14.2, banRate: 8.1, tier: "S", games: 142300 },
  { id: "Viego", name: "Viego", winRate: 51.3, pickRate: 10.8, banRate: 12.4, tier: "S", games: 108200 },
  { id: "Graves", name: "Graves", winRate: 51.0, pickRate: 8.6, banRate: 6.3, tier: "S", games: 86400 },
  { id: "Elise", name: "Elise", winRate: 51.7, pickRate: 5.4, banRate: 3.2, tier: "A", games: 54100 },
  { id: "Vi", name: "Vi", winRate: 52.1, pickRate: 6.2, banRate: 4.8, tier: "A", games: 62300 },
  { id: "JarvanIV", name: "Jarvan IV", winRate: 51.4, pickRate: 5.8, banRate: 3.6, tier: "A", games: 58100 },
  { id: "Khazix", name: "Kha'Zix", winRate: 51.9, pickRate: 7.1, banRate: 9.2, tier: "A", games: 71200 },
  { id: "RekSai", name: "Rek'Sai", winRate: 52.4, pickRate: 3.1, banRate: 1.4, tier: "B", games: 31200 },
  { id: "Hecarim", name: "Hecarim", winRate: 50.6, pickRate: 5.5, banRate: 5.1, tier: "B", games: 55100 },
  { id: "Kayn", name: "Kayn", winRate: 50.2, pickRate: 9.4, banRate: 7.3, tier: "B", games: 94300 },
  { id: "Shaco", name: "Shaco", winRate: 51.1, pickRate: 4.8, banRate: 11.6, tier: "B", games: 48200 },
  { id: "Warwick", name: "Warwick", winRate: 52.3, pickRate: 4.2, banRate: 2.8, tier: "B", games: 42100 },
  { id: "Amumu", name: "Amumu", winRate: 52.8, pickRate: 3.6, banRate: 1.9, tier: "C", games: 36100 },
  { id: "Evelynn", name: "Evelynn", winRate: 50.4, pickRate: 4.1, banRate: 6.7, tier: "C", games: 41300 },
  { id: "Nidalee", name: "Nidalee", winRate: 48.2, pickRate: 3.8, banRate: 1.1, tier: "D", games: 38200 },
];

export const CLEAR_SPEEDS: ClearSpeedEntry[] = [
  { id: "Shaco", name: "Shaco", avgClearTime: "3:05", avgHpAfterClear: 78, paths: [
    { icons: "🔴→🐦→🐺→🔵→🪨→🐸", label: "Red start (standard)" },
    { icons: "🔵→🐸→🐺→🐦→🔴→🪨", label: "Blue start invade" },
  ], games: 48200 },
  { id: "Graves", name: "Graves", avgClearTime: "3:08", avgHpAfterClear: 92, paths: [
    { icons: "🔴→🪨→🐦→🐺→🔵→🐸", label: "Red leashless full" },
    { icons: "🔵→🐸→🐺→🐦→🔴→🪨", label: "Blue start full" },
  ], games: 86400 },
  { id: "Kayn", name: "Kayn", avgClearTime: "3:10", avgHpAfterClear: 85, paths: [
    { icons: "🔴→🐦→🐺→🔵→🐸→🪨", label: "Red start raptor prio" },
    { icons: "🔵→🐸→🐺→🐦→🔴→🪨", label: "Blue start standard" },
  ], games: 94300 },
  { id: "Viego", name: "Viego", avgClearTime: "3:12", avgHpAfterClear: 74, paths: [
    { icons: "🔵→🐸→🐺→🐦→🔴→🪨", label: "Blue side full clear" },
  ], games: 108200 },
  { id: "Hecarim", name: "Hecarim", avgClearTime: "3:14", avgHpAfterClear: 68, paths: [
    { icons: "🔵→🐸→🐺→🐦→🔴→🪨", label: "Blue side speed clear" },
    { icons: "🔴→🪨→🐦→🐺→🔵→🐸", label: "Red leashless" },
  ], games: 55100 },
  { id: "Khazix", name: "Kha'Zix", avgClearTime: "3:16", avgHpAfterClear: 71, paths: [
    { icons: "🔴→🐦→🐺→🔵→🐸→🪨", label: "Red start standard" },
  ], games: 71200 },
  { id: "Amumu", name: "Amumu", avgClearTime: "3:18", avgHpAfterClear: 82, paths: [
    { icons: "🔵→🐸→🐺→🐦→🔴→🪨", label: "Blue start AOE clear" },
  ], games: 36100 },
  { id: "Vi", name: "Vi", avgClearTime: "3:20", avgHpAfterClear: 76, paths: [
    { icons: "🔴→🪨→🐦→🐺→🔵→🐸", label: "Red side full" },
    { icons: "🔴→🐦→ GANK MID", label: "Red into gank (3 camp)" },
  ], games: 62300 },
  { id: "JarvanIV", name: "Jarvan IV", avgClearTime: "3:22", avgHpAfterClear: 64, paths: [
    { icons: "🔴→🐦→🐺→🔵→🐸→🪨", label: "Red start standard" },
    { icons: "🔴→🔵→ GANK", label: "Double buff gank (aggressive)" },
  ], games: 58100 },
  { id: "Warwick", name: "Warwick", avgClearTime: "3:24", avgHpAfterClear: 95, paths: [
    { icons: "🔵→🐸→🐺→🐦→🔴→🪨", label: "Blue start sustain" },
  ], games: 42100 },
  { id: "LeeSin", name: "Lee Sin", avgClearTime: "3:26", avgHpAfterClear: 70, paths: [
    { icons: "🔴→🐦→🐺→ GANK", label: "Red 3-camp gank" },
    { icons: "🔴→🪨→🐦→🐺→🔵→🐸", label: "Red full clear" },
  ], games: 142300 },
  { id: "RekSai", name: "Rek'Sai", avgClearTime: "3:28", avgHpAfterClear: 73, paths: [
    { icons: "🔴→🐦→🐺→ GANK", label: "Red 3-camp gank" },
  ], games: 31200 },
  { id: "Elise", name: "Elise", avgClearTime: "3:30", avgHpAfterClear: 66, paths: [
    { icons: "🔴→🐦→ GANK MID", label: "Red 2-camp gank" },
    { icons: "🔵→🐸→🐺→🐦→🔴→🪨", label: "Blue full clear (rare)" },
  ], games: 54100 },
  { id: "Evelynn", name: "Evelynn", avgClearTime: "3:32", avgHpAfterClear: 58, paths: [
    { icons: "🔵→🐸→🐺→🐦→🔴→🪨", label: "Blue start full (always)" },
  ], games: 41300 },
  { id: "Nidalee", name: "Nidalee", avgClearTime: "3:06", avgHpAfterClear: 62, paths: [
    { icons: "🔵→🐸→🐺→🐦→🔴→🪨", label: "Blue leashless kite" },
    { icons: "🔴→🐦→🐺→ INVADE", label: "Red into invade" },
  ], games: 38200 },
];

export const OBJECTIVES: ObjectiveEntry[] = [
  { id: "first-dragon", name: "First Dragon", icon: "🐉", wrWhenAchieved: 58.3, wrWhenNot: 41.7, delta: 16.6 },
  { id: "first-grubs", name: "First Voidgrubs", icon: "🪲", wrWhenAchieved: 62.1, wrWhenNot: 37.9, delta: 24.2 },
  { id: "first-herald", name: "First Rift Herald", icon: "👁️", wrWhenAchieved: 56.8, wrWhenNot: 43.2, delta: 13.6 },
  { id: "first-baron", name: "First Baron", icon: "🟣", wrWhenAchieved: 74.2, wrWhenNot: 25.8, delta: 48.4 },
  { id: "dragon-soul", name: "Dragon Soul", icon: "💎", wrWhenAchieved: 89.6, wrWhenNot: 10.4, delta: 79.2 },
];

export const GANK_TIMING: GankEntry[] = [
  { id: "Elise", name: "Elise", avgFirstGankTime: "2:48", gankSuccessRate: 64.2, mostGankedLane: "Mid", games: 54100 },
  { id: "LeeSin", name: "Lee Sin", avgFirstGankTime: "2:55", gankSuccessRate: 58.7, mostGankedLane: "Mid", games: 142300 },
  { id: "JarvanIV", name: "Jarvan IV", avgFirstGankTime: "3:02", gankSuccessRate: 61.4, mostGankedLane: "Bot", games: 58100 },
  { id: "RekSai", name: "Rek'Sai", avgFirstGankTime: "3:05", gankSuccessRate: 59.1, mostGankedLane: "Top", games: 31200 },
  { id: "Vi", name: "Vi", avgFirstGankTime: "3:08", gankSuccessRate: 62.8, mostGankedLane: "Bot", games: 62300 },
  { id: "Shaco", name: "Shaco", avgFirstGankTime: "2:42", gankSuccessRate: 55.3, mostGankedLane: "Bot", games: 48200 },
  { id: "Hecarim", name: "Hecarim", avgFirstGankTime: "3:18", gankSuccessRate: 56.9, mostGankedLane: "Bot", games: 55100 },
  { id: "Khazix", name: "Kha'Zix", avgFirstGankTime: "3:22", gankSuccessRate: 54.1, mostGankedLane: "Mid", games: 71200 },
  { id: "Viego", name: "Viego", avgFirstGankTime: "3:30", gankSuccessRate: 52.6, mostGankedLane: "Top", games: 108200 },
  { id: "Warwick", name: "Warwick", avgFirstGankTime: "3:12", gankSuccessRate: 60.3, mostGankedLane: "Top", games: 42100 },
  { id: "Kayn", name: "Kayn", avgFirstGankTime: "3:35", gankSuccessRate: 48.7, mostGankedLane: "Bot", games: 94300 },
  { id: "Amumu", name: "Amumu", avgFirstGankTime: "3:28", gankSuccessRate: 57.2, mostGankedLane: "Bot", games: 36100 },
  { id: "Evelynn", name: "Evelynn", avgFirstGankTime: "6:00", gankSuccessRate: 63.8, mostGankedLane: "Mid", games: 41300 },
  { id: "Graves", name: "Graves", avgFirstGankTime: "3:40", gankSuccessRate: 47.3, mostGankedLane: "Mid", games: 86400 },
  { id: "Nidalee", name: "Nidalee", avgFirstGankTime: "3:10", gankSuccessRate: 51.2, mostGankedLane: "Mid", games: 38200 },
];

export const SCUTTLE_DATA: ScuttleEntry[] = [
  { id: "LeeSin", name: "Lee Sin", scuttleContestRate: 78.2, counterJungleRate: 34.1, earlyKillRate: 42.3, games: 142300 },
  { id: "Elise", name: "Elise", scuttleContestRate: 72.4, counterJungleRate: 28.6, earlyKillRate: 38.7, games: 54100 },
  { id: "Shaco", name: "Shaco", scuttleContestRate: 45.1, counterJungleRate: 62.3, earlyKillRate: 35.1, games: 48200 },
  { id: "Graves", name: "Graves", scuttleContestRate: 68.7, counterJungleRate: 31.4, earlyKillRate: 28.9, games: 86400 },
  { id: "RekSai", name: "Rek'Sai", scuttleContestRate: 74.6, counterJungleRate: 29.8, earlyKillRate: 36.2, games: 31200 },
  { id: "Viego", name: "Viego", scuttleContestRate: 62.3, counterJungleRate: 22.1, earlyKillRate: 31.4, games: 108200 },
  { id: "Khazix", name: "Kha'Zix", scuttleContestRate: 58.9, counterJungleRate: 36.7, earlyKillRate: 33.8, games: 71200 },
  { id: "Vi", name: "Vi", scuttleContestRate: 65.1, counterJungleRate: 18.4, earlyKillRate: 29.6, games: 62300 },
  { id: "JarvanIV", name: "Jarvan IV", scuttleContestRate: 63.8, counterJungleRate: 16.2, earlyKillRate: 32.1, games: 58100 },
  { id: "Warwick", name: "Warwick", scuttleContestRate: 71.3, counterJungleRate: 24.6, earlyKillRate: 38.2, games: 42100 },
  { id: "Hecarim", name: "Hecarim", scuttleContestRate: 56.4, counterJungleRate: 14.8, earlyKillRate: 24.7, games: 55100 },
  { id: "Kayn", name: "Kayn", scuttleContestRate: 52.1, counterJungleRate: 19.3, earlyKillRate: 21.4, games: 94300 },
  { id: "Nidalee", name: "Nidalee", scuttleContestRate: 70.8, counterJungleRate: 41.2, earlyKillRate: 34.6, games: 38200 },
  { id: "Amumu", name: "Amumu", scuttleContestRate: 42.6, counterJungleRate: 8.3, earlyKillRate: 16.2, games: 36100 },
  { id: "Evelynn", name: "Evelynn", scuttleContestRate: 28.4, counterJungleRate: 12.1, earlyKillRate: 14.8, games: 41300 },
];

export const MATCHUP_DATA: Record<string, MatchupEntry[]> = {
  LeeSin: [
    { enemyId: "Amumu", enemyName: "Amumu", wrAgainst: 54.2, games: 8420, earlyAdvantageScore: 78, tip: "Invade Amumu at level 2. He can't duel you.", startSide: "Red side (contest his blue)", spikeNote: "You spike earlier but he outscales. End fast." },
    { enemyId: "Viego", enemyName: "Viego", wrAgainst: 48.1, games: 12300, earlyAdvantageScore: 62, tip: "Fight him early before he completes first item. After that his sustain beats yours.", startSide: "Either side", spikeNote: "He outscales hard. Gank lanes and build a lead before 15 min." },
    { enemyId: "Graves", enemyName: "Graves", wrAgainst: 47.3, games: 11200, earlyAdvantageScore: 55, tip: "Don't fight him in his smokescreen. Kick him out of it and Q to chase.", startSide: "Red side (avoid his invade)", spikeNote: "Even matchup early. He outscales with items." },
    { enemyId: "Elise", enemyName: "Elise", wrAgainst: 50.8, games: 6100, earlyAdvantageScore: 58, tip: "Skill matchup. Dodge her cocoon with W, then all-in.", startSide: "Either side", spikeNote: "Both strong early. Better execution wins." },
    { enemyId: "Vi", enemyName: "Vi", wrAgainst: 48.6, games: 7800, earlyAdvantageScore: 52, tip: "Her ult is point-and-click. Save kick to peel for your carry instead of engaging.", startSide: "Either side", spikeNote: "She's easier to execute and scales better." },
    { enemyId: "Khazix", enemyName: "Kha'Zix", wrAgainst: 51.2, games: 9400, earlyAdvantageScore: 65, tip: "Fight him near minions/camps so he can't proc isolation damage.", startSide: "Either side", spikeNote: "You're stronger in skirmishes early. He's stronger at 2 items." },
    { enemyId: "Kayn", enemyName: "Kayn", wrAgainst: 53.7, games: 13100, earlyAdvantageScore: 74, tip: "Abuse pre-form Kayn. He's one of the weakest early junglers.", startSide: "Either side (invade)", spikeNote: "Destroy him before he transforms. After form he out-duels or out-sustains." },
    { enemyId: "Warwick", enemyName: "Warwick", wrAgainst: 46.4, games: 5200, earlyAdvantageScore: 42, tip: "His sustain beats you in extended fights. Short trades only.", startSide: "Either side", spikeNote: "He's stronger in 1v1s all game. Focus on ganking, not fighting him." },
    { enemyId: "Hecarim", enemyName: "Hecarim", wrAgainst: 50.1, games: 7600, earlyAdvantageScore: 60, tip: "You're stronger level 3. Contest scuttle and fight him.", startSide: "Either side", spikeNote: "Even early. He outscales with teamfight impact." },
    { enemyId: "Shaco", enemyName: "Shaco", wrAgainst: 49.3, games: 5800, earlyAdvantageScore: 48, tip: "Use Q to reveal Shaco in stealth. Don't chase him through boxes.", startSide: "Ward your own jungle", spikeNote: "He wins through cheese, not stats. Don't fall for level 2 invades." },
    { enemyId: "RekSai", enemyName: "Rek'Sai", wrAgainst: 49.7, games: 3600, earlyAdvantageScore: 56, tip: "She matches your early power. Avoid extended trades where her W knockup resets.", startSide: "Either side", spikeNote: "Skill matchup all game. Neither clearly outscales." },
    { enemyId: "Evelynn", enemyName: "Evelynn", wrAgainst: 55.1, games: 5100, earlyAdvantageScore: 82, tip: "Invade her constantly pre-6. She can't fight anyone before camouflage.", startSide: "Start on her side of the map", spikeNote: "She outscales at 6+ but you should have a massive lead by then." },
    { enemyId: "Nidalee", enemyName: "Nidalee", wrAgainst: 52.3, games: 4200, earlyAdvantageScore: 64, tip: "Dodge her spear, then engage. She wins poke, you win all-in.", startSide: "Either side", spikeNote: "Both peak early. She falls off harder." },
    { enemyId: "JarvanIV", enemyName: "Jarvan IV", wrAgainst: 51.4, games: 6800, earlyAdvantageScore: 61, tip: "Dash out of his R with W ward-hop. His cooldowns are longer than yours.", startSide: "Either side", spikeNote: "You're mechanically harder but he's more reliable in teamfights." },
  ],
};
