/**
 * Sample champion build data for development.
 * In production, this is replaced by aggregated data from high-elo one-tricks.
 *
 * Data structure mirrors the champion_builds Supabase table.
 */

export interface ChampionBuild {
  champion_name: string;
  role: string;
  patch: string;
  sample_size: number;
  win_rate: number;
  pick_rate: number;
  ban_rate: number;
  tier: string;
  tier_rank: number;
  tier_total: number;
  items_start: { id: number; name: string }[];
  items_core: { id: number; name: string; winRate: number; matches: number }[];
  items_4th: { id: number; name: string; winRate: number; matches: number }[];
  items_5th: { id: number; name: string; winRate: number; matches: number }[];
  items_6th: { id: number; name: string; winRate: number; matches: number }[];
  boots: { id: number; name: string; winRate: number; matches: number };
  runes_primary: {
    tree: string;
    treeId: number;
    keystone: { id: number; name: string };
    slots: { id: number; name: string }[];
  };
  runes_secondary: {
    tree: string;
    treeId: number;
    slots: { id: number; name: string }[];
  };
  rune_shards: { id: number; name: string }[];
  summoner_spells: {
    spells: { id: number; name: string }[];
    winRate: number;
    matches: number;
  };
  skill_order: string[];
  skill_path: number[];
  counters: {
    name: string;
    winRate: number;
    matches: number;
    tip?: string;
    powerSpikes?: string;
    difficulty?: "easy" | "medium" | "hard";
  }[];
}

const SAMPLE_BUILDS: Record<string, ChampionBuild> = {
  Ahri: {
    champion_name: "Ahri",
    role: "mid",
    patch: "16.5",
    sample_size: 72966,
    win_rate: 51.63,
    pick_rate: 14.8,
    ban_rate: 8.7,
    tier: "S+",
    tier_rank: 5,
    tier_total: 53,
    items_start: [
      { id: 1056, name: "Doran's Ring" },
      { id: 2003, name: "Health Potion" },
    ],
    items_core: [
      { id: 6655, name: "Luden's Companion", winRate: 53.7, matches: 6050 },
      { id: 3157, name: "Zhonya's Hourglass", winRate: 54.2, matches: 5800 },
      { id: 4629, name: "Cosmic Drive", winRate: 55.1, matches: 4200 },
    ],
    items_4th: [
      { id: 3089, name: "Rabadon's Deathcap", winRate: 57.33, matches: 11615 },
      { id: 3135, name: "Void Staff", winRate: 54.71, matches: 14622 },
    ],
    items_5th: [
      { id: 3135, name: "Void Staff", winRate: 58.12, matches: 5578 },
      { id: 3116, name: "Rylai's Crystal Scepter", winRate: 60.25, matches: 4128 },
      { id: 3165, name: "Morellonomicon", winRate: 61.11, matches: 1049 },
    ],
    items_6th: [
      { id: 3089, name: "Rabadon's Deathcap", winRate: 61.47, matches: 911 },
      { id: 3102, name: "Banshee's Veil", winRate: 58.69, matches: 719 },
      { id: 3116, name: "Rylai's Crystal Scepter", winRate: 56.21, matches: 612 },
    ],
    boots: { id: 3020, name: "Sorcerer's Shoes", winRate: 51.75, matches: 72213 },
    runes_primary: {
      tree: "Domination",
      treeId: 8100,
      keystone: { id: 8112, name: "Electrocute" },
      slots: [
        { id: 8139, name: "Taste of Blood" },
        { id: 8138, name: "Eyeball Collection" },
        { id: 8135, name: "Treasure Hunter" },
      ],
    },
    runes_secondary: {
      tree: "Sorcery",
      treeId: 8200,
      slots: [
        { id: 8226, name: "Manaflow Band" },
        { id: 8210, name: "Transcendence" },
      ],
    },
    rune_shards: [
      { id: 5008, name: "Adaptive Force" },
      { id: 5008, name: "Adaptive Force" },
      { id: 5001, name: "Health Scaling" },
    ],
    summoner_spells: {
      spells: [
        { id: 4, name: "Flash" },
        { id: 14, name: "Ignite" },
      ],
      winRate: 53.19,
      matches: 32855,
    },
    skill_order: ["Q", "W", "E"],
    skill_path: [2, 1, 3, 1, 1, 4, 1, 2, 1, 2, 4, 2, 2, 3, 3, 4, 3, 3],
    counters: [
      { name: "Mel", winRate: 47.8, matches: 3299 },
      { name: "Veigar", winRate: 48.0, matches: 1961 },
      { name: "Annie", winRate: 48.3, matches: 1250 },
      { name: "Vex", winRate: 48.8, matches: 1142 },
      { name: "Katarina", winRate: 49.2, matches: 2507 },
    ],
  },

  Yasuo: {
    champion_name: "Yasuo",
    role: "mid",
    patch: "16.5",
    sample_size: 58421,
    win_rate: 49.87,
    pick_rate: 11.2,
    ban_rate: 12.5,
    tier: "A",
    tier_rank: 18,
    tier_total: 53,
    items_start: [
      { id: 1055, name: "Doran's Blade" },
      { id: 2003, name: "Health Potion" },
    ],
    items_core: [
      { id: 3153, name: "Blade of the Ruined King", winRate: 51.2, matches: 42000 },
      { id: 6672, name: "Kraken Slayer", winRate: 52.8, matches: 38000 },
      { id: 3031, name: "Infinity Edge", winRate: 54.1, matches: 28000 },
    ],
    items_4th: [
      { id: 3072, name: "Bloodthirster", winRate: 56.4, matches: 9800 },
      { id: 3026, name: "Guardian Angel", winRate: 55.1, matches: 8200 },
    ],
    items_5th: [
      { id: 3026, name: "Guardian Angel", winRate: 58.2, matches: 4100 },
      { id: 3139, name: "Mercurial Scimitar", winRate: 57.8, matches: 2900 },
      { id: 3156, name: "Maw of Malmortius", winRate: 59.1, matches: 1800 },
    ],
    items_6th: [
      { id: 3072, name: "Bloodthirster", winRate: 60.3, matches: 780 },
      { id: 6333, name: "Death's Dance", winRate: 59.8, matches: 650 },
      { id: 3156, name: "Maw of Malmortius", winRate: 58.2, matches: 420 },
    ],
    boots: { id: 3006, name: "Berserker's Greaves", winRate: 50.1, matches: 55000 },
    runes_primary: {
      tree: "Precision",
      treeId: 8000,
      keystone: { id: 8010, name: "Conqueror" },
      slots: [
        { id: 9111, name: "Triumph" },
        { id: 9104, name: "Legend: Alacrity" },
        { id: 8299, name: "Last Stand" },
      ],
    },
    runes_secondary: {
      tree: "Resolve",
      treeId: 8400,
      slots: [
        { id: 8444, name: "Second Wind" },
        { id: 8451, name: "Overgrowth" },
      ],
    },
    rune_shards: [
      { id: 5005, name: "Attack Speed" },
      { id: 5008, name: "Adaptive Force" },
      { id: 5001, name: "Health Scaling" },
    ],
    summoner_spells: {
      spells: [
        { id: 4, name: "Flash" },
        { id: 14, name: "Ignite" },
      ],
      winRate: 50.5,
      matches: 42000,
    },
    skill_order: ["Q", "E", "W"],
    skill_path: [1, 3, 1, 2, 1, 4, 1, 3, 1, 3, 4, 3, 3, 2, 2, 4, 2, 2],
    counters: [
      { name: "Pantheon", winRate: 44.2, matches: 2100 },
      { name: "Renekton", winRate: 45.1, matches: 1800 },
      { name: "Annie", winRate: 46.3, matches: 1500 },
      { name: "Malzahar", winRate: 46.8, matches: 2200 },
      { name: "Zed", winRate: 47.5, matches: 3800 },
    ],
  },

  Jinx: {
    champion_name: "Jinx",
    role: "bot",
    patch: "16.5",
    sample_size: 65200,
    win_rate: 52.1,
    pick_rate: 16.3,
    ban_rate: 5.2,
    tier: "S",
    tier_rank: 3,
    tier_total: 24,
    items_start: [
      { id: 1055, name: "Doran's Blade" },
      { id: 2003, name: "Health Potion" },
    ],
    items_core: [
      { id: 6672, name: "Kraken Slayer", winRate: 53.4, matches: 48000 },
      { id: 3085, name: "Runaan's Hurricane", winRate: 54.7, matches: 42000 },
      { id: 3031, name: "Infinity Edge", winRate: 56.2, matches: 35000 },
    ],
    items_4th: [
      { id: 3094, name: "Rapid Firecannon", winRate: 58.1, matches: 12000 },
      { id: 3072, name: "Bloodthirster", winRate: 57.3, matches: 9500 },
    ],
    items_5th: [
      { id: 3072, name: "Bloodthirster", winRate: 60.2, matches: 5200 },
      { id: 3036, name: "Lord Dominik's Regards", winRate: 59.8, matches: 4800 },
      { id: 3026, name: "Guardian Angel", winRate: 61.5, matches: 2100 },
    ],
    items_6th: [
      { id: 3036, name: "Lord Dominik's Regards", winRate: 62.1, matches: 900 },
      { id: 3026, name: "Guardian Angel", winRate: 60.8, matches: 750 },
      { id: 6676, name: "The Collector", winRate: 59.2, matches: 500 },
    ],
    boots: { id: 3006, name: "Berserker's Greaves", winRate: 52.3, matches: 62000 },
    runes_primary: {
      tree: "Precision",
      treeId: 8000,
      keystone: { id: 8008, name: "Lethal Tempo" },
      slots: [
        { id: 9111, name: "Triumph" },
        { id: 9104, name: "Legend: Alacrity" },
        { id: 8299, name: "Last Stand" },
      ],
    },
    runes_secondary: {
      tree: "Sorcery",
      treeId: 8200,
      slots: [
        { id: 8275, name: "Nimbus Cloak" },
        { id: 8234, name: "Celerity" },
      ],
    },
    rune_shards: [
      { id: 5005, name: "Attack Speed" },
      { id: 5008, name: "Adaptive Force" },
      { id: 5001, name: "Health Scaling" },
    ],
    summoner_spells: {
      spells: [
        { id: 4, name: "Flash" },
        { id: 7, name: "Heal" },
      ],
      winRate: 52.4,
      matches: 58000,
    },
    skill_order: ["Q", "W", "E"],
    skill_path: [1, 2, 3, 1, 1, 4, 1, 2, 1, 2, 4, 2, 2, 3, 3, 4, 3, 3],
    counters: [
      { name: "Draven", winRate: 46.5, matches: 4200 },
      { name: "Lucian", winRate: 47.2, matches: 3800 },
      { name: "Samira", winRate: 47.8, matches: 3500 },
      { name: "Kalista", winRate: 48.1, matches: 2100 },
      { name: "Tristana", winRate: 48.9, matches: 2800 },
    ],
  },

  Thresh: {
    champion_name: "Thresh",
    role: "support",
    patch: "16.5",
    sample_size: 42800,
    win_rate: 50.8,
    pick_rate: 10.1,
    ban_rate: 4.8,
    tier: "A",
    tier_rank: 8,
    tier_total: 36,
    items_start: [
      { id: 3862, name: "Steel Shoulderguards" },
      { id: 2003, name: "Health Potion" },
    ],
    items_core: [
      { id: 3109, name: "Knight's Vow", winRate: 52.1, matches: 32000 },
      { id: 3190, name: "Locket of the Iron Solari", winRate: 51.8, matches: 28000 },
      { id: 3050, name: "Zeke's Convergence", winRate: 53.4, matches: 22000 },
    ],
    items_4th: [
      { id: 3107, name: "Redemption", winRate: 55.2, matches: 8000 },
      { id: 3110, name: "Frozen Heart", winRate: 54.8, matches: 6500 },
    ],
    items_5th: [
      { id: 3110, name: "Frozen Heart", winRate: 57.1, matches: 3200 },
      { id: 3107, name: "Redemption", winRate: 56.8, matches: 2800 },
      { id: 3143, name: "Randuin's Omen", winRate: 58.2, matches: 1200 },
    ],
    items_6th: [
      { id: 3143, name: "Randuin's Omen", winRate: 59.1, matches: 500 },
      { id: 3222, name: "Mikael's Blessing", winRate: 57.8, matches: 400 },
      { id: 3075, name: "Thornmail", winRate: 56.5, matches: 350 },
    ],
    boots: { id: 3009, name: "Boots of Swiftness", winRate: 51.2, matches: 38000 },
    runes_primary: {
      tree: "Resolve",
      treeId: 8400,
      keystone: { id: 8439, name: "Aftershock" },
      slots: [
        { id: 8446, name: "Demolish" },
        { id: 8444, name: "Second Wind" },
        { id: 8451, name: "Overgrowth" },
      ],
    },
    runes_secondary: {
      tree: "Inspiration",
      treeId: 8300,
      slots: [
        { id: 8345, name: "Biscuit Delivery" },
        { id: 8347, name: "Cosmic Insight" },
      ],
    },
    rune_shards: [
      { id: 5001, name: "Health Scaling" },
      { id: 5002, name: "Armor" },
      { id: 5001, name: "Health Scaling" },
    ],
    summoner_spells: {
      spells: [
        { id: 4, name: "Flash" },
        { id: 14, name: "Ignite" },
      ],
      winRate: 51.3,
      matches: 35000,
    },
    skill_order: ["Q", "E", "W"],
    skill_path: [3, 1, 2, 1, 1, 4, 1, 3, 1, 3, 4, 3, 3, 2, 2, 4, 2, 2],
    counters: [
      { name: "Morgana", winRate: 46.2, matches: 3500 },
      { name: "Zyra", winRate: 47.1, matches: 2800 },
      { name: "Lulu", winRate: 47.5, matches: 2600 },
      { name: "Janna", winRate: 48.2, matches: 2200 },
      { name: "Karma", winRate: 48.8, matches: 2000 },
    ],
  },

  "Lee Sin": {
    champion_name: "Lee Sin",
    role: "jungle",
    patch: "16.5",
    sample_size: 55300,
    win_rate: 48.9,
    pick_rate: 13.5,
    ban_rate: 6.8,
    tier: "B",
    tier_rank: 22,
    tier_total: 45,
    items_start: [
      { id: 1103, name: "Gustwalker Hatchling" },
    ],
    items_core: [
      { id: 6692, name: "Eclipse", winRate: 50.1, matches: 38000 },
      { id: 3071, name: "Black Cleaver", winRate: 51.2, matches: 32000 },
      { id: 6333, name: "Death's Dance", winRate: 52.8, matches: 25000 },
    ],
    items_4th: [
      { id: 3156, name: "Maw of Malmortius", winRate: 54.2, matches: 8500 },
      { id: 3026, name: "Guardian Angel", winRate: 53.8, matches: 7200 },
    ],
    items_5th: [
      { id: 3026, name: "Guardian Angel", winRate: 56.5, matches: 3800 },
      { id: 3053, name: "Sterak's Gage", winRate: 55.9, matches: 3200 },
      { id: 3156, name: "Maw of Malmortius", winRate: 57.2, matches: 1500 },
    ],
    items_6th: [
      { id: 3053, name: "Sterak's Gage", winRate: 58.1, matches: 600 },
      { id: 3143, name: "Randuin's Omen", winRate: 57.2, matches: 450 },
      { id: 3139, name: "Mercurial Scimitar", winRate: 56.0, matches: 380 },
    ],
    boots: { id: 3047, name: "Plated Steelcaps", winRate: 49.5, matches: 42000 },
    runes_primary: {
      tree: "Domination",
      treeId: 8100,
      keystone: { id: 8112, name: "Electrocute" },
      slots: [
        { id: 8143, name: "Sudden Impact" },
        { id: 8138, name: "Eyeball Collection" },
        { id: 8135, name: "Treasure Hunter" },
      ],
    },
    runes_secondary: {
      tree: "Precision",
      treeId: 8000,
      slots: [
        { id: 9111, name: "Triumph" },
        { id: 9105, name: "Legend: Tenacity" },
      ],
    },
    rune_shards: [
      { id: 5008, name: "Adaptive Force" },
      { id: 5008, name: "Adaptive Force" },
      { id: 5001, name: "Health Scaling" },
    ],
    summoner_spells: {
      spells: [
        { id: 4, name: "Flash" },
        { id: 11, name: "Smite" },
      ],
      winRate: 49.1,
      matches: 52000,
    },
    skill_order: ["Q", "W", "E"],
    skill_path: [1, 2, 3, 1, 1, 4, 1, 2, 1, 2, 4, 2, 2, 3, 3, 4, 3, 3],
    counters: [
      { name: "Amumu", winRate: 44.8, matches: 2800 },
      { name: "Rammus", winRate: 45.5, matches: 2200 },
      { name: "Warwick", winRate: 46.1, matches: 3100 },
      { name: "Nocturne", winRate: 46.8, matches: 2500 },
      { name: "Vi", winRate: 47.2, matches: 2800 },
    ],
  },

  Zed: {
    champion_name: "Zed",
    role: "mid",
    patch: "16.5",
    sample_size: 48500,
    win_rate: 50.2,
    pick_rate: 9.8,
    ban_rate: 15.2,
    tier: "A",
    tier_rank: 12,
    tier_total: 53,
    items_start: [
      { id: 1036, name: "Long Sword" },
      { id: 2003, name: "Health Potion" },
      { id: 2003, name: "Health Potion" },
      { id: 2003, name: "Health Potion" },
    ],
    items_core: [
      { id: 6693, name: "Prowler's Claw", winRate: 51.8, matches: 35000 },
      { id: 3814, name: "Edge of Night", winRate: 52.5, matches: 30000 },
      { id: 6676, name: "The Collector", winRate: 53.2, matches: 28000 },
    ],
    items_4th: [
      { id: 3036, name: "Lord Dominik's Regards", winRate: 55.8, matches: 10000 },
      { id: 3156, name: "Maw of Malmortius", winRate: 54.2, matches: 8500 },
    ],
    items_5th: [
      { id: 3156, name: "Maw of Malmortius", winRate: 57.5, matches: 4200 },
      { id: 3026, name: "Guardian Angel", winRate: 56.8, matches: 3800 },
      { id: 6333, name: "Death's Dance", winRate: 58.1, matches: 1600 },
    ],
    items_6th: [
      { id: 6333, name: "Death's Dance", winRate: 59.2, matches: 700 },
      { id: 3026, name: "Guardian Angel", winRate: 58.5, matches: 580 },
      { id: 3036, name: "Lord Dominik's Regards", winRate: 57.1, matches: 450 },
    ],
    boots: { id: 3047, name: "Plated Steelcaps", winRate: 50.5, matches: 35000 },
    runes_primary: {
      tree: "Domination",
      treeId: 8100,
      keystone: { id: 8112, name: "Electrocute" },
      slots: [
        { id: 8143, name: "Sudden Impact" },
        { id: 8138, name: "Eyeball Collection" },
        { id: 8135, name: "Treasure Hunter" },
      ],
    },
    runes_secondary: {
      tree: "Sorcery",
      treeId: 8200,
      slots: [
        { id: 8210, name: "Transcendence" },
        { id: 8236, name: "Gathering Storm" },
      ],
    },
    rune_shards: [
      { id: 5008, name: "Adaptive Force" },
      { id: 5008, name: "Adaptive Force" },
      { id: 5001, name: "Health Scaling" },
    ],
    summoner_spells: {
      spells: [
        { id: 4, name: "Flash" },
        { id: 14, name: "Ignite" },
      ],
      winRate: 50.8,
      matches: 40000,
    },
    skill_order: ["Q", "W", "E"],
    skill_path: [1, 2, 3, 1, 1, 4, 1, 2, 1, 2, 4, 2, 2, 3, 3, 4, 3, 3],
    counters: [
      { name: "Malzahar", winRate: 45.5, matches: 2800 },
      { name: "Garen", winRate: 46.2, matches: 1500 },
      { name: "Lissandra", winRate: 46.8, matches: 1800 },
      { name: "Pantheon", winRate: 47.1, matches: 1200 },
      { name: "Fizz", winRate: 47.5, matches: 2500 },
    ],
  },

  Lux: {
    champion_name: "Lux",
    role: "support",
    patch: "16.5",
    sample_size: 51200,
    win_rate: 51.4,
    pick_rate: 12.8,
    ban_rate: 7.1,
    tier: "S",
    tier_rank: 5,
    tier_total: 36,
    items_start: [
      { id: 3850, name: "Spellthief's Edge" },
      { id: 2003, name: "Health Potion" },
    ],
    items_core: [
      { id: 6655, name: "Luden's Companion", winRate: 53.1, matches: 38000 },
      { id: 3157, name: "Zhonya's Hourglass", winRate: 54.5, matches: 30000 },
      { id: 3089, name: "Rabadon's Deathcap", winRate: 56.2, matches: 22000 },
    ],
    items_4th: [
      { id: 3135, name: "Void Staff", winRate: 57.8, matches: 9500 },
      { id: 3116, name: "Rylai's Crystal Scepter", winRate: 56.2, matches: 7200 },
    ],
    items_5th: [
      { id: 3135, name: "Void Staff", winRate: 59.5, matches: 4000 },
      { id: 3165, name: "Morellonomicon", winRate: 58.8, matches: 3200 },
      { id: 3102, name: "Banshee's Veil", winRate: 60.1, matches: 1500 },
    ],
    items_6th: [
      { id: 3102, name: "Banshee's Veil", winRate: 61.2, matches: 600 },
      { id: 3165, name: "Morellonomicon", winRate: 60.5, matches: 500 },
      { id: 4629, name: "Cosmic Drive", winRate: 59.8, matches: 400 },
    ],
    boots: { id: 3020, name: "Sorcerer's Shoes", winRate: 51.8, matches: 48000 },
    runes_primary: {
      tree: "Sorcery",
      treeId: 8200,
      keystone: { id: 8214, name: "Arcane Comet" },
      slots: [
        { id: 8226, name: "Manaflow Band" },
        { id: 8210, name: "Transcendence" },
        { id: 8236, name: "Gathering Storm" },
      ],
    },
    runes_secondary: {
      tree: "Domination",
      treeId: 8100,
      slots: [
        { id: 8139, name: "Taste of Blood" },
        { id: 8135, name: "Treasure Hunter" },
      ],
    },
    rune_shards: [
      { id: 5008, name: "Adaptive Force" },
      { id: 5008, name: "Adaptive Force" },
      { id: 5001, name: "Health Scaling" },
    ],
    summoner_spells: {
      spells: [
        { id: 4, name: "Flash" },
        { id: 14, name: "Ignite" },
      ],
      winRate: 51.8,
      matches: 42000,
    },
    skill_order: ["Q", "E", "W"],
    skill_path: [3, 1, 2, 3, 3, 4, 3, 1, 3, 1, 4, 1, 1, 2, 2, 4, 2, 2],
    counters: [
      { name: "Blitzcrank", winRate: 46.5, matches: 3800 },
      { name: "Pyke", winRate: 47.2, matches: 2500 },
      { name: "Leona", winRate: 47.8, matches: 3200 },
      { name: "Nautilus", winRate: 48.1, matches: 2800 },
      { name: "Rell", winRate: 48.5, matches: 1800 },
    ],
  },

  Darius: {
    champion_name: "Darius",
    role: "top",
    patch: "16.5",
    sample_size: 45800,
    win_rate: 51.2,
    pick_rate: 8.5,
    ban_rate: 11.3,
    tier: "A",
    tier_rank: 10,
    tier_total: 48,
    items_start: [
      { id: 1055, name: "Doran's Blade" },
      { id: 2003, name: "Health Potion" },
    ],
    items_core: [
      { id: 6631, name: "Stridebreaker", winRate: 52.5, matches: 35000 },
      { id: 6333, name: "Death's Dance", winRate: 53.8, matches: 30000 },
      { id: 3053, name: "Sterak's Gage", winRate: 54.1, matches: 25000 },
    ],
    items_4th: [
      { id: 3742, name: "Dead Man's Plate", winRate: 56.2, matches: 8000 },
      { id: 3143, name: "Randuin's Omen", winRate: 55.5, matches: 6500 },
    ],
    items_5th: [
      { id: 3143, name: "Randuin's Omen", winRate: 58.1, matches: 3500 },
      { id: 3065, name: "Spirit Visage", winRate: 57.5, matches: 2800 },
      { id: 3742, name: "Dead Man's Plate", winRate: 58.8, matches: 1500 },
    ],
    items_6th: [
      { id: 3065, name: "Spirit Visage", winRate: 60.2, matches: 600 },
      { id: 3075, name: "Thornmail", winRate: 59.5, matches: 480 },
      { id: 3083, name: "Warmog's Armor", winRate: 58.8, matches: 350 },
    ],
    boots: { id: 3047, name: "Plated Steelcaps", winRate: 51.5, matches: 38000 },
    runes_primary: {
      tree: "Precision",
      treeId: 8000,
      keystone: { id: 8010, name: "Conqueror" },
      slots: [
        { id: 9111, name: "Triumph" },
        { id: 9105, name: "Legend: Tenacity" },
        { id: 8299, name: "Last Stand" },
      ],
    },
    runes_secondary: {
      tree: "Resolve",
      treeId: 8400,
      slots: [
        { id: 8444, name: "Second Wind" },
        { id: 8451, name: "Overgrowth" },
      ],
    },
    rune_shards: [
      { id: 5008, name: "Adaptive Force" },
      { id: 5002, name: "Armor" },
      { id: 5001, name: "Health Scaling" },
    ],
    summoner_spells: {
      spells: [
        { id: 4, name: "Flash" },
        { id: 6, name: "Ghost" },
      ],
      winRate: 52.1,
      matches: 35000,
    },
    skill_order: ["Q", "E", "W"],
    skill_path: [1, 2, 3, 1, 1, 4, 1, 3, 1, 3, 4, 3, 3, 2, 2, 4, 2, 2],
    counters: [
      { name: "Vayne", winRate: 44.5, matches: 2200 },
      { name: "Quinn", winRate: 45.8, matches: 1500 },
      { name: "Kayle", winRate: 46.2, matches: 1800 },
      { name: "Kennen", winRate: 46.8, matches: 1200 },
      { name: "Gnar", winRate: 47.5, matches: 2800 },
    ],
  },
};

export function getSampleBuild(championName: string): ChampionBuild | null {
  return SAMPLE_BUILDS[championName] ?? null;
}

export function getAllSampleBuilds(): ChampionBuild[] {
  return Object.values(SAMPLE_BUILDS);
}

export function getSampleChampionNames(): string[] {
  return Object.keys(SAMPLE_BUILDS);
}
