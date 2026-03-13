"use client";

import { getChampionSquareUrl } from "@/lib/riotAssets";

/* ── Types ── */

interface PowerSpike {
  label: string;
  description: string;
  strength: "strong" | "moderate" | "weak";
}

interface ChampionRef {
  id: string;
  name: string;
  reason: string;
}

interface GuideData {
  name: string;
  subtitle: string;
  identity: string;
  difficulty: "Easy" | "Medium" | "Hard";
  playstyleTags: string[];
  strengths: string[];
  weaknesses: string[];
  laning: {
    levels1to3: string;
    levels4to5: string;
    level6: string;
    waveManagement: string;
  };
  teamfight: {
    role: string;
    tips: string[];
    mistakeCallout: string;
  };
  powerSpikes: PowerSpike[];
  synergies: ChampionRef[];
  counters: ChampionRef[];
  commonMistakes: { name: string; explanation: string }[];
  itemizationNotes: string[];
}

/* ════════════════════════════════════════════════
   GUIDE DATA — 5 seed champions
   ════════════════════════════════════════════════ */

const GUIDES: Record<string, GuideData> = {
  Ahri: {
    name: "Ahri",
    subtitle: "Burst Mage / Assassin",
    identity:
      "Ahri is a mobile burst mage who picks off mispositioned targets with Charm and dashes through teamfights with Spirit Rush.",
    difficulty: "Medium",
    playstyleTags: ["Pick Comp", "Roaming", "Safe Laning"],
    strengths: [
      "Strong roaming after level 6 — Spirit Rush lets you cross walls and cover ground fast.",
      "Charm is one of the longest CC abilities in mid lane at max range.",
      "Built-in sustain from Essence Theft passive lets you survive poke lanes.",
      "Very safe blind pick — no hard counters that make the game unplayable.",
    ],
    weaknesses: [
      "Very low kill pressure pre-6 without jungle help.",
      "Falls off in extended teamfights — burst combo is front-loaded.",
      "Charm is a narrow skillshot. One miss means zero kill pressure for 12 seconds.",
      "Struggles to waveclear super minions without significant AP.",
    ],
    laning: {
      levels1to3:
        "Start Q and use it through the wave to CS and poke simultaneously. Stay behind your caster minions so the enemy can't engage on you. Only trade when your Q return passes through the opponent — don't walk up just to auto.",
      levels4to5:
        "You should have Q and W maxing with a point in E (Charm). Push the wave with Q before backing so you don't lose minions. If the wave is near your tower, let it freeze (keep minions close to your side) and wait for jungle help — Charm makes ganks almost free kills.",
      level6:
        "Spirit Rush changes everything. You can now chase kills, escape ganks, and roam to bot lane. Shove the wave with Q, then dash over the wall toward bot. Ping your team before you leave lane.",
      waveManagement:
        "Ahri wants to push and roam. Use Q through all 6 minions to clear quickly, then leave lane. Only freeze if you're behind — your kill threat with Charm is higher when the enemy is far from their tower.",
    },
    teamfight: {
      role: "Your job is to flank and delete a carry, or peel for your ADC with Charm.",
      tips: [
        "Wait for the enemy to engage before using Spirit Rush. If you dash in first, you die.",
        "Use Q to poke from fog of war before the fight starts. The return damage is true damage.",
        "Save at least one Spirit Rush charge to get out. Going 3 dashes deep is a death sentence.",
        "If you can't find a flank angle, peel for your ADC. Charm stops assassins cold.",
      ],
      mistakeCallout:
        "Don't Charm the frontline tank. Save it for carries or assassins diving your team.",
    },
    powerSpikes: [
      { label: "Level 3", description: "All three basic abilities unlocked. Can trade with Q-W combo.", strength: "moderate" },
      { label: "Level 6", description: "Spirit Rush unlocked. Look for a roam bot lane immediately.", strength: "strong" },
      { label: "1st Item", description: "Luden's or Malignance complete. Kill combo now one-shots most squishies.", strength: "strong" },
      { label: "2 Items", description: "Highest relative power point in the game. Force fights now.", strength: "strong" },
      { label: "Level 11", description: "Second rank of ult. More dashes, lower cooldown.", strength: "moderate" },
      { label: "3 Items", description: "Still strong but ADCs and bruisers start surviving your burst.", strength: "moderate" },
      { label: "Level 16", description: "Ult rank 3 is nice but the game is usually decided by now.", strength: "weak" },
    ],
    synergies: [
      { id: "Sejuani", name: "Sejuani", reason: "Double CC chain almost guarantees a kill. Charm into Sejuani R is inescapable." },
      { id: "Amumu", name: "Amumu", reason: "Bandage Toss into Curse chains with Charm. Both ults combo for AOE lockdown." },
      { id: "Jinx", name: "Jinx", reason: "Ahri catches targets with Charm, Jinx cleans up with rockets from range." },
    ],
    counters: [
      { id: "Kassadin", name: "Kassadin", reason: "Outscales you hard and can interrupt your combo with Riftwalk after 6." },
      { id: "Fizz", name: "Fizz", reason: "Playful/Trickster dodges Charm on reaction. All-ins you level 6." },
      { id: "Yasuo", name: "Yasuo", reason: "Wind Wall blocks both Q and Charm. Can dash through your minion wave onto you." },
    ],
    commonMistakes: [
      { name: "Using all 3 Spirit Rush charges to engage", explanation: "Save at least one dash for escape. Full send only works if you're sure of the kill." },
      { name: "Throwing raw Charm without setup", explanation: "Charm is easy to dodge with no setup. Land Q first for the slow, then follow with E." },
      { name: "Roaming without pushing the wave first", explanation: "If you roam with a full wave at your tower, you lose 6+ CS and plates. Shove first." },
      { name: "Building full damage when behind", explanation: "If you're 0/3, build Zhonya's second. You need to survive to land Charm, not deal more damage." },
      { name: "Ignoring vision before roaming", explanation: "Ward the river pixel brush before roaming. If the enemy mid pings you missing, your roam fails." },
    ],
    itemizationNotes: [
      "Go Luden's Companion in most games. Switch to Malignance if you need more ult CDR for constant roaming.",
      "Build Zhonya's second against assassins like Zed or Talon. Build Shadowflame second when ahead.",
      "Banshee's Veil is underrated against champions like Syndra or Lux who can catch you with one ability.",
    ],
  },

  Jinx: {
    name: "Jinx",
    subtitle: "Hypercarry ADC",
    identity:
      "Jinx is a late-game hypercarry who ramps up in teamfights. One kill triggers her passive, turning her into an unstoppable cleanup machine.",
    difficulty: "Medium",
    playstyleTags: ["Late Game", "Teamfight", "Hypercarry"],
    strengths: [
      "Strongest late-game ADC — three items makes you a teamfight monster.",
      "Passive 'Get Excited!' gives massive attack speed and movement speed on kill or assist.",
      "Rocket launcher gives range advantage over every other ADC in teamfights.",
      "Global ult can snipe kills across the map or finish low-HP enemies after fights.",
    ],
    weaknesses: [
      "Zero mobility — no dash, no blink. Flash is your only escape.",
      "Weak laning phase against aggressive bot lanes like Draven or Lucian.",
      "If you fall behind early, you are useless until 3 items.",
      "Dies instantly to any assassin who reaches you — completely reliant on peel.",
    ],
    laning: {
      levels1to3:
        "Start Q (minigun form) and focus on last-hitting. Switch to rockets only to poke when the enemy walks up for CS. Use W to punish enemies who stand behind their minions in a straight line. Do not push mindlessly — Jinx without flash dies to every gank.",
      levels4to5:
        "Keep the wave near your tower if possible. Jinx wins extended trades with minigun attack speed stacks, so if the enemy engages on you near your tower, fight back. Use E (Chompers) behind you to cut off an engage.",
      level6:
        "Your ult is global but scales with distance. In lane, use it point-blank for the execute damage plus AOE splash. After a bot fight, look at other lanes — a cross-map snipe is free gold.",
      waveManagement:
        "Jinx wants to freeze (keep the wave near your tower) in most matchups. You have no escape, so playing far from your tower is dangerous. Only push when the enemy backs or when setting up a dragon play.",
    },
    teamfight: {
      role: "Stay behind your entire team and auto-attack with rockets. Switch to minigun only when someone is in your face.",
      tips: [
        "Position at maximum rocket range. You outrange every other ADC in rockets.",
        "Save Chompers (E) for assassins — drop them at your feet when a Zed or Fizz dives you.",
        "Once you get a kill or assist, your passive triggers. This is your 'go mode' — chase down remaining enemies.",
        "Don't use your ult at the start of the fight. Save it to execute a low-HP target trying to escape.",
      ],
      mistakeCallout:
        "Never switch to minigun in a 5v5 teamfight unless someone is literally on top of you. Rockets give you range safety.",
    },
    powerSpikes: [
      { label: "Level 2", description: "Q + W lets you poke and trade. Small spike but meaningful in lane.", strength: "moderate" },
      { label: "Level 6", description: "Global ult adds kill pressure everywhere on the map.", strength: "moderate" },
      { label: "1st Item", description: "Kraken Slayer or Infinity Edge. Damage starts to feel real.", strength: "moderate" },
      { label: "2 Items", description: "Attack speed + crit. Minigun stacks start melting targets.", strength: "strong" },
      { label: "3 Items", description: "Jinx's biggest spike. Rockets crit for massive AOE damage.", strength: "strong" },
      { label: "Level 16", description: "Irrelevant — Jinx power comes from items, not levels.", strength: "weak" },
    ],
    synergies: [
      { id: "Lulu", name: "Lulu", reason: "Lulu's shield, ult, and polymorph keep Jinx alive long enough to pop off." },
      { id: "Thresh", name: "Thresh", reason: "Lantern gives Jinx a second escape tool she desperately needs." },
      { id: "Amumu", name: "Amumu", reason: "Amumu ult locks down the whole enemy team. Jinx rockets shred them." },
    ],
    counters: [
      { id: "Draven", name: "Draven", reason: "Draven bullies Jinx out of lane. His axes out-trade your minigun hard." },
      { id: "Zed", name: "Zed", reason: "Zed ult is a guaranteed kill on Jinx if flash is down. Nothing you can do." },
      { id: "Lucian", name: "Lucian", reason: "Lucian's short trades and dash punish Jinx's lack of mobility." },
    ],
    commonMistakes: [
      { name: "Playing aggressive in lane without flash", explanation: "Jinx has zero escape. If flash is down, play under tower and farm. Getting killed sets you back 5+ minutes." },
      { name: "Switching to minigun at max range", explanation: "Minigun has 525 range. At max range, always use rockets (700 range). Only switch when someone is melee range." },
      { name: "Using Zap! (W) in the middle of a teamfight", explanation: "The cast time gets you killed. Use W to poke before fights or to snipe runners. In the fight, just auto-attack." },
      { name: "Chasing kills deep into the enemy team", explanation: "Even with passive movement speed, running past your frontline gets you CC'd and killed." },
      { name: "Ulting at the start of a fight", explanation: "Super Mega Death Rocket does more damage to low-HP targets. Use it as a finisher, not an opener." },
    ],
    itemizationNotes: [
      "Kraken Slayer into Rapid Firecannon is the standard path. The extra range on RFC synergizes with rockets.",
      "If multiple assassins are on the enemy team, build Phantom Dancer second for the movement speed and shielding.",
      "Lord Dominik's Regards is mandatory third or fourth item if the enemy has any tank.",
    ],
  },

  LeeSin: {
    name: "Lee Sin",
    subtitle: "Early Game Bruiser / Assassin",
    identity:
      "Lee Sin is an early-game jungle carry who snowballs leads with aggressive ganks and mechanical outplays. Falls off late but wins games before it matters.",
    difficulty: "Hard",
    playstyleTags: ["Early Game", "Ganking", "Mechanical"],
    strengths: [
      "Strongest level 3 ganks in the game — Q gap close into E slow is almost guaranteed flash.",
      "Extremely mobile in the jungle — ward-hop lets you invade, escape, and outmaneuver anyone.",
      "Dragon's Rage (R) can kick priority targets into your team for free kills.",
      "High skill ceiling — mastery is rewarded with game-changing plays.",
    ],
    weaknesses: [
      "Falls off a cliff after 25 minutes. If the game goes late, you become a kick-bot.",
      "Missing Q means you lose most of your damage and gap close. One miss = one failed gank.",
      "Relies on snowballing — if you go 0/3 early, you have no way back into the game.",
      "Very hard to play well. Execution errors are punished harder than on simpler junglers.",
    ],
    laning: {
      levels1to3:
        "Clear red buff, then raptors, then gank mid or invade the enemy jungler at their buff. Lee Sin's level 3 is the strongest in the game — use it. If no gank is available, take scuttle and look bot.",
      levels4to5:
        "Keep ganking. Your power relative to other junglers peaks at levels 3-5. Farm only when all lanes are pushed (minions at enemy tower). Never full-clear when a lane is gankable.",
      level6:
        "Dragon's Rage changes your gank pattern. Now you can kick the enemy toward your laner for a guaranteed kill. The classic combo: Q in, ward-hop behind them, R kick them back, Q follow-up.",
      waveManagement:
        "You're a jungler, but wave management still matters. After a successful gank, help your laner push the wave into the enemy tower. This denies the enemy CS and resets the lane for your teammate.",
    },
    teamfight: {
      role: "Your job is to find a flank and kick a carry into your team. If you can't flank, peel for your ADC.",
      tips: [
        "Ward-hop behind the enemy carry, then R kick them into your team. This is the 'Insec' and it wins fights.",
        "If the Insec isn't available, play front-to-back. Use Q on the frontline and save R to peel assassins off your ADC.",
        "Don't hold R for the perfect play. A decent kick now is better than a perfect kick never.",
        "Flash-kick is faster and harder to react to than ward-hop kick. Save flash for the game-winning play.",
      ],
      mistakeCallout:
        "Don't kick the tank into your team. You just gave them a free engage. Only kick squishies or isolated targets.",
    },
    powerSpikes: [
      { label: "Level 3", description: "Q + W + E. Strongest level 3 jungler. Force a gank now.", strength: "strong" },
      { label: "Level 6", description: "Dragon's Rage unlocked. Insec combo is now available.", strength: "strong" },
      { label: "1st Item", description: "Profane Hydra or Black Cleaver. You hit hardest relative to the game right now.", strength: "strong" },
      { label: "2 Items", description: "Still strong but other champions are catching up.", strength: "moderate" },
      { label: "3 Items", description: "You're starting to fall off. Transition to utility and kick-bot.", strength: "weak" },
      { label: "Level 16", description: "Completely irrelevant. If the game is going this long, you're in trouble.", strength: "weak" },
    ],
    synergies: [
      { id: "Yasuo", name: "Yasuo", reason: "Lee Sin kick knocks enemies airborne. Yasuo ult follows up off the knockup for free." },
      { id: "Orianna", name: "Orianna", reason: "Put Orianna ball on Lee Sin. Dash in, kick, Orianna ults the clustered enemies." },
      { id: "Caitlyn", name: "Caitlyn", reason: "Caitlyn traps behind the kicked target. Guaranteed headshot plus Lee Q follow-up." },
    ],
    counters: [
      { id: "Rammus", name: "Rammus", reason: "Thornmail passive punishes Lee's auto-attack combos. Rammus taunts him mid-dash." },
      { id: "Warwick", name: "Warwick", reason: "Warwick out-sustains Lee Sin in skirmishes and follows him through Q dashes." },
      { id: "Vi", name: "Vi", reason: "Vi's ult is point-and-click. Lee can't dodge it, and she matches his early aggression." },
    ],
    commonMistakes: [
      { name: "Full-clearing instead of ganking early", explanation: "Lee Sin's power is frontloaded. Farming 6 camps while laners die wastes your biggest advantage." },
      { name: "Using Q as a gap close into 3+ enemies", explanation: "Q follow-up puts you in the middle of the enemy team. Only follow Q if you can get out or the target is isolated." },
      { name: "Holding R for the perfect Insec", explanation: "A simple kick that saves your carry or finishes a kill is more valuable than dying while waiting for the highlight play." },
      { name: "Not buying wards for ward-hopping", explanation: "Always carry a Control Ward. Ward-hop is your primary mobility tool in fights and skirmishes." },
      { name: "Playing Lee Sin in late-game teamcomps", explanation: "If your team has Kayle, Jinx, and Kassadin, don't pick Lee. You'll fall off before they come online." },
    ],
    itemizationNotes: [
      "Profane Hydra rush for burst assassin playstyle. Black Cleaver first if the enemy team is tanky.",
      "Always build Guardian Angel third or fourth. You need a second life to make Insec plays without dying.",
      "If you're the only frontline, go Sterak's Gage and Death's Dance. Accept that you're a bruiser, not an assassin.",
    ],
  },

  Thresh: {
    name: "Thresh",
    subtitle: "Playmaking Support / Warden",
    identity:
      "Thresh is the most versatile support in League. He can engage, peel, save teammates, and zone — all in a single teamfight. Hook accuracy separates good Thresh players from great ones.",
    difficulty: "Hard",
    playstyleTags: ["Playmaking", "Peel", "Versatile"],
    strengths: [
      "Lantern (W) is the only ability in the game that can pull a teammate to safety from range.",
      "Hook (Q) into Flay (E) combo is one of the most reliable engage tools in bot lane.",
      "Scales infinitely with souls — every soul permanently adds armor and AP.",
      "Can play both aggressive (hook-engage) and defensive (peel for ADC) in the same game.",
    ],
    weaknesses: [
      "Ranged but has the lowest base range of any ranged support. Gets outpoked by enchanters.",
      "Hook has a long wind-up. Good players dodge it on reaction.",
      "Squishy early despite being a 'tank' support. Die fast if caught without Aftershock.",
      "Lantern requires your teammate to click it. In solo queue, they often don't.",
    ],
    laning: {
      levels1to3:
        "Start E (Flay) for the empowered auto-attack poke. Walk up when the enemy ADC goes to last-hit and hit them with a charged auto. It chunks for 100+ damage. Take Q level 2 and look for a hook when they're slowed or CC'd by your ADC.",
      levels4to5:
        "Threaten hooks by walking forward but don't always throw them. The threat of a hook zones enemies off CS. Throw lantern to your jungler if they're pathing bot — lantern ganks are nearly impossible to react to.",
      level6:
        "The Box adds massive zone control. Drop it after landing a hook to trap the enemy inside. The wall slow stacks with Flay, making escape nearly impossible. Save it for engages, not wave clear.",
      waveManagement:
        "As support, don't hit minions randomly. If your ADC is freezing, stand in the river bush and threaten hooks. If you're pushing for a back, auto the casters to help crash the wave. Time your roams for when the wave is pushed into the enemy tower.",
    },
    teamfight: {
      role: "Start fights with a hook on a priority target, or hold hook and peel for your carries. Read the fight to decide which.",
      tips: [
        "If your team has an assassin, throw lantern to them for a free delivery into the backline.",
        "Flay backwards (toward your team) to peel divers off your ADC. This is more valuable than flaying forward most of the time.",
        "Drop The Box around your ADC when assassins dive. The walls slow anyone trying to reach them.",
        "Don't follow your hook into 5 enemies. Reactivate Q only if your team can follow up.",
      ],
      mistakeCallout:
        "Don't hook the tank and follow in. You just engaged 1v5 on a target your team can't kill. Wait for a carry to step forward.",
    },
    powerSpikes: [
      { label: "Level 2", description: "Q + E combo. Hook into Flay is a guaranteed flash or kill at level 2.", strength: "strong" },
      { label: "Level 3", description: "Lantern unlocked. Can now set up jungle ganks safely.", strength: "moderate" },
      { label: "Level 6", description: "The Box adds kill pressure. Hook + Flay + Box traps enemies.", strength: "strong" },
      { label: "1st Item", description: "Locket or Solari. Huge survivability spike for your whole team.", strength: "strong" },
      { label: "Souls 50+", description: "50 souls = free Chain Vest worth of armor. You become noticeably tanky.", strength: "moderate" },
      { label: "2 Items", description: "Knight's Vow or Zeke's. Your peel toolkit is now complete.", strength: "moderate" },
    ],
    synergies: [
      { id: "Kalista", name: "Kalista", reason: "Kalista ult pulls Thresh in, then Thresh hooks or flays. Unstoppable engage combo." },
      { id: "Draven", name: "Draven", reason: "Draven's early damage combined with Thresh hook guarantees kill lanes. Both spike at level 2." },
      { id: "LeeSin", name: "Lee Sin", reason: "Lantern Lee Sin into the enemy team. He kicks a carry back, you hook the rest." },
    ],
    counters: [
      { id: "Morgana", name: "Morgana", reason: "Black Shield blocks your entire combo. Hooks, flay, and ult are all useless against it." },
      { id: "Lulu", name: "Lulu", reason: "Polymorph stops your engage. Ult counters your all-in by giving the target 600+ HP." },
      { id: "Xerath", name: "Xerath", reason: "Outranges Thresh completely. Pokes you down before you can walk into hook range." },
    ],
    commonMistakes: [
      { name: "Throwing hook on cooldown", explanation: "Hook's threat is more valuable than the hook itself. Walk forward menacingly and zone without casting." },
      { name: "Following every hook", explanation: "Reactivating Q into 3+ enemies gets you killed. Only follow if your team is with you." },
      { name: "Not collecting souls", explanation: "Each soul is permanent stats. Walk up to collect them during laning. Don't let them expire." },
      { name: "Throwing lantern when nobody is near it", explanation: "Lantern has a range. Make sure your teammate can actually click it before you throw." },
      { name: "Flaying forward when your ADC needs peel", explanation: "Flay backward saves your carry. Flay forward only when you're engaging, not when you're being dove." },
    ],
    itemizationNotes: [
      "Locket of the Iron Solari is your default mythic. The shield saves your whole team in teamfights.",
      "Build Knight's Vow second if your ADC is your win condition. The damage redirection keeps them alive.",
      "Zeke's Convergence is good when your ADC is an auto-attacker like Jinx or Kog'Maw.",
    ],
  },

  Darius: {
    name: "Darius",
    subtitle: "Juggernaut / Lane Bully",
    identity:
      "Darius is a lane-dominant juggernaut who stacks Hemorrhage (bleed) on enemies and executes them with Noxian Guillotine. Win lane, snowball the game, dunk everyone.",
    difficulty: "Easy",
    playstyleTags: ["Lane Bully", "Snowball", "All-In"],
    strengths: [
      "Strongest level 1 in top lane — auto-attack plus bleed out-trades almost everyone.",
      "5-stack Hemorrhage gives massive AD. If you reach 5 stacks, you win every 1v1.",
      "Noxian Guillotine (R) resets on kill. In a teamfight, one dunk can become a pentakill.",
      "Ghost + Flash lets you run down any champion in the game. Nobody outruns Darius.",
    ],
    weaknesses: [
      "Zero gap closers — if the enemy kites (runs away while attacking) you, you can't reach them.",
      "Countered by ranged top laners who poke you down before you can ever engage.",
      "Falls off in late-game teamfights if the enemy team can kite and CC you.",
      "If you don't win lane, you're a walking minion. Darius from behind is one of the worst champions.",
    ],
    laning: {
      levels1to3:
        "Start W and auto-attack the enemy at level 1. Darius's bleed stacks from autos win every early trade. Take Q level 2 — hit the outer edge (the blade) for bonus damage and healing. Take E level 3 and pull the enemy in for a full trade.",
      levels4to5:
        "Zone the enemy off CS by standing between them and the wave. If they walk up, pull them with E, auto-W, then Q to heal. This combo applies 4+ bleed stacks and most enemies can't survive 5. If they respect you, freeze the wave near your tower.",
      level6:
        "Noxian Guillotine is a guaranteed kill once they're below 30% HP with 5 bleed stacks. The full combo: E pull, auto, W, auto, Q, then R when they're low. Ghost to chase if they flash.",
      waveManagement:
        "Darius wants to freeze. Keep the wave near your tower so enemies have to walk up into your E range to CS. If you have a kill lead, you can slow push (build up 2-3 waves) and crash for a dive with your jungler.",
    },
    teamfight: {
      role: "Run at the backline with Ghost. If you get to the ADC with 5 bleed stacks, you dunk them and the fight is over.",
      tips: [
        "Pop Ghost before the fight starts. You need the movement speed to reach the enemy carries.",
        "Don't waste E on the frontline. Walk past them and pull a carry instead.",
        "If you can't reach the backline, stack Hemorrhage on the nearest target. At 5 stacks you get Noxian Might (huge bonus AD).",
        "One dunk reset can chain into a pentakill. Position to hit as many enemies as possible.",
      ],
      mistakeCallout:
        "Don't fight without Ghost. Without it, any team with a support can kite you forever and you'll never reach anyone.",
    },
    powerSpikes: [
      { label: "Level 1", description: "Strongest level 1 top laner. Fight at the first wave.", strength: "strong" },
      { label: "Level 3", description: "E pull unlocked. You can now force all-ins.", strength: "strong" },
      { label: "Level 6", description: "Noxian Guillotine = guaranteed kill on low-HP targets.", strength: "strong" },
      { label: "1st Item", description: "Trinity Force or Stridebreaker. Massive stat spike.", strength: "strong" },
      { label: "2 Items", description: "Sterak's second makes you very hard to kill.", strength: "strong" },
      { label: "3 Items", description: "Starting to fall off. Game needs to end soon.", strength: "moderate" },
      { label: "Level 16", description: "You're outscaled by most carries. Close the game before this.", strength: "weak" },
    ],
    synergies: [
      { id: "Yuumi", name: "Yuumi", reason: "Yuumi sits on Darius, heals him, and gives movement speed. Unkillable running-at-you machine." },
      { id: "Orianna", name: "Orianna", reason: "Orianna ball on Darius. He runs in with Ghost, she ults, he dunks everything." },
      { id: "Thresh", name: "Thresh", reason: "Thresh lantern brings Darius deep into the enemy team without needing to walk through poke." },
    ],
    counters: [
      { id: "Vayne", name: "Vayne", reason: "Kites forever. True damage means your tankiness doesn't matter. Unplayable lane." },
      { id: "Quinn", name: "Quinn", reason: "Ranged with a disengage. Pokes you down and vaults away if you E pull her." },
      { id: "Kayle", name: "Kayle", reason: "You bully Kayle levels 1-5, but after 6 she starts kiting. After 16, she 1v9s." },
    ],
    commonMistakes: [
      { name: "Using E as your first ability in a trade", explanation: "E pull is your only gap close. If you open with it and the enemy flashes out, you have no way to continue. Auto-W first, save E for when they try to run." },
      { name: "Fighting without Ghost", explanation: "Ghost is a 210-second cooldown. Time your all-ins for when it's up. Without it, enemies walk away from you." },
      { name: "Not hitting the Q blade edge", explanation: "Q deals 50% more damage and heals you when the OUTER edge hits. The inner circle does reduced damage. Space properly." },
      { name: "Dunking at 3 bleed stacks", explanation: "R damage scales with Hemorrhage stacks. Wait for 5 stacks — it more than doubles the damage." },
      { name: "Not ending the game early enough", explanation: "Darius falls off after 30 minutes. Use your lane lead to take towers, herald, and force fights while you're strongest." },
    ],
    itemizationNotes: [
      "Trinity Force is the default first item. Stridebreaker only if the enemy team is all ranged.",
      "Sterak's Gage second makes you nearly unkillable in 2v1 scenarios when splitpushing.",
      "Dead Man's Plate is great third for chasing. Randuin's Omen if the enemy has multiple crit carries.",
    ],
  },
};

/* ════════════════════════════════════════════════
   RENDERING
   ════════════════════════════════════════════════ */

const SPIKE_COLORS: Record<string, { bg: string; border: string; dot: string; text: string }> = {
  strong: { bg: "rgba(34,197,94,0.10)", border: "#22c55e", dot: "#22c55e", text: "#4ade80" },
  moderate: { bg: "rgba(234,179,8,0.10)", border: "#eab308", dot: "#eab308", text: "#facc15" },
  weak: { bg: "rgba(113,113,122,0.10)", border: "#52525b", dot: "#71717a", text: "#a1a1aa" },
};

const DIFFICULTY_COLORS: Record<string, string> = {
  Easy: "#22c55e",
  Medium: "#eab308",
  Hard: "#ef4444",
};

function SectionHeader({ children }: { children: React.ReactNode }) {
  return <h3 className="text-base font-semibold text-zinc-100 mb-3">{children}</h3>;
}

function Glass({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-xl border border-white/[0.06] bg-white/[0.02] p-5 ${className ?? ""}`}>
      {children}
    </div>
  );
}

/* ── Template for champions without a full guide ── */

const TEMPLATE_SECTIONS = [
  {
    num: 1,
    title: "Champion Identity",
    prompt: "One sentence describing who this champion is and what they do in a game. Include their class (mage, assassin, tank, etc.) and primary win condition.",
    example: "\"Ahri is a mobile burst mage who picks off mispositioned targets with Charm and dashes through teamfights with Spirit Rush.\"",
  },
  {
    num: 2,
    title: "Strengths & Weaknesses",
    prompt: "List 3-4 strengths and 3-4 weaknesses. Each point should be specific and actionable — not vague like \"good damage.\" Mention exact abilities and situations.",
    example: "Strength: \"Strong roaming after level 6 — Spirit Rush lets you cross walls.\"\nWeakness: \"Zero kill pressure pre-6 without jungle help.\"",
  },
  {
    num: 3,
    title: "Laning Phase",
    prompt: "Break the laning phase into four stages: Levels 1-3 (early trades), Levels 4-5 (wave management), Level 6 (power spike), and Wave Management (push vs freeze). 2-3 sentences each, with specific ability usage.",
    example: "\"Start Q and use it through the wave to CS and poke simultaneously. Stay behind caster minions to avoid engages.\"",
  },
  {
    num: 4,
    title: "Teamfight Guide",
    prompt: "Describe the champion's role in teamfights in one sentence, then list 3-4 specific tips. Include one common mistake callout (what NOT to do).",
    example: "Role: \"Your job is to flank and delete a carry.\"\nMistake: \"Don't Charm the frontline tank — save it for carries.\"",
  },
  {
    num: 5,
    title: "Power Spike Timeline",
    prompt: "Mark key power spikes: Level 2, 3, 6, first item, two items, Level 11, Level 16, three items. Rate each as strong, moderate, or weak. Only include spikes that matter for this champion.",
    example: "Level 6 (Strong): \"Spirit Rush unlocked — look for a roam bot immediately.\"\nLevel 16 (Weak): \"Game is usually decided by now.\"",
  },
  {
    num: 6,
    title: "Synergies & Counters",
    prompt: "List 3 champions this champion works well with and 3 champions that counter them. For each, include one sentence explaining why.",
    example: "Synergy: \"Sejuani — double CC chain almost guarantees a kill.\"\nCounter: \"Kassadin — outscales you and interrupts your combo.\"",
  },
  {
    num: 7,
    title: "Common Mistakes",
    prompt: "List 4-5 mistakes ranked by impact. Each gets a bold name and a one-sentence explanation. Focus on mistakes Gold-Platinum players make, not beginner errors.",
    example: "\"Using all 3 Spirit Rush charges to engage — save at least one for escape.\"",
  },
  {
    num: 8,
    title: "Itemization Notes",
    prompt: "2-3 sentences on item decision-making only. Don't list a full build — just explain when to deviate from the default path and why.",
    example: "\"Go Luden's in most games. Switch to Malignance for ult CDR. Build Zhonya's second against assassins.\"",
  },
];

function GuideTemplate({ championName }: { championName: string }) {
  return (
    <div className="max-w-3xl space-y-6">
      <Glass>
        <div className="flex items-center gap-3 mb-3">
          <img
            src={getChampionSquareUrl(championName)}
            alt={championName}
            className="w-12 h-12 rounded-lg"
          />
          <div>
            <h2 className="text-lg font-bold text-zinc-100">
              {championName} <span className="text-zinc-500 font-normal text-sm">— Guide Template</span>
            </h2>
            <p className="text-sm text-zinc-400 mt-0.5">
              This guide hasn&apos;t been written yet. Below is the structure every champion guide follows.
            </p>
          </div>
        </div>
      </Glass>

      {TEMPLATE_SECTIONS.map((s) => (
        <Glass key={s.num}>
          <div className="flex items-center gap-2.5 mb-3">
            <span className="text-xs font-bold tabular-nums text-indigo-400 bg-indigo-400/10 border border-indigo-400/20 rounded-md w-6 h-6 flex items-center justify-center shrink-0">
              {s.num}
            </span>
            <SectionHeader>{s.title}</SectionHeader>
          </div>
          <p className="text-sm text-zinc-400 leading-relaxed mb-3">{s.prompt}</p>
          <div className="rounded-lg bg-white/[0.03] border border-white/[0.05] px-4 py-3">
            <p className="text-xs text-zinc-600 uppercase tracking-wider mb-1.5">Example</p>
            <p className="text-sm text-zinc-500 whitespace-pre-line italic">{s.example}</p>
          </div>
        </Glass>
      ))}

      <div className="text-center py-4">
        <p className="text-xs text-zinc-600">
          Want to write this guide? Follow the 8 sections above with specific, actionable advice.
        </p>
      </div>
    </div>
  );
}

export default function ChampionGuide({ championName, onNavigateToBuild }: { championName: string; onNavigateToBuild?: () => void }) {
  const guide = GUIDES[championName];

  if (!guide) {
    return <GuideTemplate championName={championName} />;
  }

  return (
    <div className="max-w-3xl space-y-6">
      {/* 1 — Champion Identity */}
      <Glass>
        <div className="flex items-center gap-3 mb-3">
          <img
            src={getChampionSquareUrl(guide.name)}
            alt={guide.name}
            className="w-12 h-12 rounded-lg"
          />
          <div>
            <h2 className="text-lg font-bold text-zinc-100">
              {guide.name} <span className="text-zinc-500 font-normal text-sm">— {guide.subtitle}</span>
            </h2>
            <p className="text-sm text-zinc-400 mt-0.5">{guide.identity}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <span
            className="text-xs font-semibold px-2.5 py-1 rounded-md"
            style={{ color: DIFFICULTY_COLORS[guide.difficulty], background: `${DIFFICULTY_COLORS[guide.difficulty]}15`, border: `1px solid ${DIFFICULTY_COLORS[guide.difficulty]}30` }}
          >
            {guide.difficulty}
          </span>
          {guide.playstyleTags.map((tag) => (
            <span key={tag} className="text-xs text-zinc-400 px-2.5 py-1 rounded-md bg-white/[0.04] border border-white/[0.06]">
              {tag}
            </span>
          ))}
        </div>
      </Glass>

      {/* 2 — Strengths & Weaknesses */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Glass>
          <SectionHeader>Strengths</SectionHeader>
          <ul className="space-y-2">
            {guide.strengths.map((s, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-zinc-300">
                <span className="text-green-400 mt-0.5 shrink-0">+</span>
                <span>{s}</span>
              </li>
            ))}
          </ul>
        </Glass>
        <Glass>
          <SectionHeader>Weaknesses</SectionHeader>
          <ul className="space-y-2">
            {guide.weaknesses.map((w, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-zinc-300">
                <span className="text-red-400 mt-0.5 shrink-0">−</span>
                <span>{w}</span>
              </li>
            ))}
          </ul>
        </Glass>
      </div>

      {/* 3 — Laning Phase */}
      <Glass>
        <SectionHeader>How to Play Laning Phase</SectionHeader>
        <div className="space-y-4">
          {[
            { title: "Levels 1-3", text: guide.laning.levels1to3 },
            { title: "Levels 4-5", text: guide.laning.levels4to5 },
            { title: "Level 6 Power Spike", text: guide.laning.level6 },
            { title: "Wave Management", text: guide.laning.waveManagement },
          ].map((section) => (
            <div key={section.title}>
              <h4 className="text-sm font-semibold text-zinc-200 mb-1">{section.title}</h4>
              <p className="text-sm text-zinc-400 leading-relaxed">{section.text}</p>
            </div>
          ))}
        </div>
      </Glass>

      {/* 4 — Teamfight */}
      <Glass>
        <SectionHeader>How to Teamfight</SectionHeader>
        <p className="text-sm text-zinc-300 mb-3">{guide.teamfight.role}</p>
        <ul className="space-y-2 mb-4">
          {guide.teamfight.tips.map((tip, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-zinc-400">
              <span className="text-indigo-400 mt-0.5 shrink-0">•</span>
              <span>{tip}</span>
            </li>
          ))}
        </ul>
        <div className="rounded-lg border border-yellow-500/20 bg-yellow-500/[0.05] px-4 py-3">
          <p className="text-sm text-yellow-300/90 flex items-start gap-2">
            <span className="shrink-0">⚠</span>
            <span>{guide.teamfight.mistakeCallout}</span>
          </p>
        </div>
      </Glass>

      {/* 5 — Power Spike Timeline */}
      <Glass>
        <SectionHeader>Power Spike Timeline</SectionHeader>
        <div className="relative">
          <div className="absolute left-3 top-2 bottom-2 w-px bg-white/[0.06]" />
          <div className="space-y-3">
            {guide.powerSpikes.map((spike, i) => {
              const colors = SPIKE_COLORS[spike.strength];
              return (
                <div key={i} className="flex items-start gap-3 relative pl-7">
                  <div
                    className="absolute left-[7px] top-[7px] w-[11px] h-[11px] rounded-full border-2"
                    style={{ borderColor: colors.dot, background: colors.bg }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-zinc-200">{spike.label}</span>
                      <span
                        className="text-[10px] font-medium px-1.5 py-0.5 rounded"
                        style={{ color: colors.text, background: colors.bg, border: `1px solid ${colors.border}30` }}
                      >
                        {spike.strength}
                      </span>
                    </div>
                    <p className="text-sm text-zinc-500 mt-0.5">{spike.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </Glass>

      {/* 6 — Synergies & Counters */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Glass>
          <SectionHeader>Works Well With</SectionHeader>
          <div className="space-y-3">
            {guide.synergies.map((s) => (
              <div key={s.id} className="flex items-center gap-3">
                <img src={getChampionSquareUrl(s.id)} alt={s.name} className="w-8 h-8 rounded-lg" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-zinc-200">{s.name}</p>
                  <p className="text-xs text-zinc-500">{s.reason}</p>
                </div>
              </div>
            ))}
          </div>
        </Glass>
        <Glass>
          <SectionHeader>Struggles Against</SectionHeader>
          <div className="space-y-3">
            {guide.counters.map((c) => (
              <div key={c.id} className="flex items-center gap-3">
                <img src={getChampionSquareUrl(c.id)} alt={c.name} className="w-8 h-8 rounded-lg" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-zinc-200">{c.name}</p>
                  <p className="text-xs text-zinc-500">{c.reason}</p>
                </div>
              </div>
            ))}
          </div>
        </Glass>
      </div>

      {/* 7 — Common Mistakes */}
      <Glass>
        <SectionHeader>Common Mistakes</SectionHeader>
        <ol className="space-y-3">
          {guide.commonMistakes.map((m, i) => (
            <li key={i} className="flex items-start gap-3 text-sm">
              <span className="text-zinc-600 font-bold tabular-nums shrink-0 w-5 text-right">{i + 1}.</span>
              <div>
                <span className="font-semibold text-zinc-200">{m.name}</span>
                <span className="text-zinc-500"> — {m.explanation}</span>
              </div>
            </li>
          ))}
        </ol>
      </Glass>

      {/* 8 — Itemization Notes */}
      <Glass>
        <SectionHeader>Itemization Notes</SectionHeader>
        <div className="space-y-2">
          {guide.itemizationNotes.map((note, i) => (
            <p key={i} className="text-sm text-zinc-400 leading-relaxed">{note}</p>
          ))}
        </div>
        <button
          onClick={onNavigateToBuild}
          className="text-xs text-indigo-400 mt-4 cursor-pointer hover:text-indigo-300 transition-colors bg-transparent border-none p-0"
        >
          See full build paths and win rates →
        </button>
      </Glass>
    </div>
  );
}
