import { NextRequest } from "next/server";
import { getSampleBuild, type ChampionBuild } from "@/lib/sampleChampionBuilds";
import { unstable_cache } from "next/cache";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  const { name } = await params;
  if (!name) {
    return Response.json({ error: "Champion name required" }, { status: 400 });
  }

  try {
    const tags = await getChampionTags(name);
    const defaultRole = getPrimaryRole(tags);
    const roleTiers = getRoleTiers(tags);
    const builds: Record<string, ChampionBuild> = {};

    const sample = getSampleBuild(name);

    for (const role of ALL_ROLES) {
      const tier = roleTiers[role];
      if (sample && sample.role === role) {
        builds[role] = enrichCounters(sample, name);
      } else {
        const archetype = getArchetypeForRole(tags, role);
        builds[role] = adaptBuildForRole(
          generateForArchetype(name, archetype),
          role,
          tier,
          tags
        );
      }
    }

    const sortedRoles = [...ALL_ROLES].sort(
      (a, b) => (builds[b]?.sample_size ?? 0) - (builds[a]?.sample_size ?? 0)
    );

    return Response.json({
      builds,
      defaultRole,
      availableRoles: sortedRoles,
      dataSource: sample ? "sample" : "generated",
    });
  } catch (err) {
    console.error("Build API error:", err);
    return Response.json({ error: "Failed to load build" }, { status: 500 });
  }
}

const getChampionTags = unstable_cache(
  async (name: string): Promise<string[]> => {
    try {
      const verRes = await fetch("https://ddragon.leagueoflegends.com/api/versions.json");
      const versions: string[] = await verRes.json();
      const latest = versions[0];
      const res = await fetch(
        `https://ddragon.leagueoflegends.com/cdn/${latest}/data/en_US/champion/${name}.json`
      );
      if (!res.ok) return ["Fighter"];
      const data = await res.json();
      const champ = data.data?.[name];
      return champ?.tags ?? ["Fighter"];
    } catch {
      return ["Fighter"];
    }
  },
  ["champion-tags"],
  { revalidate: 86400 }
);

/* ── Role tier system ────────────────────────────────────────
 * Every champion gets all 5 roles. Each role is classified:
 *   "primary"   – main role, full stats
 *   "secondary" – common flex pick, moderate stats
 *   "offmeta"   – rare/troll, very low play rate but still present
 * ──────────────────────────────────────────────────────────── */

const ALL_ROLES = ["top", "jungle", "mid", "bot", "support"];

type RoleTier = "primary" | "secondary" | "offmeta";

function getPrimaryRole(tags: string[]): string {
  const t = tags.map((s) => s.toLowerCase());

  if (t.includes("marksman")) return "bot";
  if (t.includes("support") && !t.includes("mage") && !t.includes("tank")) return "support";

  if (t[0] === "assassin") return "mid";
  if (t[0] === "mage" && t.includes("support")) return "mid";
  if (t[0] === "mage") return "mid";
  if (t[0] === "fighter" && t.includes("assassin")) return "mid";
  if (t[0] === "fighter") return "top";
  if (t[0] === "tank" && t.includes("support")) return "support";
  if (t[0] === "tank") return "top";
  if (t[0] === "support") return "support";

  return "mid";
}

function getRoleTiers(tags: string[]): Record<string, RoleTier> {
  const t = tags.map((s) => s.toLowerCase());
  const primary = getPrimaryRole(tags);
  const tiers: Record<string, RoleTier> = {};

  for (const role of ALL_ROLES) {
    tiers[role] = "offmeta";
  }
  tiers[primary] = "primary";

  if (t.includes("assassin")) {
    if (primary !== "mid") tiers["mid"] = "secondary";
    if (primary !== "jungle") tiers["jungle"] = "secondary";
  }
  if (t.includes("mage")) {
    if (primary !== "mid") tiers["mid"] = "secondary";
    if (primary !== "support") tiers["support"] = "secondary";
  }
  if (t.includes("fighter")) {
    if (primary !== "top") tiers["top"] = "secondary";
    if (primary !== "jungle") tiers["jungle"] = "secondary";
  }
  if (t.includes("tank")) {
    if (primary !== "top") tiers["top"] = "secondary";
    if (primary !== "jungle") tiers["jungle"] = "secondary";
    if (primary !== "support") tiers["support"] = "secondary";
  }
  if (t.includes("marksman")) {
    if (primary !== "bot") tiers["bot"] = "secondary";
    if (primary !== "mid") tiers["mid"] = "secondary";
  }
  if (t.includes("support")) {
    if (primary !== "support") tiers["support"] = "secondary";
  }

  return tiers;
}

/* ── Pick best archetype for a given role ───────────────────── */

type Archetype = "mage" | "assassin" | "marksman" | "fighter" | "tank" | "support";

function getArchetypeForRole(tags: string[], role: string): Archetype {
  const t = tags.map((s) => s.toLowerCase());
  switch (role) {
    case "top":
      if (t.includes("tank")) return "tank";
      return "fighter";
    case "jungle":
      if (t.includes("assassin")) return "assassin";
      if (t.includes("tank")) return "tank";
      return "fighter";
    case "mid":
      if (t.includes("assassin")) return "assassin";
      return "mage";
    case "bot":
      if (t.includes("marksman")) return "marksman";
      return "mage";
    case "support":
      if (t.includes("tank")) return "support";
      if (t.includes("mage")) return "mage";
      return "support";
    default:
      return "fighter";
  }
}

/* ── Template builds per archetype ──────────────────────────── */

const TEMPLATES: Record<Archetype, Omit<ChampionBuild, "champion_name">> = {
  mage: {
    role: "mid", patch: "16.5", sample_size: 32000,
    win_rate: 50.5, pick_rate: 6.2, ban_rate: 3.8,
    tier: "B", tier_rank: 25, tier_total: 53,
    items_start: [
      { id: 1056, name: "Doran's Ring" },
      { id: 2003, name: "Health Potion" },
    ],
    items_core: [
      { id: 6655, name: "Luden's Companion", winRate: 52.1, matches: 18000 },
      { id: 3157, name: "Zhonya's Hourglass", winRate: 53.4, matches: 15000 },
      { id: 3089, name: "Rabadon's Deathcap", winRate: 54.8, matches: 12000 },
    ],
    items_4th: [
      { id: 3135, name: "Void Staff", winRate: 55.2, matches: 6000 },
      { id: 3116, name: "Rylai's Crystal Scepter", winRate: 54.1, matches: 4500 },
    ],
    items_5th: [
      { id: 3116, name: "Rylai's Crystal Scepter", winRate: 57.1, matches: 2800 },
      { id: 3165, name: "Morellonomicon", winRate: 56.5, matches: 2200 },
      { id: 3102, name: "Banshee's Veil", winRate: 58.3, matches: 1100 },
    ],
    items_6th: [
      { id: 3102, name: "Banshee's Veil", winRate: 59.2, matches: 500 },
      { id: 4629, name: "Cosmic Drive", winRate: 58.1, matches: 400 },
      { id: 3135, name: "Void Staff", winRate: 57.5, matches: 350 },
    ],
    boots: { id: 3020, name: "Sorcerer's Shoes", winRate: 50.8, matches: 30000 },
    runes_primary: {
      tree: "Sorcery", treeId: 8200,
      keystone: { id: 8214, name: "Arcane Comet" },
      slots: [
        { id: 8226, name: "Manaflow Band" },
        { id: 8210, name: "Transcendence" },
        { id: 8236, name: "Gathering Storm" },
      ],
    },
    runes_secondary: {
      tree: "Domination", treeId: 8100,
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
      spells: [{ id: 4, name: "Flash" }, { id: 14, name: "Ignite" }],
      winRate: 51.2, matches: 28000,
    },
    skill_order: ["Q", "W", "E"],
    skill_path: [1, 2, 3, 1, 1, 4, 1, 2, 1, 2, 4, 2, 2, 3, 3, 4, 3, 3],
    counters: [],
  },

  assassin: {
    role: "mid", patch: "16.5", sample_size: 28000,
    win_rate: 50.1, pick_rate: 7.5, ban_rate: 9.2,
    tier: "A", tier_rank: 16, tier_total: 53,
    items_start: [
      { id: 1036, name: "Long Sword" },
      { id: 2003, name: "Health Potion" },
      { id: 2003, name: "Health Potion" },
      { id: 2003, name: "Health Potion" },
    ],
    items_core: [
      { id: 6693, name: "Prowler's Claw", winRate: 51.5, matches: 20000 },
      { id: 6676, name: "The Collector", winRate: 52.8, matches: 18000 },
      { id: 3814, name: "Edge of Night", winRate: 53.2, matches: 15000 },
    ],
    items_4th: [
      { id: 3036, name: "Lord Dominik's Regards", winRate: 55.1, matches: 6500 },
      { id: 3156, name: "Maw of Malmortius", winRate: 54.5, matches: 5200 },
    ],
    items_5th: [
      { id: 6333, name: "Death's Dance", winRate: 57.8, matches: 2800 },
      { id: 3026, name: "Guardian Angel", winRate: 56.9, matches: 2500 },
      { id: 3156, name: "Maw of Malmortius", winRate: 57.2, matches: 1200 },
    ],
    items_6th: [
      { id: 3026, name: "Guardian Angel", winRate: 59.1, matches: 500 },
      { id: 6333, name: "Death's Dance", winRate: 58.4, matches: 420 },
      { id: 3139, name: "Mercurial Scimitar", winRate: 57.0, matches: 300 },
    ],
    boots: { id: 3047, name: "Plated Steelcaps", winRate: 50.5, matches: 22000 },
    runes_primary: {
      tree: "Domination", treeId: 8100,
      keystone: { id: 8112, name: "Electrocute" },
      slots: [
        { id: 8143, name: "Sudden Impact" },
        { id: 8138, name: "Eyeball Collection" },
        { id: 8135, name: "Treasure Hunter" },
      ],
    },
    runes_secondary: {
      tree: "Precision", treeId: 8000,
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
      spells: [{ id: 4, name: "Flash" }, { id: 14, name: "Ignite" }],
      winRate: 50.8, matches: 24000,
    },
    skill_order: ["Q", "W", "E"],
    skill_path: [1, 2, 3, 1, 1, 4, 1, 2, 1, 2, 4, 2, 2, 3, 3, 4, 3, 3],
    counters: [],
  },

  marksman: {
    role: "bot", patch: "16.5", sample_size: 38000,
    win_rate: 50.8, pick_rate: 8.1, ban_rate: 4.5,
    tier: "A", tier_rank: 12, tier_total: 24,
    items_start: [
      { id: 1055, name: "Doran's Blade" },
      { id: 2003, name: "Health Potion" },
    ],
    items_core: [
      { id: 6672, name: "Kraken Slayer", winRate: 52.5, matches: 28000 },
      { id: 3085, name: "Runaan's Hurricane", winRate: 53.8, matches: 22000 },
      { id: 3031, name: "Infinity Edge", winRate: 55.1, matches: 18000 },
    ],
    items_4th: [
      { id: 3094, name: "Rapid Firecannon", winRate: 56.8, matches: 8000 },
      { id: 3072, name: "Bloodthirster", winRate: 55.9, matches: 6500 },
    ],
    items_5th: [
      { id: 3072, name: "Bloodthirster", winRate: 58.5, matches: 3200 },
      { id: 3036, name: "Lord Dominik's Regards", winRate: 57.8, matches: 2800 },
      { id: 3026, name: "Guardian Angel", winRate: 59.2, matches: 1500 },
    ],
    items_6th: [
      { id: 3036, name: "Lord Dominik's Regards", winRate: 60.1, matches: 600 },
      { id: 3026, name: "Guardian Angel", winRate: 59.5, matches: 480 },
      { id: 3139, name: "Mercurial Scimitar", winRate: 58.2, matches: 350 },
    ],
    boots: { id: 3006, name: "Berserker's Greaves", winRate: 51.2, matches: 35000 },
    runes_primary: {
      tree: "Precision", treeId: 8000,
      keystone: { id: 8008, name: "Lethal Tempo" },
      slots: [
        { id: 9111, name: "Triumph" },
        { id: 9104, name: "Legend: Alacrity" },
        { id: 8299, name: "Last Stand" },
      ],
    },
    runes_secondary: {
      tree: "Sorcery", treeId: 8200,
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
      spells: [{ id: 4, name: "Flash" }, { id: 7, name: "Heal" }],
      winRate: 51.5, matches: 32000,
    },
    skill_order: ["Q", "W", "E"],
    skill_path: [1, 2, 3, 1, 1, 4, 1, 2, 1, 2, 4, 2, 2, 3, 3, 4, 3, 3],
    counters: [],
  },

  fighter: {
    role: "top", patch: "16.5", sample_size: 30000,
    win_rate: 50.3, pick_rate: 5.8, ban_rate: 5.1,
    tier: "B", tier_rank: 20, tier_total: 48,
    items_start: [
      { id: 1055, name: "Doran's Blade" },
      { id: 2003, name: "Health Potion" },
    ],
    items_core: [
      { id: 6631, name: "Stridebreaker", winRate: 51.8, matches: 22000 },
      { id: 6333, name: "Death's Dance", winRate: 53.2, matches: 18000 },
      { id: 3053, name: "Sterak's Gage", winRate: 54.0, matches: 15000 },
    ],
    items_4th: [
      { id: 3742, name: "Dead Man's Plate", winRate: 55.5, matches: 6000 },
      { id: 3143, name: "Randuin's Omen", winRate: 54.8, matches: 4800 },
    ],
    items_5th: [
      { id: 3143, name: "Randuin's Omen", winRate: 57.2, matches: 2500 },
      { id: 3065, name: "Spirit Visage", winRate: 56.8, matches: 2200 },
      { id: 3075, name: "Thornmail", winRate: 57.8, matches: 1100 },
    ],
    items_6th: [
      { id: 3065, name: "Spirit Visage", winRate: 58.5, matches: 450 },
      { id: 3075, name: "Thornmail", winRate: 57.8, matches: 380 },
      { id: 3083, name: "Warmog's Armor", winRate: 56.9, matches: 300 },
    ],
    boots: { id: 3047, name: "Plated Steelcaps", winRate: 50.8, matches: 26000 },
    runes_primary: {
      tree: "Precision", treeId: 8000,
      keystone: { id: 8010, name: "Conqueror" },
      slots: [
        { id: 9111, name: "Triumph" },
        { id: 9105, name: "Legend: Tenacity" },
        { id: 8299, name: "Last Stand" },
      ],
    },
    runes_secondary: {
      tree: "Resolve", treeId: 8400,
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
      spells: [{ id: 4, name: "Flash" }, { id: 12, name: "Teleport" }],
      winRate: 50.5, matches: 26000,
    },
    skill_order: ["Q", "W", "E"],
    skill_path: [1, 2, 3, 1, 1, 4, 1, 2, 1, 2, 4, 2, 2, 3, 3, 4, 3, 3],
    counters: [],
  },

  tank: {
    role: "top", patch: "16.5", sample_size: 25000,
    win_rate: 51.0, pick_rate: 4.5, ban_rate: 3.2,
    tier: "B", tier_rank: 22, tier_total: 48,
    items_start: [
      { id: 1054, name: "Doran's Shield" },
      { id: 2003, name: "Health Potion" },
    ],
    items_core: [
      { id: 6664, name: "Hollow Radiance", winRate: 52.5, matches: 18000 },
      { id: 3143, name: "Randuin's Omen", winRate: 53.1, matches: 15000 },
      { id: 3075, name: "Thornmail", winRate: 53.8, matches: 12000 },
    ],
    items_4th: [
      { id: 3065, name: "Spirit Visage", winRate: 55.2, matches: 5500 },
      { id: 3083, name: "Warmog's Armor", winRate: 54.5, matches: 4200 },
    ],
    items_5th: [
      { id: 3083, name: "Warmog's Armor", winRate: 57.1, matches: 2200 },
      { id: 3110, name: "Frozen Heart", winRate: 56.5, matches: 1800 },
      { id: 3742, name: "Dead Man's Plate", winRate: 57.8, matches: 900 },
    ],
    items_6th: [
      { id: 3742, name: "Dead Man's Plate", winRate: 58.5, matches: 400 },
      { id: 3110, name: "Frozen Heart", winRate: 57.8, matches: 350 },
      { id: 3065, name: "Spirit Visage", winRate: 57.1, matches: 280 },
    ],
    boots: { id: 3047, name: "Plated Steelcaps", winRate: 51.5, matches: 22000 },
    runes_primary: {
      tree: "Resolve", treeId: 8400,
      keystone: { id: 8437, name: "Grasp of the Undying" },
      slots: [
        { id: 8446, name: "Demolish" },
        { id: 8444, name: "Second Wind" },
        { id: 8451, name: "Overgrowth" },
      ],
    },
    runes_secondary: {
      tree: "Precision", treeId: 8000,
      slots: [
        { id: 9111, name: "Triumph" },
        { id: 9105, name: "Legend: Tenacity" },
      ],
    },
    rune_shards: [
      { id: 5005, name: "Attack Speed" },
      { id: 5002, name: "Armor" },
      { id: 5001, name: "Health Scaling" },
    ],
    summoner_spells: {
      spells: [{ id: 4, name: "Flash" }, { id: 12, name: "Teleport" }],
      winRate: 51.8, matches: 20000,
    },
    skill_order: ["Q", "W", "E"],
    skill_path: [1, 2, 3, 1, 1, 4, 1, 2, 1, 2, 4, 2, 2, 3, 3, 4, 3, 3],
    counters: [],
  },

  support: {
    role: "support", patch: "16.5", sample_size: 22000,
    win_rate: 50.8, pick_rate: 5.2, ban_rate: 2.8,
    tier: "B", tier_rank: 18, tier_total: 36,
    items_start: [
      { id: 3850, name: "Spellthief's Edge" },
      { id: 2003, name: "Health Potion" },
    ],
    items_core: [
      { id: 3190, name: "Locket of the Iron Solari", winRate: 52.2, matches: 16000 },
      { id: 3109, name: "Knight's Vow", winRate: 53.1, matches: 14000 },
      { id: 3107, name: "Redemption", winRate: 53.8, matches: 11000 },
    ],
    items_4th: [
      { id: 3050, name: "Zeke's Convergence", winRate: 55.5, matches: 5000 },
      { id: 3222, name: "Mikael's Blessing", winRate: 54.8, matches: 3800 },
    ],
    items_5th: [
      { id: 3222, name: "Mikael's Blessing", winRate: 57.2, matches: 2000 },
      { id: 3110, name: "Frozen Heart", winRate: 56.5, matches: 1800 },
      { id: 3143, name: "Randuin's Omen", winRate: 57.8, matches: 800 },
    ],
    items_6th: [
      { id: 3110, name: "Frozen Heart", winRate: 58.5, matches: 350 },
      { id: 3143, name: "Randuin's Omen", winRate: 57.8, matches: 300 },
      { id: 3075, name: "Thornmail", winRate: 57.1, matches: 250 },
    ],
    boots: { id: 3009, name: "Boots of Swiftness", winRate: 51.2, matches: 18000 },
    runes_primary: {
      tree: "Resolve", treeId: 8400,
      keystone: { id: 8439, name: "Aftershock" },
      slots: [
        { id: 8446, name: "Demolish" },
        { id: 8444, name: "Second Wind" },
        { id: 8451, name: "Overgrowth" },
      ],
    },
    runes_secondary: {
      tree: "Inspiration", treeId: 8300,
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
      spells: [{ id: 4, name: "Flash" }, { id: 14, name: "Ignite" }],
      winRate: 51.5, matches: 18000,
    },
    skill_order: ["Q", "W", "E"],
    skill_path: [1, 2, 3, 1, 1, 4, 1, 2, 1, 2, 4, 2, 2, 3, 3, 4, 3, 3],
    counters: [],
  },
};

/* ── Build generation helpers ───────────────────────────────── */

function generateForArchetype(name: string, archetype: Archetype): ChampionBuild {
  return { ...TEMPLATES[archetype], champion_name: name };
}

function enrichCounters(build: ChampionBuild, champName: string): ChampionBuild {
  if (!build.counters?.length) return build;
  const needsEnrichment = build.counters.some((c) => !c.tip || !c.powerSpikes);
  if (!needsEnrichment) return build;
  return {
    ...build,
    counters: build.counters.map((c) => {
      if (c.tip && c.powerSpikes && c.difficulty) return c;
      const { tip, powerSpikes } = generateMatchupTip(champName, c.name);
      return {
        ...c,
        tip: c.tip ?? tip,
        powerSpikes: c.powerSpikes ?? powerSpikes,
        difficulty: c.difficulty ?? (c.winRate < 47 ? "hard" as const : c.winRate < 49 ? "medium" as const : "easy" as const),
      };
    }),
  };
}

const ROLE_SUMMONERS: Record<string, { spells: { id: number; name: string }[] }> = {
  top: { spells: [{ id: 4, name: "Flash" }, { id: 12, name: "Teleport" }] },
  jungle: { spells: [{ id: 4, name: "Flash" }, { id: 11, name: "Smite" }] },
  mid: { spells: [{ id: 4, name: "Flash" }, { id: 14, name: "Ignite" }] },
  bot: { spells: [{ id: 4, name: "Flash" }, { id: 7, name: "Heal" }] },
  support: { spells: [{ id: 4, name: "Flash" }, { id: 14, name: "Ignite" }] },
};

const ROLE_START_ITEMS: Record<string, { id: number; name: string }[] | null> = {
  jungle: [{ id: 1103, name: "Gustwalker Hatchling" }],
  support: [{ id: 3850, name: "Spellthief's Edge" }, { id: 2003, name: "Health Potion" }],
  top: null,
  mid: null,
  bot: null,
};

function adaptBuildForRole(build: ChampionBuild, role: string, tier: RoleTier, tags: string[] = []): ChampionBuild {
  const adapted = { ...build, role };

  const roleSumms = ROLE_SUMMONERS[role];
  if (roleSumms) {
    adapted.summoner_spells = {
      ...adapted.summoner_spells,
      spells: roleSumms.spells,
    };
  }

  const startOverride = ROLE_START_ITEMS[role];
  if (startOverride) {
    adapted.items_start = startOverride;
  }

  if (tier === "secondary") {
    adapted.pick_rate = Math.round(Math.max(1.0, adapted.pick_rate * 0.3) * 10) / 10;
    adapted.sample_size = Math.floor(adapted.sample_size * 0.15);
    adapted.win_rate = Math.round((adapted.win_rate - 1.2) * 10) / 10;
    adapted.ban_rate = Math.round(Math.max(0.5, adapted.ban_rate * 0.4) * 10) / 10;
    adapted.tier = "B";
  } else if (tier === "offmeta") {
    adapted.pick_rate = Math.round((0.1 + Math.random() * 0.5) * 10) / 10;
    adapted.sample_size = Math.floor(100 + Math.random() * 600);
    adapted.win_rate = Math.round((44 + Math.random() * 8) * 10) / 10;
    adapted.ban_rate = 0;
    adapted.tier = "D";
  }

  if (!adapted.counters?.length) {
    adapted.counters = generateCounters(adapted.champion_name, tags, role);
  } else {
    adapted.counters = adapted.counters.map((c) => {
      if (c.tip && c.powerSpikes) return c;
      const { tip, powerSpikes } = generateMatchupTip(adapted.champion_name, c.name);
      return {
        ...c,
        tip: c.tip ?? tip,
        powerSpikes: c.powerSpikes ?? powerSpikes,
        difficulty: c.difficulty ?? (c.winRate < 47 ? "hard" as const : c.winRate < 49 ? "medium" as const : "easy" as const),
      };
    });
  }

  return adapted;
}

/* ── Generated matchup data with champion-specific tips ──────── */

type CounterEntry = {
  name: string; winRate: number; matches: number;
  tip?: string; powerSpikes?: string; difficulty?: "easy" | "medium" | "hard";
};

type ChampMechanics = {
  keyAbility: string;
  keyAbilitySlot: string;
  dodgeTip: string;
  weakness: string;
  powerSpike: string;
  itemSpike: string;
  engageTool?: string;
  defTool?: string;
};

const CHAMP_MECHANICS: Record<string, ChampMechanics> = {
  Aatrox: { keyAbility: "The Darkin Blade (Q)", keyAbilitySlot: "Q", dodgeTip: "sidestep his Q sweetspots by moving toward him instead of away", weakness: "weak when Q and E are on cooldown — punish between combos", powerSpike: "Level 6 with Goredrinker", itemSpike: "Eclipse / Goredrinker", engageTool: "W pull", defTool: "E dash" },
  Ahri: { keyAbility: "Charm (E)", keyAbilitySlot: "E", dodgeTip: "stay behind minions to block her Charm", weakness: "very low kill pressure when Charm is on cooldown", powerSpike: "Level 6 with 3 ult dashes", itemSpike: "Lost Chapter / Luden's", engageTool: "Charm + R dash", defTool: "Spirit Rush (R)" },
  Akali: { keyAbility: "Shuriken Flip (E)", keyAbilitySlot: "E", dodgeTip: "sidestep her E shuriken — if it misses she can't follow up", weakness: "vulnerable between shroud cooldowns, no sustained trading without energy", powerSpike: "Level 6 all-in with R execute", itemSpike: "Hextech Rocketbelt", engageTool: "E dash-in + R", defTool: "W Shroud stealth" },
  Akshan: { keyAbility: "Heroic Swing (E)", keyAbilitySlot: "E", dodgeTip: "stand away from walls so his E swing covers less distance", weakness: "no escape if he uses E aggressively — punish him when it's down", powerSpike: "Level 3 with all abilities", itemSpike: "Kraken Slayer", engageTool: "E swing", defTool: "W stealth camouflage" },
  Alistar: { keyAbility: "Headbutt-Pulverize (W+Q)", keyAbilitySlot: "W+Q", dodgeTip: "stay far back or behind minions — his W+Q combo has a clear engage range", weakness: "useless when W+Q combo is on cooldown, no poke or sustain pressure", powerSpike: "Level 2 W+Q combo", itemSpike: "Locket / Mobility Boots", engageTool: "W+Q knockup", defTool: "R cleanse + DR" },
  Amumu: { keyAbility: "Bandage Toss (Q)", keyAbilitySlot: "Q", dodgeTip: "sidestep his Q skillshot — without it he can't engage", weakness: "immobile and useless if both Q charges are down", powerSpike: "Level 6 team ult", itemSpike: "Sunfire Aegis", engageTool: "Q + R", defTool: "R AoE stun" },
  Anivia: { keyAbility: "Flash Frost (Q)", keyAbilitySlot: "Q", dodgeTip: "dodge the Q stun — her full combo requires it to land", weakness: "extremely slow and immobile, vulnerable to ganks without wall", powerSpike: "Level 6 with R waveclear", itemSpike: "Tear + Lost Chapter", engageTool: "Q stun + W wall", defTool: "W wall + passive egg" },
  Annie: { keyAbility: "Summon: Tibbers (R)", keyAbilitySlot: "R", dodgeTip: "watch her passive stun stacks — back off when she has 3-4 stacks", weakness: "short range and immobile, kitable after using stun", powerSpike: "Level 6 with Tibbers + stun", itemSpike: "Lost Chapter", engageTool: "Flash + R stun", defTool: "E shield" },
  Aphelios: { keyAbility: "Weapon Rotation", keyAbilitySlot: "Passive", dodgeTip: "track his current weapon — red gun (Severum) gives sustain, purple (Gravitum) roots", weakness: "very immobile and reliant on support peel", powerSpike: "Level 6 with Infernum R", itemSpike: "Kraken + Runaan's", engageTool: "Gravitum root", defTool: "Severum sustain" },
  Ashe: { keyAbility: "Enchanted Crystal Arrow (R)", keyAbilitySlot: "R", dodgeTip: "sidestep her R arrow — the stun duration scales with distance", weakness: "no mobility, extremely easy to dive and burst", powerSpike: "Level 6 global stun", itemSpike: "Kraken Slayer", engageTool: "R global stun", defTool: "W slow" },
  AurelionSol: { keyAbility: "Breath of Light (Q)", keyAbilitySlot: "Q", dodgeTip: "get on top of him — he struggles in melee range", weakness: "extremely vulnerable to gap-closers and assassins in melee range", powerSpike: "Level 6 with E knockback", itemSpike: "Rod of Ages + Rylai's", engageTool: "E knockback", defTool: "E knockback" },
  Aurora: { keyAbility: "Across the Veil (R)", keyAbilitySlot: "R", dodgeTip: "flash or dash out of her R boundary immediately", weakness: "squishy and predictable engage pattern with R", powerSpike: "Level 6 with R zone", itemSpike: "Stormsurge / Luden's", engageTool: "R zone + Q", defTool: "E spirit form" },
  Azir: { keyAbility: "Conquering Sands (Q)", keyAbilitySlot: "Q", dodgeTip: "play around his soldier placement — fight where his soldiers aren't", weakness: "weak early levels without soldiers positioned, high mana costs", powerSpike: "Level 9 with maxed Q + Nashor's", itemSpike: "Nashor's Tooth", engageTool: "R Emperor's Divide", defTool: "E dash to soldiers" },
  Bard: { keyAbility: "Cosmic Binding (Q)", keyAbilitySlot: "Q", dodgeTip: "don't stand near walls or minions — his Q stuns if it hits a second target", weakness: "roams leave his ADC vulnerable — punish the 1v2", powerSpike: "Level 1-3 with Meeps + Electrocute", itemSpike: "Mobility Boots", engageTool: "Q stun + R", defTool: "E tunnel + R stasis" },
  BelVeth: { keyAbility: "Above and Below (Q)", keyAbilitySlot: "Q", dodgeTip: "kite her when all 4 Q dashes are used — she can't dash the same direction twice", weakness: "vulnerable to CC chains and burst before she gets resets", powerSpike: "Level 6 with Void Coral form", itemSpike: "Blade of the Ruined King", engageTool: "Q dashes + W", defTool: "E damage reduction" },
  Blitzcrank: { keyAbility: "Rocket Grab (Q)", keyAbilitySlot: "Q", dodgeTip: "stay behind minions at all times — his Q can't pass through them", weakness: "completely useless when Q is on cooldown (20s early), play aggressive", powerSpike: "Level 2 Q+E combo", itemSpike: "Mobility Boots", engageTool: "Q hook", defTool: "W speed boost" },
  Brand: { keyAbility: "Sear (Q) stun", keyAbilitySlot: "Q", dodgeTip: "dodge his W first — he needs an ability to land before Q stuns", weakness: "immobile and squishy, all-in him when W misses", powerSpike: "Level 3 full combo", itemSpike: "Liandry's Anguish", engageTool: "W+Q stun", defTool: "none" },
  Braum: { keyAbility: "Concussive Blows (Passive)", keyAbilitySlot: "Passive", dodgeTip: "disengage after 1-2 hits — don't let his passive stack to 4 for the stun", weakness: "weak when E shield is on cooldown, can only block one direction", powerSpike: "Level 2-3 with ADC follow-up", itemSpike: "Locket", engageTool: "Q slow + passive", defTool: "E Unbreakable shield" },
  Briar: { keyAbility: "Blood Frenzy (W)", keyAbilitySlot: "W", dodgeTip: "use CC when she W's — she can't stop attacking and takes more damage", weakness: "W frenzy makes her predictable and she can't disengage", powerSpike: "Level 6 with R engage", itemSpike: "Blade of the Ruined King", engageTool: "R long-range", defTool: "E self-heal" },
  Caitlyn: { keyAbility: "Yordle Snap Trap (W)", keyAbilitySlot: "W", dodgeTip: "watch for traps under your feet during fights — don't walk into them", weakness: "weak mid-game before 3 items, punish in the mid-game dip", powerSpike: "Levels 1-3 poke | Late game 3+ items", itemSpike: "Infinity Edge", engageTool: "W trap + E net", defTool: "E 90 Caliber Net" },
  Camille: { keyAbility: "Hookshot (E)", keyAbilitySlot: "E", dodgeTip: "stay away from walls — her E stuns if she dashes off a wall to you", weakness: "no trade potential when E is on cooldown (16s early)", powerSpike: "Level 6 lockdown", itemSpike: "Trinity Force", engageTool: "E wall dash + R", defTool: "R lockdown" },
  Cassiopeia: { keyAbility: "Petrifying Gaze (R)", keyAbilitySlot: "R", dodgeTip: "turn away when she ults — facing her R stuns, facing away only slows", weakness: "no mobility, vulnerable to ganks and all-ins from behind", powerSpike: "Level 1-2 poison DPS", itemSpike: "Tear + Seraph's", engageTool: "R stun", defTool: "W Miasma ground" },
  ChoGath: { keyAbility: "Rupture (Q)", keyAbilitySlot: "Q", dodgeTip: "watch for the ground indicator and sidestep — his Q has a clear delay", weakness: "immobile and kitable, can be poked down without engaging", powerSpike: "Level 6 with R feast execute", itemSpike: "Rod of Ages / Heartsteel", engageTool: "Q knockup + W silence", defTool: "R stacking HP" },
  Corki: { keyAbility: "Missile Barrage (R)", keyAbilitySlot: "R", dodgeTip: "dodge the Big One (every 3rd rocket) — it deals much more damage", weakness: "weak before first item and Package timer", powerSpike: "Level 6 poke + Package roams", itemSpike: "Trinity Force / Manamune", engageTool: "W Package", defTool: "W Valkyrie" },
  Darius: { keyAbility: "Decimate (Q)", keyAbilitySlot: "Q", dodgeTip: "walk INTO his Q blade range — standing in the handle deals less and denies his heal", weakness: "easily kited with no gap closer, useless if he can't stack passive", powerSpike: "Level 1-3 all-in with passive 5 stacks", itemSpike: "Trinity Force / Stridebreaker", engageTool: "E pull", defTool: "Q heal on blade" },
  Diana: { keyAbility: "Crescent Strike (Q)", keyAbilitySlot: "Q", dodgeTip: "dodge her Q arc — she can only dash with E if Q's moonlight debuff is on you", weakness: "no escape if she uses E aggressively, weak pre-6", powerSpike: "Level 6 teamfight R + E combo", itemSpike: "Hextech Rocketbelt", engageTool: "Q mark + E dash", defTool: "W shield orbs" },
  DrMundo: { keyAbility: "Infected Bonesaw (Q)", keyAbilitySlot: "Q", dodgeTip: "sidestep his Q cleavers — they slow and deal %HP damage", weakness: "buy Grievous Wounds early to cut his R healing in half", powerSpike: "Level 6 with R sustain", itemSpike: "Heartsteel + Warmog's", engageTool: "Q slow", defTool: "R massive regen + passive CC immune" },
  Draven: { keyAbility: "Spinning Axe (Q)", keyAbilitySlot: "Q", dodgeTip: "watch where his axes land — step on the landing spot to force him to choose between the axe and trading", weakness: "falls off hard if he doesn't get kills early, play safe and outscale", powerSpike: "Level 1-2 with double axes", itemSpike: "BF Sword / Infinity Edge", engageTool: "E knockback + W speed", defTool: "W Blood Rush speed" },
  Ekko: { keyAbility: "Chronobreak (R)", keyAbilitySlot: "R", dodgeTip: "track his R ghost clone — don't group near where it will land", weakness: "much weaker when R is on cooldown, force fights then", powerSpike: "Level 6 with R safety net", itemSpike: "Hextech Rocketbelt", engageTool: "E blink + passive proc", defTool: "R rewind + heal" },
  Elise: { keyAbility: "Cocoon (E human)", keyAbilitySlot: "E", dodgeTip: "dodge her human form E stun — it's a thin skillshot and her only CC", weakness: "falls off hard late game, you outscale by playing safe", powerSpike: "Level 3 gank with Cocoon", itemSpike: "Sorcerer's Shoes + Shadowflame", engageTool: "E stun + Rappel", defTool: "E Rappel (untargetable)" },
  Evelynn: { keyAbility: "Allure (W)", keyAbilitySlot: "W", dodgeTip: "when you see the charm heart above you, she's about to engage — back up immediately", weakness: "very weak pre-6 without stealth, invade her early", powerSpike: "Level 6 with stealth camouflage", itemSpike: "Hextech Rocketbelt", engageTool: "W charm + E", defTool: "R execute + untargetable" },
  Ezreal: { keyAbility: "Mystic Shot (Q)", keyAbilitySlot: "Q", dodgeTip: "stand behind minions to block his Q poke — it doesn't pass through targets", weakness: "short range for an ADC, weak in all-ins vs engage supports", powerSpike: "Level 2 Q+E poke", itemSpike: "Manamune + Trinity Force", engageTool: "W+Q burst", defTool: "E Arcane Shift blink" },
  Fiddlesticks: { keyAbility: "Crowstorm (R)", keyAbilitySlot: "R", dodgeTip: "ward jungle flanks and unwarded bushes — his R channel starts from fog of war", weakness: "extremely squishy and useless if his R is interrupted or he ults without surprise", powerSpike: "Level 6 with Crowstorm", itemSpike: "Zhonya's Hourglass", engageTool: "R channel from bush", defTool: "Q fear + W drain" },
  Fiora: { keyAbility: "Riposte (W)", keyAbilitySlot: "W", dodgeTip: "bait out her W parry before using your important CC — she blocks it and stuns you", weakness: "W has a 24s cooldown early — trade aggressively when it's down", powerSpike: "Level 1-2 vitals + Level 6 ult", itemSpike: "Ravenous Hydra", engageTool: "Q lunge to vitals", defTool: "W Riposte parry" },
  Fizz: { keyAbility: "Playful/Trickster (E)", keyAbilitySlot: "E", dodgeTip: "don't use your key abilities until after his E hop — he becomes untargetable", weakness: "weak levels 1-2, bully him before he gets E at level 3", powerSpike: "Level 3 with E | Level 6 shark ult", itemSpike: "Hextech Rocketbelt", engageTool: "Q dash + R shark", defTool: "E untargetable hop" },
  Galio: { keyAbility: "Shield of Durand (W)", keyAbilitySlot: "W", dodgeTip: "don't stand in his W taunt range — disengage when you see him charging it", weakness: "long cooldowns and poor sustained damage without combo", powerSpike: "Level 6 with R global follow-up", itemSpike: "Hextech Rocketbelt", engageTool: "W taunt + E dash", defTool: "R global shield + entry" },
  Gangplank: { keyAbility: "Powder Keg (E)", keyAbilitySlot: "E", dodgeTip: "auto-attack his barrels to defuse them before he chains them", weakness: "very weak without barrels, melee and immobile in fights", powerSpike: "Level 13 with maxed barrels | 3 items", itemSpike: "Sheen + Trinity Force", engageTool: "Barrel chain + R slow", defTool: "W cleanse + heal" },
  Garen: { keyAbility: "Decisive Strike (Q)", keyAbilitySlot: "Q", dodgeTip: "kite when he runs at you with Q — the silence prevents you from casting", weakness: "easily kitable with no gap closer, useless against ranged poke", powerSpike: "Level 6 with R execute", itemSpike: "Berserker's + Stridebreaker", engageTool: "Q silence + E spin", defTool: "W damage reduction" },
  Gnar: { keyAbility: "GNAR! (R mega form)", keyAbilitySlot: "R", dodgeTip: "track his rage bar — back off when he's about to transform to Mega Gnar", weakness: "Mini Gnar is squishy and has no CC, all-in him in mini form", powerSpike: "Level 6 Mega Gnar R near walls", itemSpike: "Trinity Force / Black Cleaver", engageTool: "Mega R + W stun", defTool: "Mini E hop" },
  Gragas: { keyAbility: "Explosive Cask (R)", keyAbilitySlot: "R", dodgeTip: "his R knocks you away — don't stand between him and his team during fights", weakness: "long cooldowns between combos, punish in the windows", powerSpike: "Level 6 with R displacement", itemSpike: "Hextech Rocketbelt", engageTool: "E body slam + R", defTool: "W damage reduction" },
  Graves: { keyAbility: "End of the Line (Q)", keyAbilitySlot: "Q", dodgeTip: "don't fight him near walls — his Q bounces off walls for double damage", weakness: "can't attack through minions, his autos are blocked by frontline", powerSpike: "Level 3 jungle clear speed", itemSpike: "Eclipse", engageTool: "E dash + R", defTool: "E dash + armor" },
  Gwen: { keyAbility: "Hallowed Mist (W)", keyAbilitySlot: "W", dodgeTip: "don't waste ranged abilities when she's in her W mist — they won't hit", weakness: "weak early levels 1-3, bully before she gets Q stacks", powerSpike: "Level 6 with R + Q combo", itemSpike: "Riftmaker / Nashor's", engageTool: "E dash + Q", defTool: "W mist untargetable zone" },
  Hecarim: { keyAbility: "Onslaught of Shadows (R)", keyAbilitySlot: "R", dodgeTip: "don't clump — his R fears in an area and his E charges through your team", weakness: "squishy when he goes damage, CC him during his E charge", powerSpike: "Level 6 with R engage", itemSpike: "Trinity Force", engageTool: "R fear + E charge", defTool: "E movespeed" },
  Heimerdinger: { keyAbility: "H-28G Evolution Turret (Q)", keyAbilitySlot: "Q", dodgeTip: "kill his turrets before fighting him — he's weak without them", weakness: "extremely immobile, gank him and burst his turrets first", powerSpike: "Level 3 with 3 turrets placed", itemSpike: "Zhonya's Hourglass", engageTool: "E stun grenade", defTool: "Q turret zone" },
  Hwei: { keyAbility: "Subject: Disaster (QQ)", keyAbilitySlot: "QQ", dodgeTip: "sidestep his QQ (the fireball combo) — it's his main poke and waveclear", weakness: "immobile and squishy, vulnerable to gap-closers", powerSpike: "Level 6 with R fear zone", itemSpike: "Luden's / Blackfire Torch", engageTool: "R fear zone", defTool: "EW shield + speed" },
  Illaoi: { keyAbility: "Test of Spirit (E)", keyAbilitySlot: "E", dodgeTip: "dodge her E soul pull at all costs — if she pulls your spirit, walk away immediately", weakness: "completely useless when E misses, has 0 chase or mobility", powerSpike: "Level 6 with R + tentacle slams", itemSpike: "Black Cleaver / Sterak's", engageTool: "E spirit pull", defTool: "R tentacle spawns + heal" },
  Irelia: { keyAbility: "Bladesurge (Q)", keyAbilitySlot: "Q", dodgeTip: "stay away from low-HP minions — she resets Q on kills and uses them to gap-close to you", weakness: "if she misses E stun or wastes Q with no reset, she's stuck with no escape", powerSpike: "Level 4-5 with 4 passive stacks", itemSpike: "Blade of the Ruined King", engageTool: "E stun + Q resets", defTool: "W damage reduction" },
  Ivern: { keyAbility: "Rootcaller (Q)", keyAbilitySlot: "Q", dodgeTip: "sidestep his Q root — allies can dash to his Q target", weakness: "no damage, focus the carries he's protecting instead", powerSpike: "Level 6 with Daisy", itemSpike: "Shurelya's / Redemption", engageTool: "Q root + Daisy", defTool: "E shield + slow" },
  Janna: { keyAbility: "Howling Gale (Q)", keyAbilitySlot: "Q", dodgeTip: "engage on the ADC — Janna's peel is weaker against sustained pressure than burst", weakness: "squishy and no damage, aggressive all-ins overwhelm her shields", powerSpike: "Level 2 with W poke", itemSpike: "Shurelya's / Staff of Flowing Water", engageTool: "Q tornado", defTool: "R Monsoon heal + knockback" },
  JarvanIV: { keyAbility: "Cataclysm (R)", keyAbilitySlot: "R", dodgeTip: "save a dash or flash for his R arena — you need to escape the ring", weakness: "if he misses E+Q combo, he has no engage for 12 seconds", powerSpike: "Level 2 E+Q combo gank", itemSpike: "Eclipse / Goredrinker", engageTool: "E+Q combo + R", defTool: "E+Q escape" },
  Jax: { keyAbility: "Counter Strike (E)", keyAbilitySlot: "E", dodgeTip: "don't auto-attack him during his E spin — it dodges autos and stuns after", weakness: "weak levels 1-5, bully before he gets his R passive", powerSpike: "Level 6 with R resistances | 2 items", itemSpike: "Trinity Force + BotRK", engageTool: "Q leap + E stun", defTool: "E dodge + R resist" },
  Jayce: { keyAbility: "Shock Blast (Q through gate)", keyAbilitySlot: "Q+E", dodgeTip: "dodge his accelerated Q through gate — it's his main poke and has long cooldown", weakness: "weak in melee form early, punish when he swaps to hammer", powerSpike: "Level 1-3 ranged poke", itemSpike: "Manamune + Eclipse", engageTool: "Ranged Q+E poke", defTool: "Hammer E knockback" },
  Jhin: { keyAbility: "Curtain Call (R)", keyAbilitySlot: "R", dodgeTip: "sidestep his R shots — they narrow in a cone and the 4th shot crits", weakness: "immobile with fixed attack speed, easy to dive during reload", powerSpike: "Level 1-2 with 4th shot", itemSpike: "Infinity Edge", engageTool: "W snare + R", defTool: "E traps + W range" },
  Jinx: { keyAbility: "Super Mega Death Rocket! (R)", keyAbilitySlot: "R", dodgeTip: "don't stay low HP — her R is a global execute that gets stronger the lower you are", weakness: "no mobility or escape, dive her and she dies", powerSpike: "Level 1 with Fishbones range", itemSpike: "Kraken + Runaan's", engageTool: "E traps + W slow", defTool: "passive reset speed" },
  KSante: { keyAbility: "All Out (R)", keyAbilitySlot: "R", dodgeTip: "he trades tankiness for damage in R — burst him fast during All Out", weakness: "much squishier during R form, focus him when he ults", powerSpike: "Level 6 with R mode switch", itemSpike: "Iceborn Gauntlet", engageTool: "W+R wall slam", defTool: "E dash + shield" },
  KaiSa: { keyAbility: "Killer Instinct (R)", keyAbilitySlot: "R", dodgeTip: "her R dashes to anyone with Passive plasma — don't get hit by W or allies' CC", weakness: "very short range for an ADC, vulnerable before R evolves", powerSpike: "Q evolve at 100 AD", itemSpike: "Kraken + Nashor's", engageTool: "R dive + passive burst", defTool: "E stealth + speed" },
  Kalista: { keyAbility: "Rend (E)", keyAbilitySlot: "E", dodgeTip: "she out-DPSes most ADCs in extended fights — keep trades short", weakness: "useless if she gets slowed, buy Frozen Heart or slows", powerSpike: "Level 2 with support binding", itemSpike: "Blade of the Ruined King", engageTool: "R throw support", defTool: "Passive hops" },
  Karma: { keyAbility: "Inner Flame (Q)", keyAbilitySlot: "Q", dodgeTip: "dodge her empowered R+Q — it does massive AoE damage and slows", weakness: "R empowerment has a long cooldown early, trade after she uses it", powerSpike: "Level 1-2 R+Q poke", itemSpike: "Shurelya's / Mandate", engageTool: "W root + R+Q", defTool: "E shield + speed" },
  Karthus: { keyAbility: "Requiem (R)", keyAbilitySlot: "R", dodgeTip: "buy Zhonya's or Banshee's — his R is unavoidable global damage, you need to negate it", weakness: "immobile and squishy, dive him and kill him before he can DPS in passive", powerSpike: "Level 6 global R | 3 items", itemSpike: "Liandry's / Shadowflame", engageTool: "R global damage", defTool: "Passive: keeps casting for 7s after death" },
  Kassadin: { keyAbility: "Riftwalk (R)", keyAbilitySlot: "R", dodgeTip: "punish him hard pre-6 — he's a melee with no gap closer until level 6", weakness: "extremely weak early, one of the weakest laners levels 1-5", powerSpike: "Level 6 R mobility | Level 16", itemSpike: "Rod of Ages + Seraph's", engageTool: "R blink + E slow", defTool: "R blink escape" },
  Katarina: { keyAbility: "Shunpo (E)", keyAbilitySlot: "E", dodgeTip: "step on her daggers before she can E to them — it denies her burst damage", weakness: "if you CC her during R channel, she deals no damage", powerSpike: "Level 3 with all abilities | Level 6 R", itemSpike: "Hextech Rocketbelt / Nashor's", engageTool: "E to daggers + R", defTool: "E blink to daggers/allies" },
  Kayle: { keyAbility: "Divine Judgment (R)", keyAbilitySlot: "R", dodgeTip: "all-in before level 6 — she's one of the weakest early laners in the game", weakness: "melee and useless levels 1-5, freeze and zone her off CS", powerSpike: "Level 6 ranged | Level 11 waves | Level 16", itemSpike: "Nashor's Tooth", engageTool: "W speed + ranged autos", defTool: "R invulnerability" },
  Kayn: { keyAbility: "Shadow Step (E)", keyAbilitySlot: "E", dodgeTip: "ward your jungle walls — he ganks through terrain with E", weakness: "weak in base form pre-transformation, fight him early", powerSpike: "Form transformation (Red or Blue)", itemSpike: "Goredrinker (Red) / Prowler's (Blue)", engageTool: "W knockup (Rhaast) / W through walls (SA)", defTool: "R untargetable + heal" },
  Kennen: { keyAbility: "Slicing Maelstrom (R)", keyAbilitySlot: "R", dodgeTip: "don't group tightly — his R stuns everyone in a big AoE", weakness: "squishy and short-range, burst him before he gets R off", powerSpike: "Level 6 teamfight with R + Zhonya's", itemSpike: "Hextech Rocketbelt + Zhonya's", engageTool: "E speed + R + Zhonya's", defTool: "E Lightning Rush speed" },
  Khazix: { keyAbility: "Taste Their Fear (Q)", keyAbilitySlot: "Q", dodgeTip: "stand near allies or minions — his Q deals bonus damage to isolated targets", weakness: "much weaker when targets are not isolated", powerSpike: "Level 6 with evolved ability", itemSpike: "Prowler's Claw / Eclipse", engageTool: "E leap + passive slow", defTool: "R stealth" },
  Kindred: { keyAbility: "Lamb's Respite (R)", keyAbilitySlot: "R", dodgeTip: "her R makes everyone in the zone unkillable — don't waste big cooldowns inside it", weakness: "short range jungle marksman, CC and burst her before she ults", powerSpike: "Mark stacks (4, 7, 10)", itemSpike: "Kraken + Collector", engageTool: "W zone + Q dashes", defTool: "R unkillable zone" },
  Kled: { keyAbility: "Violent Tendencies (W)", keyAbilitySlot: "W", dodgeTip: "disengage when his W activates (fast auto attacks) — it's his main damage window", weakness: "if you dismount him from Skaarl, he's extremely fragile", powerSpike: "Level 2-3 all-in with W", itemSpike: "Sundered Sky", engageTool: "Q pull + R charge", defTool: "Skaarl remount" },
  KogMaw: { keyAbility: "Bio-Arcane Barrage (W)", keyAbilitySlot: "W", dodgeTip: "all-in when his W is on cooldown — his range and damage drop massively", weakness: "zero mobility, dive him and he dies instantly", powerSpike: "Level 9 with maxed W | 3 items", itemSpike: "Guinsoo's + BotRK", engageTool: "W range + R poke", defTool: "E slow puddle" },
  LeBlanc: { keyAbility: "Distortion (W)", keyAbilitySlot: "W", dodgeTip: "she returns to her W pad — stand on it and punish her when she snaps back", weakness: "if she uses W to waveclear, she has no escape for 18 seconds", powerSpike: "Level 3 W+Q+E combo", itemSpike: "Luden's", engageTool: "W dash + E chain", defTool: "W return / R return" },
  LeeSin: { keyAbility: "Sonic Wave (Q)", keyAbilitySlot: "Q", dodgeTip: "dodge his Q — he can't follow up with Q2 if Q1 misses", weakness: "falls off hard late game, outscale him by not dying early", powerSpike: "Level 3-6 ganks", itemSpike: "Eclipse / Goredrinker", engageTool: "Q hit + Q follow + R kick", defTool: "W safeguard to allies" },
  Leona: { keyAbility: "Shield of Daybreak (Q)", keyAbilitySlot: "Q", dodgeTip: "dodge her E zenith blade — if she can't reach you, she can't stun you", weakness: "useless when E misses, she has no way to engage without it", powerSpike: "Level 2 E+Q combo | Level 6 R", itemSpike: "Locket / Mobility Boots", engageTool: "E dash + Q stun + R", defTool: "W resist + shield" },
  Lillia: { keyAbility: "Swirlseed (E)", keyAbilitySlot: "E", dodgeTip: "dodge her E seed — it rolls across the map and applies her passive for R sleep", weakness: "squishy and needs to be in melee range to deal real damage", powerSpike: "Level 6 with R sleep combo", itemSpike: "Liandry's", engageTool: "R sleep on passive targets", defTool: "Passive movespeed" },
  Lissandra: { keyAbility: "Frozen Tomb (R)", keyAbilitySlot: "R", dodgeTip: "her R can self-cast (Zhonya's effect) or point-click stun you — spread out", weakness: "short range and low sustained damage, kite her outside her range", powerSpike: "Level 6 with R lockdown", itemSpike: "Luden's + Zhonya's", engageTool: "E claw + W root + R", defTool: "R self-cast + E escape" },
  Lucian: { keyAbility: "Relentless Pursuit (E)", keyAbilitySlot: "E", dodgeTip: "trade when his E dash is on cooldown — it's his only repositioning tool", weakness: "short range ADC, outranges him late game", powerSpike: "Level 2-3 with passive procs", itemSpike: "Essence Reaver + Navori", engageTool: "W + passive procs", defTool: "E dash" },
  Lulu: { keyAbility: "Whimsy (W)", keyAbilitySlot: "W", dodgeTip: "she'll polymorph your diver — bait her W before the real engage", weakness: "squishy and low damage alone, target her if separated from ADC", powerSpike: "Level 6 with R knockup + HP", itemSpike: "Shurelya's / Staff of Flowing Water", engageTool: "W polymorph", defTool: "R Wild Growth HP + knockup" },
  Lux: { keyAbility: "Light Binding (Q)", keyAbilitySlot: "Q", dodgeTip: "dodge her Q root — it binds 2 targets, don't stand behind your frontline", weakness: "immobile, all-in her when Q and E are on cooldown", powerSpike: "Level 6 with R laser", itemSpike: "Luden's", engageTool: "Q root + E + R", defTool: "W shield" },
  Malphite: { keyAbility: "Unstoppable Force (R)", keyAbilitySlot: "R", dodgeTip: "don't group tightly — his R knocks up everyone in a circle", weakness: "useless when R is on cooldown (130s at rank 1), fight without it", powerSpike: "Level 6 with R engage", itemSpike: "Iceborn Gauntlet / Shadowflame", engageTool: "R charge knockup", defTool: "W armor + shield" },
  Malzahar: { keyAbility: "Nether Grasp (R)", keyAbilitySlot: "R", dodgeTip: "buy QSS to cleanse his R suppression — it completely negates his kill combo", weakness: "no mobility, gank him pre-6 when he has no ult", powerSpike: "Level 6 with R suppression", itemSpike: "Liandry's + Rylai's", engageTool: "R suppression", defTool: "Passive spell shield" },
  Maokai: { keyAbility: "Nature's Grasp (R)", keyAbilitySlot: "R", dodgeTip: "dodge his R root wall — it's slow-moving and very telegraphed", weakness: "low damage, focus his carries instead of him in fights", powerSpike: "Level 3 ganks with root", itemSpike: "Radiant Virtue / Sunfire", engageTool: "W point-click dash + R wall", defTool: "Passive heal autos" },
  MasterYi: { keyAbility: "Alpha Strike (Q)", keyAbilitySlot: "Q", dodgeTip: "save your CC for after his Q ends — he's untargetable during Alpha Strike", weakness: "dies instantly to hard CC, chain stuns and he's dead", powerSpike: "Level 6 with Highlander", itemSpike: "Blade of the Ruined King + Guinsoo's", engageTool: "Q untargetable + R speed", defTool: "Q untargetable + W heal" },
  Mel: { keyAbility: "Starfire (W reflect)", keyAbilitySlot: "W", dodgeTip: "hold your burst until after her W reflect shield expires — hitting into it returns damage to you", weakness: "vulnerable when W shield is on cooldown, bait it then all-in", powerSpike: "Level 6 with R global", itemSpike: "Luden's / Malignance", engageTool: "Q + R global", defTool: "W reflect shield" },
  MissFortune: { keyAbility: "Bullet Time (R)", keyAbilitySlot: "R", dodgeTip: "don't stand in her R cone — CC her during the channel to cancel it", weakness: "immobile during R, any CC stops her ultimate immediately", powerSpike: "Level 6 with R channel | Level 1-3 Q poke", itemSpike: "Collector + Infinity Edge", engageTool: "E slow + R channel", defTool: "W movespeed" },
  Mordekaiser: { keyAbility: "Realm of Death (R)", keyAbilitySlot: "R", dodgeTip: "buy QSS to escape his R death realm — or stay out of his range", weakness: "completely kiteable, struggles against ranged champs who dodge Q", powerSpike: "Level 6 with R 1v1 realm", itemSpike: "Riftmaker", engageTool: "E pull + R 1v1 cage", defTool: "W shield + heal" },
  Morgana: { keyAbility: "Dark Binding (Q)", keyAbilitySlot: "Q", dodgeTip: "dodge her Q — it's a 3-second root that guarantees her full combo", weakness: "useless when Q misses (11s cooldown), play aggressive in the window", powerSpike: "Level 2 Q+W combo", itemSpike: "Zhonya's Hourglass", engageTool: "Q root + R", defTool: "E Black Shield (CC immune)" },
  Nami: { keyAbility: "Aqua Prison (Q)", keyAbilitySlot: "Q", dodgeTip: "sidestep her Q bubble — it's slow and predictable, dodge and punish", weakness: "squishy and immobile, burst her if she steps too far forward", powerSpike: "Level 1-2 W poke + E buff", itemSpike: "Shurelya's / Mandate", engageTool: "Q bubble + R wave", defTool: "W bounce heal" },
  Nasus: { keyAbility: "Siphoning Strike (Q)", keyAbilitySlot: "Q", dodgeTip: "freeze the wave and zone him off stacks — a Nasus without stacks is useless", weakness: "extremely weak levels 1-7, bully him relentlessly early", powerSpike: "Level 6 with R + 150+ stacks | 300+ stacks", itemSpike: "Trinity Force / Frozen Heart", engageTool: "W 95% slow + R", defTool: "R stat boost + Lifesteal Q" },
  Nautilus: { keyAbility: "Dredge Line (Q)", keyAbilitySlot: "Q", dodgeTip: "stay behind minions — his Q hook can't go through them", weakness: "immobile when Q is down, punish in the cooldown window", powerSpike: "Level 2-3 with Q+E+passive", itemSpike: "Locket / Dead Man's", engageTool: "Q hook + R lockdown", defTool: "W shield" },
  Neeko: { keyAbility: "Pop Blossom (R)", keyAbilitySlot: "R", dodgeTip: "she disguises as allies — watch for her walking toward you suspiciously as a 'minion' or ally", weakness: "immobile and squishy, burst her before she gets R off", powerSpike: "Level 6 with R + Zhonya's", itemSpike: "Hextech Rocketbelt + Zhonya's", engageTool: "Passive disguise + R", defTool: "W clone + invis" },
  Nidalee: { keyAbility: "Javelin Toss (Q human)", keyAbilitySlot: "Q", dodgeTip: "dodge her Q spear — it deals massive damage at max range", weakness: "useless in teamfights if she misses Q spear", powerSpike: "Level 3 jungle clear", itemSpike: "Night Harvester", engageTool: "Q spear + cougar combo", defTool: "Cougar W pounce" },
  Nilah: { keyAbility: "Jubilant Veil (W)", keyAbilitySlot: "W", dodgeTip: "don't use auto-attack reliant damage when she has W up — she dodges autos", weakness: "very short range, poke her from outside her range", powerSpike: "Level 6 with R pull + lifesteal", itemSpike: "Infinity Edge", engageTool: "E dash + R pull", defTool: "W auto dodge + mist" },
  Nocturne: { keyAbility: "Paranoia (R)", keyAbilitySlot: "R", dodgeTip: "when your screen goes dark, group with your team — he's looking to pick off someone alone", weakness: "useless when R is on cooldown (150s early), play aggressive", powerSpike: "Level 6 with R darkness dive", itemSpike: "Stridebreaker / Eclipse", engageTool: "R darkness + dash", defTool: "W spellshield" },
  Nunu: { keyAbility: "Biggest Snowball Ever! (W)", keyAbilitySlot: "W", dodgeTip: "sidestep or CC the snowball — it's very telegraphed", weakness: "low damage, ignore him and focus his carries", powerSpike: "Level 3 ganks with snowball", itemSpike: "Sunfire Aegis", engageTool: "W snowball + R channel", defTool: "Q monster consume heal" },
  Olaf: { keyAbility: "Ragnarok (R)", keyAbilitySlot: "R", dodgeTip: "his R makes him immune to CC — kite backwards and wait for it to expire", weakness: "once R ends he's slow and has no escape, turn on him", powerSpike: "Level 6 with R CC immunity", itemSpike: "Goredrinker / Stridebreaker", engageTool: "Q slow + R CC immune chase", defTool: "R CC immunity" },
  Orianna: { keyAbility: "Command: Shockwave (R)", keyAbilitySlot: "R", dodgeTip: "track her ball position — her R pulls everyone near the ball", weakness: "immobile, gap-close and all-in her when she mispositions the ball", powerSpike: "Level 6 with R | Teamfight with ball delivery", itemSpike: "Luden's + Rabadon's", engageTool: "E ball on ally + R shockwave", defTool: "E shield + W speed" },
  Ornn: { keyAbility: "Call of the Forge God (R)", keyAbilitySlot: "R", dodgeTip: "sidestep the R ram — he sends it out then knocks it back for a big knockup", weakness: "low damage solo, target his carries in fights", powerSpike: "Level 13+ with item upgrades for team", itemSpike: "Sunfire + team item upgrades", engageTool: "R ram + E knockup", defTool: "W brittle + shield" },
  Pantheon: { keyAbility: "Shield Vault (W)", keyAbilitySlot: "W", dodgeTip: "his W is a point-click stun — respect his range and all-in potential levels 2-5", weakness: "falls off hard after mid-game, outscale him by surviving lane", powerSpike: "Level 2-5 with W+Q", itemSpike: "Eclipse + Youmuu's", engageTool: "W stun + Q", defTool: "E Aegis Assault (invulnerable from front)" },
  Pyke: { keyAbility: "Death from Below (R)", keyAbilitySlot: "R", dodgeTip: "stay above his R execute threshold — his R resets on kill so one pick snowballs", weakness: "squishy assassin support, he can't build HP", powerSpike: "Level 6 with R execute gold sharing", itemSpike: "Umbral Glaive", engageTool: "Q hook + E stun + R", defTool: "W stealth + speed" },
  Qiyana: { keyAbility: "Supreme Display of Talent (R)", keyAbilitySlot: "R", dodgeTip: "don't fight near walls or river — her R stuns in a huge area near terrain", weakness: "weak when pushed under tower with no river/brush access for elements", powerSpike: "Level 3 with all abilities", itemSpike: "Prowler's Claw / Eclipse", engageTool: "E dash + Q + R wall stun", defTool: "W element dash" },
  Quinn: { keyAbility: "Vault (E)", keyAbilitySlot: "E", dodgeTip: "her E knocks her back — engage after she uses it since it's her only escape", weakness: "squishy and short-ranged, all-in when E is on cooldown", powerSpike: "Level 1-3 with passive procs", itemSpike: "Collector + Youmuu's", engageTool: "E vault + passive proc", defTool: "E knockback + R roam speed" },
  Rakan: { keyAbility: "The Quickness (R)", keyAbilitySlot: "R", dodgeTip: "flash or dash away from his R — he charms everyone he touches during it", weakness: "squishy, if he engages without R he can be burst down quickly", powerSpike: "Level 6 with R+W combo", itemSpike: "Shurelya's", engageTool: "R charm + W knockup", defTool: "E dash to Xayah/ally" },
  Rammus: { keyAbility: "Defensive Ball Curl (W)", keyAbilitySlot: "W", dodgeTip: "don't auto-attack him during W — his thorns return damage to auto-attackers", weakness: "useless against AP and magic damage, switch to ability-based trades", powerSpike: "Level 3 ganks with Q speed", itemSpike: "Thornmail + Frozen Heart", engageTool: "Q speed + E taunt", defTool: "W reflect + resist" },
  RekSai: { keyAbility: "Void Rush (R)", keyAbilitySlot: "R", dodgeTip: "her R dashes to a target she hit with E — use Zhonya's or become untargetable", weakness: "predictable engage pattern, flash her knockup tunnel", powerSpike: "Level 3 ganks with tunnel", itemSpike: "Eclipse / Stridebreaker", engageTool: "E tunnel + unburrow knockup", defTool: "Burrowed tremor sense" },
  Rell: { keyAbility: "Ferromancy: Crash Down (W)", keyAbilitySlot: "W", dodgeTip: "dodge her W engage — she's slow as a snail after dismounting", weakness: "extremely slow in dismounted form, kite her", powerSpike: "Level 2-3 with W engage", itemSpike: "Locket / Knight's Vow", engageTool: "W slam + R pull", defTool: "W mount speed" },
  Renata: { keyAbility: "Hostile Takeover (R)", keyAbilitySlot: "R", dodgeTip: "her R makes you attack your own allies — flash sideways, don't run into your team", weakness: "immobile and squishy, easy to pick off with gap closers", powerSpike: "Level 6 with R teamfight", itemSpike: "Shurelya's", engageTool: "Q root + R berserk", defTool: "W bailout revive" },
  Renekton: { keyAbility: "Ruthless Predator (W)", keyAbilitySlot: "W", dodgeTip: "his empowered W with 50 fury stuns for 1.5s — back off when he has high fury", weakness: "falls off hard after 25 minutes, survive lane and outscale", powerSpike: "Level 3 with all abilities + fury", itemSpike: "Goredrinker / Sundered Sky", engageTool: "E dash + W stun", defTool: "R Dominus HP + fury" },
  Rengar: { keyAbility: "Unseen Predator (Passive)", keyAbilitySlot: "Passive", dodgeTip: "buy Control Wards — his R gives him stealth and he leaps from bushes", weakness: "weak in open areas with no bushes, don't fight in jungle", powerSpike: "Level 6 with R stealth assassin leap", itemSpike: "Prowler's Claw / Eclipse", engageTool: "R stealth + passive leap", defTool: "W heal + CC cleanse (empowered)" },
  Riven: { keyAbility: "Blade of the Exile (R)", keyAbilitySlot: "R", dodgeTip: "respect her all-in when R is glowing — her damage and range increase massively", weakness: "long cooldowns early (Q 13s), trade when her abilities are down", powerSpike: "Level 6 with R execute", itemSpike: "Eclipse + Black Cleaver", engageTool: "Q combo + E + W stun", defTool: "E shield dash" },
  Rumble: { keyAbility: "The Equalizer (R)", keyAbilitySlot: "R", dodgeTip: "walk out of his R fire trail immediately — it ticks massive damage", weakness: "no mobility, easy to gank and he overheats himself", powerSpike: "Level 6 with R zone", itemSpike: "Shadowflame / Liandry's", engageTool: "R fire trail + E slow", defTool: "W shield + speed" },
  Ryze: { keyAbility: "Rune Prison (W)", keyAbilitySlot: "W", dodgeTip: "stay outside his W range — it's a point-click root that combos into full burst", weakness: "short range, outranges him and he can't do anything", powerSpike: "Level 6 with R realm warp | 3 items", itemSpike: "Rod of Ages + Seraph's", engageTool: "W root + E+Q combo", defTool: "R Realm Warp escape" },
  Samira: { keyAbility: "Inferno Trigger (R)", keyAbilitySlot: "R", dodgeTip: "CC her during R — she needs to channel it, any hard CC cancels it", weakness: "needs to build Style rank to S before ulting, don't let her combo freely", powerSpike: "Level 6 with S-rank R", itemSpike: "Collector + Infinity Edge", engageTool: "E dash through enemy + R", defTool: "W Blade Whirl (blocks projectiles)" },
  Senna: { keyAbility: "Last Embrace (W)", keyAbilitySlot: "W", dodgeTip: "dodge her W root — it detonates after 1 second, sidestep when it lands", weakness: "very slow and immobile, easy to gap-close and burst", powerSpike: "Scaling passive souls (infinite range late)", itemSpike: "Eclipse / Umbral Glaive", engageTool: "W root + R global", defTool: "E stealth shroud" },
  Seraphine: { keyAbility: "Encore (R)", keyAbilitySlot: "R", dodgeTip: "don't stand behind allies — her R extends through champions it hits", weakness: "immobile and squishy, dive her and she dies instantly", powerSpike: "Level 6 with R teamfight", itemSpike: "Luden's / Shurelya's", engageTool: "R extending charm + E stun", defTool: "W shield + heal" },
  Sett: { keyAbility: "Haymaker (W)", keyAbilitySlot: "W", dodgeTip: "sidestep his W center (true damage zone) — only the middle deals true damage", weakness: "no escape, kite him and he can never reach you", powerSpike: "Level 1-3 with passive autos", itemSpike: "Stridebreaker / Goredrinker", engageTool: "E pull + R suplex", defTool: "W shield + true damage" },
  Shaco: { keyAbility: "Deceive (Q)", keyAbilitySlot: "Q", dodgeTip: "buy Control Wards — his Q stealth lets him get behind you for backstab damage", weakness: "extremely squishy, if you reveal him he dies instantly", powerSpike: "Level 3 ganks with stealth", itemSpike: "Prowler's / Liandry's (AP)", engageTool: "Q stealth + backstab", defTool: "R clone" },
  Shen: { keyAbility: "Stand United (R)", keyAbilitySlot: "R", dodgeTip: "interrupt his R channel with CC — he teleports to shield an ally globally", weakness: "low damage, focus on farming and you'll outscale in 1v1", powerSpike: "Level 6 with R global shield + TP", itemSpike: "Titanic Hydra", engageTool: "E taunt + R global", defTool: "W spirit blade zone (blocks autos)" },
  Shyvana: { keyAbility: "Dragon's Descent (R)", keyAbilitySlot: "R", dodgeTip: "dodge her R dash — she needs to be in dragon form for all her enhanced abilities", weakness: "weak without fury/dragon form, fight when R is down", powerSpike: "Level 6 with dragon form", itemSpike: "Nashor's Tooth (AP) / BotRK", engageTool: "R dash + E fireball", defTool: "W burnout speed" },
  Singed: { keyAbility: "Poison Trail (Q)", keyAbilitySlot: "Q", dodgeTip: "don't chase Singed — he wants you to run behind him through his poison trail", weakness: "useless if you just ignore him and don't chase", powerSpike: "Level 2 proxy farming | Level 6 R stats", itemSpike: "Rylai's + Demonic", engageTool: "W slow + E fling", defTool: "R stat boost + passive speed" },
  Sion: { keyAbility: "Decimating Smash (Q)", keyAbilitySlot: "Q", dodgeTip: "interrupt his Q charge with any CC — or just walk out of the range indicator", weakness: "immobile and telegraphed, his Q and R are easy to dodge", powerSpike: "Level 6 with R charge engage", itemSpike: "Sunfire + Heartsteel", engageTool: "R charge + Q knockup", defTool: "W shield + passive zombie" },
  Sivir: { keyAbility: "Spell Shield (E)", keyAbilitySlot: "E", dodgeTip: "bait her E spellshield with a low-value ability before using your main CC", weakness: "short auto-attack range, outranges her easily", powerSpike: "Level 9 with maxed Q | 3 items", itemSpike: "Essence Reaver + Navori", engageTool: "Q poke + R team speed", defTool: "E spell shield" },
  Skarner: { keyAbility: "Impale (R)", keyAbilitySlot: "R", dodgeTip: "buy QSS for his R suppression — or stay far back to avoid his engage range", weakness: "easily kited without flash, his engage is predictable", powerSpike: "Level 6 with R suppress", itemSpike: "Iceborn Gauntlet", engageTool: "E stun + R suppress drag", defTool: "W shield" },
  Smolder: { keyAbility: "Super Scorcher Breath (Q)", keyAbilitySlot: "Q", dodgeTip: "punish him hard early — his Q stacks scale infinitely but he's weak before 225 stacks", weakness: "extremely weak early game, one of the worst laning ADCs", powerSpike: "25/125/225 Q stack thresholds", itemSpike: "Trinity Force + Essence Reaver", engageTool: "W slow + R execute", defTool: "E flight" },
  Sona: { keyAbility: "Crescendo (R)", keyAbilitySlot: "R", dodgeTip: "spread out so her R doesn't stun your whole team — it's a line skillshot", weakness: "extremely squishy, one combo kills her", powerSpike: "Level 6 with R stun | Late game auras", itemSpike: "Shurelya's / Staff of Flowing Water", engageTool: "R stun + passive auto", defTool: "W heal + shield" },
  Soraka: { keyAbility: "Wish (R)", keyAbilitySlot: "R", dodgeTip: "buy Grievous Wounds to cut her healing — target her first in fights", weakness: "squishy and immobile, burst her down before she heals her team", powerSpike: "Level 6 with R global heal", itemSpike: "Warmog's Armor", engageTool: "E silence zone", defTool: "W heal + R global heal" },
  Swain: { keyAbility: "Demonic Ascension (R)", keyAbilitySlot: "R", dodgeTip: "kite away from his R drain zone — he heals massively while in range", weakness: "short range, poke from outside his R radius", powerSpike: "Level 6 with R drain", itemSpike: "Liandry's + Zhonya's", engageTool: "E root pull + R drain", defTool: "R drain + Zhonya's" },
  Sylas: { keyAbility: "Hijack (R)", keyAbilitySlot: "R", dodgeTip: "he steals your ult — consider how strong your R is in his hands and play accordingly", weakness: "weak when your team has bad ults for him to steal", powerSpike: "Level 6 with stolen R", itemSpike: "Luden's / Lich Bane", engageTool: "E2 dash + stolen R", defTool: "W heal (more at low HP)" },
  Syndra: { keyAbility: "Unleashed Power (R)", keyAbilitySlot: "R", dodgeTip: "her R damage scales with the number of balls on the field — fight when she has few spheres out", weakness: "immobile, gap-close and burst her", powerSpike: "Level 6 with R burst", itemSpike: "Luden's", engageTool: "E stun + Q + R", defTool: "E scatter push" },
  TahmKench: { keyAbility: "Devour (W)", keyAbilitySlot: "W", dodgeTip: "he eats allies to save them — bait his W then re-engage on the spat-out target", weakness: "immobile tank, kite him and he can't reach you", powerSpike: "Level 1-3 in melee | Level 6 R engage", itemSpike: "Heartsteel", engageTool: "R underground dash + Q", defTool: "W devour ally save" },
  Taliyah: { keyAbility: "Seismic Shove (W)", keyAbilitySlot: "W", dodgeTip: "sidestep her W knockup — without it she can't land the full E combo", weakness: "high cooldowns and mana costs, punish when abilities are down", powerSpike: "Level 3 with W+E combo", itemSpike: "Luden's / Liandry's", engageTool: "W knockup into E", defTool: "R Weaver's Wall" },
  Talon: { keyAbility: "Shadow Assault (R)", keyAbilitySlot: "R", dodgeTip: "he goes invisible during R — place a Control Ward and don't panic", weakness: "weak in extended fights, survive his burst and he's useless", powerSpike: "Level 2-3 first blood | Level 6 roam", itemSpike: "Youmuu's / Eclipse", engageTool: "E wall hop + R stealth", defTool: "R invisibility + E wall hop" },
  Taric: { keyAbility: "Cosmic Radiance (R)", keyAbilitySlot: "R", dodgeTip: "his R makes allies invulnerable after 2.5s — disengage and wait for it to end", weakness: "slow and telegraphed, play around his R delay", powerSpike: "Level 6 with R invulnerability", itemSpike: "Locket / Frozen Heart", engageTool: "E stun + R invuln", defTool: "R Cosmic Radiance invuln" },
  Teemo: { keyAbility: "Noxious Trap (R)", keyAbilitySlot: "R", dodgeTip: "buy Control Wards and Oracle Lens to clear his mushrooms", weakness: "squishy and short-ranged, all-in him and he dies instantly", powerSpike: "Level 6 with R mushroom map control", itemSpike: "Nashor's + Liandry's", engageTool: "Q blind", defTool: "W speed + passive stealth" },
  Thresh: { keyAbility: "Death Sentence (Q)", keyAbilitySlot: "Q", dodgeTip: "sidestep his Q hook — stand behind minions and watch for his hook wind-up animation", weakness: "squishy if he misses Q, his only escape is W lantern", powerSpike: "Level 2 with Q+E", itemSpike: "Locket / Zeke's", engageTool: "Q hook + E flay", defTool: "W Dark Passage lantern escape" },
  Tristana: { keyAbility: "Rocket Jump (W)", keyAbilitySlot: "W", dodgeTip: "CC her mid-jump — her W has a long cast time and resets on kills", weakness: "if she W's in aggressively, she has no escape for 22 seconds", powerSpike: "Level 2-3 all-in with E bomb", itemSpike: "Kraken + Navori", engageTool: "W jump + E bomb", defTool: "W jump reset on kills" },
  Trundle: { keyAbility: "Subjugate (R)", keyAbilitySlot: "R", dodgeTip: "his R steals your resistances — don't engage as a tank when his R is up", weakness: "useless against kiting, slow without pillar", powerSpike: "Level 6 with R tank melter", itemSpike: "Blade of the Ruined King", engageTool: "E pillar + R stat steal", defTool: "W domain speed + heal" },
  Tryndamere: { keyAbility: "Undying Rage (R)", keyAbilitySlot: "R", dodgeTip: "his R prevents him from dying for 5 seconds — kite away and re-engage after", weakness: "useless in teamfights if you CC him during R and ignore him", powerSpike: "Level 6 with R immortality", itemSpike: "Kraken + Navori", engageTool: "E spin + R unkillable", defTool: "R unkillable 5s" },
  TwistedFate: { keyAbility: "Pick A Card (W)", keyAbilitySlot: "W", dodgeTip: "back off when he has gold card selected — it's a point-click stun", weakness: "immobile and squishy, all-in him when gold card is on cooldown", powerSpike: "Level 6 with R global semi-presence", itemSpike: "Rapid Firecannon + Lich Bane", engageTool: "R global + gold W stun", defTool: "R Destiny vision" },
  Twitch: { keyAbility: "Ambush (Q)", keyAbilitySlot: "Q", dodgeTip: "buy Control Wards — he ganks from stealth and his Q attack speed shreds you", weakness: "squishy and dies to burst, pink ward and one-shot him", powerSpike: "Level 2 stealth gank | Level 6 R range", itemSpike: "BotRK + Runaan's", engageTool: "Q stealth + R AoE", defTool: "Q stealth" },
  Udyr: { keyAbility: "Wingborne Storm (R)", keyAbilitySlot: "R", dodgeTip: "kite him — he's a melee champion with no gap closer besides movespeed", weakness: "completely kiteable, just don't let him get on top of you", powerSpike: "Level 3-6 with Bear + Phoenix", itemSpike: "Jak'Sho / Trinity Force", engageTool: "E bear stun + R storm", defTool: "W shield + lifesteal" },
  Urgot: { keyAbility: "Fear Beyond Death (R)", keyAbilitySlot: "R", dodgeTip: "don't fight below 25% HP — his R2 is a guaranteed execute below threshold", weakness: "immobile and short range, poke him from a distance", powerSpike: "Level 9 with all 6 knee guns active", itemSpike: "Black Cleaver + Titanic Hydra", engageTool: "E flip + R execute", defTool: "W shield + machine gun legs" },
  Varus: { keyAbility: "Chain of Corruption (R)", keyAbilitySlot: "R", dodgeTip: "his R spreads to nearby allies — don't group tightly when his R is up", weakness: "no mobility at all, dive him and he has no escape", powerSpike: "Level 6 with R root", itemSpike: "Manamune + Lethality", engageTool: "R root + Q snipe", defTool: "E slow zone" },
  Vayne: { keyAbility: "Silver Bolts (W)", keyAbilitySlot: "W", dodgeTip: "disengage after 2 auto attacks — her W 3rd hit procs deal %max HP true damage", weakness: "very short range (550) and weak laning phase, bully her levels 1-5", powerSpike: "Level 6 with R stealth | 2 items", itemSpike: "BotRK + Guinsoo's", engageTool: "R stealth + Q tumble", defTool: "Q tumble + E condemn" },
  Veigar: { keyAbility: "Event Horizon (E)", keyAbilitySlot: "E", dodgeTip: "flash or dash out of his E cage walls immediately — the cage stuns, the inside doesn't", weakness: "stand inside the cage center safely, punish his immobility", powerSpike: "Infinite scaling AP | Level 6 R execute", itemSpike: "Lost Chapter | Rabadon's", engageTool: "E cage + W + R", defTool: "E cage zone control" },
  VelKoz: { keyAbility: "Lifeform Disintegration Ray (R)", keyAbilitySlot: "R", dodgeTip: "flank him during R — he's rooted in place while channeling", weakness: "immobile and squishy, dive him from an angle he doesn't expect", powerSpike: "Level 6 with R laser", itemSpike: "Luden's + Shadowflame", engageTool: "E knockup + R channel", defTool: "none" },
  Vex: { keyAbility: "Shadow Surge (R)", keyAbilitySlot: "R", dodgeTip: "dodge her R projectile — if it hits, she dashes to you for massive burst", weakness: "no escape if she uses R aggressively, punish failed R engages", powerSpike: "Level 6 with R engage", itemSpike: "Luden's + Shadowflame", engageTool: "R dash-in + fear passive", defTool: "Fear passive anti-dash" },
  Vi: { keyAbility: "Assault and Battery (R)", keyAbilitySlot: "R", dodgeTip: "her R is a point-click CC that can't be stopped — position far back or Zhonya's it", weakness: "if she R's your tank instead of carry, she's wasted it", powerSpike: "Level 6 with R lockdown", itemSpike: "Trinity Force / Eclipse", engageTool: "Q charge + R lockdown", defTool: "E shield" },
  Viego: { keyAbility: "Heartbreaker (R)", keyAbilitySlot: "R", dodgeTip: "don't let him possess your dead teammates — he resets and becomes them", weakness: "squishy early, burst him before he gets resets", powerSpike: "Level 6 with R reset | Teamfight resets", itemSpike: "Blade of the Ruined King", engageTool: "W stun + passive possession", defTool: "Passive possession heals + resets" },
  Viktor: { keyAbility: "Chaos Storm (R)", keyAbilitySlot: "R", dodgeTip: "move out of his R storm cloud — it follows targets and ticks damage", weakness: "immobile, gap-close and burst him before he gets E augment waveclear", powerSpike: "First Hex Core augment | Level 6 R", itemSpike: "Hexcore upgrades + Luden's", engageTool: "W gravity field + R", defTool: "Q shield" },
  Vladimir: { keyAbility: "Sanguine Pool (W)", keyAbilitySlot: "W", dodgeTip: "wait for him to use W pool before using your key abilities — he becomes untargetable", weakness: "W pool has a 26s cooldown early and costs 20% HP — punish aggressively", powerSpike: "Level 9-11 with CDR | Late game 3+ items", itemSpike: "Hextech Rocketbelt + Rabadon's", engageTool: "R amplify + E + Q", defTool: "W sanguine pool (untargetable)" },
  Volibear: { keyAbility: "Stormbringer (R)", keyAbilitySlot: "R", dodgeTip: "his R disables turrets — don't rely on tower safety when his R is up", weakness: "kitable without R engage, fight when R is down", powerSpike: "Level 6 with R tower dive", itemSpike: "Riftmaker / Nashor's", engageTool: "Q stun + R turret disable", defTool: "W heal bite" },
  Warwick: { keyAbility: "Infinite Duress (R)", keyAbilitySlot: "R", dodgeTip: "his R is a long-range suppression if he's below 50% HP — stay spread", weakness: "buy Grievous Wounds — his entire kit is healing-dependent", powerSpike: "Level 6 with R suppression leap", itemSpike: "Blade of the Ruined King / Titanic", engageTool: "R long-range suppress", defTool: "Q follow + E damage reduction + fear" },
  Xayah: { keyAbility: "Featherstorm (R)", keyAbilitySlot: "R", dodgeTip: "her R makes her untargetable and sends feathers — dodge the recall path", weakness: "vulnerable when R is on cooldown, she has no other escape", powerSpike: "Level 6 with R safety + damage", itemSpike: "Kraken + Navori", engageTool: "E feather pull root", defTool: "R Featherstorm untargetable" },
  Xerath: { keyAbility: "Arcanopulse (Q)", keyAbilitySlot: "Q", dodgeTip: "move unpredictably — his Q charges in a line and is his main poke", weakness: "zero mobility, gap-close and he can't escape", powerSpike: "Level 6 with R long-range poke", itemSpike: "Luden's", engageTool: "E stun + Q + R", defTool: "none" },
  XinZhao: { keyAbility: "Wind Becomes Lightning (W)", keyAbilitySlot: "W", dodgeTip: "his W thrust slows and he Q-combos into knockup — dodge W and disengage", weakness: "falls off late game, outscale him and he becomes a mediocre diver", powerSpike: "Level 3-6 ganks", itemSpike: "Eclipse / Trinity Force", engageTool: "E dash + Q knockup", defTool: "R knockback zone" },
  Yasuo: { keyAbility: "Wind Wall (W)", keyAbilitySlot: "W", dodgeTip: "bait his Wind Wall before using important projectile abilities — it blocks everything", weakness: "weak when dashing is limited (no minion wave), fight in open areas", powerSpike: "Level 6 with R | 2 items 100% crit", itemSpike: "Kraken + Infinity Edge", engageTool: "Tornado Q3 + R knockup", defTool: "W Wind Wall (blocks projectiles)" },
  Yone: { keyAbility: "Soul Unbound (E)", keyAbilitySlot: "E", dodgeTip: "he snaps back to his E body — CC him at the return point to punish", weakness: "predictable E return, place abilities where his shadow is", powerSpike: "Level 3 with all abilities | Level 6 R engage", itemSpike: "BotRK + Kraken", engageTool: "R knockup + E body", defTool: "E snap back" },
  Yorick: { keyAbility: "Eulogy of the Isles (R)", keyAbilitySlot: "R", dodgeTip: "kill the Maiden of the Mist — without R maiden he loses massive DPS and sustain", weakness: "weak without ghouls and maiden, fight when they're dead", powerSpike: "Level 6 with Maiden + ghouls", itemSpike: "Trinity Force / Hullbreaker", engageTool: "W cage + R Maiden", defTool: "W wall cage" },
  Yuumi: { keyAbility: "You and Me! (W)", keyAbilitySlot: "W", dodgeTip: "CC her when she detaches — she's extremely squishy and dies instantly when off her host", weakness: "kill her carry and she's useless, or burst her when she hops off", powerSpike: "Late game attached to fed carry", itemSpike: "Moonstone + Staff of Flowing Water", engageTool: "R root waves", defTool: "W attach untargetable" },
  Zac: { keyAbility: "Let's Bounce! (R)", keyAbilitySlot: "R", dodgeTip: "don't group in narrow areas — his E + R combo chains into massive AoE CC", weakness: "kill his passive blobs when he revives to prevent the passive resurrection", powerSpike: "Level 6 with E + R combo", itemSpike: "Sunfire + Radiant Virtue", engageTool: "E long-range jump + R", defTool: "Passive blob revive" },
  Zed: { keyAbility: "Death Mark (R)", keyAbilitySlot: "R", dodgeTip: "buy Zhonya's Hourglass — it completely negates his R pop damage", weakness: "much weaker when R and W are both on cooldown, trade in that window", powerSpike: "Level 6 with R assassination", itemSpike: "Prowler's / Eclipse", engageTool: "W shadow + R", defTool: "W swap escape + R swap" },
  Zeri: { keyAbility: "Lightning Crash (R)", keyAbilitySlot: "R", dodgeTip: "her R gives stacking movespeed — kite back and don't let her build stacks", weakness: "low range without R stacks, short-range and weak without ult", powerSpike: "Level 6 with R stacking speed", itemSpike: "Trinity Force + Runaan's", engageTool: "E wall dash + R movespeed", defTool: "E wall dash" },
  Ziggs: { keyAbility: "Mega Inferno Bomb (R)", keyAbilitySlot: "R", dodgeTip: "his R has a huge AoE — spread out and the center does more damage than edges", weakness: "immobile, dive him and he has only W to escape", powerSpike: "Level 6 with R poke", itemSpike: "Luden's", engageTool: "E minefield + R", defTool: "W Satchel Charge jump" },
  Zilean: { keyAbility: "Chronoshift (R)", keyAbilitySlot: "R", dodgeTip: "his R revives an ally — bait it by bursting someone, then wait for revive and re-engage", weakness: "squishy and immobile, kill him before he can R a carry", powerSpike: "Level 6 with R revive", itemSpike: "Shurelya's", engageTool: "Q+W+Q double bomb stun", defTool: "R Chronoshift revive" },
  Zoe: { keyAbility: "Paddle Star (Q)", keyAbilitySlot: "Q", dodgeTip: "dodge her E bubble at all costs — if it hits, her Q does massive bonus damage on sleeping targets", weakness: "if E misses she's useless and has no escape", powerSpike: "Level 3 with E+Q combo", itemSpike: "Luden's + Shadowflame", engageTool: "E sleep + Q snipe", defTool: "R portal return" },
  Zyra: { keyAbility: "Stranglethorns (R)", keyAbilitySlot: "R", dodgeTip: "don't group on her plants — her R empowers them and knocks up everyone in the zone", weakness: "immobile and squishy, dive past her plants and burst her", powerSpike: "Level 6 with R knockup", itemSpike: "Liandry's", engageTool: "E root + R knockup", defTool: "Seed plants zone" },
};

const CLASS_COUNTER_NAMES: Record<string, string[]> = {
  mage: ["Zed", "Fizz", "Katarina", "Talon", "Yasuo"],
  assassin: ["Malzahar", "Lissandra", "Galio", "Annie", "Pantheon"],
  fighter: ["Vayne", "Quinn", "Kayle", "Kennen", "Teemo"],
  tank: ["Fiora", "Vayne", "Gwen", "Mordekaiser", "Darius"],
  marksman: ["Draven", "Lucian", "Kalista", "Samira", "Tristana"],
  support: ["Blitzcrank", "Pyke", "Leona", "Nautilus", "Rell"],
};

function generateMatchupTip(playerChamp: string, enemyChamp: string): { tip: string; powerSpikes: string } {
  const enemy = CHAMP_MECHANICS[enemyChamp];
  const player = CHAMP_MECHANICS[playerChamp];

  if (!enemy) {
    return {
      tip: `Play carefully and track ${enemyChamp}'s cooldowns before committing.`,
      powerSpikes: "Level 6 | After first completed item",
    };
  }

  const playerHasCC = player?.engageTool?.toLowerCase().includes("stun") ||
    player?.engageTool?.toLowerCase().includes("root") ||
    player?.engageTool?.toLowerCase().includes("charm") ||
    player?.engageTool?.toLowerCase().includes("knockup");
  const playerCCName = player?.engageTool ?? "your CC";

  let tip: string;

  if (enemy.defTool && (
    enemy.defTool.toLowerCase().includes("untargetable") ||
    enemy.defTool.toLowerCase().includes("invuln") ||
    enemy.defTool.toLowerCase().includes("stealth") ||
    enemy.defTool.toLowerCase().includes("parry") ||
    enemy.defTool.toLowerCase().includes("shield") ||
    enemy.defTool.toLowerCase().includes("dodge") ||
    enemy.defTool.toLowerCase().includes("spell shield") ||
    enemy.defTool.toLowerCase().includes("block")
  )) {
    if (playerHasCC) {
      tip = `Hold ${playerCCName} until ${enemyChamp} uses their ${enemy.defTool} — then punish the cooldown window. ${enemy.dodgeTip.charAt(0).toUpperCase() + enemy.dodgeTip.slice(1)}.`;
    } else {
      tip = `Bait out ${enemyChamp}'s ${enemy.defTool} before committing to your combo. ${enemy.dodgeTip.charAt(0).toUpperCase() + enemy.dodgeTip.slice(1)}.`;
    }
  } else if (enemy.engageTool) {
    tip = `${enemy.dodgeTip.charAt(0).toUpperCase() + enemy.dodgeTip.slice(1)}. ${enemy.weakness.charAt(0).toUpperCase() + enemy.weakness.slice(1)}.`;
  } else {
    tip = `${enemy.dodgeTip.charAt(0).toUpperCase() + enemy.dodgeTip.slice(1)}. ${enemy.weakness.charAt(0).toUpperCase() + enemy.weakness.slice(1)}.`;
  }

  return {
    tip,
    powerSpikes: enemy.powerSpike + " | " + enemy.itemSpike,
  };
}

function generateCounters(
  championName: string,
  tags: string[],
  role: string
): CounterEntry[] {
  const t = tags.map((s) => s.toLowerCase());
  let classKey: string;
  if (role === "bot") classKey = "marksman";
  else if (role === "support") classKey = "support";
  else if (t.includes("assassin")) classKey = "assassin";
  else if (t.includes("mage")) classKey = "mage";
  else if (t.includes("tank")) classKey = "tank";
  else classKey = "fighter";

  const names = CLASS_COUNTER_NAMES[classKey] ?? CLASS_COUNTER_NAMES.fighter;
  const difficulties: Array<"hard" | "hard" | "medium" | "medium" | "easy"> = ["hard", "hard", "medium", "medium", "easy"];

  return names.map((name, i) => {
    const { tip, powerSpikes } = generateMatchupTip(championName, name);
    return {
      name,
      winRate: Math.round((45 + i * 0.8) * 10) / 10,
      matches: Math.floor(1200 + i * 400),
      tip,
      powerSpikes,
      difficulty: difficulties[i],
    };
  });
}
