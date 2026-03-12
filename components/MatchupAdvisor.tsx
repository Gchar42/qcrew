"use client";

import { useState, useCallback } from "react";

interface MatchupAdvisorProps {
  championName: string;
}

interface AdviceSection {
  title: string;
  icon: string;
  items: string[];
}

type ClassTag = "Assassin" | "Fighter" | "Mage" | "Marksman" | "Tank" | "Support";

const CLASS_ADVICE: Record<ClassTag, { runes: string[]; items: string[]; tips: string[] }> = {
  Assassin: {
    runes: [
      "Take Bone Plating to survive burst combos",
      "Consider Exhaust over Ignite for safety",
      "Second Wind helps sustain through poke before all-ins",
    ],
    items: [
      "Rush Seeker's Armguard if AD, or Verdant Barrier if AP",
      "Early Cloth Armor / Null-Magic Mantle for lane safety",
      "Steelcaps reduce their auto-attack trading damage significantly",
    ],
    tips: [
      "Play safe pre-6 — most assassins spike at level 6",
      "Ward pixel brush to track their roam timings",
      "Hug tower after they hit 6 if you don't have stopwatch",
    ],
  },
  Fighter: {
    runes: [
      "Conqueror stacks well in extended trades",
      "Bone Plating reduces short trade burst",
      "Grasp is strong if you can proc it consistently",
    ],
    items: [
      "Doran's Shield for sustain in tough matchups",
      "Bramble Vest if they auto-attack trade heavily",
      "Prioritize completing your mythic for the 1-item power spike",
    ],
    tips: [
      "Trade when their core ability is on cooldown",
      "Fighters excel in extended trades — disengage quickly if you don't want that",
      "Freeze the wave near your tower to deny them aggressive plays",
    ],
  },
  Mage: {
    runes: [
      "Second Wind + Magic Resist shard for sustain",
      "Nullifying Orb blocks burst from AP combos",
      "Unflinching helps against their CC chains",
    ],
    items: [
      "Hexdrinker / Verdant Barrier for early magic resist",
      "Boots of Swiftness or Mercury's Treads to dodge and mitigate",
      "Refillable Potion sustains through poke-heavy lanes",
    ],
    tips: [
      "Dodge skillshots and trade when abilities are on cooldown",
      "Most mages are vulnerable after using their wave clear spell",
      "All-in when their key spell misses — mages are fragile up close",
    ],
  },
  Marksman: {
    runes: [
      "Fleet Footwork helps sustain against constant poke",
      "Bone Plating reduces auto-attack trade damage",
      "Alacrity pairs well with matching their attack speed",
    ],
    items: [
      "Doran's Shield to sustain through auto-attack poke",
      "Steelcaps massively reduce their DPS",
      "Early Warden's Mail if they stack attack speed",
    ],
    tips: [
      "Look for trades when they step up to last hit",
      "Marksmen are weakest in short burst trades — engage and disengage fast",
      "Zone them off minions to deny gold and XP",
    ],
  },
  Tank: {
    runes: [
      "Take Conqueror for sustained damage in extended trades",
      "Cut Down or Last Stand maximize damage against high HP targets",
      "Lethal Tempo works if your champion auto-attacks in trades",
    ],
    items: [
      "Prioritize %HP damage items (BotRK, Liandry's, Void Staff)",
      "Don't rush penetration — build your core damage first",
      "Blade of the Ruined King is essential against HP stackers",
    ],
    tips: [
      "Tanks want extended trades — short trades favor you",
      "Poke them down before committing to all-ins",
      "Don't chase into their team — they want you to overextend",
    ],
  },
  Support: {
    runes: [
      "Cheap Shot procs easily against supports with CC",
      "Biscuit Delivery sustains through their poke",
      "Presence of Mind helps manage mana against sustain supports",
    ],
    items: [
      "Long Sword + 3 pots for aggressive lane start",
      "Executioner's Calling if they have healing (Soraka, Nami, Yuumi)",
      "Early Boots help dodge skillshot-based supports",
    ],
    tips: [
      "Target the carry, not the support, in 2v2 fights",
      "Enchanters are weak early — punish before they scale",
      "Engage supports are most dangerous at level 2/3 and 6 — respect those",
    ],
  },
};

let _champListCache: { id: string; tags: string[] }[] | null = null;

async function getChampionList(): Promise<{ id: string; tags: string[] }[]> {
  if (_champListCache) return _champListCache;
  try {
    const res = await fetch("/api/champions");
    if (!res.ok) return [];
    const data = await res.json();
    const list = (data.champions ?? []).map((c: { id: string; tags?: string[] }) => ({
      id: c.id,
      tags: c.tags ?? [],
    }));
    _champListCache = list;
    return list;
  } catch {
    return [];
  }
}

async function fetchChampionTags(name: string): Promise<string[]> {
  const list = await getChampionList();
  const lower = name.toLowerCase();
  const match = list.find((c) => c.id.toLowerCase() === lower);
  if (match) return match.tags;

  // Fallback: try direct API call with original casing
  try {
    const res = await fetch(`/api/ddragon/champion/${encodeURIComponent(name)}`);
    if (!res.ok) return [];
    const data = await res.json();
    return data.tags ?? [];
  } catch {
    return [];
  }
}

function resolveClass(tags: string[]): ClassTag {
  const valid: ClassTag[] = ["Assassin", "Fighter", "Mage", "Marksman", "Tank", "Support"];
  for (const t of tags) {
    if (valid.includes(t as ClassTag)) return t as ClassTag;
  }
  return "Fighter";
}

export default function MatchupAdvisor({ championName }: MatchupAdvisorProps) {
  const [enemy, setEnemy] = useState("");
  const [advice, setAdvice] = useState<AdviceSection[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [enemyClass, setEnemyClass] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const analyze = useCallback(async () => {
    const trimmed = enemy.trim();
    if (!trimmed) return;

    setLoading(true);
    setError(null);
    setAdvice(null);

    const tags = await fetchChampionTags(trimmed);
    if (tags.length === 0) {
      setError(`Could not find champion "${trimmed}" — check the spelling (e.g. "Aatrox", "KSante")`);
      setLoading(false);
      return;
    }

    const cls = resolveClass(tags);
    setEnemyClass(cls);
    const classAdvice = CLASS_ADVICE[cls];

    const sections: AdviceSection[] = [
      { title: "Rune Adjustments", icon: "🔮", items: classAdvice.runes },
      { title: "Item Adjustments", icon: "🛒", items: classAdvice.items },
      { title: "Laning Tips", icon: "💡", items: classAdvice.tips },
    ];

    setAdvice(sections);
    setLoading(false);
  }, [enemy]);

  return (
    <div className="glass rounded-2xl p-5">
      <h3 className="text-lg font-semibold text-zinc-100 mb-1 flex items-center gap-2">
        <span className="text-indigo-400">🗡️</span>
        Matchup Advisor
      </h3>
      <p className="text-xs text-zinc-500 mb-4">
        Playing <span className="text-indigo-400 font-medium">{championName}</span> — enter your lane opponent
      </p>

      <div className="flex gap-2 mb-4">
        <input
          type="text"
          value={enemy}
          onChange={(e) => setEnemy(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && analyze()}
          placeholder="Enemy champion (e.g. Zed)"
          className="flex-1 rounded-lg bg-white/[0.05] border border-white/10 px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-600 outline-none focus:border-indigo-500/50 transition-colors"
        />
        <button
          onClick={analyze}
          disabled={loading || !enemy.trim()}
          className="rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed px-4 py-2 text-sm font-medium text-white transition-colors"
        >
          {loading ? "..." : "Analyze"}
        </button>
      </div>

      {error && (
        <p className="text-sm text-red-400 mb-3">{error}</p>
      )}

      {advice && enemyClass && (
        <>
          <p className="text-xs text-zinc-500 mb-3">
            <span className="text-zinc-300">{enemy.trim()}</span> is classified
            as <span className="text-indigo-400 font-medium">{enemyClass}</span>
          </p>

          <div className="space-y-3">
            {advice.map((section) => (
              <div
                key={section.title}
                className="rounded-xl bg-white/[0.03] border border-white/5 p-3"
              >
                <h4 className="text-sm font-medium text-zinc-300 mb-2 flex items-center gap-2">
                  <span>{section.icon}</span>
                  {section.title}
                </h4>
                <ul className="space-y-1.5">
                  {section.items.map((item, i) => (
                    <li
                      key={i}
                      className="text-xs text-zinc-400 flex items-start gap-2"
                    >
                      <span className="text-indigo-500 mt-0.5 shrink-0">•</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
