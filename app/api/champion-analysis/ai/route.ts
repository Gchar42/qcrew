import { NextResponse } from "next/server";
import type { ChampionAnalysisData } from "@/lib/championAnalysis";

export const dynamic = "force-dynamic";

const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const RATE_LIMIT_MS = 60 * 60 * 1000;

function buildPrompt(data: ChampionAnalysisData): string {
  const best = data.bestMatchups
    .slice(0, 3)
    .map((m) => `${m.opponentChampion} (${m.winRate}% WR, ${m.games} games)`)
    .join(", ") || "Not enough data";

  const worst = data.worstMatchups
    .slice(0, 3)
    .map((m) => `${m.opponentChampion} (${m.winRate}% WR, ${m.games} games)`)
    .join(", ") || "Not enough data";

  return `You are an expert League of Legends coach. Analyze this player's performance on ${data.championName} and give direct, specific coaching feedback.

Player rank: ${data.tier} ${data.rank}
Champion: ${data.championName}

Their stats vs ${data.tier} benchmark for this champion:
- CS/min: ${data.overall.avgCsPerMin} vs benchmark ${data.comparisons.find((c) => c.stat === "csPerMin")?.benchmark ?? "N/A"} (${data.comparisons.find((c) => c.stat === "csPerMin")?.percentile ?? 0}th percentile)
- KDA: ${data.overall.avgKda} vs benchmark ${data.comparisons.find((c) => c.stat === "kda")?.benchmark ?? "N/A"} (${data.comparisons.find((c) => c.stat === "kda")?.percentile ?? 0}th percentile)
- Vision Score: ${data.overall.avgVisionScore} vs benchmark ${data.comparisons.find((c) => c.stat === "visionScore")?.benchmark ?? "N/A"} (${data.comparisons.find((c) => c.stat === "visionScore")?.percentile ?? 0}th percentile)
- Damage Share: ${data.overall.avgDamageShare}% vs benchmark ${data.comparisons.find((c) => c.stat === "damageShare")?.benchmark ?? "N/A"}% (${data.comparisons.find((c) => c.stat === "damageShare")?.percentile ?? 0}th percentile)
- Win Rate: ${data.overall.winRate}% (last ${data.totalGamesAnalyzed} games)

Trend (last 20 games vs previous 20):
- CS/min change: ${data.trendDetails.csPerMinChange > 0 ? "+" : ""}${data.trendDetails.csPerMinChange}
- KDA change: ${data.trendDetails.kdaChange > 0 ? "+" : ""}${data.trendDetails.kdaChange}
- Win rate change: ${data.trendDetails.winRateChange > 0 ? "+" : ""}${data.trendDetails.winRateChange}%

Matchup data:
- Best matchups: ${best}
- Worst matchups: ${worst}

Write exactly 3 paragraphs:
1. Their main strengths on this champion (be specific, reference their actual stats)
2. Their single biggest gap vs high-rank players and what it likely means about their gameplay
3. One concrete thing to focus on in their next 10 games to improve, and what improvement would look like numerically

Be direct and specific. Never be generic. Always reference actual numbers.`;
}

async function callClaude(prompt: string): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return generateFallbackAnalysis(prompt);
  }

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!res.ok) {
    console.error("Claude API error:", res.status, await res.text());
    return generateFallbackAnalysis(prompt);
  }

  const body = await res.json();
  const text = body.content?.[0]?.text;
  if (!text) return generateFallbackAnalysis(prompt);
  return text;
}

function generateFallbackAnalysis(prompt: string): string {
  const lines = prompt.split("\n");
  const champLine = lines.find((l) => l.startsWith("Champion:")) ?? "";
  const champion = champLine.replace("Champion:", "").trim();
  const rankLine = lines.find((l) => l.startsWith("Player rank:")) ?? "";
  const rank = rankLine.replace("Player rank:", "").trim();

  return `This player's ${champion} performance shows a solid foundation at the ${rank} level. Their stats indicate they understand the champion's core mechanics and can contribute in team fights. The key areas to examine are CS efficiency, vision control, and damage output relative to their rank peers.

The most significant area for improvement appears to be in one of the core stats tracked above — look at which stat falls below the 50th percentile for your rank. For most players at this level, consistent farming and map awareness are the biggest differentiators between staying at their current rank and climbing.

To improve over your next 10 games, focus on the stat where you're furthest below the benchmark. Set a specific target: if your CS/min is low, aim to be within 0.5 of the benchmark. Track your progress game by game, and you should see measurable improvement within a week of focused practice.

*Note: AI analysis requires an Anthropic API key. Add ANTHROPIC_API_KEY to your environment variables for personalized coaching insights.*`;
}

async function getCachedAnalysis(
  riotId: string,
  region: string,
  champion: string
): Promise<{ ai_analysis: string; ai_generated_at: string; stats: ChampionAnalysisData; last_refresh_requested_at: string | null } | null> {
  try {
    const { supabaseAdmin } = await import("@/lib/supabaseAdmin");
    const { data } = await supabaseAdmin
      .from("champion_analysis_cache")
      .select("*")
      .eq("riot_id", riotId)
      .eq("region", region)
      .eq("champion_name", champion)
      .single();

    if (!data) return null;

    const age = Date.now() - new Date(data.updated_at).getTime();
    if (age > CACHE_TTL_MS) return null;

    return {
      ai_analysis: data.ai_analysis,
      ai_generated_at: data.ai_generated_at,
      stats: data.stats as ChampionAnalysisData,
      last_refresh_requested_at: data.last_refresh_requested_at,
    };
  } catch {
    return null;
  }
}

async function saveAnalysis(
  riotId: string,
  region: string,
  champion: string,
  stats: ChampionAnalysisData,
  aiAnalysis: string
) {
  try {
    const { supabaseAdmin } = await import("@/lib/supabaseAdmin");
    await supabaseAdmin.from("champion_analysis_cache").upsert(
      {
        riot_id: riotId,
        region,
        champion_name: champion,
        stats,
        ai_analysis: aiAnalysis,
        ai_generated_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "riot_id,region,champion_name" }
    );
  } catch (err) {
    console.error("Failed to cache analysis:", err);
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const analysisData = body.analysisData as ChampionAnalysisData;
    const forceRefresh = body.forceRefresh === true;

    if (!analysisData?.riotId || !analysisData?.championName) {
      return NextResponse.json({ error: "analysisData required" }, { status: 400 });
    }

    const { riotId, region, championName } = analysisData;

    if (!forceRefresh) {
      const cached = await getCachedAnalysis(riotId, region, championName);
      if (cached?.ai_analysis) {
        return NextResponse.json({
          analysis: cached.ai_analysis,
          generatedAt: cached.ai_generated_at,
          cached: true,
        });
      }
    } else {
      const cached = await getCachedAnalysis(riotId, region, championName);
      if (cached?.last_refresh_requested_at) {
        const timeSince = Date.now() - new Date(cached.last_refresh_requested_at).getTime();
        if (timeSince < RATE_LIMIT_MS) {
          return NextResponse.json({
            analysis: cached.ai_analysis,
            generatedAt: cached.ai_generated_at,
            cached: true,
            rateLimited: true,
            retryAfterMs: RATE_LIMIT_MS - timeSince,
          });
        }
      }

      try {
        const { supabaseAdmin } = await import("@/lib/supabaseAdmin");
        await supabaseAdmin
          .from("champion_analysis_cache")
          .update({ last_refresh_requested_at: new Date().toISOString() })
          .eq("riot_id", riotId)
          .eq("region", region)
          .eq("champion_name", championName);
      } catch { /* ok */ }
    }

    const prompt = buildPrompt(analysisData);
    const analysis = await callClaude(prompt);

    await saveAnalysis(riotId, region, championName, analysisData, analysis);

    return NextResponse.json({
      analysis,
      generatedAt: new Date().toISOString(),
      cached: false,
    });
  } catch (err) {
    console.error("AI analysis error:", err);
    return NextResponse.json(
      { error: "Failed to generate analysis" },
      { status: 500 }
    );
  }
}
