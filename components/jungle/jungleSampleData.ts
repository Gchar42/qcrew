/* Sample data for all jungle-viable champions */

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
  source?: string;
  note?: string;
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
  // S TIER
  { id: "RekSai", name: "Rek'Sai", winRate: 53.2, pickRate: 5.8, banRate: 6.1, tier: "S", games: 58200 },
  { id: "Nocturne", name: "Nocturne", winRate: 52.8, pickRate: 7.4, banRate: 4.2, tier: "S", games: 74100 },
  { id: "Briar", name: "Briar", winRate: 52.6, pickRate: 6.1, banRate: 8.8, tier: "S", games: 61200 },
  { id: "Viego", name: "Viego", winRate: 51.3, pickRate: 10.8, banRate: 12.4, tier: "S", games: 108200 },
  { id: "Belveth", name: "Bel'Veth", winRate: 52.4, pickRate: 4.9, banRate: 7.3, tier: "S", games: 49100 },
  // A TIER
  { id: "LeeSin", name: "Lee Sin", winRate: 49.8, pickRate: 14.2, banRate: 8.1, tier: "A", games: 142300 },
  { id: "Graves", name: "Graves", winRate: 51.0, pickRate: 8.6, banRate: 6.3, tier: "A", games: 86400 },
  { id: "Elise", name: "Elise", winRate: 51.7, pickRate: 5.4, banRate: 3.2, tier: "A", games: 54100 },
  { id: "Vi", name: "Vi", winRate: 52.1, pickRate: 6.2, banRate: 4.8, tier: "A", games: 62300 },
  { id: "JarvanIV", name: "Jarvan IV", winRate: 51.4, pickRate: 5.8, banRate: 3.6, tier: "A", games: 58100 },
  { id: "Khazix", name: "Kha'Zix", winRate: 51.9, pickRate: 7.1, banRate: 9.2, tier: "A", games: 71200 },
  { id: "Zyra", name: "Zyra", winRate: 52.5, pickRate: 3.8, banRate: 2.9, tier: "A", games: 38100 },
  { id: "Kayn", name: "Kayn", winRate: 50.2, pickRate: 9.4, banRate: 7.3, tier: "A", games: 94300 },
  { id: "Volibear", name: "Volibear", winRate: 51.8, pickRate: 4.6, banRate: 2.1, tier: "A", games: 46100 },
  { id: "Lillia", name: "Lillia", winRate: 52.0, pickRate: 3.9, banRate: 2.4, tier: "A", games: 39100 },
  { id: "Diana", name: "Diana", winRate: 51.6, pickRate: 5.1, banRate: 3.8, tier: "A", games: 51200 },
  // B TIER
  { id: "Hecarim", name: "Hecarim", winRate: 50.6, pickRate: 5.5, banRate: 5.1, tier: "B", games: 55100 },
  { id: "Shaco", name: "Shaco", winRate: 51.1, pickRate: 4.8, banRate: 11.6, tier: "B", games: 48200 },
  { id: "Warwick", name: "Warwick", winRate: 52.3, pickRate: 4.2, banRate: 2.8, tier: "B", games: 42100 },
  { id: "Ekko", name: "Ekko", winRate: 50.8, pickRate: 5.3, banRate: 4.1, tier: "B", games: 53100 },
  { id: "Fiddlesticks", name: "Fiddlesticks", winRate: 52.1, pickRate: 3.4, banRate: 2.7, tier: "B", games: 34100 },
  { id: "XinZhao", name: "Xin Zhao", winRate: 51.2, pickRate: 3.6, banRate: 1.8, tier: "B", games: 36100 },
  { id: "MasterYi", name: "Master Yi", winRate: 50.9, pickRate: 4.7, banRate: 6.4, tier: "B", games: 47100 },
  { id: "Udyr", name: "Udyr", winRate: 51.4, pickRate: 3.2, banRate: 1.9, tier: "B", games: 32100 },
  { id: "Kindred", name: "Kindred", winRate: 50.7, pickRate: 3.8, banRate: 2.6, tier: "B", games: 38100 },
  { id: "Nunu", name: "Nunu & Willump", winRate: 51.0, pickRate: 3.5, banRate: 1.4, tier: "B", games: 35100 },
  { id: "Zac", name: "Zac", winRate: 51.5, pickRate: 3.1, banRate: 2.0, tier: "B", games: 31100 },
  { id: "MonkeyKing", name: "Wukong", winRate: 50.6, pickRate: 3.3, banRate: 2.2, tier: "B", games: 33100 },
  { id: "Trundle", name: "Trundle", winRate: 51.3, pickRate: 2.8, banRate: 1.5, tier: "B", games: 28100 },
  { id: "Rengar", name: "Rengar", winRate: 50.4, pickRate: 4.1, banRate: 3.9, tier: "B", games: 41100 },
  { id: "Morgana", name: "Morgana", winRate: 52.0, pickRate: 2.6, banRate: 1.2, tier: "B", games: 26100 },
  { id: "Ivern", name: "Ivern", winRate: 51.8, pickRate: 2.1, banRate: 0.8, tier: "B", games: 21100 },
  // C TIER
  { id: "Amumu", name: "Amumu", winRate: 52.8, pickRate: 3.6, banRate: 1.9, tier: "C", games: 36100 },
  { id: "Evelynn", name: "Evelynn", winRate: 50.4, pickRate: 4.1, banRate: 6.7, tier: "C", games: 41300 },
  { id: "Nidalee", name: "Nidalee", winRate: 48.2, pickRate: 3.8, banRate: 1.1, tier: "C", games: 38200 },
  { id: "DrMundo", name: "Dr. Mundo", winRate: 51.2, pickRate: 2.4, banRate: 1.0, tier: "C", games: 24100 },
  { id: "Rammus", name: "Rammus", winRate: 51.6, pickRate: 2.2, banRate: 1.8, tier: "C", games: 22100 },
  { id: "Karthus", name: "Karthus", winRate: 50.1, pickRate: 2.3, banRate: 1.6, tier: "C", games: 23100 },
  { id: "Taliyah", name: "Taliyah", winRate: 49.8, pickRate: 2.0, banRate: 1.3, tier: "C", games: 20100 },
  { id: "Skarner", name: "Skarner", winRate: 50.3, pickRate: 2.5, banRate: 2.1, tier: "C", games: 25100 },
  { id: "Gragas", name: "Gragas", winRate: 49.9, pickRate: 2.7, banRate: 1.7, tier: "C", games: 27100 },
  { id: "Shyvana", name: "Shyvana", winRate: 50.8, pickRate: 2.1, banRate: 1.2, tier: "C", games: 21100 },
  { id: "Sylas", name: "Sylas", winRate: 49.6, pickRate: 2.9, banRate: 1.4, tier: "C", games: 29100 },
  { id: "Brand", name: "Brand", winRate: 51.4, pickRate: 1.8, banRate: 1.1, tier: "C", games: 18100 },
  // D TIER
  { id: "Sejuani", name: "Sejuani", winRate: 49.2, pickRate: 1.9, banRate: 0.9, tier: "D", games: 19100 },
  { id: "Poppy", name: "Poppy", winRate: 49.5, pickRate: 1.6, banRate: 0.7, tier: "D", games: 16100 },
  { id: "Pantheon", name: "Pantheon", winRate: 48.8, pickRate: 1.8, banRate: 1.0, tier: "D", games: 18100 },
  { id: "Talon", name: "Talon", winRate: 48.5, pickRate: 2.1, banRate: 1.3, tier: "D", games: 21100 },
  { id: "Naafiri", name: "Naafiri", winRate: 49.1, pickRate: 1.5, banRate: 0.6, tier: "D", games: 15100 },
  { id: "Sett", name: "Sett", winRate: 49.3, pickRate: 1.4, banRate: 0.8, tier: "D", games: 14100 },
  { id: "Mordekaiser", name: "Mordekaiser", winRate: 49.7, pickRate: 1.3, banRate: 0.5, tier: "D", games: 13100 },
  { id: "Jax", name: "Jax", winRate: 48.9, pickRate: 1.7, banRate: 1.1, tier: "D", games: 17100 },
  { id: "Qiyana", name: "Qiyana", winRate: 48.3, pickRate: 1.2, banRate: 0.9, tier: "D", games: 12100 },
  { id: "Maokai", name: "Maokai", winRate: 50.1, pickRate: 1.1, banRate: 0.4, tier: "D", games: 11100 },
  { id: "Aatrox", name: "Aatrox", winRate: 48.0, pickRate: 0.9, banRate: 0.3, tier: "D", games: 9100 },
  { id: "Neeko", name: "Neeko", winRate: 50.5, pickRate: 1.0, banRate: 0.4, tier: "D", games: 10100 },
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
