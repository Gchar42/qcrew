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

/**
 * Dynamically generate patch versions and dates based on Riot's ~2-week cadence.
 * Anchor: patch 25.1 released 2025-01-14. Each subsequent patch is +14 days.
 * Season = calendar year; minor resets to 1 each January.
 */
const SEASON_ANCHORS: Record<number, { firstPatchDate: Date; maxPatches: number }> = {
  14: { firstPatchDate: new Date("2024-01-10T00:00:00Z"), maxPatches: 24 },
  25: { firstPatchDate: new Date("2025-01-14T00:00:00Z"), maxPatches: 24 },
  26: { firstPatchDate: new Date("2026-01-07T00:00:00Z"), maxPatches: 24 },
  27: { firstPatchDate: new Date("2027-01-06T00:00:00Z"), maxPatches: 24 },
};

function getPatchDate(season: number, minor: number): Date {
  const anchor = SEASON_ANCHORS[season];
  if (!anchor) return new Date(0);
  const ms = anchor.firstPatchDate.getTime() + (minor - 1) * 14 * 86400000;
  return new Date(ms);
}

function formatDateStr(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function generatePatchVersions(): { versions: string[]; dates: Record<string, string> } {
  const now = new Date();
  const versions: string[] = [];
  const dates: Record<string, string> = {};

  const seasons = Object.keys(SEASON_ANCHORS).map(Number).sort((a, b) => b - a);

  for (const season of seasons) {
    const anchor = SEASON_ANCHORS[season];
    for (let minor = anchor.maxPatches; minor >= 1; minor--) {
      const patchDate = getPatchDate(season, minor);
      if (patchDate > now) continue;
      const ver = `${season}.${minor}`;
      versions.push(ver);
      dates[ver] = formatDateStr(patchDate);
    }
  }

  versions.sort((a, b) => {
    const [aMaj, aMin] = a.split(".").map(Number);
    const [bMaj, bMin] = b.split(".").map(Number);
    return bMaj !== aMaj ? bMaj - aMaj : bMin - aMin;
  });

  return { versions, dates };
}

function isRecentPatch(version: string, allVersions: string[]): boolean {
  const idx = allVersions.indexOf(version);
  return idx >= 0 && idx < 2;
}

const CACHE_MAX_AGE_DAYS_OLD = 7;
const CACHE_MAX_AGE_DAYS_RECENT = 1;

const PATCH_URL_BASE = "https://www.leagueoflegends.com/en-us/news/game-updates";

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

const LOWER_IS_BETTER = /\bcooldown\b|\bcool\s*down\b|\bmana\s*cost\b|\bcost\b|\bcast\s*time\b|\bwind[\s-]*up\b|\bdelay\b/i;

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
        const inverted = LOWER_IS_BETTER.test(line);
        if (a > b) { inverted ? nerfSignals++ : buffSignals++; }
        else if (a < b) { inverted ? buffSignals++ : nerfSignals++; }
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

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const champion = (searchParams.get("champion") || "").trim();
  const limitParam = searchParams.get("limit");
  const limit = Math.min(Math.max(parseInt(limitParam || "20", 10) || 20, 1), 60);

  if (!champion) {
    return NextResponse.json({ error: "champion param required" }, { status: 400 });
  }

  const { versions: PATCH_VERSIONS, dates: PATCH_DATES } = generatePatchVersions();
  const client = getAdminClient();

  // Check cache with tiered TTL: 1 day for newest 2 patches, 7 days for older
  if (client) {
    const { data: cached } = await client
      .from("champion_patch_notes")
      .select("patch_version, patch_date, change_type, changes_text, scraped_at")
      .ilike("champion_name", champion)
      .order("patch_version", { ascending: false })
      .limit(limit);

    if (cached && cached.length > 0) {
      const now = Date.now();
      const fresh: typeof cached = [];
      const staleVersions: string[] = [];

      for (const row of cached) {
        const maxAge = isRecentPatch(row.patch_version, PATCH_VERSIONS)
          ? CACHE_MAX_AGE_DAYS_RECENT
          : CACHE_MAX_AGE_DAYS_OLD;
        const age = now - new Date(row.scraped_at).getTime();
        if (age < maxAge * 86400000) {
          fresh.push(row);
        } else {
          staleVersions.push(row.patch_version);
        }
      }

      // Delete stale entries so they get re-scraped below
      if (staleVersions.length > 0) {
        await client
          .from("champion_patch_notes")
          .delete()
          .ilike("champion_name", champion)
          .in("patch_version", staleVersions);
      }

      // If we still have fresh data covering the request, return it
      if (fresh.length > 0 && staleVersions.length === 0) {
        const changes: PatchChange[] = fresh.map((r) => ({
          patchVersion: r.patch_version,
          patchDate: r.patch_date,
          changeType: classifyChange(r.changes_text),
          changes: r.changes_text,
        }));
        return NextResponse.json({ champion, changes, cached: true });
      }
    }
  }

  // Determine which versions need scraping
  const versionsToScrape = PATCH_VERSIONS;

  // Scrape patch notes
  const changes: PatchChange[] = [];

  for (let i = 0; i < versionsToScrape.length; i += 5) {
    const batch = versionsToScrape.slice(i, i + 5);
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
