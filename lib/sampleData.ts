/**
 * Realistic sample/fallback data for 10 champions.
 * Used when Redis cache is empty or during development.
 * Pick rates per row sum to 100%. Games reflect champion popularity.
 */

/* ─── Types ─── */

export type SampleRuneEntry = {
  id: number; name: string; pickRate: number; winRate: number; games: number;
};

export type SampleRuneTree = {
  id: number; name: string; slots: SampleRuneEntry[][];
};

export type SampleItemOption = {
  id: number; name: string; winRate: number; pickRate: number; games: number;
};

export type SampleItemSlot = { label: string; items: SampleItemOption[] };

export type SampleShardOption = {
  id: number; name: string; pickRate: number; winRate: number; games: number;
};

export type SampleShardRow = { label: string; options: SampleShardOption[] };

export type SampleBuild = {
  name: string;
  winRate: number;
  pickRate: number;
  games: number;
  primaryTree: number;
  keystoneId: number;
  primaryRunes: number[];
  secondaryTree: number;
  secondaryRunes: number[];
  shards: number[];
  summonerSpells: number[];
  skillOrder: string;
  startingItems: { id: number; name: string }[];
  coreItems: { id: number; name: string; winRate: number; slot: string }[];
};

export type SampleChampionData = {
  id: number;
  name: string;
  role: string;
  games: number;
  winRate: number;
  pickRate: number;
  banRate: number;
  patch: string;
  updatedAt: string;
  runeTrees: SampleRuneTree[];
  shards: SampleShardRow[];
  itemSlots: SampleItemSlot[];
  builds: SampleBuild[];
};

/* ─── Helpers ─── */

const R = (id: number, name: string, pr: number, wr: number, g: number): SampleRuneEntry =>
  ({ id, name, pickRate: pr, winRate: wr, games: g });

const I = (id: number, name: string, wr: number, pr: number, g: number): SampleItemOption =>
  ({ id, name, winRate: wr, pickRate: pr, games: g });

const S = (id: number, name: string, pr: number, wr: number, g: number): SampleShardOption =>
  ({ id, name, pickRate: pr, winRate: wr, games: g });

const ts = (hoursAgo: number) => new Date(Date.now() - hoursAgo * 3600000).toISOString();

/* ─── Rune ID constants ─── */

// Precision 8000
const PtA = 8005, LT = 8008, Fleet = 8021, Conq = 8010;
const Overheal = 9101, Triumph = 9111, PoM = 8009;
const Alacrity = 9104, Tenacity = 9105, Bloodline = 9103;
const CdG = 8014, CutDown = 8017, LastStand = 8299;

// Domination 8100
const Elec = 8112, Pred = 8124, DH = 8128, HoB = 9923;
const CheapShot = 8126, ToB = 8139, SuddenImp = 8143;
const ZombieWard = 8136, GhostPoro = 8120, Eyeball = 8138;
const TreasureH = 8135, IngeniousH = 8134, RelentlessH = 8105;

// Sorcery 8200
const Aery = 8214, Comet = 8229, PhaseRush = 8230;
const NullOrb = 8224, Manaflow = 8226, NimbusCloak = 8275;
const Transcendence = 8210, Celerity = 8234, AbsFocus = 8233;
const Scorch = 8237, Waterwalking = 8232, GatheringStorm = 8236;

// Resolve 8300
const Grasp = 8437, Aftershock = 8439, Guardian = 8465;
const Demolish = 8446, FontOfLife = 8463, ShieldBash = 8401;
const Conditioning = 8429, SecondWind = 8444, BonePlating = 8473;
const Overgrowth = 8451, Revitalize = 8453, Unflinching = 8242;

// Inspiration 8400
const Glacial = 8351, Spellbook = 8360, FirstStrike = 8369;
const HexFlash = 8306, MagicBoots = 8304, CashBack = 8313;
const FuturesMarket = 8321, MinionDemat = 8316, Biscuit = 8345;
const CosmicInsight = 8347, ApproachVel = 8410, TimeWarp = 8352;

// Shards
const AdaptiveForce = 5008, AttackSpeed = 5005, AbilityHaste = 5007;
const Armor = 5002, MagicResist = 5003, HealthScaling = 5001;

/* ═══════════════════════════════════════════════
   AHRI — Mid · 28 000 games
   Primary: Domination (Electrocute)  Secondary: Inspiration
   ═══════════════════════════════════════════════ */

const AHRI: SampleChampionData = {
  id: 103, name: "Ahri", role: "Mid",
  games: 28000, winRate: 51.8, pickRate: 8.2, banRate: 5.1,
  patch: "16.5", updatedAt: ts(4),
  runeTrees: [
    { id: 8000, name: "Precision", slots: [
      [R(PtA, "Press the Attack", 18.5, 48.4, 312), R(LT, "Lethal Tempo", 6.2, 46.9, 105), R(Fleet, "Fleet Footwork", 42.1, 50.3, 710), R(Conq, "Conqueror", 33.2, 49.1, 560)],
      [R(Overheal, "Overheal", 8.4, 48.1, 142), R(Triumph, "Triumph", 64.3, 50.4, 1084), R(PoM, "Presence of Mind", 27.3, 50.8, 460)],
      [R(Alacrity, "Legend: Alacrity", 22.5, 49.2, 379), R(Tenacity, "Legend: Tenacity", 18.8, 49.6, 317), R(Bloodline, "Legend: Bloodline", 58.7, 50.5, 989)],
      [R(CdG, "Coup de Grace", 61.2, 50.6, 1032), R(CutDown, "Cut Down", 12.4, 48.7, 209), R(LastStand, "Last Stand", 26.4, 49.3, 445)],
    ]},
    { id: 8100, name: "Domination", slots: [
      [R(Elec, "Electrocute", 72.4, 52.3, 17237), R(Pred, "Predator", 2.1, 47.8, 500), R(DH, "Dark Harvest", 14.8, 50.6, 3523), R(HoB, "Hail of Blades", 10.7, 49.2, 2548)],
      [R(CheapShot, "Cheap Shot", 18.3, 51.4, 4357), R(ToB, "Taste of Blood", 62.4, 52.1, 14855), R(SuddenImp, "Sudden Impact", 19.3, 51.7, 4596)],
      [R(ZombieWard, "Zombie Ward", 10.2, 51.6, 2428), R(GhostPoro, "Ghost Poro", 8.5, 51.1, 2024), R(Eyeball, "Eyeball Collection", 81.3, 52.4, 19356)],
      [R(TreasureH, "Treasure Hunter", 38.6, 52.0, 9189), R(IngeniousH, "Ingenious Hunter", 14.2, 51.3, 3380), R(RelentlessH, "Relentless Hunter", 47.2, 52.5, 11239)],
    ]},
    { id: 8200, name: "Sorcery", slots: [
      [R(Aery, "Summon Aery", 35.4, 50.1, 1204), R(Comet, "Arcane Comet", 48.2, 50.8, 1639), R(PhaseRush, "Phase Rush", 16.4, 49.5, 558)],
      [R(NullOrb, "Nullifying Orb", 12.1, 50.2, 1680), R(Manaflow, "Manaflow Band", 72.8, 51.9, 10108), R(NimbusCloak, "Nimbus Cloak", 15.1, 50.4, 2096)],
      [R(Transcendence, "Transcendence", 68.4, 52.1, 9498), R(Celerity, "Celerity", 8.3, 50.0, 1153), R(AbsFocus, "Absolute Focus", 23.3, 51.2, 3235)],
      [R(Scorch, "Scorch", 42.6, 51.5, 5914), R(Waterwalking, "Waterwalking", 4.8, 49.7, 667), R(GatheringStorm, "Gathering Storm", 52.6, 52.3, 7305)],
    ]},
    { id: 8300, name: "Resolve", slots: [
      [R(Grasp, "Grasp of the Undying", 24.5, 48.6, 147), R(Aftershock, "Aftershock", 31.2, 49.1, 187), R(Guardian, "Guardian", 44.3, 49.8, 266)],
      [R(Demolish, "Demolish", 15.4, 49.2, 356), R(FontOfLife, "Font of Life", 22.1, 50.1, 511), R(ShieldBash, "Shield Bash", 62.5, 50.6, 1445)],
      [R(Conditioning, "Conditioning", 28.3, 51.4, 654), R(SecondWind, "Second Wind", 38.5, 50.8, 890), R(BonePlating, "Bone Plating", 33.2, 50.5, 768)],
      [R(Overgrowth, "Overgrowth", 42.1, 50.3, 974), R(Revitalize, "Revitalize", 31.6, 50.7, 731), R(Unflinching, "Unflinching", 26.3, 49.9, 608)],
    ]},
    { id: 8400, name: "Inspiration", slots: [
      [R(Glacial, "Glacial Augment", 18.3, 49.4, 329), R(Spellbook, "Unsealed Spellbook", 12.5, 48.8, 225), R(FirstStrike, "First Strike", 69.2, 51.6, 1246)],
      [R(HexFlash, "Hextech Flashtraption", 8.2, 49.8, 895), R(MagicBoots, "Magical Footwear", 52.4, 52.3, 5722), R(CashBack, "Cash Back", 39.4, 51.4, 4302)],
      [R(FuturesMarket, "Future's Market", 22.8, 51.1, 2489), R(MinionDemat, "Minion Dematerializer", 14.6, 50.4, 1594), R(Biscuit, "Biscuit Delivery", 62.6, 52.0, 6836)],
      [R(CosmicInsight, "Cosmic Insight", 58.3, 52.2, 6366), R(ApproachVel, "Approach Velocity", 12.4, 50.1, 1354), R(TimeWarp, "Time Warp Tonic", 29.3, 51.0, 3199)],
    ]},
  ],
  shards: [
    { label: "Offense", options: [S(AdaptiveForce, "Adaptive Force", 82.4, 52.1, 23072), S(AttackSpeed, "Attack Speed", 5.3, 49.1, 1484), S(AbilityHaste, "Ability Haste", 12.3, 50.8, 3444)] },
    { label: "Flex", options: [S(AdaptiveForce, "Adaptive Force", 78.6, 52.0, 22008), S(Armor, "Armor", 14.2, 51.3, 3976), S(MagicResist, "Magic Resist", 7.2, 50.4, 2016)] },
    { label: "Defense", options: [S(HealthScaling, "Health", 52.8, 51.9, 14784), S(Armor, "Armor", 28.4, 51.6, 7952), S(MagicResist, "Magic Resist", 18.8, 51.2, 5264)] },
  ],
  itemSlots: [
    { label: "1st Item", items: [
      I(6655, "Luden's Companion", 52.8, 38.4, 10752), I(6653, "Stormsurge", 53.4, 24.1, 6748),
      I(3100, "Lich Bane", 50.2, 14.8, 4144), I(4645, "Shadowflame", 51.6, 12.3, 3444),
      I(3157, "Zhonya's Hourglass", 49.8, 10.4, 2912),
    ]},
    { label: "2nd Item", items: [
      I(4645, "Shadowflame", 53.1, 32.6, 9128), I(3089, "Rabadon's Deathcap", 54.8, 22.4, 6272),
      I(3157, "Zhonya's Hourglass", 51.4, 18.2, 5096), I(3135, "Void Staff", 52.2, 15.1, 4228),
      I(3100, "Lich Bane", 51.8, 11.7, 3276),
    ]},
    { label: "3rd Item", items: [
      I(3089, "Rabadon's Deathcap", 55.6, 28.8, 8064), I(3135, "Void Staff", 53.4, 24.2, 6776),
      I(3157, "Zhonya's Hourglass", 52.1, 21.4, 5992), I(3102, "Banshee's Veil", 50.8, 14.2, 3976),
      I(4645, "Shadowflame", 52.6, 11.4, 3192),
    ]},
  ],
  builds: [
    {
      name: "Most Popular", winRate: 52.3, pickRate: 48.2, games: 13496,
      primaryTree: 8100, keystoneId: Elec, primaryRunes: [ToB, Eyeball, RelentlessH],
      secondaryTree: 8400, secondaryRunes: [MagicBoots, Biscuit],
      shards: [AdaptiveForce, AdaptiveForce, HealthScaling],
      summonerSpells: [4, 14], skillOrder: "Q > W > E",
      startingItems: [{ id: 1056, name: "Doran's Ring" }, { id: 2003, name: "Health Potion" }],
      coreItems: [
        { id: 6655, name: "Luden's Companion", winRate: 52.8, slot: "52.8% as 1st item" },
        { id: 4645, name: "Shadowflame", winRate: 53.1, slot: "53.1% as 2nd item" },
        { id: 3089, name: "Rabadon's Deathcap", winRate: 55.6, slot: "55.6% as 3rd item" },
      ],
    },
    {
      name: "Highest Win Rate", winRate: 54.1, pickRate: 12.6, games: 3528,
      primaryTree: 8100, keystoneId: Elec, primaryRunes: [ToB, Eyeball, TreasureH],
      secondaryTree: 8200, secondaryRunes: [Manaflow, GatheringStorm],
      shards: [AdaptiveForce, AdaptiveForce, HealthScaling],
      summonerSpells: [4, 12], skillOrder: "Q > E > W",
      startingItems: [{ id: 1056, name: "Doran's Ring" }, { id: 2003, name: "Health Potion" }],
      coreItems: [
        { id: 6653, name: "Stormsurge", winRate: 53.4, slot: "53.4% as 1st item" },
        { id: 3089, name: "Rabadon's Deathcap", winRate: 54.8, slot: "54.8% as 2nd item" },
        { id: 3135, name: "Void Staff", winRate: 53.4, slot: "53.4% as 3rd item" },
      ],
    },
  ],
};

/* ═══════════════════════════════════════════════
   YASUO — Mid · 45 000 games
   Primary: Precision (Lethal Tempo)  Secondary: Resolve
   ═══════════════════════════════════════════════ */

const YASUO: SampleChampionData = {
  id: 157, name: "Yasuo", role: "Mid",
  games: 45000, winRate: 49.6, pickRate: 12.4, banRate: 14.8,
  patch: "16.5", updatedAt: ts(2),
  runeTrees: [
    { id: 8000, name: "Precision", slots: [
      [R(PtA, "Press the Attack", 4.2, 47.8, 1620), R(LT, "Lethal Tempo", 68.3, 49.8, 26356), R(Fleet, "Fleet Footwork", 18.6, 50.2, 7178), R(Conq, "Conqueror", 8.9, 48.4, 3435)],
      [R(Overheal, "Overheal", 12.8, 48.6, 4941), R(Triumph, "Triumph", 74.5, 49.9, 28748), R(PoM, "Presence of Mind", 12.7, 48.8, 4901)],
      [R(Alacrity, "Legend: Alacrity", 72.4, 49.7, 27941), R(Tenacity, "Legend: Tenacity", 14.3, 49.1, 5519), R(Bloodline, "Legend: Bloodline", 13.3, 50.4, 5132)],
      [R(CdG, "Coup de Grace", 42.6, 49.4, 16434), R(CutDown, "Cut Down", 18.2, 49.8, 7023), R(LastStand, "Last Stand", 39.2, 50.1, 15128)],
    ]},
    { id: 8100, name: "Domination", slots: [
      [R(Elec, "Electrocute", 48.2, 48.6, 578), R(Pred, "Predator", 5.4, 46.2, 65), R(DH, "Dark Harvest", 34.1, 47.8, 409), R(HoB, "Hail of Blades", 12.3, 47.1, 148)],
      [R(CheapShot, "Cheap Shot", 14.8, 49.1, 2356), R(ToB, "Taste of Blood", 62.3, 49.8, 9914), R(SuddenImp, "Sudden Impact", 22.9, 49.4, 3645)],
      [R(ZombieWard, "Zombie Ward", 8.4, 49.2, 1337), R(GhostPoro, "Ghost Poro", 6.1, 48.8, 971), R(Eyeball, "Eyeball Collection", 85.5, 49.7, 13607)],
      [R(TreasureH, "Treasure Hunter", 42.3, 49.3, 6732), R(IngeniousH, "Ingenious Hunter", 8.6, 48.4, 1369), R(RelentlessH, "Relentless Hunter", 49.1, 49.8, 7814)],
    ]},
    { id: 8200, name: "Sorcery", slots: [
      [R(Aery, "Summon Aery", 22.4, 48.2, 202), R(Comet, "Arcane Comet", 18.6, 47.6, 167), R(PhaseRush, "Phase Rush", 59.0, 49.4, 531)],
      [R(NullOrb, "Nullifying Orb", 18.4, 49.1, 1012), R(Manaflow, "Manaflow Band", 28.6, 49.4, 1573), R(NimbusCloak, "Nimbus Cloak", 53.0, 49.8, 2915)],
      [R(Transcendence, "Transcendence", 42.1, 49.6, 2316), R(Celerity, "Celerity", 28.4, 49.2, 1562), R(AbsFocus, "Absolute Focus", 29.5, 49.5, 1622)],
      [R(Scorch, "Scorch", 24.8, 49.0, 1364), R(Waterwalking, "Waterwalking", 8.6, 48.4, 473), R(GatheringStorm, "Gathering Storm", 66.6, 49.9, 3663)],
    ]},
    { id: 8300, name: "Resolve", slots: [
      [R(Grasp, "Grasp of the Undying", 32.4, 49.2, 389), R(Aftershock, "Aftershock", 24.1, 48.4, 289), R(Guardian, "Guardian", 43.5, 48.8, 522)],
      [R(Demolish, "Demolish", 18.2, 49.0, 4732), R(FontOfLife, "Font of Life", 6.4, 48.2, 1664), R(ShieldBash, "Shield Bash", 75.4, 49.8, 19604)],
      [R(Conditioning, "Conditioning", 22.6, 50.4, 5876), R(SecondWind, "Second Wind", 38.2, 49.4, 9932), R(BonePlating, "Bone Plating", 39.2, 49.6, 10192)],
      [R(Overgrowth, "Overgrowth", 48.4, 49.7, 12584), R(Revitalize, "Revitalize", 22.3, 49.2, 5798), R(Unflinching, "Unflinching", 29.3, 49.8, 7618)],
    ]},
    { id: 8400, name: "Inspiration", slots: [
      [R(Glacial, "Glacial Augment", 14.2, 47.4, 85), R(Spellbook, "Unsealed Spellbook", 8.6, 46.8, 52), R(FirstStrike, "First Strike", 77.2, 48.6, 463)],
      [R(HexFlash, "Hextech Flashtraption", 12.4, 48.2, 446), R(MagicBoots, "Magical Footwear", 48.6, 49.4, 1750), R(CashBack, "Cash Back", 39.0, 49.0, 1404)],
      [R(FuturesMarket, "Future's Market", 28.4, 49.1, 1022), R(MinionDemat, "Minion Dematerializer", 18.2, 48.6, 655), R(Biscuit, "Biscuit Delivery", 53.4, 49.6, 1923)],
      [R(CosmicInsight, "Cosmic Insight", 42.8, 49.4, 1541), R(ApproachVel, "Approach Velocity", 22.6, 48.8, 814), R(TimeWarp, "Time Warp Tonic", 34.6, 49.2, 1246)],
    ]},
  ],
  shards: [
    { label: "Offense", options: [S(AdaptiveForce, "Adaptive Force", 8.4, 48.6, 3780), S(AttackSpeed, "Attack Speed", 88.2, 49.8, 39690), S(AbilityHaste, "Ability Haste", 3.4, 47.4, 1530)] },
    { label: "Flex", options: [S(AdaptiveForce, "Adaptive Force", 72.6, 49.7, 32670), S(Armor, "Armor", 18.8, 49.2, 8460), S(MagicResist, "Magic Resist", 8.6, 48.8, 3870)] },
    { label: "Defense", options: [S(HealthScaling, "Health", 48.2, 49.6, 21690), S(Armor, "Armor", 34.6, 49.8, 15570), S(MagicResist, "Magic Resist", 17.2, 49.1, 7740)] },
  ],
  itemSlots: [
    { label: "1st Item", items: [
      I(3153, "Blade of the Ruined King", 50.4, 42.8, 19260), I(6672, "Kraken Slayer", 49.2, 22.4, 10080),
      I(3031, "Infinity Edge", 51.8, 14.6, 6570), I(3046, "Phantom Dancer", 48.6, 11.8, 5310),
      I(6333, "Death's Dance", 49.4, 8.4, 3780),
    ]},
    { label: "2nd Item", items: [
      I(6672, "Kraken Slayer", 50.8, 34.2, 15390), I(3031, "Infinity Edge", 52.4, 26.8, 12060),
      I(3046, "Phantom Dancer", 49.6, 16.4, 7380), I(6333, "Death's Dance", 50.2, 12.8, 5760),
      I(3153, "Blade of the Ruined King", 48.4, 9.8, 4410),
    ]},
    { label: "3rd Item", items: [
      I(3031, "Infinity Edge", 53.6, 32.4, 14580), I(6333, "Death's Dance", 51.2, 24.6, 11070),
      I(3046, "Phantom Dancer", 50.4, 18.2, 8190), I(3053, "Sterak's Gage", 49.8, 14.4, 6480),
      I(3742, "Dead Man's Plate", 48.6, 10.4, 4680),
    ]},
  ],
  builds: [
    {
      name: "Most Popular", winRate: 49.8, pickRate: 52.4, games: 23580,
      primaryTree: 8000, keystoneId: LT, primaryRunes: [Triumph, Alacrity, LastStand],
      secondaryTree: 8300, secondaryRunes: [BonePlating, Overgrowth],
      shards: [AttackSpeed, AdaptiveForce, HealthScaling],
      summonerSpells: [4, 14], skillOrder: "Q > E > W",
      startingItems: [{ id: 1055, name: "Doran's Blade" }, { id: 2003, name: "Health Potion" }],
      coreItems: [
        { id: 3153, name: "Blade of the Ruined King", winRate: 50.4, slot: "50.4% as 1st item" },
        { id: 6672, name: "Kraken Slayer", winRate: 50.8, slot: "50.8% as 2nd item" },
        { id: 3031, name: "Infinity Edge", winRate: 53.6, slot: "53.6% as 3rd item" },
      ],
    },
    {
      name: "Highest Win Rate", winRate: 52.6, pickRate: 14.8, games: 6660,
      primaryTree: 8000, keystoneId: Fleet, primaryRunes: [Triumph, Bloodline, CdG],
      secondaryTree: 8300, secondaryRunes: [SecondWind, Overgrowth],
      shards: [AttackSpeed, AdaptiveForce, Armor],
      summonerSpells: [4, 3], skillOrder: "Q > E > W",
      startingItems: [{ id: 1055, name: "Doran's Blade" }, { id: 2003, name: "Health Potion" }],
      coreItems: [
        { id: 3153, name: "Blade of the Ruined King", winRate: 51.2, slot: "51.2% as 1st item" },
        { id: 3031, name: "Infinity Edge", winRate: 52.4, slot: "52.4% as 2nd item" },
        { id: 6333, name: "Death's Dance", winRate: 51.2, slot: "51.2% as 3rd item" },
      ],
    },
  ],
};

/* ═══════════════════════════════════════════════
   JINX — ADC · 38 000 games
   Primary: Precision (Lethal Tempo)  Secondary: Sorcery
   ═══════════════════════════════════════════════ */

const JINX: SampleChampionData = {
  id: 222, name: "Jinx", role: "ADC",
  games: 38000, winRate: 51.2, pickRate: 10.8, banRate: 4.2,
  patch: "16.5", updatedAt: ts(3),
  runeTrees: [
    { id: 8000, name: "Precision", slots: [
      [R(PtA, "Press the Attack", 8.4, 49.8, 2722), R(LT, "Lethal Tempo", 76.2, 51.6, 24689), R(Fleet, "Fleet Footwork", 12.8, 50.4, 4147), R(Conq, "Conqueror", 2.6, 47.2, 843)],
      [R(Overheal, "Overheal", 18.4, 50.2, 5963), R(Triumph, "Triumph", 62.8, 51.4, 20347), R(PoM, "Presence of Mind", 18.8, 50.8, 6090)],
      [R(Alacrity, "Legend: Alacrity", 68.4, 51.3, 22161), R(Tenacity, "Legend: Tenacity", 4.2, 48.6, 1361), R(Bloodline, "Legend: Bloodline", 27.4, 51.8, 8878)],
      [R(CdG, "Coup de Grace", 58.6, 51.4, 18986), R(CutDown, "Cut Down", 28.2, 51.8, 9136), R(LastStand, "Last Stand", 13.2, 49.6, 4278)],
    ]},
    { id: 8100, name: "Domination", slots: [
      [R(Elec, "Electrocute", 42.4, 48.8, 339), R(Pred, "Predator", 4.2, 45.6, 34), R(DH, "Dark Harvest", 44.2, 49.2, 354), R(HoB, "Hail of Blades", 9.2, 47.4, 74)],
      [R(CheapShot, "Cheap Shot", 22.4, 50.6, 2394), R(ToB, "Taste of Blood", 58.6, 51.2, 6264), R(SuddenImp, "Sudden Impact", 19.0, 50.4, 2031)],
      [R(ZombieWard, "Zombie Ward", 12.4, 50.8, 1326), R(GhostPoro, "Ghost Poro", 8.2, 50.2, 877), R(Eyeball, "Eyeball Collection", 79.4, 51.3, 8488)],
      [R(TreasureH, "Treasure Hunter", 48.6, 51.0, 5195), R(IngeniousH, "Ingenious Hunter", 12.4, 50.2, 1326), R(RelentlessH, "Relentless Hunter", 39.0, 51.4, 4170)],
    ]},
    { id: 8200, name: "Sorcery", slots: [
      [R(Aery, "Summon Aery", 28.4, 49.4, 256), R(Comet, "Arcane Comet", 32.6, 49.8, 293), R(PhaseRush, "Phase Rush", 39.0, 50.2, 351)],
      [R(NullOrb, "Nullifying Orb", 14.2, 50.4, 2654), R(Manaflow, "Manaflow Band", 42.6, 51.2, 7960), R(NimbusCloak, "Nimbus Cloak", 43.2, 51.4, 8072)],
      [R(Transcendence, "Transcendence", 32.8, 51.0, 6130), R(Celerity, "Celerity", 28.4, 50.6, 5305), R(AbsFocus, "Absolute Focus", 38.8, 51.4, 7246)],
      [R(Scorch, "Scorch", 18.4, 50.2, 3437), R(Waterwalking, "Waterwalking", 4.2, 49.1, 784), R(GatheringStorm, "Gathering Storm", 77.4, 51.6, 14459)],
    ]},
    { id: 8300, name: "Resolve", slots: [
      [R(Grasp, "Grasp of the Undying", 18.4, 47.6, 110), R(Aftershock, "Aftershock", 22.6, 48.2, 136), R(Guardian, "Guardian", 59.0, 48.8, 354)],
      [R(Demolish, "Demolish", 12.4, 49.8, 868), R(FontOfLife, "Font of Life", 14.2, 49.4, 994), R(ShieldBash, "Shield Bash", 73.4, 50.6, 5138)],
      [R(Conditioning, "Conditioning", 24.6, 51.2, 1722), R(SecondWind, "Second Wind", 42.8, 50.4, 2996), R(BonePlating, "Bone Plating", 32.6, 50.2, 2282)],
      [R(Overgrowth, "Overgrowth", 52.4, 50.8, 3668), R(Revitalize, "Revitalize", 24.8, 50.2, 1736), R(Unflinching, "Unflinching", 22.8, 49.6, 1596)],
    ]},
    { id: 8400, name: "Inspiration", slots: [
      [R(Glacial, "Glacial Augment", 12.4, 47.8, 62), R(Spellbook, "Unsealed Spellbook", 8.2, 46.4, 41), R(FirstStrike, "First Strike", 79.4, 49.2, 397)],
      [R(HexFlash, "Hextech Flashtraption", 6.2, 48.4, 310), R(MagicBoots, "Magical Footwear", 58.4, 51.2, 2920), R(CashBack, "Cash Back", 35.4, 50.4, 1770)],
      [R(FuturesMarket, "Future's Market", 32.6, 50.8, 1630), R(MinionDemat, "Minion Dematerializer", 8.4, 49.2, 420), R(Biscuit, "Biscuit Delivery", 59.0, 51.4, 2950)],
      [R(CosmicInsight, "Cosmic Insight", 48.2, 51.0, 2410), R(ApproachVel, "Approach Velocity", 28.6, 50.6, 1430), R(TimeWarp, "Time Warp Tonic", 23.2, 49.8, 1160)],
    ]},
  ],
  shards: [
    { label: "Offense", options: [S(AdaptiveForce, "Adaptive Force", 12.4, 50.2, 4712), S(AttackSpeed, "Attack Speed", 84.2, 51.4, 31996), S(AbilityHaste, "Ability Haste", 3.4, 48.6, 1292)] },
    { label: "Flex", options: [S(AdaptiveForce, "Adaptive Force", 68.4, 51.2, 25992), S(Armor, "Armor", 22.6, 50.8, 8588), S(MagicResist, "Magic Resist", 9.0, 50.2, 3420)] },
    { label: "Defense", options: [S(HealthScaling, "Health", 44.8, 51.2, 17024), S(Armor, "Armor", 38.4, 51.4, 14592), S(MagicResist, "Magic Resist", 16.8, 50.4, 6384)] },
  ],
  itemSlots: [
    { label: "1st Item", items: [
      I(6672, "Kraken Slayer", 52.4, 48.6, 18468), I(3085, "Runaan's Hurricane", 50.2, 18.4, 6992),
      I(3094, "Rapid Firecannon", 49.8, 12.8, 4864), I(3031, "Infinity Edge", 51.6, 11.4, 4332),
      I(3046, "Phantom Dancer", 49.4, 8.8, 3344),
    ]},
    { label: "2nd Item", items: [
      I(3085, "Runaan's Hurricane", 52.8, 38.4, 14592), I(3031, "Infinity Edge", 53.4, 28.6, 10868),
      I(3094, "Rapid Firecannon", 50.6, 14.2, 5396), I(3046, "Phantom Dancer", 50.2, 10.4, 3952),
      I(3072, "Bloodthirster", 51.4, 8.4, 3192),
    ]},
    { label: "3rd Item", items: [
      I(3031, "Infinity Edge", 54.8, 34.6, 13148), I(3036, "Lord Dominik's Regards", 52.4, 24.2, 9196),
      I(3094, "Rapid Firecannon", 51.2, 16.8, 6384), I(3072, "Bloodthirster", 52.6, 14.2, 5396),
      I(3033, "Mortal Reminder", 50.4, 10.2, 3876),
    ]},
  ],
  builds: [
    {
      name: "Most Popular", winRate: 51.6, pickRate: 54.2, games: 20596,
      primaryTree: 8000, keystoneId: LT, primaryRunes: [Triumph, Alacrity, CdG],
      secondaryTree: 8200, secondaryRunes: [AbsFocus, GatheringStorm],
      shards: [AttackSpeed, AdaptiveForce, HealthScaling],
      summonerSpells: [4, 7], skillOrder: "Q > W > E",
      startingItems: [{ id: 1055, name: "Doran's Blade" }, { id: 2003, name: "Health Potion" }],
      coreItems: [
        { id: 6672, name: "Kraken Slayer", winRate: 52.4, slot: "52.4% as 1st item" },
        { id: 3085, name: "Runaan's Hurricane", winRate: 52.8, slot: "52.8% as 2nd item" },
        { id: 3031, name: "Infinity Edge", winRate: 54.8, slot: "54.8% as 3rd item" },
      ],
    },
    {
      name: "Highest Win Rate", winRate: 53.8, pickRate: 11.2, games: 4256,
      primaryTree: 8000, keystoneId: LT, primaryRunes: [Triumph, Bloodline, CutDown],
      secondaryTree: 8200, secondaryRunes: [NimbusCloak, GatheringStorm],
      shards: [AttackSpeed, AdaptiveForce, Armor],
      summonerSpells: [4, 7], skillOrder: "Q > W > E",
      startingItems: [{ id: 1055, name: "Doran's Blade" }, { id: 2003, name: "Health Potion" }],
      coreItems: [
        { id: 6672, name: "Kraken Slayer", winRate: 53.2, slot: "53.2% as 1st item" },
        { id: 3031, name: "Infinity Edge", winRate: 53.4, slot: "53.4% as 2nd item" },
        { id: 3036, name: "Lord Dominik's Regards", winRate: 52.4, slot: "52.4% as 3rd item" },
      ],
    },
  ],
};

/* ═══════════════════════════════════════════════
   THRESH — Support · 22 000 games
   Primary: Resolve (Aftershock)  Secondary: Inspiration
   ═══════════════════════════════════════════════ */

const THRESH: SampleChampionData = {
  id: 412, name: "Thresh", role: "Support",
  games: 22000, winRate: 50.4, pickRate: 9.6, banRate: 3.8,
  patch: "16.5", updatedAt: ts(5),
  runeTrees: [
    { id: 8000, name: "Precision", slots: [
      [R(PtA, "Press the Attack", 32.4, 48.8, 194), R(LT, "Lethal Tempo", 8.6, 46.4, 52), R(Fleet, "Fleet Footwork", 38.2, 49.4, 229), R(Conq, "Conqueror", 20.8, 48.2, 125)],
      [R(Overheal, "Overheal", 6.2, 48.4, 248), R(Triumph, "Triumph", 68.4, 50.6, 2736), R(PoM, "Presence of Mind", 25.4, 49.8, 1016)],
      [R(Alacrity, "Legend: Alacrity", 42.6, 50.2, 1704), R(Tenacity, "Legend: Tenacity", 38.4, 50.4, 1536), R(Bloodline, "Legend: Bloodline", 19.0, 49.6, 760)],
      [R(CdG, "Coup de Grace", 48.2, 50.2, 1928), R(CutDown, "Cut Down", 22.4, 49.8, 896), R(LastStand, "Last Stand", 29.4, 50.4, 1176)],
    ]},
    { id: 8100, name: "Domination", slots: [
      [R(Elec, "Electrocute", 48.6, 49.4, 340), R(Pred, "Predator", 12.4, 48.2, 87), R(DH, "Dark Harvest", 24.8, 48.6, 174), R(HoB, "Hail of Blades", 14.2, 48.8, 99)],
      [R(CheapShot, "Cheap Shot", 28.4, 50.2, 1562), R(ToB, "Taste of Blood", 42.6, 50.4, 2343), R(SuddenImp, "Sudden Impact", 29.0, 49.8, 1595)],
      [R(ZombieWard, "Zombie Ward", 34.2, 50.8, 1881), R(GhostPoro, "Ghost Poro", 18.6, 50.0, 1023), R(Eyeball, "Eyeball Collection", 47.2, 50.2, 2596)],
      [R(TreasureH, "Treasure Hunter", 28.4, 49.8, 1562), R(IngeniousH, "Ingenious Hunter", 38.2, 50.6, 2101), R(RelentlessH, "Relentless Hunter", 33.4, 50.2, 1837)],
    ]},
    { id: 8200, name: "Sorcery", slots: [
      [R(Aery, "Summon Aery", 42.4, 49.2, 170), R(Comet, "Arcane Comet", 28.6, 48.8, 114), R(PhaseRush, "Phase Rush", 29.0, 49.6, 116)],
      [R(NullOrb, "Nullifying Orb", 8.4, 49.4, 277), R(Manaflow, "Manaflow Band", 52.6, 50.4, 1736), R(NimbusCloak, "Nimbus Cloak", 39.0, 50.2, 1287)],
      [R(Transcendence, "Transcendence", 48.2, 50.6, 1591), R(Celerity, "Celerity", 32.4, 50.0, 1069), R(AbsFocus, "Absolute Focus", 19.4, 49.4, 640)],
      [R(Scorch, "Scorch", 38.6, 50.2, 1274), R(Waterwalking, "Waterwalking", 12.4, 49.4, 409), R(GatheringStorm, "Gathering Storm", 49.0, 50.6, 1617)],
    ]},
    { id: 8300, name: "Resolve", slots: [
      [R(Grasp, "Grasp of the Undying", 8.4, 49.2, 1545), R(Aftershock, "Aftershock", 72.6, 50.8, 13358), R(Guardian, "Guardian", 19.0, 50.2, 3497)],
      [R(Demolish, "Demolish", 22.4, 50.2, 4118), R(FontOfLife, "Font of Life", 58.6, 50.6, 10781), R(ShieldBash, "Shield Bash", 19.0, 49.8, 3494)],
      [R(Conditioning, "Conditioning", 28.4, 51.2, 5225), R(SecondWind, "Second Wind", 32.6, 50.4, 5998), R(BonePlating, "Bone Plating", 39.0, 50.6, 7177)],
      [R(Overgrowth, "Overgrowth", 28.6, 50.2, 5262), R(Revitalize, "Revitalize", 42.4, 51.0, 7802), R(Unflinching, "Unflinching", 29.0, 50.4, 5336)],
    ]},
    { id: 8400, name: "Inspiration", slots: [
      [R(Glacial, "Glacial Augment", 42.4, 49.6, 424), R(Spellbook, "Unsealed Spellbook", 18.2, 48.4, 182), R(FirstStrike, "First Strike", 39.4, 49.8, 394)],
      [R(HexFlash, "Hextech Flashtraption", 38.4, 50.4, 4224), R(MagicBoots, "Magical Footwear", 32.6, 50.6, 3586), R(CashBack, "Cash Back", 29.0, 50.2, 3190)],
      [R(FuturesMarket, "Future's Market", 24.2, 50.0, 2662), R(MinionDemat, "Minion Dematerializer", 8.4, 49.2, 924), R(Biscuit, "Biscuit Delivery", 67.4, 50.8, 7414)],
      [R(CosmicInsight, "Cosmic Insight", 62.4, 50.8, 6864), R(ApproachVel, "Approach Velocity", 18.6, 50.0, 2046), R(TimeWarp, "Time Warp Tonic", 19.0, 49.6, 2090)],
    ]},
  ],
  shards: [
    { label: "Offense", options: [S(AdaptiveForce, "Adaptive Force", 28.4, 50.2, 6248), S(AttackSpeed, "Attack Speed", 14.2, 49.4, 3124), S(AbilityHaste, "Ability Haste", 57.4, 50.6, 12628)] },
    { label: "Flex", options: [S(AdaptiveForce, "Adaptive Force", 22.8, 49.8, 5016), S(Armor, "Armor", 48.6, 50.6, 10692), S(MagicResist, "Magic Resist", 28.6, 50.2, 6292)] },
    { label: "Defense", options: [S(HealthScaling, "Health", 62.4, 50.6, 13728), S(Armor, "Armor", 24.2, 50.2, 5324), S(MagicResist, "Magic Resist", 13.4, 49.8, 2948)] },
  ],
  itemSlots: [
    { label: "1st Item", items: [
      I(3190, "Locket of the Iron Solari", 51.4, 32.8, 7216), I(3109, "Knight's Vow", 50.8, 24.6, 5412),
      I(3050, "Zeke's Convergence", 50.2, 18.4, 4048), I(3107, "Redemption", 51.6, 14.2, 3124),
      I(3110, "Frozen Heart", 49.8, 10.0, 2200),
    ]},
    { label: "2nd Item", items: [
      I(3109, "Knight's Vow", 51.2, 28.4, 6248), I(3050, "Zeke's Convergence", 50.6, 22.8, 5016),
      I(3107, "Redemption", 51.8, 20.4, 4488), I(3190, "Locket of the Iron Solari", 50.4, 16.2, 3564),
      I(3222, "Mikael's Blessing", 50.2, 12.2, 2684),
    ]},
    { label: "3rd Item", items: [
      I(3107, "Redemption", 52.4, 26.4, 5808), I(3050, "Zeke's Convergence", 51.2, 22.6, 4972),
      I(3222, "Mikael's Blessing", 51.4, 18.8, 4136), I(3110, "Frozen Heart", 50.6, 17.4, 3828),
      I(3109, "Knight's Vow", 50.2, 14.8, 3256),
    ]},
  ],
  builds: [
    {
      name: "Most Popular", winRate: 50.8, pickRate: 46.4, games: 10208,
      primaryTree: 8300, keystoneId: Aftershock, primaryRunes: [FontOfLife, BonePlating, Revitalize],
      secondaryTree: 8400, secondaryRunes: [HexFlash, Biscuit],
      shards: [AbilityHaste, Armor, HealthScaling],
      summonerSpells: [4, 14], skillOrder: "E > Q > W",
      startingItems: [{ id: 3302, name: "Relic Shield" }, { id: 2003, name: "Health Potion" }],
      coreItems: [
        { id: 3190, name: "Locket of the Iron Solari", winRate: 51.4, slot: "51.4% as 1st item" },
        { id: 3109, name: "Knight's Vow", winRate: 51.2, slot: "51.2% as 2nd item" },
        { id: 3107, name: "Redemption", winRate: 52.4, slot: "52.4% as 3rd item" },
      ],
    },
    {
      name: "Highest Win Rate", winRate: 52.8, pickRate: 12.8, games: 2816,
      primaryTree: 8300, keystoneId: Guardian, primaryRunes: [FontOfLife, Conditioning, Revitalize],
      secondaryTree: 8400, secondaryRunes: [HexFlash, CosmicInsight],
      shards: [AbilityHaste, Armor, HealthScaling],
      summonerSpells: [4, 3], skillOrder: "Q > E > W",
      startingItems: [{ id: 3302, name: "Relic Shield" }, { id: 2003, name: "Health Potion" }],
      coreItems: [
        { id: 3190, name: "Locket of the Iron Solari", winRate: 52.2, slot: "52.2% as 1st item" },
        { id: 3107, name: "Redemption", winRate: 51.8, slot: "51.8% as 2nd item" },
        { id: 3222, name: "Mikael's Blessing", winRate: 51.4, slot: "51.4% as 3rd item" },
      ],
    },
  ],
};

/* ═══════════════════════════════════════════════
   LEE SIN — Jungle · 35 000 games
   Primary: Domination (Electrocute)  Secondary: Precision
   ═══════════════════════════════════════════════ */

const LEE_SIN: SampleChampionData = {
  id: 64, name: "Lee Sin", role: "Jungle",
  games: 35000, winRate: 48.6, pickRate: 11.8, banRate: 8.4,
  patch: "16.5", updatedAt: ts(3),
  runeTrees: [
    { id: 8000, name: "Precision", slots: [
      [R(PtA, "Press the Attack", 18.4, 47.8, 1288), R(LT, "Lethal Tempo", 4.2, 45.6, 294), R(Fleet, "Fleet Footwork", 14.6, 48.2, 1022), R(Conq, "Conqueror", 62.8, 49.4, 4396)],
      [R(Overheal, "Overheal", 4.2, 46.4, 574), R(Triumph, "Triumph", 78.6, 48.8, 10742), R(PoM, "Presence of Mind", 17.2, 48.2, 2351)],
      [R(Alacrity, "Legend: Alacrity", 48.4, 48.6, 6617), R(Tenacity, "Legend: Tenacity", 38.2, 48.8, 5222), R(Bloodline, "Legend: Bloodline", 13.4, 48.2, 1832)],
      [R(CdG, "Coup de Grace", 42.6, 48.4, 5824), R(CutDown, "Cut Down", 14.8, 48.2, 2023), R(LastStand, "Last Stand", 42.6, 49.2, 5824)],
    ]},
    { id: 8100, name: "Domination", slots: [
      [R(Elec, "Electrocute", 68.4, 49.2, 16758), R(Pred, "Predator", 4.8, 46.8, 1176), R(DH, "Dark Harvest", 12.4, 47.4, 3038), R(HoB, "Hail of Blades", 14.4, 48.6, 3528)],
      [R(CheapShot, "Cheap Shot", 14.2, 48.4, 3479), R(ToB, "Taste of Blood", 22.4, 48.8, 5488), R(SuddenImp, "Sudden Impact", 63.4, 49.4, 15533)],
      [R(ZombieWard, "Zombie Ward", 18.6, 49.2, 4557), R(GhostPoro, "Ghost Poro", 12.4, 48.6, 3038), R(Eyeball, "Eyeball Collection", 69.0, 49.4, 16905)],
      [R(TreasureH, "Treasure Hunter", 52.4, 49.0, 12838), R(IngeniousH, "Ingenious Hunter", 8.2, 47.8, 2009), R(RelentlessH, "Relentless Hunter", 39.4, 49.4, 9653)],
    ]},
    { id: 8200, name: "Sorcery", slots: [
      [R(Aery, "Summon Aery", 18.4, 47.2, 110), R(Comet, "Arcane Comet", 22.6, 47.6, 136), R(PhaseRush, "Phase Rush", 59.0, 48.4, 354)],
      [R(NullOrb, "Nullifying Orb", 22.4, 48.2, 762), R(Manaflow, "Manaflow Band", 18.6, 47.8, 632), R(NimbusCloak, "Nimbus Cloak", 59.0, 48.8, 2006)],
      [R(Transcendence, "Transcendence", 52.4, 48.6, 1782), R(Celerity, "Celerity", 28.6, 48.2, 972), R(AbsFocus, "Absolute Focus", 19.0, 48.4, 646)],
      [R(Scorch, "Scorch", 28.4, 48.0, 966), R(Waterwalking, "Waterwalking", 48.2, 49.2, 1639), R(GatheringStorm, "Gathering Storm", 23.4, 48.4, 796)],
    ]},
    { id: 8300, name: "Resolve", slots: [
      [R(Grasp, "Grasp of the Undying", 28.4, 48.4, 170), R(Aftershock, "Aftershock", 42.6, 49.2, 256), R(Guardian, "Guardian", 29.0, 48.6, 174)],
      [R(Demolish, "Demolish", 18.4, 48.2, 1288), R(FontOfLife, "Font of Life", 14.2, 48.4, 994), R(ShieldBash, "Shield Bash", 67.4, 49.0, 4718)],
      [R(Conditioning, "Conditioning", 32.6, 49.4, 2282), R(SecondWind, "Second Wind", 28.4, 48.6, 1988), R(BonePlating, "Bone Plating", 39.0, 49.2, 2730)],
      [R(Overgrowth, "Overgrowth", 42.4, 49.0, 2968), R(Revitalize, "Revitalize", 28.6, 48.8, 2002), R(Unflinching, "Unflinching", 29.0, 49.4, 2030)],
    ]},
    { id: 8400, name: "Inspiration", slots: [
      [R(Glacial, "Glacial Augment", 12.4, 46.4, 50), R(Spellbook, "Unsealed Spellbook", 18.2, 47.2, 73), R(FirstStrike, "First Strike", 69.4, 48.2, 278)],
      [R(HexFlash, "Hextech Flashtraption", 14.2, 47.8, 497), R(MagicBoots, "Magical Footwear", 52.4, 48.8, 1834), R(CashBack, "Cash Back", 33.4, 48.2, 1169)],
      [R(FuturesMarket, "Future's Market", 38.4, 48.4, 1344), R(MinionDemat, "Minion Dematerializer", 8.2, 47.2, 287), R(Biscuit, "Biscuit Delivery", 53.4, 48.8, 1869)],
      [R(CosmicInsight, "Cosmic Insight", 62.4, 48.8, 2184), R(ApproachVel, "Approach Velocity", 14.2, 47.6, 497), R(TimeWarp, "Time Warp Tonic", 23.4, 48.2, 819)],
    ]},
  ],
  shards: [
    { label: "Offense", options: [S(AdaptiveForce, "Adaptive Force", 72.4, 48.8, 25340), S(AttackSpeed, "Attack Speed", 18.6, 48.2, 6510), S(AbilityHaste, "Ability Haste", 9.0, 47.6, 3150)] },
    { label: "Flex", options: [S(AdaptiveForce, "Adaptive Force", 78.4, 48.8, 27440), S(Armor, "Armor", 14.6, 48.4, 5110), S(MagicResist, "Magic Resist", 7.0, 47.8, 2450)] },
    { label: "Defense", options: [S(HealthScaling, "Health", 48.6, 48.8, 17010), S(Armor, "Armor", 34.2, 48.6, 11970), S(MagicResist, "Magic Resist", 17.2, 48.2, 6020)] },
  ],
  itemSlots: [
    { label: "1st Item", items: [
      I(6698, "Profane Hydra", 49.4, 34.6, 12110), I(3142, "Youmuu's Ghostblade", 48.8, 24.2, 8470),
      I(6692, "Eclipse", 48.2, 18.4, 6440), I(3071, "Black Cleaver", 49.6, 12.8, 4480),
      I(6697, "Hubris", 47.8, 10.0, 3500),
    ]},
    { label: "2nd Item", items: [
      I(3142, "Youmuu's Ghostblade", 49.2, 28.6, 10010), I(3814, "Edge of Night", 48.8, 22.4, 7840),
      I(6694, "Serylda's Grudge", 49.6, 18.8, 6580), I(6333, "Death's Dance", 50.2, 16.4, 5740),
      I(3071, "Black Cleaver", 49.4, 13.8, 4830),
    ]},
    { label: "3rd Item", items: [
      I(3814, "Edge of Night", 49.8, 26.4, 9240), I(6694, "Serylda's Grudge", 50.4, 24.2, 8470),
      I(6333, "Death's Dance", 51.2, 20.6, 7210), I(3053, "Sterak's Gage", 49.6, 16.2, 5670),
      I(3742, "Dead Man's Plate", 48.4, 12.6, 4410),
    ]},
  ],
  builds: [
    {
      name: "Most Popular", winRate: 49.2, pickRate: 48.8, games: 17080,
      primaryTree: 8100, keystoneId: Elec, primaryRunes: [SuddenImp, Eyeball, TreasureH],
      secondaryTree: 8000, secondaryRunes: [Triumph, LastStand],
      shards: [AdaptiveForce, AdaptiveForce, HealthScaling],
      summonerSpells: [4, 11], skillOrder: "Q > W > E",
      startingItems: [{ id: 1102, name: "Gustwalker Hatchling" }],
      coreItems: [
        { id: 6698, name: "Profane Hydra", winRate: 49.4, slot: "49.4% as 1st item" },
        { id: 3142, name: "Youmuu's Ghostblade", winRate: 49.2, slot: "49.2% as 2nd item" },
        { id: 3814, name: "Edge of Night", winRate: 49.8, slot: "49.8% as 3rd item" },
      ],
    },
    {
      name: "Highest Win Rate", winRate: 51.4, pickRate: 14.2, games: 4970,
      primaryTree: 8000, keystoneId: Conq, primaryRunes: [Triumph, Tenacity, LastStand],
      secondaryTree: 8100, secondaryRunes: [SuddenImp, Eyeball],
      shards: [AdaptiveForce, AdaptiveForce, Armor],
      summonerSpells: [4, 11], skillOrder: "Q > E > W",
      startingItems: [{ id: 1103, name: "Mosstomper Seedling" }],
      coreItems: [
        { id: 6692, name: "Eclipse", winRate: 50.2, slot: "50.2% as 1st item" },
        { id: 3071, name: "Black Cleaver", winRate: 50.8, slot: "50.8% as 2nd item" },
        { id: 6333, name: "Death's Dance", winRate: 51.2, slot: "51.2% as 3rd item" },
      ],
    },
  ],
};

/* ═══════════════════════════════════════════════
   DARIUS — Top · 30 000 games
   Primary: Precision (Conqueror)  Secondary: Resolve
   ═══════════════════════════════════════════════ */

const DARIUS: SampleChampionData = {
  id: 122, name: "Darius", role: "Top",
  games: 30000, winRate: 50.8, pickRate: 7.6, banRate: 12.4,
  patch: "16.5", updatedAt: ts(4),
  runeTrees: [
    { id: 8000, name: "Precision", slots: [
      [R(PtA, "Press the Attack", 4.2, 48.4, 1092), R(LT, "Lethal Tempo", 2.8, 47.2, 728), R(Fleet, "Fleet Footwork", 3.6, 48.8, 936), R(Conq, "Conqueror", 89.4, 51.2, 23244)],
      [R(Overheal, "Overheal", 2.4, 47.6, 624), R(Triumph, "Triumph", 88.4, 51.0, 22984), R(PoM, "Presence of Mind", 9.2, 49.6, 2392)],
      [R(Alacrity, "Legend: Alacrity", 32.4, 50.6, 8424), R(Tenacity, "Legend: Tenacity", 52.8, 51.2, 13728), R(Bloodline, "Legend: Bloodline", 14.8, 50.2, 3848)],
      [R(CdG, "Coup de Grace", 18.4, 49.8, 4784), R(CutDown, "Cut Down", 6.2, 48.4, 1612), R(LastStand, "Last Stand", 75.4, 51.4, 19604)],
    ]},
    { id: 8100, name: "Domination", slots: [
      [R(Elec, "Electrocute", 42.6, 48.6, 213), R(Pred, "Predator", 22.4, 47.4, 112), R(DH, "Dark Harvest", 24.8, 48.2, 124), R(HoB, "Hail of Blades", 10.2, 47.8, 51)],
      [R(CheapShot, "Cheap Shot", 32.4, 50.4, 1296), R(ToB, "Taste of Blood", 48.6, 50.8, 1944), R(SuddenImp, "Sudden Impact", 19.0, 49.6, 760)],
      [R(ZombieWard, "Zombie Ward", 14.2, 50.2, 568), R(GhostPoro, "Ghost Poro", 12.4, 50.0, 496), R(Eyeball, "Eyeball Collection", 73.4, 50.6, 2936)],
      [R(TreasureH, "Treasure Hunter", 38.6, 50.2, 1544), R(IngeniousH, "Ingenious Hunter", 12.4, 49.4, 496), R(RelentlessH, "Relentless Hunter", 49.0, 50.8, 1960)],
    ]},
    { id: 8200, name: "Sorcery", slots: [
      [R(Aery, "Summon Aery", 24.6, 48.4, 148), R(Comet, "Arcane Comet", 32.4, 48.8, 194), R(PhaseRush, "Phase Rush", 43.0, 49.6, 258)],
      [R(NullOrb, "Nullifying Orb", 18.4, 49.8, 736), R(Manaflow, "Manaflow Band", 22.6, 49.4, 904), R(NimbusCloak, "Nimbus Cloak", 59.0, 50.6, 2360)],
      [R(Transcendence, "Transcendence", 42.4, 50.2, 1696), R(Celerity, "Celerity", 38.6, 50.4, 1544), R(AbsFocus, "Absolute Focus", 19.0, 49.6, 760)],
      [R(Scorch, "Scorch", 32.4, 50.0, 1296), R(Waterwalking, "Waterwalking", 8.6, 49.2, 344), R(GatheringStorm, "Gathering Storm", 59.0, 50.8, 2360)],
    ]},
    { id: 8300, name: "Resolve", slots: [
      [R(Grasp, "Grasp of the Undying", 38.6, 49.4, 1544), R(Aftershock, "Aftershock", 22.4, 48.8, 896), R(Guardian, "Guardian", 39.0, 49.2, 1560)],
      [R(Demolish, "Demolish", 52.4, 51.2, 9432), R(FontOfLife, "Font of Life", 8.4, 49.4, 1512), R(ShieldBash, "Shield Bash", 39.2, 50.6, 7056)],
      [R(Conditioning, "Conditioning", 28.6, 51.4, 5148), R(SecondWind, "Second Wind", 38.4, 50.6, 6912), R(BonePlating, "Bone Plating", 33.0, 50.8, 5940)],
      [R(Overgrowth, "Overgrowth", 52.6, 51.0, 9468), R(Revitalize, "Revitalize", 18.4, 50.2, 3312), R(Unflinching, "Unflinching", 29.0, 51.2, 5220)],
    ]},
    { id: 8400, name: "Inspiration", slots: [
      [R(Glacial, "Glacial Augment", 18.2, 47.6, 73), R(Spellbook, "Unsealed Spellbook", 22.4, 48.2, 90), R(FirstStrike, "First Strike", 59.4, 48.8, 238)],
      [R(HexFlash, "Hextech Flashtraption", 12.4, 49.2, 372), R(MagicBoots, "Magical Footwear", 48.6, 50.4, 1458), R(CashBack, "Cash Back", 39.0, 50.0, 1170)],
      [R(FuturesMarket, "Future's Market", 28.4, 49.8, 852), R(MinionDemat, "Minion Dematerializer", 12.6, 49.2, 378), R(Biscuit, "Biscuit Delivery", 59.0, 50.6, 1770)],
      [R(CosmicInsight, "Cosmic Insight", 48.6, 50.2, 1458), R(ApproachVel, "Approach Velocity", 28.4, 50.0, 852), R(TimeWarp, "Time Warp Tonic", 23.0, 49.4, 690)],
    ]},
  ],
  shards: [
    { label: "Offense", options: [S(AdaptiveForce, "Adaptive Force", 68.4, 50.8, 20520), S(AttackSpeed, "Attack Speed", 22.6, 50.4, 6780), S(AbilityHaste, "Ability Haste", 9.0, 49.6, 2700)] },
    { label: "Flex", options: [S(AdaptiveForce, "Adaptive Force", 62.4, 50.8, 18720), S(Armor, "Armor", 24.2, 50.6, 7260), S(MagicResist, "Magic Resist", 13.4, 50.0, 4020)] },
    { label: "Defense", options: [S(HealthScaling, "Health", 42.8, 50.8, 12840), S(Armor, "Armor", 38.6, 51.0, 11580), S(MagicResist, "Magic Resist", 18.6, 50.2, 5580)] },
  ],
  itemSlots: [
    { label: "1st Item", items: [
      I(3078, "Trinity Force", 52.4, 42.8, 12840), I(6631, "Stridebreaker", 50.6, 24.6, 7380),
      I(3071, "Black Cleaver", 49.8, 14.2, 4260), I(3053, "Sterak's Gage", 50.2, 10.4, 3120),
      I(3742, "Dead Man's Plate", 48.6, 8.0, 2400),
    ]},
    { label: "2nd Item", items: [
      I(3053, "Sterak's Gage", 51.8, 32.4, 9720), I(3742, "Dead Man's Plate", 51.2, 22.6, 6780),
      I(6333, "Death's Dance", 52.4, 18.8, 5640), I(3071, "Black Cleaver", 50.6, 14.2, 4260),
      I(4401, "Force of Nature", 50.2, 12.0, 3600),
    ]},
    { label: "3rd Item", items: [
      I(3742, "Dead Man's Plate", 52.6, 28.4, 8520), I(6333, "Death's Dance", 53.2, 24.6, 7380),
      I(4401, "Force of Nature", 51.4, 18.2, 5460), I(3075, "Thornmail", 50.8, 16.4, 4920),
      I(3065, "Spirit Visage", 50.2, 12.4, 3720),
    ]},
  ],
  builds: [
    {
      name: "Most Popular", winRate: 51.2, pickRate: 52.8, games: 15840,
      primaryTree: 8000, keystoneId: Conq, primaryRunes: [Triumph, Tenacity, LastStand],
      secondaryTree: 8300, secondaryRunes: [Demolish, Overgrowth],
      shards: [AdaptiveForce, AdaptiveForce, HealthScaling],
      summonerSpells: [4, 6], skillOrder: "Q > E > W",
      startingItems: [{ id: 1055, name: "Doran's Blade" }, { id: 2003, name: "Health Potion" }],
      coreItems: [
        { id: 3078, name: "Trinity Force", winRate: 52.4, slot: "52.4% as 1st item" },
        { id: 3053, name: "Sterak's Gage", winRate: 51.8, slot: "51.8% as 2nd item" },
        { id: 3742, name: "Dead Man's Plate", winRate: 52.6, slot: "52.6% as 3rd item" },
      ],
    },
    {
      name: "Highest Win Rate", winRate: 53.4, pickRate: 12.4, games: 3720,
      primaryTree: 8000, keystoneId: Conq, primaryRunes: [Triumph, Tenacity, LastStand],
      secondaryTree: 8300, secondaryRunes: [SecondWind, Unflinching],
      shards: [AdaptiveForce, Armor, Armor],
      summonerSpells: [6, 12], skillOrder: "Q > E > W",
      startingItems: [{ id: 1054, name: "Doran's Shield" }, { id: 2003, name: "Health Potion" }],
      coreItems: [
        { id: 3078, name: "Trinity Force", winRate: 53.2, slot: "53.2% as 1st item" },
        { id: 6333, name: "Death's Dance", winRate: 52.4, slot: "52.4% as 2nd item" },
        { id: 3053, name: "Sterak's Gage", winRate: 53.8, slot: "53.8% as 3rd item" },
      ],
    },
  ],
};

/* ═══════════════════════════════════════════════
   ZED — Mid · 42 000 games
   Primary: Domination (Electrocute)  Secondary: Sorcery
   ═══════════════════════════════════════════════ */

const ZED: SampleChampionData = {
  id: 238, name: "Zed", role: "Mid",
  games: 42000, winRate: 49.8, pickRate: 11.2, banRate: 18.6,
  patch: "16.5", updatedAt: ts(2),
  runeTrees: [
    { id: 8000, name: "Precision", slots: [
      [R(PtA, "Press the Attack", 22.4, 47.8, 538), R(LT, "Lethal Tempo", 8.6, 46.2, 206), R(Fleet, "Fleet Footwork", 38.2, 48.6, 917), R(Conq, "Conqueror", 30.8, 48.2, 739)],
      [R(Overheal, "Overheal", 4.2, 47.2, 504), R(Triumph, "Triumph", 72.4, 49.8, 8688), R(PoM, "Presence of Mind", 23.4, 49.2, 2808)],
      [R(Alacrity, "Legend: Alacrity", 38.6, 49.4, 4632), R(Tenacity, "Legend: Tenacity", 42.4, 49.8, 5088), R(Bloodline, "Legend: Bloodline", 19.0, 49.2, 2280)],
      [R(CdG, "Coup de Grace", 52.6, 49.6, 6312), R(CutDown, "Cut Down", 18.4, 49.2, 2208), R(LastStand, "Last Stand", 29.0, 49.8, 3480)],
    ]},
    { id: 8100, name: "Domination", slots: [
      [R(Elec, "Electrocute", 78.4, 50.2, 27384), R(Pred, "Predator", 2.4, 46.8, 838), R(DH, "Dark Harvest", 8.6, 48.4, 3003), R(HoB, "Hail of Blades", 10.6, 49.4, 3703)],
      [R(CheapShot, "Cheap Shot", 12.4, 49.4, 4331), R(ToB, "Taste of Blood", 28.6, 49.8, 9987), R(SuddenImp, "Sudden Impact", 59.0, 50.4, 20601)],
      [R(ZombieWard, "Zombie Ward", 8.4, 49.6, 2934), R(GhostPoro, "Ghost Poro", 6.2, 49.2, 2165), R(Eyeball, "Eyeball Collection", 85.4, 50.2, 29829)],
      [R(TreasureH, "Treasure Hunter", 48.6, 49.8, 16973), R(IngeniousH, "Ingenious Hunter", 8.2, 48.6, 2864), R(RelentlessH, "Relentless Hunter", 43.2, 50.4, 15091)],
    ]},
    { id: 8200, name: "Sorcery", slots: [
      [R(Aery, "Summon Aery", 18.4, 47.8, 110), R(Comet, "Arcane Comet", 28.6, 48.4, 172), R(PhaseRush, "Phase Rush", 53.0, 49.2, 318)],
      [R(NullOrb, "Nullifying Orb", 28.4, 49.8, 3976), R(Manaflow, "Manaflow Band", 32.6, 49.6, 4564), R(NimbusCloak, "Nimbus Cloak", 39.0, 50.2, 5460)],
      [R(Transcendence, "Transcendence", 62.4, 50.2, 8736), R(Celerity, "Celerity", 18.6, 49.4, 2604), R(AbsFocus, "Absolute Focus", 19.0, 49.8, 2660)],
      [R(Scorch, "Scorch", 42.8, 49.6, 5992), R(Waterwalking, "Waterwalking", 8.4, 48.8, 1176), R(GatheringStorm, "Gathering Storm", 48.8, 50.4, 6832)],
    ]},
    { id: 8300, name: "Resolve", slots: [
      [R(Grasp, "Grasp of the Undying", 22.4, 48.2, 90), R(Aftershock, "Aftershock", 28.6, 48.6, 114), R(Guardian, "Guardian", 49.0, 49.0, 196)],
      [R(Demolish, "Demolish", 14.2, 48.8, 852), R(FontOfLife, "Font of Life", 8.4, 48.2, 504), R(ShieldBash, "Shield Bash", 77.4, 49.4, 4644)],
      [R(Conditioning, "Conditioning", 22.4, 49.8, 1344), R(SecondWind, "Second Wind", 38.6, 49.4, 2316), R(BonePlating, "Bone Plating", 39.0, 49.6, 2340)],
      [R(Overgrowth, "Overgrowth", 42.4, 49.2, 2544), R(Revitalize, "Revitalize", 28.6, 49.0, 1716), R(Unflinching, "Unflinching", 29.0, 49.6, 1740)],
    ]},
    { id: 8400, name: "Inspiration", slots: [
      [R(Glacial, "Glacial Augment", 8.4, 46.8, 42), R(Spellbook, "Unsealed Spellbook", 12.6, 47.4, 63), R(FirstStrike, "First Strike", 79.0, 48.8, 395)],
      [R(HexFlash, "Hextech Flashtraption", 8.2, 48.4, 410), R(MagicBoots, "Magical Footwear", 52.4, 49.8, 2620), R(CashBack, "Cash Back", 39.4, 49.2, 1970)],
      [R(FuturesMarket, "Future's Market", 32.4, 49.4, 1620), R(MinionDemat, "Minion Dematerializer", 18.6, 49.0, 930), R(Biscuit, "Biscuit Delivery", 49.0, 49.8, 2450)],
      [R(CosmicInsight, "Cosmic Insight", 52.6, 49.8, 2630), R(ApproachVel, "Approach Velocity", 12.4, 48.6, 620), R(TimeWarp, "Time Warp Tonic", 35.0, 49.4, 1750)],
    ]},
  ],
  shards: [
    { label: "Offense", options: [S(AdaptiveForce, "Adaptive Force", 88.4, 50.0, 37128), S(AttackSpeed, "Attack Speed", 4.2, 47.8, 1764), S(AbilityHaste, "Ability Haste", 7.4, 49.2, 3108)] },
    { label: "Flex", options: [S(AdaptiveForce, "Adaptive Force", 72.6, 50.0, 30492), S(Armor, "Armor", 18.4, 49.6, 7728), S(MagicResist, "Magic Resist", 9.0, 49.2, 3780)] },
    { label: "Defense", options: [S(HealthScaling, "Health", 48.4, 49.8, 20328), S(Armor, "Armor", 34.2, 50.2, 14364), S(MagicResist, "Magic Resist", 17.4, 49.4, 7308)] },
  ],
  itemSlots: [
    { label: "1st Item", items: [
      I(3142, "Youmuu's Ghostblade", 50.4, 38.6, 16212), I(6698, "Profane Hydra", 50.2, 24.4, 10248),
      I(6697, "Hubris", 49.8, 16.2, 6804), I(6692, "Eclipse", 48.6, 12.4, 5208),
      I(3814, "Edge of Night", 49.2, 8.4, 3528),
    ]},
    { label: "2nd Item", items: [
      I(6698, "Profane Hydra", 50.8, 28.4, 11928), I(3814, "Edge of Night", 50.2, 22.6, 9492),
      I(6694, "Serylda's Grudge", 50.6, 18.8, 7896), I(6697, "Hubris", 49.4, 16.2, 6804),
      I(6333, "Death's Dance", 50.4, 14.0, 5880),
    ]},
    { label: "3rd Item", items: [
      I(6694, "Serylda's Grudge", 51.4, 28.6, 12012), I(3814, "Edge of Night", 50.8, 24.2, 10164),
      I(6333, "Death's Dance", 51.8, 18.4, 7728), I(3053, "Sterak's Gage", 50.2, 16.8, 7056),
      I(3742, "Dead Man's Plate", 49.4, 12.0, 5040),
    ]},
  ],
  builds: [
    {
      name: "Most Popular", winRate: 50.2, pickRate: 52.4, games: 22008,
      primaryTree: 8100, keystoneId: Elec, primaryRunes: [SuddenImp, Eyeball, TreasureH],
      secondaryTree: 8200, secondaryRunes: [Transcendence, Scorch],
      shards: [AdaptiveForce, AdaptiveForce, HealthScaling],
      summonerSpells: [4, 14], skillOrder: "Q > W > E",
      startingItems: [{ id: 1036, name: "Long Sword" }, { id: 2031, name: "Refillable Potion" }],
      coreItems: [
        { id: 3142, name: "Youmuu's Ghostblade", winRate: 50.4, slot: "50.4% as 1st item" },
        { id: 6698, name: "Profane Hydra", winRate: 50.8, slot: "50.8% as 2nd item" },
        { id: 6694, name: "Serylda's Grudge", winRate: 51.4, slot: "51.4% as 3rd item" },
      ],
    },
    {
      name: "Highest Win Rate", winRate: 52.4, pickRate: 14.6, games: 6132,
      primaryTree: 8100, keystoneId: Elec, primaryRunes: [SuddenImp, Eyeball, RelentlessH],
      secondaryTree: 8200, secondaryRunes: [NullOrb, GatheringStorm],
      shards: [AdaptiveForce, AdaptiveForce, Armor],
      summonerSpells: [4, 14], skillOrder: "Q > E > W",
      startingItems: [{ id: 1036, name: "Long Sword" }, { id: 2031, name: "Refillable Potion" }],
      coreItems: [
        { id: 3142, name: "Youmuu's Ghostblade", winRate: 51.2, slot: "51.2% as 1st item" },
        { id: 3814, name: "Edge of Night", winRate: 50.2, slot: "50.2% as 2nd item" },
        { id: 6694, name: "Serylda's Grudge", winRate: 51.4, slot: "51.4% as 3rd item" },
      ],
    },
  ],
};

/* ═══════════════════════════════════════════════
   LUX — Support · 25 000 games
   Primary: Sorcery (Arcane Comet)  Secondary: Inspiration
   ═══════════════════════════════════════════════ */

const LUX: SampleChampionData = {
  id: 99, name: "Lux", role: "Support",
  games: 25000, winRate: 51.4, pickRate: 8.8, banRate: 6.2,
  patch: "16.5", updatedAt: ts(3),
  runeTrees: [
    { id: 8000, name: "Precision", slots: [
      [R(PtA, "Press the Attack", 12.4, 47.6, 62), R(LT, "Lethal Tempo", 8.2, 46.2, 41), R(Fleet, "Fleet Footwork", 48.6, 49.8, 243), R(Conq, "Conqueror", 30.8, 48.4, 154)],
      [R(Overheal, "Overheal", 8.2, 48.4, 410), R(Triumph, "Triumph", 58.4, 50.6, 2920), R(PoM, "Presence of Mind", 33.4, 50.8, 1670)],
      [R(Alacrity, "Legend: Alacrity", 18.4, 49.2, 920), R(Tenacity, "Legend: Tenacity", 22.6, 49.8, 1130), R(Bloodline, "Legend: Bloodline", 59.0, 50.4, 2950)],
      [R(CdG, "Coup de Grace", 58.4, 50.4, 2920), R(CutDown, "Cut Down", 22.6, 49.8, 1130), R(LastStand, "Last Stand", 19.0, 49.2, 950)],
    ]},
    { id: 8100, name: "Domination", slots: [
      [R(Elec, "Electrocute", 52.4, 49.8, 524), R(Pred, "Predator", 4.2, 46.4, 42), R(DH, "Dark Harvest", 32.8, 49.2, 328), R(HoB, "Hail of Blades", 10.6, 48.4, 106)],
      [R(CheapShot, "Cheap Shot", 42.6, 50.8, 2663), R(ToB, "Taste of Blood", 38.4, 51.2, 2400), R(SuddenImp, "Sudden Impact", 19.0, 49.4, 1188)],
      [R(ZombieWard, "Zombie Ward", 18.4, 50.4, 1150), R(GhostPoro, "Ghost Poro", 14.2, 50.0, 888), R(Eyeball, "Eyeball Collection", 67.4, 51.2, 4213)],
      [R(TreasureH, "Treasure Hunter", 42.6, 50.6, 2663), R(IngeniousH, "Ingenious Hunter", 18.4, 50.2, 1150), R(RelentlessH, "Relentless Hunter", 39.0, 51.0, 2438)],
    ]},
    { id: 8200, name: "Sorcery", slots: [
      [R(Aery, "Summon Aery", 22.6, 50.6, 4520), R(Comet, "Arcane Comet", 68.4, 51.8, 13680), R(PhaseRush, "Phase Rush", 9.0, 49.2, 1800)],
      [R(NullOrb, "Nullifying Orb", 8.4, 50.4, 1680), R(Manaflow, "Manaflow Band", 78.2, 51.8, 15640), R(NimbusCloak, "Nimbus Cloak", 13.4, 50.2, 2680)],
      [R(Transcendence, "Transcendence", 72.4, 51.6, 14480), R(Celerity, "Celerity", 8.2, 49.8, 1640), R(AbsFocus, "Absolute Focus", 19.4, 50.8, 3880)],
      [R(Scorch, "Scorch", 52.6, 51.2, 10520), R(Waterwalking, "Waterwalking", 4.2, 49.4, 840), R(GatheringStorm, "Gathering Storm", 43.2, 51.6, 8640)],
    ]},
    { id: 8300, name: "Resolve", slots: [
      [R(Grasp, "Grasp of the Undying", 18.4, 48.6, 92), R(Aftershock, "Aftershock", 32.6, 49.4, 163), R(Guardian, "Guardian", 49.0, 49.8, 245)],
      [R(Demolish, "Demolish", 12.4, 49.6, 620), R(FontOfLife, "Font of Life", 52.4, 50.8, 2620), R(ShieldBash, "Shield Bash", 35.2, 50.2, 1760)],
      [R(Conditioning, "Conditioning", 28.4, 50.6, 1420), R(SecondWind, "Second Wind", 38.6, 50.2, 1930), R(BonePlating, "Bone Plating", 33.0, 50.4, 1650)],
      [R(Overgrowth, "Overgrowth", 32.4, 50.4, 1620), R(Revitalize, "Revitalize", 48.6, 51.2, 2430), R(Unflinching, "Unflinching", 19.0, 49.8, 950)],
    ]},
    { id: 8400, name: "Inspiration", slots: [
      [R(Glacial, "Glacial Augment", 22.6, 49.4, 226), R(Spellbook, "Unsealed Spellbook", 8.4, 48.2, 84), R(FirstStrike, "First Strike", 69.0, 50.4, 690)],
      [R(HexFlash, "Hextech Flashtraption", 8.2, 49.6, 615), R(MagicBoots, "Magical Footwear", 58.4, 51.4, 4380), R(CashBack, "Cash Back", 33.4, 50.6, 2505)],
      [R(FuturesMarket, "Future's Market", 18.4, 50.2, 1380), R(MinionDemat, "Minion Dematerializer", 12.6, 49.8, 945), R(Biscuit, "Biscuit Delivery", 69.0, 51.4, 5175)],
      [R(CosmicInsight, "Cosmic Insight", 62.4, 51.6, 4680), R(ApproachVel, "Approach Velocity", 14.2, 50.2, 1065), R(TimeWarp, "Time Warp Tonic", 23.4, 50.0, 1755)],
    ]},
  ],
  shards: [
    { label: "Offense", options: [S(AdaptiveForce, "Adaptive Force", 88.6, 51.6, 22150), S(AttackSpeed, "Attack Speed", 2.4, 48.2, 600), S(AbilityHaste, "Ability Haste", 9.0, 50.4, 2250)] },
    { label: "Flex", options: [S(AdaptiveForce, "Adaptive Force", 72.4, 51.4, 18100), S(Armor, "Armor", 18.6, 51.0, 4650), S(MagicResist, "Magic Resist", 9.0, 50.6, 2250)] },
    { label: "Defense", options: [S(HealthScaling, "Health", 58.4, 51.4, 14600), S(Armor, "Armor", 28.2, 51.2, 7050), S(MagicResist, "Magic Resist", 13.4, 50.8, 3350)] },
  ],
  itemSlots: [
    { label: "1st Item", items: [
      I(6655, "Luden's Companion", 52.6, 42.4, 10600), I(4645, "Shadowflame", 51.8, 22.6, 5650),
      I(6653, "Stormsurge", 52.2, 14.8, 3700), I(3107, "Redemption", 50.4, 12.2, 3050),
      I(3504, "Ardent Censer", 49.8, 8.0, 2000),
    ]},
    { label: "2nd Item", items: [
      I(4645, "Shadowflame", 52.8, 32.4, 8100), I(3089, "Rabadon's Deathcap", 54.2, 22.8, 5700),
      I(3157, "Zhonya's Hourglass", 51.4, 18.2, 4550), I(3107, "Redemption", 50.8, 14.6, 3650),
      I(3135, "Void Staff", 52.4, 12.0, 3000),
    ]},
    { label: "3rd Item", items: [
      I(3089, "Rabadon's Deathcap", 55.4, 28.4, 7100), I(3135, "Void Staff", 53.2, 24.6, 6150),
      I(3157, "Zhonya's Hourglass", 52.6, 20.4, 5100), I(3102, "Banshee's Veil", 50.8, 14.2, 3550),
      I(4645, "Shadowflame", 51.4, 12.4, 3100),
    ]},
  ],
  builds: [
    {
      name: "Most Popular", winRate: 51.8, pickRate: 48.6, games: 12150,
      primaryTree: 8200, keystoneId: Comet, primaryRunes: [Manaflow, Transcendence, Scorch],
      secondaryTree: 8400, secondaryRunes: [MagicBoots, Biscuit],
      shards: [AdaptiveForce, AdaptiveForce, HealthScaling],
      summonerSpells: [4, 14], skillOrder: "E > Q > W",
      startingItems: [{ id: 3303, name: "Spellthief's Edge" }, { id: 2003, name: "Health Potion" }],
      coreItems: [
        { id: 6655, name: "Luden's Companion", winRate: 52.6, slot: "52.6% as 1st item" },
        { id: 4645, name: "Shadowflame", winRate: 52.8, slot: "52.8% as 2nd item" },
        { id: 3089, name: "Rabadon's Deathcap", winRate: 55.4, slot: "55.4% as 3rd item" },
      ],
    },
    {
      name: "Highest Win Rate", winRate: 53.6, pickRate: 11.4, games: 2850,
      primaryTree: 8200, keystoneId: Comet, primaryRunes: [Manaflow, Transcendence, GatheringStorm],
      secondaryTree: 8400, secondaryRunes: [MagicBoots, CosmicInsight],
      shards: [AdaptiveForce, AdaptiveForce, Armor],
      summonerSpells: [4, 3], skillOrder: "E > Q > W",
      startingItems: [{ id: 3303, name: "Spellthief's Edge" }, { id: 2003, name: "Health Potion" }],
      coreItems: [
        { id: 6655, name: "Luden's Companion", winRate: 53.4, slot: "53.4% as 1st item" },
        { id: 3089, name: "Rabadon's Deathcap", winRate: 54.2, slot: "54.2% as 2nd item" },
        { id: 3135, name: "Void Staff", winRate: 53.2, slot: "53.2% as 3rd item" },
      ],
    },
  ],
};

/* ═══════════════════════════════════════════════
   VI — Jungle · 18 000 games
   Primary: Precision (Conqueror) / Domination (HoB)  Secondary: Resolve
   ═══════════════════════════════════════════════ */

const VI: SampleChampionData = {
  id: 254, name: "Vi", role: "Jungle",
  games: 18000, winRate: 51.4, pickRate: 5.2, banRate: 2.8,
  patch: "16.5", updatedAt: ts(5),
  runeTrees: [
    { id: 8000, name: "Precision", slots: [
      [R(PtA, "Press the Attack", 12.4, 50.2, 1364), R(LT, "Lethal Tempo", 4.2, 48.4, 462), R(Fleet, "Fleet Footwork", 8.6, 49.6, 946), R(Conq, "Conqueror", 74.8, 51.8, 8228)],
      [R(Overheal, "Overheal", 4.2, 48.6, 462), R(Triumph, "Triumph", 82.4, 51.6, 9064), R(PoM, "Presence of Mind", 13.4, 50.2, 1474)],
      [R(Alacrity, "Legend: Alacrity", 42.6, 51.2, 4686), R(Tenacity, "Legend: Tenacity", 44.8, 51.6, 4928), R(Bloodline, "Legend: Bloodline", 12.6, 50.4, 1386)],
      [R(CdG, "Coup de Grace", 38.4, 51.2, 4224), R(CutDown, "Cut Down", 12.6, 50.4, 1386), R(LastStand, "Last Stand", 49.0, 51.8, 5390)],
    ]},
    { id: 8100, name: "Domination", slots: [
      [R(Elec, "Electrocute", 28.6, 50.2, 2574), R(Pred, "Predator", 4.2, 47.8, 378), R(DH, "Dark Harvest", 12.4, 49.4, 1116), R(HoB, "Hail of Blades", 54.8, 51.6, 4932)],
      [R(CheapShot, "Cheap Shot", 18.4, 50.6, 1656), R(ToB, "Taste of Blood", 32.6, 51.0, 2934), R(SuddenImp, "Sudden Impact", 49.0, 51.4, 4410)],
      [R(ZombieWard, "Zombie Ward", 18.6, 50.8, 1674), R(GhostPoro, "Ghost Poro", 12.4, 50.2, 1116), R(Eyeball, "Eyeball Collection", 69.0, 51.2, 6210)],
      [R(TreasureH, "Treasure Hunter", 42.4, 50.8, 3816), R(IngeniousH, "Ingenious Hunter", 14.2, 50.2, 1278), R(RelentlessH, "Relentless Hunter", 43.4, 51.4, 3906)],
    ]},
    { id: 8200, name: "Sorcery", slots: [
      [R(Aery, "Summon Aery", 22.4, 48.4, 67), R(Comet, "Arcane Comet", 28.6, 48.8, 86), R(PhaseRush, "Phase Rush", 49.0, 49.6, 147)],
      [R(NullOrb, "Nullifying Orb", 28.4, 50.2, 511), R(Manaflow, "Manaflow Band", 18.6, 49.6, 335), R(NimbusCloak, "Nimbus Cloak", 53.0, 50.8, 954)],
      [R(Transcendence, "Transcendence", 48.4, 50.4, 871), R(Celerity, "Celerity", 32.6, 50.0, 587), R(AbsFocus, "Absolute Focus", 19.0, 49.6, 342)],
      [R(Scorch, "Scorch", 22.4, 49.8, 403), R(Waterwalking, "Waterwalking", 52.6, 51.2, 947), R(GatheringStorm, "Gathering Storm", 25.0, 50.2, 450)],
    ]},
    { id: 8300, name: "Resolve", slots: [
      [R(Grasp, "Grasp of the Undying", 28.4, 49.8, 170), R(Aftershock, "Aftershock", 48.6, 50.4, 292), R(Guardian, "Guardian", 23.0, 49.2, 138)],
      [R(Demolish, "Demolish", 22.4, 50.8, 2016), R(FontOfLife, "Font of Life", 14.2, 50.2, 1278), R(ShieldBash, "Shield Bash", 63.4, 51.4, 5706)],
      [R(Conditioning, "Conditioning", 32.6, 51.6, 2934), R(SecondWind, "Second Wind", 28.4, 50.8, 2556), R(BonePlating, "Bone Plating", 39.0, 51.2, 3510)],
      [R(Overgrowth, "Overgrowth", 48.6, 51.2, 4374), R(Revitalize, "Revitalize", 22.4, 50.6, 2016), R(Unflinching, "Unflinching", 29.0, 51.4, 2610)],
    ]},
    { id: 8400, name: "Inspiration", slots: [
      [R(Glacial, "Glacial Augment", 12.4, 48.2, 37), R(Spellbook, "Unsealed Spellbook", 8.6, 47.4, 26), R(FirstStrike, "First Strike", 79.0, 49.8, 237)],
      [R(HexFlash, "Hextech Flashtraption", 14.2, 49.4, 426), R(MagicBoots, "Magical Footwear", 52.4, 50.8, 1572), R(CashBack, "Cash Back", 33.4, 50.2, 1002)],
      [R(FuturesMarket, "Future's Market", 32.6, 50.4, 978), R(MinionDemat, "Minion Dematerializer", 8.4, 49.2, 252), R(Biscuit, "Biscuit Delivery", 59.0, 51.0, 1770)],
      [R(CosmicInsight, "Cosmic Insight", 52.4, 50.8, 1572), R(ApproachVel, "Approach Velocity", 22.6, 50.2, 678), R(TimeWarp, "Time Warp Tonic", 25.0, 49.8, 750)],
    ]},
  ],
  shards: [
    { label: "Offense", options: [S(AdaptiveForce, "Adaptive Force", 52.4, 51.2, 9432), S(AttackSpeed, "Attack Speed", 42.6, 51.6, 7668), S(AbilityHaste, "Ability Haste", 5.0, 49.8, 900)] },
    { label: "Flex", options: [S(AdaptiveForce, "Adaptive Force", 68.4, 51.4, 12312), S(Armor, "Armor", 22.6, 51.0, 4068), S(MagicResist, "Magic Resist", 9.0, 50.4, 1620)] },
    { label: "Defense", options: [S(HealthScaling, "Health", 52.4, 51.4, 9432), S(Armor, "Armor", 32.6, 51.2, 5868), S(MagicResist, "Magic Resist", 15.0, 50.6, 2700)] },
  ],
  itemSlots: [
    { label: "1st Item", items: [
      I(3078, "Trinity Force", 52.6, 38.4, 6912), I(6692, "Eclipse", 51.2, 24.6, 4428),
      I(3071, "Black Cleaver", 50.8, 16.2, 2916), I(3053, "Sterak's Gage", 51.4, 12.4, 2232),
      I(3748, "Titanic Hydra", 50.2, 8.4, 1512),
    ]},
    { label: "2nd Item", items: [
      I(3053, "Sterak's Gage", 52.4, 32.6, 5868), I(3742, "Dead Man's Plate", 51.8, 22.4, 4032),
      I(6333, "Death's Dance", 52.8, 18.6, 3348), I(3071, "Black Cleaver", 51.2, 14.4, 2592),
      I(3748, "Titanic Hydra", 50.6, 12.0, 2160),
    ]},
    { label: "3rd Item", items: [
      I(3742, "Dead Man's Plate", 52.8, 28.4, 5112), I(6333, "Death's Dance", 53.4, 24.2, 4356),
      I(4401, "Force of Nature", 51.6, 18.6, 3348), I(3075, "Thornmail", 50.8, 16.4, 2952),
      I(3065, "Spirit Visage", 50.2, 12.4, 2232),
    ]},
  ],
  builds: [
    {
      name: "Most Popular", winRate: 51.8, pickRate: 42.4, games: 7632,
      primaryTree: 8100, keystoneId: HoB, primaryRunes: [SuddenImp, Eyeball, RelentlessH],
      secondaryTree: 8300, secondaryRunes: [BonePlating, Overgrowth],
      shards: [AttackSpeed, AdaptiveForce, HealthScaling],
      summonerSpells: [4, 11], skillOrder: "Q > E > W",
      startingItems: [{ id: 1102, name: "Gustwalker Hatchling" }],
      coreItems: [
        { id: 3078, name: "Trinity Force", winRate: 52.6, slot: "52.6% as 1st item" },
        { id: 3053, name: "Sterak's Gage", winRate: 52.4, slot: "52.4% as 2nd item" },
        { id: 3742, name: "Dead Man's Plate", winRate: 52.8, slot: "52.8% as 3rd item" },
      ],
    },
    {
      name: "Highest Win Rate", winRate: 53.6, pickRate: 18.2, games: 3276,
      primaryTree: 8000, keystoneId: Conq, primaryRunes: [Triumph, Tenacity, LastStand],
      secondaryTree: 8300, secondaryRunes: [Conditioning, Overgrowth],
      shards: [AdaptiveForce, AdaptiveForce, HealthScaling],
      summonerSpells: [4, 11], skillOrder: "Q > W > E",
      startingItems: [{ id: 1103, name: "Mosstomper Seedling" }],
      coreItems: [
        { id: 6692, name: "Eclipse", winRate: 52.4, slot: "52.4% as 1st item" },
        { id: 3053, name: "Sterak's Gage", winRate: 52.8, slot: "52.8% as 2nd item" },
        { id: 6333, name: "Death's Dance", winRate: 53.4, slot: "53.4% as 3rd item" },
      ],
    },
  ],
};

/* ═══════════════════════════════════════════════
   CAMILLE — Top · 15 000 games
   Primary: Precision (Conqueror) / Resolve (Grasp)  Secondary: Resolve / Inspiration
   ═══════════════════════════════════════════════ */

const CAMILLE: SampleChampionData = {
  id: 164, name: "Camille", role: "Top",
  games: 15000, winRate: 50.2, pickRate: 4.8, banRate: 3.2,
  patch: "16.5", updatedAt: ts(6),
  runeTrees: [
    { id: 8000, name: "Precision", slots: [
      [R(PtA, "Press the Attack", 8.4, 48.8, 630), R(LT, "Lethal Tempo", 4.2, 47.4, 315), R(Fleet, "Fleet Footwork", 12.6, 49.6, 945), R(Conq, "Conqueror", 74.8, 50.8, 5610)],
      [R(Overheal, "Overheal", 4.2, 47.8, 315), R(Triumph, "Triumph", 78.4, 50.4, 5880), R(PoM, "Presence of Mind", 17.4, 49.8, 1305)],
      [R(Alacrity, "Legend: Alacrity", 28.4, 50.0, 2130), R(Tenacity, "Legend: Tenacity", 48.6, 50.6, 3645), R(Bloodline, "Legend: Bloodline", 23.0, 50.2, 1725)],
      [R(CdG, "Coup de Grace", 38.4, 50.2, 2880), R(CutDown, "Cut Down", 14.2, 49.8, 1065), R(LastStand, "Last Stand", 47.4, 50.8, 3555)],
    ]},
    { id: 8100, name: "Domination", slots: [
      [R(Elec, "Electrocute", 48.6, 49.2, 292), R(Pred, "Predator", 4.2, 46.8, 25), R(DH, "Dark Harvest", 28.4, 48.6, 170), R(HoB, "Hail of Blades", 18.8, 49.4, 113)],
      [R(CheapShot, "Cheap Shot", 22.4, 49.8, 672), R(ToB, "Taste of Blood", 48.6, 50.4, 1458), R(SuddenImp, "Sudden Impact", 29.0, 50.0, 870)],
      [R(ZombieWard, "Zombie Ward", 12.4, 49.6, 372), R(GhostPoro, "Ghost Poro", 8.6, 49.2, 258), R(Eyeball, "Eyeball Collection", 79.0, 50.2, 2370)],
      [R(TreasureH, "Treasure Hunter", 38.6, 50.0, 1158), R(IngeniousH, "Ingenious Hunter", 18.4, 49.4, 552), R(RelentlessH, "Relentless Hunter", 43.0, 50.4, 1290)],
    ]},
    { id: 8200, name: "Sorcery", slots: [
      [R(Aery, "Summon Aery", 28.4, 48.8, 85), R(Comet, "Arcane Comet", 22.6, 48.4, 68), R(PhaseRush, "Phase Rush", 49.0, 49.6, 147)],
      [R(NullOrb, "Nullifying Orb", 22.4, 49.4, 672), R(Manaflow, "Manaflow Band", 28.6, 49.8, 858), R(NimbusCloak, "Nimbus Cloak", 49.0, 50.4, 1470)],
      [R(Transcendence, "Transcendence", 48.4, 50.2, 1452), R(Celerity, "Celerity", 28.6, 49.8, 858), R(AbsFocus, "Absolute Focus", 23.0, 49.6, 690)],
      [R(Scorch, "Scorch", 38.4, 49.8, 1152), R(Waterwalking, "Waterwalking", 8.6, 48.6, 258), R(GatheringStorm, "Gathering Storm", 53.0, 50.6, 1590)],
    ]},
    { id: 8300, name: "Resolve", slots: [
      [R(Grasp, "Grasp of the Undying", 62.4, 50.6, 5616), R(Aftershock, "Aftershock", 14.2, 49.2, 1278), R(Guardian, "Guardian", 23.4, 49.8, 2106)],
      [R(Demolish, "Demolish", 42.6, 50.6, 3834), R(FontOfLife, "Font of Life", 8.4, 49.2, 756), R(ShieldBash, "Shield Bash", 49.0, 50.8, 4410)],
      [R(Conditioning, "Conditioning", 32.4, 51.2, 2916), R(SecondWind, "Second Wind", 38.6, 50.4, 3474), R(BonePlating, "Bone Plating", 29.0, 50.2, 2610)],
      [R(Overgrowth, "Overgrowth", 42.4, 50.6, 3816), R(Revitalize, "Revitalize", 28.6, 50.2, 2574), R(Unflinching, "Unflinching", 29.0, 50.8, 2610)],
    ]},
    { id: 8400, name: "Inspiration", slots: [
      [R(Glacial, "Glacial Augment", 12.4, 48.4, 50), R(Spellbook, "Unsealed Spellbook", 18.6, 48.8, 74), R(FirstStrike, "First Strike", 69.0, 49.8, 276)],
      [R(HexFlash, "Hextech Flashtraption", 12.4, 49.4, 558), R(MagicBoots, "Magical Footwear", 48.6, 50.6, 2187), R(CashBack, "Cash Back", 39.0, 50.2, 1755)],
      [R(FuturesMarket, "Future's Market", 28.4, 50.0, 1278), R(MinionDemat, "Minion Dematerializer", 14.2, 49.4, 639), R(Biscuit, "Biscuit Delivery", 57.4, 50.8, 2583)],
      [R(CosmicInsight, "Cosmic Insight", 52.6, 50.6, 2367), R(ApproachVel, "Approach Velocity", 18.4, 50.0, 828), R(TimeWarp, "Time Warp Tonic", 29.0, 49.8, 1305)],
    ]},
  ],
  shards: [
    { label: "Offense", options: [S(AdaptiveForce, "Adaptive Force", 62.4, 50.4, 9360), S(AttackSpeed, "Attack Speed", 32.6, 50.2, 4890), S(AbilityHaste, "Ability Haste", 5.0, 49.2, 750)] },
    { label: "Flex", options: [S(AdaptiveForce, "Adaptive Force", 58.4, 50.2, 8760), S(Armor, "Armor", 28.6, 50.4, 4290), S(MagicResist, "Magic Resist", 13.0, 49.8, 1950)] },
    { label: "Defense", options: [S(HealthScaling, "Health", 42.4, 50.2, 6360), S(Armor, "Armor", 38.6, 50.6, 5790), S(MagicResist, "Magic Resist", 19.0, 49.8, 2850)] },
  ],
  itemSlots: [
    { label: "1st Item", items: [
      I(3078, "Trinity Force", 51.4, 48.6, 7290), I(3074, "Ravenous Hydra", 50.2, 18.4, 2760),
      I(3153, "Blade of the Ruined King", 49.8, 14.2, 2130), I(6692, "Eclipse", 50.6, 10.8, 1620),
      I(3053, "Sterak's Gage", 49.4, 8.0, 1200),
    ]},
    { label: "2nd Item", items: [
      I(3074, "Ravenous Hydra", 52.2, 32.4, 4860), I(3053, "Sterak's Gage", 51.6, 24.6, 3690),
      I(6333, "Death's Dance", 52.8, 18.2, 2730), I(3742, "Dead Man's Plate", 51.0, 14.8, 2220),
      I(3153, "Blade of the Ruined King", 50.4, 10.0, 1500),
    ]},
    { label: "3rd Item", items: [
      I(6333, "Death's Dance", 53.4, 28.4, 4260), I(3053, "Sterak's Gage", 52.2, 24.6, 3690),
      I(3742, "Dead Man's Plate", 51.6, 18.2, 2730), I(4401, "Force of Nature", 50.8, 16.4, 2460),
      I(3074, "Ravenous Hydra", 51.2, 12.4, 1860),
    ]},
  ],
  builds: [
    {
      name: "Most Popular", winRate: 50.6, pickRate: 42.8, games: 6420,
      primaryTree: 8300, keystoneId: Grasp, primaryRunes: [ShieldBash, BonePlating, Overgrowth],
      secondaryTree: 8400, secondaryRunes: [MagicBoots, Biscuit],
      shards: [AdaptiveForce, AdaptiveForce, HealthScaling],
      summonerSpells: [4, 12], skillOrder: "Q > E > W",
      startingItems: [{ id: 1055, name: "Doran's Blade" }, { id: 2003, name: "Health Potion" }],
      coreItems: [
        { id: 3078, name: "Trinity Force", winRate: 51.4, slot: "51.4% as 1st item" },
        { id: 3074, name: "Ravenous Hydra", winRate: 52.2, slot: "52.2% as 2nd item" },
        { id: 6333, name: "Death's Dance", winRate: 53.4, slot: "53.4% as 3rd item" },
      ],
    },
    {
      name: "Highest Win Rate", winRate: 52.8, pickRate: 18.6, games: 2790,
      primaryTree: 8000, keystoneId: Conq, primaryRunes: [Triumph, Tenacity, LastStand],
      secondaryTree: 8300, secondaryRunes: [Conditioning, Overgrowth],
      shards: [AdaptiveForce, Armor, HealthScaling],
      summonerSpells: [4, 14], skillOrder: "Q > E > W",
      startingItems: [{ id: 1055, name: "Doran's Blade" }, { id: 2003, name: "Health Potion" }],
      coreItems: [
        { id: 3078, name: "Trinity Force", winRate: 52.6, slot: "52.6% as 1st item" },
        { id: 3053, name: "Sterak's Gage", winRate: 52.4, slot: "52.4% as 2nd item" },
        { id: 6333, name: "Death's Dance", winRate: 53.4, slot: "53.4% as 3rd item" },
      ],
    },
  ],
};

/* ─── Export ─── */

export const SAMPLE_CHAMPIONS: SampleChampionData[] = [
  AHRI, YASUO, JINX, THRESH, LEE_SIN, DARIUS, ZED, LUX, VI, CAMILLE,
];

export const SAMPLE_CHAMPIONS_BY_NAME: Record<string, SampleChampionData> = Object.fromEntries(
  SAMPLE_CHAMPIONS.map((c) => [c.name, c])
);

export const SAMPLE_CHAMPIONS_BY_ID: Record<number, SampleChampionData> = Object.fromEntries(
  SAMPLE_CHAMPIONS.map((c) => [c.id, c])
);

export function getSampleChampion(nameOrId: string | number): SampleChampionData | undefined {
  if (typeof nameOrId === "number") return SAMPLE_CHAMPIONS_BY_ID[nameOrId];
  return SAMPLE_CHAMPIONS_BY_NAME[nameOrId]
    ?? SAMPLE_CHAMPIONS.find((c) => c.name.toLowerCase() === String(nameOrId).toLowerCase());
}
