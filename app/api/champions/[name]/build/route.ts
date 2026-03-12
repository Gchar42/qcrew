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
        builds[role] = sample;
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
  }

  return adapted;
}

/* ── Generated matchup data with tips ───────────────────────── */

type CounterEntry = {
  name: string; winRate: number; matches: number;
  tip?: string; powerSpikes?: string; difficulty?: "easy" | "medium" | "hard";
};

const CLASS_COUNTERS: Record<string, { names: string[]; tips: string[]; spikes: string[] }> = {
  mage: {
    names: ["Zed", "Fizz", "Katarina", "Talon", "Yasuo"],
    tips: [
      "Assassins can gap-close onto you. Save your CC for when they engage.",
      "Rush Zhonya's Hourglass to survive their all-in combo.",
      "Ward river and track their roams -- ping your sidelaners.",
      "Poke before level 6, play safe after they hit their power spike.",
      "Stay behind minions and respect their mobility windows.",
    ],
    spikes: ["Levels 3, 6 | After Lost Chapter", "Level 6 all-in | After Zhonya's", "Levels 2, 6 | After first item", "Levels 3, 6 | After Serrated Dirk", "Level 6 | After first completed item"],
  },
  assassin: {
    names: ["Malzahar", "Lissandra", "Galio", "Annie", "Pantheon"],
    tips: [
      "They can lock you down with targeted CC. Bait it before going in.",
      "Avoid fighting when their CC is up -- play around cooldowns.",
      "Roam to sidelanes when you can't kill them in lane.",
      "Their point-and-click CC shuts down your combos. Build Hexdrinker early if AP.",
      "Look for trades when their key ability is on cooldown.",
    ],
    spikes: ["Level 6 suppression | After Banshee's", "Level 6 | After Prowler's", "Level 3 taunt | After first item", "Level 6 burst | After Tibbers", "Level 3 combo | After first item"],
  },
  fighter: {
    names: ["Vayne", "Quinn", "Kayle", "Kennen", "Teemo"],
    tips: [
      "Ranged top laners kite you early. Short trade and back off.",
      "All-in when they waste their disengage ability.",
      "Freeze near your tower and call for jungle ganks.",
      "Rush tier 2 boots to close the gap more effectively.",
      "Take Second Wind and Doran's Shield to survive the poke.",
    ],
    spikes: ["Levels 1-3 with Doran's Blade | After Stridebreaker", "Level 6 all-in | After first item", "Levels 2-3 short trade | After Phage", "Level 6 engage | After tier 2 boots", "Level 3 and 6 | After first item"],
  },
  tank: {
    names: ["Fiora", "Vayne", "Gwen", "Mordekaiser", "Darius"],
    tips: [
      "They have built-in %HP damage. Avoid extended trades.",
      "Short trades only -- you lose long fights against their sustained damage.",
      "Prioritize teamfighting over 1v1 -- you're more useful in groups.",
      "Build Bramble Vest early if they have sustain.",
      "Respect their level 1-3 kill pressure -- you outscale in teamfights.",
    ],
    spikes: ["Level 6 teamfight | After Sunfire Aegis", "Level 9 with maxed Q | After 2 items", "After first full tank item | Level 11", "Post-6 with team | After Thornmail", "Level 6 with team | After first item"],
  },
  marksman: {
    names: ["Draven", "Lucian", "Kalista", "Samira", "Tristana"],
    tips: [
      "They bully you in lane. Play safe and scale for mid-game.",
      "Respect their early damage -- trade only with support engage.",
      "Focus on CS and avoid unnecessary fights before your 2-item spike.",
      "Position behind your support and let them dictate trades.",
      "Don't coinflip fights early -- you outscale most lane bullies.",
    ],
    spikes: ["After BF Sword | Level 6 with support", "After 2 items (Kraken + Zeal) | Level 9", "After Infinity Edge | Level 11", "After first item | With support all-in at 6", "Level 6 with support | After 2 items"],
  },
  support: {
    names: ["Blitzcrank", "Pyke", "Leona", "Nautilus", "Rell"],
    tips: [
      "Hook/engage supports punish bad positioning. Stay behind minions.",
      "Ward lane bushes immediately -- they need vision denial to engage.",
      "Play near your ADC and peel when they engage.",
      "Build early boots to dodge skillshots.",
      "Time your shields/heals for when they commit to a fight.",
    ],
    spikes: ["Level 2 all-in | After Shurelya's", "Level 3 with ADC | After first support item", "Level 2-3 engage | After tier 2 boots", "Level 6 with team | After Locket", "Level 3 and 6 | After first item"],
  },
};

function generateCounters(
  _championName: string,
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

  const data = CLASS_COUNTERS[classKey] ?? CLASS_COUNTERS.fighter;
  const difficulties: Array<"hard" | "hard" | "medium" | "medium" | "easy"> = ["hard", "hard", "medium", "medium", "easy"];

  return data.names.map((name, i) => ({
    name,
    winRate: Math.round((45 + i * 0.8) * 10) / 10,
    matches: Math.floor(1200 + i * 400),
    tip: data.tips[i],
    powerSpikes: data.spikes[i],
    difficulty: difficulties[i],
  }));
}
