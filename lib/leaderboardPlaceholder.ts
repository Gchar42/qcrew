/**
 * Placeholder leaderboard data sourced from OP.GG NA Challenger ladder (Mar 2026).
 * Used as a fallback when the Riot API key is unavailable.
 */

export type PlaceholderEntry = {
  name: string;
  tier: "CHALLENGER" | "GRANDMASTER" | "MASTER";
  lp: number;
  wins: number;
  losses: number;
  hotStreak: boolean;
  freshBlood: boolean;
  veteran: boolean;
  role: string;
};

const NA_CHALLENGER: PlaceholderEntry[] = [
  { name: "Sn1per1#NA2", tier: "CHALLENGER", lp: 2467, wins: 301, losses: 184, hotStreak: false, freshBlood: false, veteran: true, role: "Top" },
  { name: "never type#1998", tier: "CHALLENGER", lp: 2375, wins: 141, losses: 53, hotStreak: true, freshBlood: false, veteran: false, role: "Top" },
  { name: "T0mio#NA1", tier: "CHALLENGER", lp: 2344, wins: 253, losses: 150, hotStreak: false, freshBlood: false, veteran: true, role: "Jungle" },
  { name: "TFBlade#122", tier: "CHALLENGER", lp: 2322, wins: 249, losses: 120, hotStreak: false, freshBlood: false, veteran: true, role: "Top" },
  { name: "Sheiden#PHL1", tier: "CHALLENGER", lp: 2317, wins: 204, losses: 109, hotStreak: false, freshBlood: false, veteran: false, role: "Jungle" },
  { name: "Cupic#Hwei", tier: "CHALLENGER", lp: 2225, wins: 178, losses: 93, hotStreak: false, freshBlood: false, veteran: false, role: "Support" },
  { name: "KDKD#9999", tier: "CHALLENGER", lp: 2212, wins: 177, losses: 111, hotStreak: false, freshBlood: false, veteran: true, role: "Support" },
  { name: "kurfyou#NA2", tier: "CHALLENGER", lp: 2117, wins: 171, losses: 116, hotStreak: false, freshBlood: false, veteran: true, role: "Mid" },
  { name: "always#91225", tier: "CHALLENGER", lp: 1912, wins: 197, losses: 124, hotStreak: false, freshBlood: false, veteran: true, role: "Jungle" },
  { name: "cant type#1998", tier: "CHALLENGER", lp: 1911, wins: 247, losses: 158, hotStreak: false, freshBlood: false, veteran: true, role: "Top" },
  { name: "Jesse Pinkman#LYON", tier: "CHALLENGER", lp: 1882, wins: 137, losses: 73, hotStreak: true, freshBlood: false, veteran: false, role: "Mid" },
  { name: "Fishlord#Swain", tier: "CHALLENGER", lp: 1858, wins: 146, losses: 102, hotStreak: false, freshBlood: false, veteran: true, role: "Support" },
  { name: "Yozu#Lux", tier: "CHALLENGER", lp: 1828, wins: 164, losses: 81, hotStreak: false, freshBlood: false, veteran: true, role: "Support" },
  { name: "Solarbacca#NA1", tier: "CHALLENGER", lp: 1819, wins: 178, losses: 124, hotStreak: false, freshBlood: false, veteran: true, role: "Top" },
  { name: "Pobelter#NA1", tier: "CHALLENGER", lp: 1770, wins: 149, losses: 111, hotStreak: false, freshBlood: false, veteran: true, role: "Mid" },
  { name: "MySwordCrimson#2006", tier: "CHALLENGER", lp: 1709, wins: 157, losses: 115, hotStreak: false, freshBlood: false, veteran: true, role: "Top" },
  { name: "Davemon#NA1", tier: "CHALLENGER", lp: 1708, wins: 192, losses: 115, hotStreak: false, freshBlood: false, veteran: false, role: "Mid" },
  { name: "Yuuji#247", tier: "CHALLENGER", lp: 1704, wins: 134, losses: 82, hotStreak: false, freshBlood: false, veteran: false, role: "Top" },
  { name: "Maestro#TEMPO", tier: "CHALLENGER", lp: 1388, wins: 102, losses: 61, hotStreak: false, freshBlood: false, veteran: false, role: "Top" },
  { name: "Aldnoah#NA1", tier: "CHALLENGER", lp: 1385, wins: 161, losses: 128, hotStreak: false, freshBlood: false, veteran: true, role: "Support" },
  { name: "Hyperton#goat", tier: "CHALLENGER", lp: 1301, wins: 156, losses: 122, hotStreak: false, freshBlood: false, veteran: false, role: "Top" },
  { name: "Doublelift#NA01", tier: "CHALLENGER", lp: 1321, wins: 160, losses: 131, hotStreak: false, freshBlood: false, veteran: true, role: "ADC" },
  { name: "C9 Blaber#123", tier: "CHALLENGER", lp: 1239, wins: 109, losses: 59, hotStreak: true, freshBlood: false, veteran: false, role: "Jungle" },
  { name: "Spica#001", tier: "CHALLENGER", lp: 1275, wins: 137, losses: 100, hotStreak: false, freshBlood: false, veteran: false, role: "Jungle" },
  { name: "Josedeodo#NA12", tier: "CHALLENGER", lp: 1248, wins: 146, losses: 82, hotStreak: false, freshBlood: false, veteran: false, role: "Jungle" },
  { name: "DaddyVladdy#BIG", tier: "CHALLENGER", lp: 1232, wins: 154, losses: 93, hotStreak: false, freshBlood: false, veteran: false, role: "Mid" },
  { name: "Chime#Old", tier: "CHALLENGER", lp: 1341, wins: 135, losses: 97, hotStreak: false, freshBlood: false, veteran: true, role: "Support" },
  { name: "VULCAN#5125", tier: "CHALLENGER", lp: 1267, wins: 108, losses: 75, hotStreak: false, freshBlood: false, veteran: false, role: "Support" },
  { name: "Breezyyy#NA1", tier: "CHALLENGER", lp: 1210, wins: 190, losses: 159, hotStreak: false, freshBlood: false, veteran: true, role: "Support" },
  { name: "Nikkone#NA1", tier: "CHALLENGER", lp: 1338, wins: 115, losses: 91, hotStreak: false, freshBlood: false, veteran: true, role: "Jungle" },
];

const NA_GRANDMASTER: PlaceholderEntry[] = [
  { name: "Tempest#GM01", tier: "GRANDMASTER", lp: 987, wins: 210, losses: 160, hotStreak: false, freshBlood: false, veteran: true, role: "Mid" },
  { name: "ShadowHunter#NA1", tier: "GRANDMASTER", lp: 945, wins: 195, losses: 148, hotStreak: true, freshBlood: false, veteran: false, role: "Jungle" },
  { name: "MidKingdom#2024", tier: "GRANDMASTER", lp: 921, wins: 180, losses: 140, hotStreak: false, freshBlood: false, veteran: false, role: "Mid" },
  { name: "JungleDiff#NA3", tier: "GRANDMASTER", lp: 898, wins: 172, losses: 135, hotStreak: false, freshBlood: false, veteran: true, role: "Jungle" },
  { name: "TopGapper#9999", tier: "GRANDMASTER", lp: 876, wins: 165, losses: 130, hotStreak: false, freshBlood: true, veteran: false, role: "Top" },
  { name: "ADCarry#MAIN", tier: "GRANDMASTER", lp: 854, wins: 200, losses: 162, hotStreak: false, freshBlood: false, veteran: true, role: "ADC" },
  { name: "SupportDiff#777", tier: "GRANDMASTER", lp: 832, wins: 155, losses: 120, hotStreak: false, freshBlood: false, veteran: false, role: "Support" },
  { name: "DragonSlayer#NA2", tier: "GRANDMASTER", lp: 810, wins: 148, losses: 115, hotStreak: false, freshBlood: false, veteran: false, role: "Top" },
  { name: "BaronSteal#420", tier: "GRANDMASTER", lp: 798, wins: 190, losses: 155, hotStreak: true, freshBlood: false, veteran: false, role: "Jungle" },
  { name: "FlashBear#NA1", tier: "GRANDMASTER", lp: 775, wins: 142, losses: 112, hotStreak: false, freshBlood: false, veteran: true, role: "ADC" },
  { name: "WardBot#SUPP", tier: "GRANDMASTER", lp: 762, wins: 168, losses: 138, hotStreak: false, freshBlood: false, veteran: false, role: "Support" },
  { name: "OTP Thresh#NA1", tier: "GRANDMASTER", lp: 748, wins: 135, losses: 108, hotStreak: false, freshBlood: false, veteran: true, role: "Support" },
  { name: "Pentakill#GG", tier: "GRANDMASTER", lp: 735, wins: 178, losses: 148, hotStreak: false, freshBlood: false, veteran: false, role: "Mid" },
  { name: "CleanMechanics#99", tier: "GRANDMASTER", lp: 720, wins: 160, losses: 130, hotStreak: false, freshBlood: false, veteran: false, role: "ADC" },
  { name: "Smurf Alert#007", tier: "GRANDMASTER", lp: 705, wins: 128, losses: 95, hotStreak: true, freshBlood: true, veteran: false, role: "Mid" },
  { name: "GankCity#JGL", tier: "GRANDMASTER", lp: 690, wins: 145, losses: 118, hotStreak: false, freshBlood: false, veteran: true, role: "Jungle" },
  { name: "Outplayed#FF15", tier: "GRANDMASTER", lp: 678, wins: 152, losses: 125, hotStreak: false, freshBlood: false, veteran: false, role: "Top" },
  { name: "LP Machine#NA1", tier: "GRANDMASTER", lp: 665, wins: 170, losses: 142, hotStreak: false, freshBlood: false, veteran: true, role: "ADC" },
  { name: "DodgeOrLose#NA4", tier: "GRANDMASTER", lp: 652, wins: 138, losses: 115, hotStreak: false, freshBlood: false, veteran: false, role: "Mid" },
  { name: "PromoHelper#ELO", tier: "GRANDMASTER", lp: 640, wins: 162, losses: 138, hotStreak: false, freshBlood: false, veteran: false, role: "Support" },
];

const NA_MASTER: PlaceholderEntry[] = [
  { name: "MasterYi OTP#NA1", tier: "MASTER", lp: 420, wins: 180, losses: 155, hotStreak: false, freshBlood: false, veteran: true, role: "Jungle" },
  { name: "Emerald Escapee#1", tier: "MASTER", lp: 395, wins: 165, losses: 142, hotStreak: false, freshBlood: true, veteran: false, role: "Mid" },
  { name: "Macro Player#NA2", tier: "MASTER", lp: 378, wins: 150, losses: 128, hotStreak: false, freshBlood: false, veteran: false, role: "Top" },
  { name: "SoloQ Grinder#999", tier: "MASTER", lp: 355, wins: 200, losses: 178, hotStreak: true, freshBlood: false, veteran: true, role: "ADC" },
  { name: "Filled ADC#NA1", tier: "MASTER", lp: 340, wins: 142, losses: 125, hotStreak: false, freshBlood: false, veteran: false, role: "ADC" },
  { name: "Roam King#SUP", tier: "MASTER", lp: 325, wins: 138, losses: 120, hotStreak: false, freshBlood: false, veteran: false, role: "Support" },
  { name: "Tower Diver#ARAM", tier: "MASTER", lp: 310, wins: 175, losses: 158, hotStreak: false, freshBlood: false, veteran: true, role: "Top" },
  { name: "CSing Pro#MID", tier: "MASTER", lp: 295, wins: 130, losses: 115, hotStreak: false, freshBlood: false, veteran: false, role: "Mid" },
  { name: "Wave Clear#TOP", tier: "MASTER", lp: 280, wins: 155, losses: 140, hotStreak: false, freshBlood: false, veteran: false, role: "Top" },
  { name: "Herald Enjoyer#JG", tier: "MASTER", lp: 265, wins: 168, losses: 155, hotStreak: false, freshBlood: false, veteran: true, role: "Jungle" },
  { name: "Peel Master#ENC", tier: "MASTER", lp: 250, wins: 120, losses: 108, hotStreak: false, freshBlood: false, veteran: false, role: "Support" },
  { name: "Splitpush#Only", tier: "MASTER", lp: 238, wins: 145, losses: 132, hotStreak: false, freshBlood: false, veteran: false, role: "Top" },
  { name: "TiltProof#NA3", tier: "MASTER", lp: 225, wins: 195, losses: 182, hotStreak: false, freshBlood: false, veteran: true, role: "Jungle" },
  { name: "Dodge King#LP", tier: "MASTER", lp: 210, wins: 128, losses: 118, hotStreak: false, freshBlood: false, veteran: false, role: "Mid" },
  { name: "Coach Diff#NA1", tier: "MASTER", lp: 195, wins: 140, losses: 130, hotStreak: false, freshBlood: true, veteran: false, role: "Support" },
  { name: "Vision Score#100", tier: "MASTER", lp: 180, wins: 160, losses: 150, hotStreak: false, freshBlood: false, veteran: true, role: "Support" },
  { name: "Early Game#WIN", tier: "MASTER", lp: 165, wins: 135, losses: 128, hotStreak: false, freshBlood: false, veteran: false, role: "Jungle" },
  { name: "AFK Farm#JGL", tier: "MASTER", lp: 150, wins: 172, losses: 165, hotStreak: false, freshBlood: false, veteran: false, role: "Jungle" },
  { name: "Late Game#ADC", tier: "MASTER", lp: 135, wins: 148, losses: 142, hotStreak: false, freshBlood: false, veteran: true, role: "ADC" },
  { name: "OneMore Game#NA2", tier: "MASTER", lp: 120, wins: 155, losses: 150, hotStreak: false, freshBlood: false, veteran: false, role: "Mid" },
];

export const PLACEHOLDER_DATA: Record<string, PlaceholderEntry[]> = {
  challenger: NA_CHALLENGER,
  grandmaster: NA_GRANDMASTER,
  master: NA_MASTER,
};

export function getPlaceholderEntries(tiers: string[]) {
  const all: PlaceholderEntry[] = [];
  for (const t of tiers) {
    const entries = PLACEHOLDER_DATA[t];
    if (entries) all.push(...entries);
  }
  return all.sort((a, b) => b.lp - a.lp);
}
