import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getAdminClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

type PatchChange = {
  patchVersion: string;
  patchDate: string | null;
  changeType: string | null;
  changes: string;
};

const PATCH_VERSIONS: string[] = [];

// Generate patch version list: 26.5 down to 14.1
for (let minor = 5; minor >= 1; minor--) PATCH_VERSIONS.push(`26.${minor}`);
for (let minor = 24; minor >= 1; minor--) PATCH_VERSIONS.push(`25.${minor}`);
for (let minor = 24; minor >= 1; minor--) PATCH_VERSIONS.push(`14.${minor}`);

const PATCH_URL_BASE = "https://www.leagueoflegends.com/en-us/news/game-updates";

function patchUrl(version: string): string {
  const slug = version.replace(/\./g, "-");
  // Some older patches use "league-of-legends-patch-X-Y-notes"
  return `${PATCH_URL_BASE}/patch-${slug}-notes/`;
}

function normalizeChampName(name: string): string {
  return name.trim().toLowerCase().replace(/['\s.]/g, "");
}

function extractChampionChanges(html: string, championName: string): string | null {
  const normalized = normalizeChampName(championName);

  // Find champion header (h3 or h2) in the patch notes HTML
  // Riot uses ### Champion Name in their markdown which renders to <h3>
  const headerPatterns = [
    new RegExp(`<h3[^>]*>\\s*${escapeRegex(championName)}\\s*</h3>`, "i"),
    new RegExp(`<h2[^>]*>\\s*${escapeRegex(championName)}\\s*</h2>`, "i"),
    // Also try with id attribute matching
    new RegExp(`<h[23][^>]*id="[^"]*${escapeRegex(normalized)}[^"]*"[^>]*>`, "i"),
  ];

  let startIdx = -1;
  for (const pattern of headerPatterns) {
    const match = pattern.exec(html);
    if (match) {
      startIdx = match.index;
      break;
    }
  }

  if (startIdx === -1) return null;

  // Find the end: next h2 or h3 that's a different champion section
  const rest = html.slice(startIdx);
  const endMatch = rest.match(/(?<=.{10})<h[23][^>]*>/i);
  const section = endMatch ? rest.slice(0, endMatch.index!) : rest.slice(0, 2000);

  // Strip HTML tags and clean up
  let text = section
    .replace(/<blockquote[^>]*>[\s\S]*?<\/blockquote>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<li[^>]*>/gi, "- ")
    .replace(/<\/li>/gi, "\n")
    .replace(/<hr\s*\/?>/gi, "\n")
    .replace(/<h[456][^>]*>([\s\S]*?)<\/h[456]>/gi, "**$1**\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/&#\d+;/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  // Remove the champion name header line from the start
  const lines = text.split("\n");
  if (lines[0] && normalizeChampName(lines[0]) === normalized) {
    text = lines.slice(1).join("\n").trim();
  }

  return text || null;
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function classifyChange(text: string): string {
  const lower = text.toLowerCase();
  const hasIncrease = /increased|buffed|added|new|improved|more|higher|longer|faster|reduced cooldown|increased.*ratio/i.test(lower);
  const hasDecrease = /decreased|nerfed|removed|reduced|less|lower|shorter|slower|increased cooldown|reduced.*ratio/i.test(lower);
  if (hasIncrease && hasDecrease) return "adjust";
  if (hasIncrease) return "buff";
  if (hasDecrease) return "nerf";
  return "change";
}

// Dates for known patches (approximate)
const PATCH_DATES: Record<string, string> = {
  "26.5": "2026-03-04", "26.4": "2026-02-18", "26.3": "2026-02-04",
  "26.2": "2026-01-21", "26.1": "2026-01-07",
  "25.24": "2025-12-02", "25.23": "2025-11-18", "25.22": "2025-11-04",
  "25.21": "2025-10-21", "25.20": "2025-10-07", "25.19": "2025-09-23",
  "25.18": "2025-09-09", "25.17": "2025-08-26", "25.16": "2025-08-12",
  "25.15": "2025-07-29", "25.14": "2025-07-15", "25.13": "2025-07-01",
  "25.12": "2025-06-17", "25.11": "2025-06-03", "25.10": "2025-05-20",
  "25.9": "2025-05-06", "25.8": "2025-04-22", "25.7": "2025-04-08",
  "25.6": "2025-03-25", "25.5": "2025-03-11", "25.4": "2025-02-25",
  "25.3": "2025-02-11", "25.2": "2025-01-28", "25.1": "2025-01-14",
};

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const champion = (searchParams.get("champion") || "").trim();
  const limitParam = searchParams.get("limit");
  const limit = Math.min(Math.max(parseInt(limitParam || "20", 10) || 20, 1), 60);

  if (!champion) {
    return NextResponse.json({ error: "champion param required" }, { status: 400 });
  }

  const client = getAdminClient();

  // Check cache first
  if (client) {
    const { data: cached } = await client
      .from("champion_patch_notes")
      .select("patch_version, patch_date, change_type, changes_text")
      .ilike("champion_name", champion)
      .order("patch_version", { ascending: false })
      .limit(limit);

    if (cached && cached.length > 0) {
      const changes: PatchChange[] = cached.map((r) => ({
        patchVersion: r.patch_version,
        patchDate: r.patch_date,
        changeType: r.change_type,
        changes: r.changes_text,
      }));
      return NextResponse.json({ champion, changes, cached: true });
    }
  }

  // Scrape patch notes
  const changes: PatchChange[] = [];
  const patchesToScrape = PATCH_VERSIONS;

  // Scrape in parallel batches of 5 to avoid hammering the server
  for (let i = 0; i < patchesToScrape.length; i += 5) {
    const batch = patchesToScrape.slice(i, i + 5);
    const results = await Promise.allSettled(
      batch.map(async (version) => {
        try {
          const url = patchUrl(version);
          const res = await fetch(url, {
            headers: { "User-Agent": "StatGap/1.0 (patch-changelog)" },
            signal: AbortSignal.timeout(8000),
          });
          if (!res.ok) return null;
          const html = await res.text();
          const champChanges = extractChampionChanges(html, champion);
          if (!champChanges) return null;
          return {
            patchVersion: version,
            patchDate: PATCH_DATES[version] || null,
            changeType: classifyChange(champChanges),
            changes: champChanges,
          } as PatchChange;
        } catch {
          return null;
        }
      })
    );
    for (const r of results) {
      if (r.status === "fulfilled" && r.value) {
        changes.push(r.value);
      }
    }
  }

  // Sort by patch version descending
  changes.sort((a, b) => {
    const [aMaj, aMin] = a.patchVersion.split(".").map(Number);
    const [bMaj, bMin] = b.patchVersion.split(".").map(Number);
    return bMaj !== aMaj ? bMaj - aMaj : bMin - aMin;
  });

  // Cache results in Supabase
  if (client && changes.length > 0) {
    const rows = changes.map((c) => ({
      champion_name: champion,
      patch_version: c.patchVersion,
      patch_date: c.patchDate,
      change_type: c.changeType,
      changes_text: c.changes,
    }));
    await client
      .from("champion_patch_notes")
      .upsert(rows, { onConflict: "champion_name,patch_version" })
      .then(() => {});
  }

  return NextResponse.json({ champion, changes, cached: false });
}
