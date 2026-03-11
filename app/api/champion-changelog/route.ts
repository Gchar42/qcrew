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
for (let minor = 5; minor >= 1; minor--) PATCH_VERSIONS.push(`26.${minor}`);
for (let minor = 24; minor >= 1; minor--) PATCH_VERSIONS.push(`25.${minor}`);
for (let minor = 24; minor >= 1; minor--) PATCH_VERSIONS.push(`14.${minor}`);

const PATCH_URL_BASE = "https://www.leagueoflegends.com/en-us/news/game-updates";
const CACHE_MAX_AGE_DAYS = 7;

function patchUrl(version: string): string {
  const slug = version.replace(/\./g, "-");
  return `${PATCH_URL_BASE}/patch-${slug}-notes/`;
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function normalizeChampName(name: string): string {
  return name.trim().toLowerCase().replace(/['\s.]/g, "");
}

function extractChampionChanges(html: string, championName: string): string | null {
  const normalized = normalizeChampName(championName);

  const idRegex = new RegExp(
    `<h3[^>]*\\bid="${escapeRegex("patch-" + normalized)}"[^>]*>[\\s\\S]*?</h3>`,
    "i"
  );
  const headerMatch = idRegex.exec(html);
  if (!headerMatch) return null;

  const sectionStart = headerMatch.index + headerMatch[0].length;
  const afterHeader = html.slice(sectionStart);

  const nextChampRegex = /<h3[^>]*class="[^"]*change-title[^"]*"[^>]*>/i;
  const nextChampMatch = nextChampRegex.exec(afterHeader);
  const nextSectionRegex = /<h2[^>]*>/i;
  const nextSectionMatch = nextSectionRegex.exec(afterHeader);

  let endIdx = afterHeader.length;
  if (nextChampMatch) endIdx = Math.min(endIdx, nextChampMatch.index);
  if (nextSectionMatch) endIdx = Math.min(endIdx, nextSectionMatch.index);
  endIdx = Math.min(endIdx, 5000);

  const sectionHtml = afterHeader.slice(0, endIdx);

  let cleaned = sectionHtml.replace(/<blockquote[^>]*>[\s\S]*?<\/blockquote>/gi, "");

  cleaned = cleaned.replace(/<h4[^>]*>([\s\S]*?)<\/h4>/gi, (_match, inner: string) => {
    const abilityName = inner.replace(/<img[^>]*>/gi, "").replace(/<[^>]+>/g, "").trim();
    return `\n[ABILITY]${abilityName}\n`;
  });

  cleaned = cleaned.replace(/<li[^>]*>/gi, "- ");
  cleaned = cleaned.replace(/<\/li>/gi, "\n");
  cleaned = cleaned.replace(/<br\s*\/?>/gi, "\n");
  cleaned = cleaned.replace(/<hr\s*\/?>/gi, "");
  cleaned = cleaned.replace(/<\/?strong>/gi, "");
  cleaned = cleaned.replace(/<[^>]+>/g, "");

  cleaned = cleaned
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/&#8658;/g, "\u21D2")
    .replace(/&#\d+;/g, "")
    .replace(/&[a-z]+;/gi, "");

  cleaned = cleaned
    .split("\n")
    .map((l) => l.replace(/[ \t]+/g, " ").trim())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  if (!cleaned || cleaned.length < 5) return null;
  return cleaned;
}

function classifyChange(text: string): string {
  const lines = text.split("\n").map((l) => l.trim()).filter((l) => l.startsWith("- "));

  let buffSignals = 0;
  let nerfSignals = 0;

  for (const line of lines) {
    const arrowParts = line.split(/\u21D2|\u2192|=>|\u279C/);
    if (arrowParts.length === 2) {
      const beforeNums = arrowParts[0].match(/[\d.]+/g)?.map(Number) ?? [];
      const afterNums = arrowParts[1].match(/[\d.]+/g)?.map(Number) ?? [];

      if (beforeNums.length > 0 && afterNums.length > 0) {
        const b = beforeNums[beforeNums.length - 1];
        const a = afterNums[afterNums.length - 1];
        if (a > b) buffSignals++;
        else if (a < b) nerfSignals++;
      }
    }

    const lower = line.toLowerCase();
    if (/\bnew\b|\badded\b|\bnow\b/.test(lower) && !/\bremoved\b/.test(lower)) buffSignals++;
    if (/\bremoved\b/.test(lower)) nerfSignals++;
  }

  const lower = text.toLowerCase();
  if (/\bbuff\b/.test(lower)) buffSignals += 2;
  if (/\bnerf\b/.test(lower)) nerfSignals += 2;

  if (buffSignals > 0 && nerfSignals > 0) return "adjust";
  if (buffSignals > nerfSignals) return "buff";
  if (nerfSignals > buffSignals) return "nerf";
  return "change";
}

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

  // Check cache: only use entries newer than CACHE_MAX_AGE_DAYS
  if (client) {
    const cutoff = new Date(Date.now() - CACHE_MAX_AGE_DAYS * 86400000).toISOString();

    const { data: cached } = await client
      .from("champion_patch_notes")
      .select("patch_version, patch_date, change_type, changes_text, scraped_at")
      .ilike("champion_name", champion)
      .gte("scraped_at", cutoff)
      .order("patch_version", { ascending: false })
      .limit(limit);

    if (cached && cached.length > 0) {
      // Re-classify on read so cached entries always get correct buff/nerf labels
      const changes: PatchChange[] = cached.map((r) => ({
        patchVersion: r.patch_version,
        patchDate: r.patch_date,
        changeType: classifyChange(r.changes_text),
        changes: r.changes_text,
      }));
      return NextResponse.json({ champion, changes, cached: true });
    }

    // Delete any stale entries for this champion before re-scraping
    await client
      .from("champion_patch_notes")
      .delete()
      .ilike("champion_name", champion);
  }

  // Scrape patch notes
  const changes: PatchChange[] = [];

  for (let i = 0; i < PATCH_VERSIONS.length; i += 5) {
    const batch = PATCH_VERSIONS.slice(i, i + 5);
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

  changes.sort((a, b) => {
    const [aMaj, aMin] = a.patchVersion.split(".").map(Number);
    const [bMaj, bMin] = b.patchVersion.split(".").map(Number);
    return bMaj !== aMaj ? bMaj - aMaj : bMin - aMin;
  });

  // Cache fresh results
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
      .upsert(rows, { onConflict: "champion_name,patch_version" });
  }

  return NextResponse.json({ champion, changes, cached: false });
}
