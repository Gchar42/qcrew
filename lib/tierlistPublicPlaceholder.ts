type RoleKey = "top" | "jungle" | "mid" | "adc" | "support";

export type PublicPlaceholderChamp = {
  championId: number;
  championName: string;
  games: number;
  wins: number;
  winRate: number;
  pickRate: number;
  score: number;
};

/**
 * Snapshot placeholders from public tier/stat pages (MetaSRC Silver–Grandmaster aggregate),
 * used only when local cache-derived tier data is too sparse and no DB snapshot exists.
 */
export const PUBLIC_PLACEHOLDER_BY_ROLE: Record<RoleKey, PublicPlaceholderChamp[]> = {
  top: [
    { championId: 86, championName: "Garen", games: 1000, wins: 532, winRate: 53.2, pickRate: 11.0, score: 43.87 },
    { championId: 54, championName: "Malphite", games: 1000, wins: 503, winRate: 50.3, pickRate: 5.8, score: 40.31 },
    { championId: 126, championName: "Jayce", games: 1000, wins: 492, winRate: 49.2, pickRate: 4.7, score: 39.33 },
    { championId: 266, championName: "Aatrox", games: 1000, wins: 499, winRate: 49.9, pickRate: 8.0, score: 40.68 },
    { championId: 24, championName: "Jax", games: 1000, wins: 503, winRate: 50.3, pickRate: 5.7, score: 40.29 },
    { championId: 114, championName: "Fiora", games: 1000, wins: 514, winRate: 51.4, pickRate: 3.5, score: 40.86 },
    { championId: 14, championName: "Sion", games: 1000, wins: 499, winRate: 49.9, pickRate: 4.8, score: 39.88 },
    { championId: 75, championName: "Nasus", games: 1000, wins: 495, winRate: 49.5, pickRate: 4.3, score: 39.41 },
    { championId: 122, championName: "Darius", games: 1000, wins: 501, winRate: 50.1, pickRate: 7.0, score: 40.62 },
    { championId: 58, championName: "Renekton", games: 1000, wins: 496, winRate: 49.6, pickRate: 5.9, score: 39.99 },
  ],
  jungle: [
    { championId: 64, championName: "Lee Sin", games: 1000, wins: 495, winRate: 49.5, pickRate: 13.5, score: 41.26 },
    { championId: 121, championName: "Kha'Zix", games: 1000, wins: 491, winRate: 49.1, pickRate: 6.7, score: 39.9 },
    { championId: 79, championName: "Gragas", games: 1000, wins: 488, winRate: 48.8, pickRate: 5.5, score: 39.49 },
    { championId: 120, championName: "Hecarim", games: 1000, wins: 507, winRate: 50.7, pickRate: 6.3, score: 40.93 },
    { championId: 19, championName: "Warwick", games: 1000, wins: 513, winRate: 51.3, pickRate: 2.9, score: 40.35 },
    { championId: 35, championName: "Shaco", games: 1000, wins: 504, winRate: 50.4, pickRate: 3.8, score: 40.15 },
    { championId: 24, championName: "Jax", games: 1000, wins: 499, winRate: 49.9, pickRate: 2.8, score: 39.16 },
    { championId: 254, championName: "Vi", games: 1000, wins: 505, winRate: 50.5, pickRate: 5.7, score: 40.59 },
    { championId: 59, championName: "Jarvan IV", games: 1000, wins: 507, winRate: 50.7, pickRate: 6.4, score: 40.95 },
    { championId: 421, championName: "Rek'Sai", games: 1000, wins: 519, winRate: 51.9, pickRate: 2.3, score: 40.51 },
  ],
  mid: [
    { championId: 103, championName: "Ahri", games: 1000, wins: 516, winRate: 51.6, pickRate: 14.5, score: 43.04 },
    { championId: 7, championName: "LeBlanc", games: 1000, wins: 501, winRate: 50.1, pickRate: 4.1, score: 40.08 },
    { championId: 238, championName: "Zed", games: 1000, wins: 493, winRate: 49.3, pickRate: 6.4, score: 39.76 },
    { championId: 134, championName: "Syndra", games: 1000, wins: 498, winRate: 49.8, pickRate: 4.3, score: 39.91 },
    { championId: 61, championName: "Orianna", games: 1000, wins: 479, winRate: 47.9, pickRate: 4.8, score: 38.42 },
    { championId: 518, championName: "Neeko", games: 1000, wins: 496, winRate: 49.6, pickRate: 3.9, score: 39.65 },
    { championId: 69, championName: "Cassiopeia", games: 1000, wins: 503, winRate: 50.3, pickRate: 1.1, score: 39.52 },
    { championId: 50, championName: "Swain", games: 1000, wins: 523, winRate: 52.3, pickRate: 1.0, score: 41.0 },
    { championId: 101, championName: "Xerath", games: 1000, wins: 537, winRate: 53.7, pickRate: 4.9, score: 42.16 },
    { championId: 13, championName: "Ryze", games: 1000, wins: 476, winRate: 47.6, pickRate: 4.7, score: 38.07 },
  ],
  adc: [
    { championId: 202, championName: "Jhin", games: 1000, wins: 510, winRate: 51.0, pickRate: 13.7, score: 42.37 },
    { championId: 222, championName: "Jinx", games: 1000, wins: 517, winRate: 51.7, pickRate: 14.6, score: 43.14 },
    { championId: 81, championName: "Ezreal", games: 1000, wins: 491, winRate: 49.1, pickRate: 19.3, score: 42.14 },
    { championId: 145, championName: "Kai'Sa", games: 1000, wins: 486, winRate: 48.6, pickRate: 17.1, score: 41.29 },
    { championId: 51, championName: "Caitlyn", games: 1000, wins: 504, winRate: 50.4, pickRate: 15.8, score: 42.19 },
    { championId: 119, championName: "Draven", games: 1000, wins: 505, winRate: 50.5, pickRate: 3.5, score: 40.71 },
    { championId: 236, championName: "Lucian", games: 1000, wins: 494, winRate: 49.4, pickRate: 7.8, score: 40.05 },
    { championId: 18, championName: "Tristana", games: 1000, wins: 520, winRate: 52.0, pickRate: 4.4, score: 41.45 },
    { championId: 110, championName: "Varus", games: 1000, wins: 489, winRate: 48.9, pickRate: 5.5, score: 39.35 },
    { championId: 498, championName: "Xayah", games: 1000, wins: 517, winRate: 51.7, pickRate: 5.0, score: 41.73 },
  ],
  support: [
    { championId: 555, championName: "Pyke", games: 1000, wins: 503, winRate: 50.3, pickRate: 6.0, score: 40.53 },
    { championId: 412, championName: "Thresh", games: 1000, wins: 516, winRate: 51.6, pickRate: 12.5, score: 42.8 },
    { championId: 267, championName: "Nami", games: 1000, wins: 515, winRate: 51.5, pickRate: 11.3, score: 42.66 },
    { championId: 89, championName: "Leona", games: 1000, wins: 513, winRate: 51.3, pickRate: 7.8, score: 41.87 },
    { championId: 117, championName: "Lulu", games: 1000, wins: 498, winRate: 49.8, pickRate: 8.5, score: 40.71 },
    { championId: 40, championName: "Janna", games: 1000, wins: 517, winRate: 51.7, pickRate: 2.8, score: 41.14 },
    { championId: 16, championName: "Soraka", games: 1000, wins: 516, winRate: 51.6, pickRate: 3.9, score: 41.11 },
    { championId: 53, championName: "Blitzcrank", games: 1000, wins: 505, winRate: 50.5, pickRate: 5.9, score: 40.53 },
    { championId: 432, championName: "Bard", games: 1000, wins: 501, winRate: 50.1, pickRate: 6.2, score: 40.06 },
    { championId: 223, championName: "Tahm Kench", games: 1000, wins: 496, winRate: 49.6, pickRate: 2.6, score: 39.06 },
  ],
};

