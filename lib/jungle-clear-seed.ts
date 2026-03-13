/**
 * Seed data for jungle clear speeds — used as fallback until the cron pipeline
 * populates jungle_clear_stats with 200+ games per champion.
 *
 * Methodology: p5 (5th percentile) clear times from high-elo ranked games.
 * Values are realistic estimates based on champion kits and known clear patterns.
 *
 * Once the pipeline runs, this data is replaced automatically.
 */

export interface SeedClearEntry {
  championKey: string;
  name: string;
  clearTimeP5Seconds: number;
  hpAfterClearP50: number;
  paths: { icons: string; label: string }[];
  note?: string;
}

const SEED_DATA: SeedClearEntry[] = [
  // TIER 1 — Fastest clearers (sub 3:00)
  { championKey: "Ivern", name: "Ivern", clearTimeP5Seconds: 130, hpAfterClearP50: 30, paths: [
    { icons: "🐺→🔵→🐸→🐦→🔴→🪨", label: "Mark Wolves→Blue→Gromp→cross→mark Raptors→Red→collect all→smite Krugs" },
  ], note: "Ivern's passive marks camps instead of fighting — fastest clear in the game" },
  { championKey: "Zyra", name: "Zyra", clearTimeP5Seconds: 168, hpAfterClearP50: 55, paths: [
    { icons: "🐦→🔴→🪨→🐺→🔵→🐸", label: "Raptors→Red→Krugs→Wolves→Blue→Gromp" },
  ], note: "Plants do massive AoE damage" },
  { championKey: "Naafiri", name: "Naafiri", clearTimeP5Seconds: 168, hpAfterClearP50: 70, paths: [
    { icons: "🐦→🔴→🪨→🐺→🔵→🐸", label: "Raptors→Red→Krugs→Wolves→Blue→Gromp" },
  ], note: "Dogs cleave through camps" },
  { championKey: "Brand", name: "Brand", clearTimeP5Seconds: 170, hpAfterClearP50: 45, paths: [
    { icons: "🐦→🔴→🪨→🐺→🔵→🐸", label: "Raptors→Red→Krugs→Wolves→Blue→Gromp" },
  ], note: "Passive burn AoE" },
  { championKey: "Lillia", name: "Lillia", clearTimeP5Seconds: 172, hpAfterClearP50: 65, paths: [
    { icons: "🐦→🪨→🔴→🐺→🔵→🐸", label: "Raptors→Krugs→Red→Wolves→Blue→Gromp" },
  ], note: "Q AoE ramp gets faster per camp" },
  { championKey: "Fiddlesticks", name: "Fiddlesticks", clearTimeP5Seconds: 175, hpAfterClearP50: 80, paths: [
    { icons: "🐦→🔴→🪨→🐺→🔵→🐸", label: "Raptors→Red→Krugs→Wolves→Blue→Gromp" },
  ], note: "W drain multi-camp" },
  { championKey: "Karthus", name: "Karthus", clearTimeP5Seconds: 175, hpAfterClearP50: 40, paths: [
    { icons: "🐦→🔴→🪨→🐺→🔵→🐸", label: "Raptors→Red→Krugs→Wolves→Blue→Gromp" },
  ], note: "Q spam AoE — low HP but fast" },
  { championKey: "Morgana", name: "Morgana", clearTimeP5Seconds: 175, hpAfterClearP50: 70, paths: [
    { icons: "🔴→🪨→🐦→🐺→🔵→🐸", label: "Red→Krugs→Raptors→Wolves→Blue→Gromp" },
  ], note: "W pool AoE + passive sustain" },
  { championKey: "Diana", name: "Diana", clearTimeP5Seconds: 175, hpAfterClearP50: 60, paths: [
    { icons: "🐦→🔴→🪨→🐺→🔵→🐸", label: "Raptors→Red→Krugs→Wolves→Blue→Gromp" },
  ], note: "Passive AoE cleave" },
  { championKey: "Shyvana", name: "Shyvana", clearTimeP5Seconds: 178, hpAfterClearP50: 75, paths: [
    { icons: "🔴→🪨→🐦→🐺→🔵→🐸", label: "Red→Krugs→Raptors→Wolves→Blue→Gromp" },
  ], note: "W burnout AoE" },

  // TIER 2 — Fast clearers (3:00–3:10)
  { championKey: "Udyr", name: "Udyr", clearTimeP5Seconds: 180, hpAfterClearP50: 80, paths: [
    { icons: "🔴→🪨→🐦→🐺→🔵→🐸", label: "Red→Krugs→Raptors→Wolves→Blue→Gromp" },
  ], note: "Stance cycling AoE + sustain" },
  { championKey: "Nocturne", name: "Nocturne", clearTimeP5Seconds: 182, hpAfterClearP50: 75, paths: [
    { icons: "🔴→🪨→🐦→🐺→🔵→🐸", label: "Red→Krugs→Raptors→Wolves→Blue→Gromp" },
  ], note: "Passive cleave" },
  { championKey: "Olaf", name: "Olaf", clearTimeP5Seconds: 183, hpAfterClearP50: 70, paths: [
    { icons: "🔵→🐸→🐺→🐦→🔴→🪨", label: "Blue→Gromp→Wolves→Raptors→Red→Krugs" },
  ], note: "Q spam + low HP AS steroid" },
  { championKey: "Belveth", name: "Bel'Veth", clearTimeP5Seconds: 183, hpAfterClearP50: 65, paths: [
    { icons: "🔴→🪨→🐦→🐺→🔵→🐸", label: "Red→Krugs→Raptors→Wolves→Blue→Gromp" },
  ], note: "Fast autos + resets" },
  { championKey: "Briar", name: "Briar", clearTimeP5Seconds: 185, hpAfterClearP50: 60, paths: [
    { icons: "🔴→🪨→🐦→🐺→🔵→🐸", label: "Red→Krugs→Raptors→Wolves→Blue→Gromp" },
  ], note: "W frenzy" },
  { championKey: "MasterYi", name: "Master Yi", clearTimeP5Seconds: 185, hpAfterClearP50: 70, paths: [
    { icons: "🔴→🪨→🐦→🐺→🔵→🐸", label: "Red→Krugs→Raptors→Wolves→Blue→Gromp" },
  ], note: "Q + meditate sustain" },
  { championKey: "Volibear", name: "Volibear", clearTimeP5Seconds: 185, hpAfterClearP50: 85, paths: [
    { icons: "🔵→🐸→🐺→🐦→🔴→🪨", label: "Blue→Gromp→Wolves→Raptors→Red→Krugs" },
  ], note: "Passive AoE + sustain" },
  { championKey: "Taliyah", name: "Taliyah", clearTimeP5Seconds: 186, hpAfterClearP50: 50, paths: [
    { icons: "🐦→🔴→🪨→🐺→🔵→🐸", label: "Raptors→Red→Krugs→Wolves→Blue→Gromp" },
  ], note: "Q AoE on worked ground" },
  { championKey: "Kayn", name: "Kayn", clearTimeP5Seconds: 187, hpAfterClearP50: 65, paths: [
    { icons: "🐦→🔴→🪨→🐺→🔵→🐸", label: "Raptors→Red→Krugs→Wolves→Blue→Gromp" },
  ], note: "Q AoE through walls" },
  { championKey: "Hecarim", name: "Hecarim", clearTimeP5Seconds: 187, hpAfterClearP50: 60, paths: [
    { icons: "🔵→🐸→🐺→🐦→🔴→🪨", label: "Blue→Gromp→Wolves→Raptors→Red→Krugs" },
  ], note: "Q spam AoE" },
  { championKey: "Ekko", name: "Ekko", clearTimeP5Seconds: 188, hpAfterClearP50: 55, paths: [
    { icons: "🐦→🔴→🪨→🐺→🔵→🐸", label: "Raptors→Red→Krugs→Wolves→Blue→Gromp" },
  ], note: "Passive proc AoE" },
  { championKey: "DrMundo", name: "Dr. Mundo", clearTimeP5Seconds: 188, hpAfterClearP50: 90, paths: [
    { icons: "🔵→🐸→🐺→🐦→🔴→🪨", label: "Blue→Gromp→Wolves→Raptors→Red→Krugs" },
  ], note: "Passive regen" },
  { championKey: "Mordekaiser", name: "Mordekaiser", clearTimeP5Seconds: 188, hpAfterClearP50: 75, paths: [
    { icons: "🐦→🔴→🪨→🐺→🔵→🐸", label: "Raptors→Red→Krugs→Wolves→Blue→Gromp" },
  ], note: "Passive AoE" },

  // TIER 3 — Medium clearers (3:10–3:25)
  { championKey: "Viego", name: "Viego", clearTimeP5Seconds: 190, hpAfterClearP50: 70, paths: [
    { icons: "🐦→🪨→🔴→🐺→🐸→🔵", label: "Raptors→Krugs→Red→Wolves→Gromp→Blue" },
  ], note: "Passive sustain" },
  { championKey: "Graves", name: "Graves", clearTimeP5Seconds: 190, hpAfterClearP50: 92, paths: [
    { icons: "🔴→🪨→🐦→🐺→🐸→🔵", label: "Red→Krugs→Raptors→Wolves→Gromp→Blue" },
  ], note: "Armor stacking — highest HP after clear" },
  { championKey: "Vi", name: "Vi", clearTimeP5Seconds: 192, hpAfterClearP50: 65, paths: [
    { icons: "🔴→🪨→🐦→🐺→🔵→🐸", label: "Red→Krugs→Raptors→Wolves→Blue→Gromp" },
  ], note: "E AoE" },
  { championKey: "JarvanIV", name: "Jarvan IV", clearTimeP5Seconds: 192, hpAfterClearP50: 60, paths: [
    { icons: "🔴→🪨→🐦→🐺→🔵→🐸", label: "Red→Krugs→Raptors→Wolves→Blue→Gromp" },
  ], note: "Passive + flag AoE" },
  { championKey: "RekSai", name: "Rek'Sai", clearTimeP5Seconds: 192, hpAfterClearP50: 70, paths: [
    { icons: "🔴→🪨→🐦→🐺→🔵→🐸", label: "Red→Krugs→Raptors→Wolves→Blue→Gromp" },
  ], note: "Q AoE + tunnel mobility" },
  { championKey: "XinZhao", name: "Xin Zhao", clearTimeP5Seconds: 193, hpAfterClearP50: 65, paths: [
    { icons: "🔵→🐸→🐺→🐦→🔴→🪨", label: "Blue→Gromp→Wolves→Raptors→Red→Krugs" },
  ], note: "W AoE + sustain" },
  { championKey: "MonkeyKing", name: "Wukong", clearTimeP5Seconds: 193, hpAfterClearP50: 60, paths: [
    { icons: "🔴→🪨→🐦→🐺→🔵→🐸", label: "Red→Krugs→Raptors→Wolves→Blue→Gromp" },
  ], note: "Clone + E AoE" },
  { championKey: "Amumu", name: "Amumu", clearTimeP5Seconds: 194, hpAfterClearP50: 70, paths: [
    { icons: "🔴→🪨→🐦→🐺→🔵→🐸", label: "Red→Krugs→Raptors→Wolves→Blue→Gromp" },
  ], note: "W + E AoE" },
  { championKey: "Warwick", name: "Warwick", clearTimeP5Seconds: 195, hpAfterClearP50: 95, paths: [
    { icons: "🔴→🪨→🐦→🐺→🔵→🐸", label: "Red→Krugs→Raptors→Wolves→Blue→Gromp" },
  ], note: "Q sustain — highest HP in game" },
  { championKey: "Zac", name: "Zac", clearTimeP5Seconds: 195, hpAfterClearP50: 75, paths: [
    { icons: "🔴→🪨→🐦→🐺→🔵→🐸", label: "Red→Krugs→Raptors→Wolves→Blue→Gromp" },
  ], note: "Blob pickup sustain" },
  { championKey: "Skarner", name: "Skarner", clearTimeP5Seconds: 196, hpAfterClearP50: 70, paths: [
    { icons: "🔴→🪨→🐦→🐺→🔵→🐸", label: "Red→Krugs→Raptors→Wolves→Blue→Gromp" },
  ], note: "Q AoE" },
  { championKey: "Trundle", name: "Trundle", clearTimeP5Seconds: 196, hpAfterClearP50: 80, paths: [
    { icons: "🔴→🪨→🐦→🐺→🔵→🐸", label: "Red→Krugs→Raptors→Wolves→Blue→Gromp" },
  ], note: "Q auto reset + passive heal" },
  { championKey: "Gragas", name: "Gragas", clearTimeP5Seconds: 197, hpAfterClearP50: 65, paths: [
    { icons: "🔴→🪨→🐦→🐺→🔵→🐸", label: "Red→Krugs→Raptors→Wolves→Blue→Gromp" },
  ], note: "W sustain + Q AoE" },
  { championKey: "Sett", name: "Sett", clearTimeP5Seconds: 198, hpAfterClearP50: 65, paths: [
    { icons: "🔴→🪨→🐦→🐺→🔵→🐸", label: "Red→Krugs→Raptors→Wolves→Blue→Gromp" },
  ], note: "Passive regen between camps" },
  { championKey: "Nunu", name: "Nunu & Willump", clearTimeP5Seconds: 198, hpAfterClearP50: 85, paths: [
    { icons: "🔴→🪨→🐦→🐺→🔵→🐸", label: "Red→Krugs→Raptors→Wolves→Blue→Gromp" },
  ], note: "Q consume heal" },

  // TIER 4 — Slow clearers (3:20–3:35)
  { championKey: "LeeSin", name: "Lee Sin", clearTimeP5Seconds: 200, hpAfterClearP50: 70, paths: [
    { icons: "🔴→🪨→🐦→🐺→🔵→🐸", label: "Red→Krugs→Raptors→Wolves→Blue→Gromp" },
    { icons: "🔴→🐦→🐺→ GANK", label: "Red 3-camp gank" },
  ], note: "Single target, W sustain" },
  { championKey: "Elise", name: "Elise", clearTimeP5Seconds: 202, hpAfterClearP50: 65, paths: [
    { icons: "🔴→🪨→🐦→🐺→🔵→🐸", label: "Red→Krugs→Raptors→Wolves→Blue→Gromp" },
    { icons: "🔴→🐦→ GANK MID", label: "Red 2-camp gank" },
  ], note: "Spiderling tanking" },
  { championKey: "Khazix", name: "Kha'Zix", clearTimeP5Seconds: 202, hpAfterClearP50: 55, paths: [
    { icons: "🔴→🪨→🐦→🐺→🔵→🐸", label: "Red→Krugs→Raptors→Wolves→Blue→Gromp" },
  ], note: "Isolation single target" },
  { championKey: "Nidalee", name: "Nidalee", clearTimeP5Seconds: 202, hpAfterClearP50: 50, paths: [
    { icons: "🔴→🐦→🐺→🔵→🐸→🪨", label: "Red→Raptors→Wolves→Blue→Gromp→Krugs" },
  ], note: "High skill cap clear" },
  { championKey: "Kindred", name: "Kindred", clearTimeP5Seconds: 203, hpAfterClearP50: 55, paths: [
    { icons: "🔴→🪨→🐦→🐺→🔵→🐸", label: "Red→Krugs→Raptors→Wolves→Blue→Gromp" },
  ], note: "Single target marksman" },
  { championKey: "Rengar", name: "Rengar", clearTimeP5Seconds: 204, hpAfterClearP50: 55, paths: [
    { icons: "🔴→🪨→🐦→🐺→🔵→🐸", label: "Red→Krugs→Raptors→Wolves→Blue→Gromp" },
  ], note: "Bush leap resets" },
  { championKey: "Shaco", name: "Shaco", clearTimeP5Seconds: 204, hpAfterClearP50: 70, paths: [
    { icons: "🔴→🪨→🐦→🐺→🔵→🐸", label: "Red (boxes)→Krugs→Raptors→Wolves→Blue→Gromp" },
  ], note: "Box pre-setup at Red" },
  { championKey: "Sylas", name: "Sylas", clearTimeP5Seconds: 205, hpAfterClearP50: 55, paths: [
    { icons: "🔵→🐸→🐺→🐦→🔴→🪨", label: "Blue→Gromp→Wolves→Raptors→Red→Krugs" },
  ], note: "W heal + passive" },
  { championKey: "Talon", name: "Talon", clearTimeP5Seconds: 205, hpAfterClearP50: 50, paths: [
    { icons: "🐦→🔴→🪨→🐺→🔵→🐸", label: "Raptors→Red→Krugs→Wolves→Blue→Gromp" },
  ], note: "Passive bleed" },
  { championKey: "Qiyana", name: "Qiyana", clearTimeP5Seconds: 205, hpAfterClearP50: 50, paths: [
    { icons: "🔴→🪨→🐦→🐺→🔵→🐸", label: "Red→Krugs→Raptors→Wolves→Blue→Gromp" },
  ] },

  // TIER 5 — Very slow clearers (3:30+)
  { championKey: "Rammus", name: "Rammus", clearTimeP5Seconds: 210, hpAfterClearP50: 85, paths: [
    { icons: "🔴→🪨→🐦→🐺→🔵→🐸", label: "Red→Krugs→Raptors→Wolves→Blue→Gromp" },
  ], note: "W reflects but slow DPS" },
  { championKey: "Sejuani", name: "Sejuani", clearTimeP5Seconds: 212, hpAfterClearP50: 75, paths: [
    { icons: "🔵→🐸→🐺→🐦→🔴→🪨", label: "Blue→Gromp→Wolves→Raptors→Red→Krugs" },
  ], note: "E stacking slow" },
  { championKey: "Poppy", name: "Poppy", clearTimeP5Seconds: 212, hpAfterClearP50: 60, paths: [
    { icons: "🔴→🪨→🐦→🐺→🔵→🐸", label: "Red→Krugs→Raptors→Wolves→Blue→Gromp" },
  ], note: "Single target" },
  { championKey: "Pantheon", name: "Pantheon", clearTimeP5Seconds: 213, hpAfterClearP50: 55, paths: [
    { icons: "🔴→🪨→🐦→🐺→🔵→🐸", label: "Red→Krugs→Raptors→Wolves→Blue→Gromp" },
  ], note: "Mana hungry" },
  { championKey: "Jax", name: "Jax", clearTimeP5Seconds: 215, hpAfterClearP50: 60, paths: [
    { icons: "🔴→🪨→🐦→🐺→🔵→🐸", label: "Red→Krugs→Raptors→Wolves→Blue→Gromp" },
  ], note: "E dodge + passive AS" },
  { championKey: "Aatrox", name: "Aatrox", clearTimeP5Seconds: 215, hpAfterClearP50: 60, paths: [
    { icons: "🔴→🪨→🐦→🐺→🔵→🐸", label: "Red→Krugs→Raptors→Wolves→Blue→Gromp" },
  ], note: "Q sweetspots" },
  { championKey: "Evelynn", name: "Evelynn", clearTimeP5Seconds: 200, hpAfterClearP50: 58, paths: [
    { icons: "🔵→🐸→🐺→🐦→🔴→🪨", label: "Blue→Gromp→Wolves→Raptors→Red→Krugs" },
  ], note: "Must full clear before 6 — no gank pressure pre-camo" },
  { championKey: "Maokai", name: "Maokai", clearTimeP5Seconds: 210, hpAfterClearP50: 75, paths: [
    { icons: "🔴→🪨→🐦→🐺→🔵→🐸", label: "Red→Krugs→Raptors→Wolves→Blue→Gromp" },
  ], note: "Sapling AoE clear — slow but healthy" },
  { championKey: "Neeko", name: "Neeko", clearTimeP5Seconds: 208, hpAfterClearP50: 55, paths: [
    { icons: "🐦→🔴→🪨→🐺→🔵→🐸", label: "Raptors→Red→Krugs→Wolves→Blue→Gromp" },
  ], note: "Clone tanks camps, passive AoE" },
];

/* ── Formatter for the frontend ClearSpeedEntry shape ── */

export interface SeedClearSpeedFormatted {
  id: string;
  name: string;
  avgClearTime: string;
  avgHpAfterClear: number;
  paths: { icons: string; label: string }[];
  games: number;
  source: "seed";
  note?: string;
}

function secondsToMSS(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function getSeedClearSpeeds(): SeedClearSpeedFormatted[] {
  return SEED_DATA.map((entry) => ({
    id: entry.championKey,
    name: entry.name,
    avgClearTime: secondsToMSS(entry.clearTimeP5Seconds),
    avgHpAfterClear: entry.hpAfterClearP50,
    paths: entry.paths,
    games: 0,
    source: "seed" as const,
    note: entry.note,
  }));
}
