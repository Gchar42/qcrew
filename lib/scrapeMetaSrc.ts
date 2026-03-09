type RoleKey = "top" | "jungle" | "mid" | "adc" | "support";

export type ScrapedChamp = {
  championName: string;
  role: RoleKey;
  tier: string;
  winRate: number;
  pickRate: number;
  banRate: number;
  score: number;
};

function normalizeRole(raw: string): RoleKey | null {
  const v = raw.trim().toUpperCase();
  if (v === "TOP") return "top";
  if (v === "JUNGLE") return "jungle";
  if (v === "MID") return "mid";
  if (v === "ADC") return "adc";
  if (v === "SUPPORT") return "support";
  return null;
}

function parsePercent(s: string): number {
  const n = parseFloat(s.replace("%", "").trim());
  return Number.isNaN(n) ? 0 : n;
}

const RANKS = "silver,gold,platinum,emerald,diamond,master,grandmaster";

/**
 * Fetch MetaSRC /lol/stats filtered to Silver–Grandmaster and parse the
 * markdown table rows. Returns champion stats grouped by role.
 */
export async function scrapeMetaSrc(): Promise<Record<RoleKey, ScrapedChamp[]>> {
  const url = `https://www.metasrc.com/lol/stats?ranks=${RANKS}`;
  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    },
    next: { revalidate: 0 },
  });

  if (!res.ok) {
    throw new Error(`MetaSRC responded ${res.status}`);
  }

  const html = await res.text();

  const result: Record<RoleKey, ScrapedChamp[]> = {
    top: [],
    jungle: [],
    mid: [],
    adc: [],
    support: [],
  };

  // MetaSRC renders an HTML table. When fetched as text, we can parse the rows
  // by looking for the markdown-table-like structure the fetch tool produces,
  // OR fall back to regex on the raw HTML table rows.
  //
  // Strategy: extract each table row via regex on the raw HTML.
  // Each row has: champion name, role (in the link path), tier, score, trend, win%, role%, pick%, ban%, KDA.
  //
  // We also try the markdown table format (pipe-separated) in case the fetch
  // returned a markdown conversion.

  // Try markdown table first (pipe-separated rows)
  const mdRows = html.split("\n").filter((line) => line.startsWith("|") && line.includes("%"));
  if (mdRows.length > 10) {
    for (const row of mdRows) {
      const cells = row
        .split("|")
        .map((c) => c.trim())
        .filter(Boolean);
      if (cells.length < 9) continue;

      // cells: [Name(link), Role column (may not be present), Tier, Score, Trend, Win%, Role%, Pick%, Ban%, KDA]
      // MetaSRC markdown format from our earlier fetch:
      // | [Aatrox](url) | God / S+ | 86.94 | -4.26 | 49.93% | 82.24% | 7.97% | 9.77% | 1.94 |
      const nameMatch = cells[0].match(/\[([^\]]+)\]/);
      if (!nameMatch) continue;
      const championName = nameMatch[1];

      // Detect role from the URL path: /build/aatrox = top (default), /build/aatrox/jungle etc.
      const urlMatch = cells[0].match(/\/build\/[^/]+(?:\/(\w+))?/);
      let roleRaw: string | null = null;
      if (urlMatch && urlMatch[1]) {
        roleRaw = urlMatch[1];
      }

      const tierStr = cells[1] ?? "";
      const scoreVal = parseFloat(cells[2]) || 0;
      const winRate = parsePercent(cells[4]);
      const rolePercent = parsePercent(cells[5]);
      const pickRate = parsePercent(cells[6]);
      const banRate = parsePercent(cells[7]);

      // If role wasn't in URL, infer from rolePercent > 50% meaning primary role
      // We need the role column. MetaSRC puts role in the page header section
      // but in the table the role is implicit from the URL.
      // Default role = determine from URL; if no sub-path, use primary role heuristic
      let role: RoleKey | null = roleRaw ? normalizeRole(roleRaw) : null;

      if (!role) {
        // No sub-path means the champion's primary/default role on MetaSRC.
        // We'll determine from known mappings or skip (the main list uses primary role).
        // For now, we try to extract from the lines above the table or skip.
        // Actually, MetaSRC defaults to the champion's primary role when no sub-path.
        // We can determine primary role from rolePercent (> 50% = this IS the primary listing).
        // But we still need the role name. Let's look at the page content before the table.
        role = inferPrimaryRole(championName);
      }

      if (!role) continue;

      result[role].push({
        championName,
        role,
        tier: tierStr,
        winRate,
        pickRate,
        banRate,
        score: scoreVal,
      });
    }

    if (Object.values(result).some((arr) => arr.length > 5)) {
      return result;
    }
  }

  // Fallback: parse raw HTML table rows
  // Pattern: <td> cells containing champion name, role icon/text, stats
  const trPattern = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  let trMatch;
  while ((trMatch = trPattern.exec(html)) !== null) {
    const rowHtml = trMatch[1];

    const champLink = rowHtml.match(/\/build\/([a-z-]+)(?:\/([a-z]+))?/i);
    if (!champLink) continue;

    const champSlug = champLink[1];
    const roleSlug = champLink[2] || null;

    // Extract champion display name from link text or alt text
    const nameText = rowHtml.match(/>([A-Z][a-zA-Z' .]+)</);
    const championName = nameText ? nameText[1].trim() : slugToName(champSlug);

    // Extract percentages (win%, pick%, ban%)
    const percents = [...rowHtml.matchAll(/([\d.]+)%/g)].map((m) => parseFloat(m[1]));
    if (percents.length < 3) continue;

    const winRate = percents[0];
    const pickRate = percents.length >= 3 ? percents[2] : 0;
    const banRate = percents.length >= 4 ? percents[3] : 0;

    // Score
    const scoreMatch = rowHtml.match(/(\d+\.\d+)/);
    const score = scoreMatch ? parseFloat(scoreMatch[1]) : 0;

    let role: RoleKey | null = roleSlug ? normalizeRole(roleSlug) : inferPrimaryRole(championName);
    if (!role) continue;

    result[role].push({
      championName,
      role,
      tier: "",
      winRate,
      pickRate,
      banRate,
      score,
    });
  }

  return result;
}

function slugToName(slug: string): string {
  return slug
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

const PRIMARY_ROLES: Record<string, RoleKey> = {
  Aatrox: "top", Ahri: "mid", Akali: "mid", Akshan: "mid", Alistar: "support",
  Ambessa: "top", Amumu: "jungle", Anivia: "mid", Annie: "mid", Aphelios: "adc",
  Ashe: "adc", "Aurelion Sol": "mid", Aurora: "mid", Azir: "mid", Bard: "support",
  "Bel'Veth": "jungle", Blitzcrank: "support", Brand: "support", Braum: "support",
  Briar: "jungle", Caitlyn: "adc", Camille: "top", Cassiopeia: "mid",
  "Cho'Gath": "top", Corki: "adc", Darius: "top", Diana: "jungle",
  "Dr. Mundo": "jungle", Draven: "adc", Ekko: "jungle", Elise: "jungle",
  Evelynn: "jungle", Ezreal: "adc", Fiddlesticks: "jungle", Fiora: "top",
  Fizz: "mid", Galio: "mid", Gangplank: "top", Garen: "top", Gnar: "top",
  Gragas: "top", Graves: "jungle", Gwen: "top", Hecarim: "jungle",
  Heimerdinger: "top", Hwei: "mid", Illaoi: "top", Irelia: "top",
  Ivern: "jungle", Janna: "support", "Jarvan IV": "jungle", Jax: "top",
  Jayce: "top", Jhin: "adc", Jinx: "adc", "K'Sante": "top",
  "Kai'Sa": "adc", Kalista: "adc", Karma: "support", Karthus: "jungle",
  Kassadin: "mid", Katarina: "mid", Kayle: "top", Kayn: "jungle",
  Kennen: "top", "Kha'Zix": "jungle", Kindred: "jungle", Kled: "top",
  "Kog'Maw": "adc", LeBlanc: "mid", "Lee Sin": "jungle", Leona: "support",
  Lillia: "jungle", Lissandra: "mid", Lucian: "adc", Lulu: "support",
  Lux: "support", Malphite: "top", Malzahar: "mid", Maokai: "support",
  "Master Yi": "jungle", Mel: "mid", Milio: "support",
  "Miss Fortune": "adc", Mordekaiser: "top", Morgana: "support",
  Naafiri: "jungle", Nami: "support", Nasus: "top", Nautilus: "support",
  Neeko: "support", Nidalee: "jungle", Nilah: "adc", Nocturne: "jungle",
  "Nunu & Willump": "jungle", Nunu: "jungle", Olaf: "top",
  Orianna: "mid", Ornn: "top", Pantheon: "support", Poppy: "jungle",
  Pyke: "support", Qiyana: "mid", Quinn: "top", Rakan: "support",
  Rammus: "jungle", "Rek'Sai": "jungle", "Renata Glasc": "support",
  Renekton: "top", Rengar: "jungle", Riven: "top", Rumble: "top",
  Ryze: "mid", Samira: "adc", Sejuani: "jungle", Senna: "support",
  Seraphine: "support", Sett: "top", Shaco: "jungle", Shen: "top",
  Shyvana: "jungle", Singed: "top", Sion: "top", Sivir: "adc",
  Skarner: "jungle", Smolder: "adc", Sona: "support", Soraka: "support",
  Swain: "support", Sylas: "mid", Syndra: "mid",
  "Tahm Kench": "support", Taliyah: "jungle", Talon: "jungle",
  Taric: "support", Teemo: "top", Thresh: "support", Tristana: "adc",
  Trundle: "top", Tryndamere: "top", "Twisted Fate": "mid",
  Twitch: "adc", Udyr: "jungle", Urgot: "top", Varus: "adc",
  Vayne: "adc", Veigar: "mid", "Vel'Koz": "support", Vex: "mid",
  Vi: "jungle", Viego: "jungle", Viktor: "mid", Vladimir: "mid",
  Volibear: "top", Warwick: "jungle", Wukong: "jungle",
  Xayah: "adc", Xerath: "mid", "Xin Zhao": "jungle",
  Yasuo: "mid", Yone: "mid", Yorick: "top", Yunara: "support",
  Yuumi: "support", Zaahen: "top", Zac: "jungle", Zed: "mid",
  Zeri: "adc", Ziggs: "adc", Zilean: "support", Zoe: "mid",
  Zyra: "support",
};

function inferPrimaryRole(name: string): RoleKey | null {
  return PRIMARY_ROLES[name] ?? null;
}
