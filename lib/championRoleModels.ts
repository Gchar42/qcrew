type RoleModelEntry = {
  riotId: string;
  tier: string;
  rank: string;
  lp: number;
  games: number;
  winRate: number;
  kda: number;
  avgCsPerMin: number;
  avgVisionScore: number;
  avgDamageShare: number;
  region: string;
};

type ChampionRoleModels = Record<string, RoleModelEntry[]>;

const TIER_ORDER = [
  "IRON", "BRONZE", "SILVER", "GOLD", "PLATINUM",
  "EMERALD", "DIAMOND", "MASTER", "GRANDMASTER", "CHALLENGER",
];

function tierIndex(tier: string): number {
  return TIER_ORDER.indexOf(tier.toUpperCase());
}

const ROLE_MODELS: ChampionRoleModels = {
  Yasuo: [
    { riotId: "Tempest#NA1", tier: "DIAMOND", rank: "II", lp: 75, games: 312, winRate: 56, kda: 3.1, avgCsPerMin: 7.8, avgVisionScore: 18, avgDamageShare: 26.5, region: "na1" },
    { riotId: "WindWall#KR1", tier: "MASTER", rank: "I", lp: 180, games: 450, winRate: 54, kda: 3.4, avgCsPerMin: 8.2, avgVisionScore: 20, avgDamageShare: 27.8, region: "kr" },
    { riotId: "Dzukill#EUW", tier: "GRANDMASTER", rank: "I", lp: 520, games: 680, winRate: 55, kda: 3.6, avgCsPerMin: 8.5, avgVisionScore: 22, avgDamageShare: 28.5, region: "euw1" },
    { riotId: "PzZZang#KR1", tier: "CHALLENGER", rank: "I", lp: 1200, games: 820, winRate: 58, kda: 4.1, avgCsPerMin: 9.0, avgVisionScore: 25, avgDamageShare: 29.2, region: "kr" },
  ],
  Yone: [
    { riotId: "SoulBlade#NA1", tier: "DIAMOND", rank: "I", lp: 90, games: 280, winRate: 55, kda: 3.0, avgCsPerMin: 7.6, avgVisionScore: 17, avgDamageShare: 25.8, region: "na1" },
    { riotId: "YoneKing#EUW", tier: "MASTER", rank: "I", lp: 200, games: 400, winRate: 53, kda: 3.3, avgCsPerMin: 8.0, avgVisionScore: 19, avgDamageShare: 27.0, region: "euw1" },
    { riotId: "Dzukill#EUW", tier: "GRANDMASTER", rank: "I", lp: 520, games: 540, winRate: 56, kda: 3.7, avgCsPerMin: 8.4, avgVisionScore: 21, avgDamageShare: 28.0, region: "euw1" },
    { riotId: "Faker#KR1", tier: "CHALLENGER", rank: "I", lp: 1400, games: 200, winRate: 60, kda: 4.5, avgCsPerMin: 9.2, avgVisionScore: 28, avgDamageShare: 27.5, region: "kr" },
  ],
  Zed: [
    { riotId: "ShadowStep#NA1", tier: "DIAMOND", rank: "II", lp: 65, games: 350, winRate: 54, kda: 3.2, avgCsPerMin: 7.5, avgVisionScore: 16, avgDamageShare: 27.0, region: "na1" },
    { riotId: "Laceration#NA1", tier: "MASTER", rank: "I", lp: 250, games: 500, winRate: 56, kda: 3.8, avgCsPerMin: 8.1, avgVisionScore: 18, avgDamageShare: 28.5, region: "na1" },
    { riotId: "OneShotKing#KR1", tier: "GRANDMASTER", rank: "I", lp: 480, games: 620, winRate: 55, kda: 3.5, avgCsPerMin: 8.4, avgVisionScore: 20, avgDamageShare: 29.0, region: "kr" },
    { riotId: "Zed99#KR1", tier: "CHALLENGER", rank: "I", lp: 1100, games: 750, winRate: 57, kda: 4.0, avgCsPerMin: 8.8, avgVisionScore: 23, avgDamageShare: 30.0, region: "kr" },
  ],
  Ahri: [
    { riotId: "CharmCaster#NA1", tier: "DIAMOND", rank: "I", lp: 80, games: 290, winRate: 56, kda: 3.5, avgCsPerMin: 7.2, avgVisionScore: 20, avgDamageShare: 24.0, region: "na1" },
    { riotId: "FoxFire#EUW", tier: "MASTER", rank: "I", lp: 190, games: 380, winRate: 55, kda: 3.8, avgCsPerMin: 7.8, avgVisionScore: 23, avgDamageShare: 25.0, region: "euw1" },
    { riotId: "NineT#KR1", tier: "GRANDMASTER", rank: "I", lp: 550, games: 510, winRate: 57, kda: 4.1, avgCsPerMin: 8.0, avgVisionScore: 26, avgDamageShare: 25.5, region: "kr" },
    { riotId: "Kuro#KR1", tier: "CHALLENGER", rank: "I", lp: 1050, games: 600, winRate: 59, kda: 4.5, avgCsPerMin: 8.5, avgVisionScore: 30, avgDamageShare: 26.0, region: "kr" },
  ],
  Jinx: [
    { riotId: "RocketGirl#NA1", tier: "DIAMOND", rank: "I", lp: 85, games: 310, winRate: 55, kda: 3.3, avgCsPerMin: 8.0, avgVisionScore: 22, avgDamageShare: 28.0, region: "na1" },
    { riotId: "PowPow#EUW", tier: "MASTER", rank: "I", lp: 220, games: 420, winRate: 54, kda: 3.6, avgCsPerMin: 8.5, avgVisionScore: 24, avgDamageShare: 29.5, region: "euw1" },
    { riotId: "ADCKing#KR1", tier: "GRANDMASTER", rank: "I", lp: 500, games: 580, winRate: 56, kda: 3.9, avgCsPerMin: 9.0, avgVisionScore: 26, avgDamageShare: 30.0, region: "kr" },
    { riotId: "Gumayusi#KR1", tier: "CHALLENGER", rank: "I", lp: 1300, games: 350, winRate: 60, kda: 4.8, avgCsPerMin: 9.5, avgVisionScore: 30, avgDamageShare: 31.0, region: "kr" },
  ],
  LeeSin: [
    { riotId: "KickFlash#NA1", tier: "DIAMOND", rank: "II", lp: 70, games: 340, winRate: 53, kda: 3.0, avgCsPerMin: 5.5, avgVisionScore: 28, avgDamageShare: 18.5, region: "na1" },
    { riotId: "InSec#KR1", tier: "MASTER", rank: "I", lp: 210, games: 480, winRate: 55, kda: 3.4, avgCsPerMin: 5.8, avgVisionScore: 32, avgDamageShare: 19.0, region: "kr" },
    { riotId: "JungleGod#EUW", tier: "GRANDMASTER", rank: "I", lp: 490, games: 600, winRate: 54, kda: 3.6, avgCsPerMin: 6.0, avgVisionScore: 35, avgDamageShare: 19.5, region: "euw1" },
    { riotId: "Canyon#KR1", tier: "CHALLENGER", rank: "I", lp: 1350, games: 450, winRate: 58, kda: 4.2, avgCsPerMin: 6.5, avgVisionScore: 38, avgDamageShare: 20.0, region: "kr" },
  ],
  Thresh: [
    { riotId: "HookCity#NA1", tier: "DIAMOND", rank: "I", lp: 75, games: 300, winRate: 54, kda: 3.2, avgCsPerMin: 1.2, avgVisionScore: 55, avgDamageShare: 8.5, region: "na1" },
    { riotId: "Lantern#EUW", tier: "MASTER", rank: "I", lp: 200, games: 420, winRate: 55, kda: 3.5, avgCsPerMin: 1.3, avgVisionScore: 62, avgDamageShare: 9.0, region: "euw1" },
    { riotId: "FlayKing#KR1", tier: "GRANDMASTER", rank: "I", lp: 510, games: 560, winRate: 56, kda: 3.8, avgCsPerMin: 1.4, avgVisionScore: 68, avgDamageShare: 9.5, region: "kr" },
    { riotId: "Keria#KR1", tier: "CHALLENGER", rank: "I", lp: 1250, games: 380, winRate: 59, kda: 4.5, avgCsPerMin: 1.5, avgVisionScore: 75, avgDamageShare: 10.0, region: "kr" },
  ],
  Lux: [
    { riotId: "LightBeam#NA1", tier: "DIAMOND", rank: "II", lp: 60, games: 270, winRate: 55, kda: 3.4, avgCsPerMin: 6.8, avgVisionScore: 22, avgDamageShare: 24.5, region: "na1" },
    { riotId: "LaserMage#EUW", tier: "MASTER", rank: "I", lp: 180, games: 360, winRate: 54, kda: 3.7, avgCsPerMin: 7.2, avgVisionScore: 25, avgDamageShare: 25.0, region: "euw1" },
    { riotId: "Illuminated#KR1", tier: "GRANDMASTER", rank: "I", lp: 470, games: 490, winRate: 56, kda: 4.0, avgCsPerMin: 7.5, avgVisionScore: 28, avgDamageShare: 26.0, region: "kr" },
    { riotId: "LuxMain99#KR1", tier: "CHALLENGER", rank: "I", lp: 980, games: 580, winRate: 58, kda: 4.3, avgCsPerMin: 8.0, avgVisionScore: 32, avgDamageShare: 27.0, region: "kr" },
  ],
};

function generateGenericRoleModels(championName: string): RoleModelEntry[] {
  return [
    { riotId: `${championName}Main#D1`, tier: "DIAMOND", rank: "I", lp: 80, games: 300, winRate: 55, kda: 3.2, avgCsPerMin: 7.2, avgVisionScore: 20, avgDamageShare: 22.0, region: "na1" },
    { riotId: `${championName}OTP#M1`, tier: "MASTER", rank: "I", lp: 200, games: 440, winRate: 54, kda: 3.5, avgCsPerMin: 7.6, avgVisionScore: 24, avgDamageShare: 23.0, region: "na1" },
    { riotId: `${championName}God#GM`, tier: "GRANDMASTER", rank: "I", lp: 500, games: 580, winRate: 56, kda: 3.8, avgCsPerMin: 8.0, avgVisionScore: 28, avgDamageShare: 24.0, region: "kr" },
    { riotId: `${championName}King#C1`, tier: "CHALLENGER", rank: "I", lp: 1100, games: 700, winRate: 58, kda: 4.2, avgCsPerMin: 8.5, avgVisionScore: 32, avgDamageShare: 25.0, region: "kr" },
  ];
}

export type { RoleModelEntry };

export function getRoleModels(
  championName: string,
  playerTier: string,
  count: number = 3
): RoleModelEntry[] {
  const models = ROLE_MODELS[championName] ?? generateGenericRoleModels(championName);
  const playerTierIdx = tierIndex(playerTier);

  const higherModels = models
    .filter((m) => tierIndex(m.tier) > playerTierIdx)
    .sort((a, b) => tierIndex(a.tier) - tierIndex(b.tier));

  return higherModels.slice(0, count);
}
