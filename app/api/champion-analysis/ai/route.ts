import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type StatsBlock = {
  games: number; wins: number; winRate: number;
  avgKda: number; avgKills: number; avgDeaths: number; avgAssists: number;
  avgCsPerMin: number; avgVisionScore: number; avgDamageShare: number; avgGoldPerMin: number;
};

type StatComparison = {
  stat: string; label: string; playerValue: number; benchmark: number;
  percentile: number; status: "good" | "warning" | "bad";
};

type AnalysisData = {
  championName: string; riotId: string; tier: string; rank: string;
  overall: StatsBlock; recentBlock: StatsBlock; previousBlock: StatsBlock;
  trend: "improving" | "plateauing" | "declining";
  trendDetails: { csPerMinChange: number; kdaChange: number; winRateChange: number };
  comparisons: StatComparison[];
  avgPercentile: number; equivalentRank: string;
  masteryGrade: string; playstyleTitle: string;
  oneThingCallout: { stat: string; current: number; target: number; targetRank: string; tip: string };
  totalGamesAnalyzed: number;
  [key: string]: unknown;
};

function generateDevAnalysis(data: AnalysisData): string {
  const { championName, overall, recentBlock, trend, trendDetails, comparisons, oneThingCallout, equivalentRank, masteryGrade, playstyleTitle } = data;
  const weakest = comparisons.reduce((a, b) => a.percentile < b.percentile ? a : b);
  const strongest = comparisons.reduce((a, b) => a.percentile > b.percentile ? a : b);

  const trendEmoji = trend === "improving" ? "📈" : trend === "declining" ? "📉" : "➡️";
  const trendWord = trend === "improving" ? "on an upward trajectory" : trend === "declining" ? "in a slight dip" : "holding steady";

  const paragraphs: string[] = [];

  paragraphs.push(
    `Looking at your ${overall.games} games on ${championName}, you're currently playing at a ${equivalentRank}-level with a ${masteryGrade} mastery grade. ` +
    `Your "${playstyleTitle}" identity is clear — let's sharpen it into something that climbs.`
  );

  paragraphs.push(
    `Your biggest strength is ${strongest.label.toLowerCase()} at ${strongest.playerValue}${strongest.stat === "winRate" || strongest.stat === "damageShare" ? "%" : ""}, ` +
    `which puts you in the ${strongest.percentile}th percentile for ${data.tier || "Gold"}. ` +
    `That's legitimately good — keep leaning into this.`
  );

  if (weakest.stat === "csPerMin") {
    const csAt10 = Math.round(overall.avgCsPerMin * 10);
    const targetCs = Math.round(oneThingCallout.target * 10);
    paragraphs.push(
      `Your CS at 10 minutes averages around ${csAt10} — hitting ${targetCs} would put you at ${oneThingCallout.targetRank}-level laning. ` +
      `Focus on catching the two minion waves you miss during base timings. Practice the "shove-and-back" pattern: hard push cannon waves, ` +
      `then recall so you lose minimal CS. Also, use attack-move click (A-click) to avoid misclicks under tower.`
    );
  } else if (weakest.stat === "visionScore") {
    paragraphs.push(
      `Your vision score of ${overall.avgVisionScore} is holding you back (${weakest.percentile}th percentile). ` +
      `Buy a Control Ward every single back — this alone adds 6-8 vision score per game. ` +
      `Sweep the river bush 60 seconds before Dragon/Baron spawns, and drop a deep ward in the enemy jungle when you have lane priority. ` +
      `Vision isn't just a support stat; it's how you avoid the deaths that cost you games.`
    );
  } else if (weakest.stat === "kda") {
    paragraphs.push(
      `Your KDA of ${overall.avgKda} (${overall.avgKills}/${overall.avgDeaths}/${overall.avgAssists}) shows you're dying ${overall.avgDeaths} times per game on average. ` +
      `Review your death log in losses — most players at this rank die from overstaying 3-5 seconds after a fight or objective. ` +
      `Set a mental rule: if you get a kill and you're below 40% HP, back immediately. Don't greed for plates or another wave.`
    );
  } else if (weakest.stat === "damageShare") {
    paragraphs.push(
      `Your damage share of ${overall.avgDamageShare}% is below the ${data.tier || "Gold"} benchmark of ${weakest.benchmark}%. ` +
      `Before teamfights, look for 2-3 poke abilities on grouped enemies. During laning, trade when the enemy goes for a last-hit — ` +
      `they can't trade back and CS at the same time. This alone can boost your damage by 15-20%.`
    );
  } else {
    paragraphs.push(
      `Your ${weakest.label.toLowerCase()} is at ${weakest.playerValue}, which is in the ${weakest.percentile}th percentile. ` +
      `${oneThingCallout.tip}`
    );
  }

  if (trend === "improving") {
    paragraphs.push(
      `${trendEmoji} You're ${trendWord} — your recent win rate is up ${trendDetails.winRateChange > 0 ? "+" : ""}${trendDetails.winRateChange}% ` +
      `and your KDA improved by ${trendDetails.kdaChange > 0 ? "+" : ""}${trendDetails.kdaChange}. ` +
      `Whatever you changed recently is working. Stay consistent and don't tilt-queue after a loss.`
    );
  } else if (trend === "declining") {
    paragraphs.push(
      `${trendEmoji} You're ${trendWord} — recent win rate dropped ${trendDetails.winRateChange}% with a KDA shift of ${trendDetails.kdaChange}. ` +
      `This happens to everyone. Take a 5-minute break between losses, and limit ranked to 3 games in a row. ` +
      `Your fundamentals are solid; this is likely a mental/focus issue, not a skill one.`
    );
  } else {
    paragraphs.push(
      `${trendEmoji} You're ${trendWord} — your stats over the last ${recentBlock.games} games are nearly identical to the previous block. ` +
      `To break through the plateau, focus exclusively on the one stat above (${oneThingCallout.stat === "csPerMin" ? "CS/min" : weakest.label.toLowerCase()}). ` +
      `Improvement comes from deliberate focus on one thing, not trying to fix everything at once.`
    );
  }

  paragraphs.push(
    `Bottom line: fix your ${weakest.label.toLowerCase()}, keep abusing your ${strongest.label.toLowerCase()}, ` +
    `and you'll be ${oneThingCallout.targetRank} within 50-80 games. Let's go.`
  );

  return paragraphs.join("\n\n");
}

export async function POST(request: Request) {
  let body: { analysisData?: AnalysisData; forceRefresh?: boolean };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { analysisData } = body;
  if (!analysisData || !analysisData.championName) {
    return NextResponse.json(
      { error: "Missing analysisData in request body" },
      { status: 400 },
    );
  }

  const hasOpenAIKey = !!process.env.OPENAI_API_KEY;

  if (!hasOpenAIKey) {
    // DEV MODE: generate analysis from stats without calling OpenAI
    const analysis = generateDevAnalysis(analysisData);
    return NextResponse.json({
      analysis,
      generatedAt: new Date().toISOString(),
      cached: false,
    });
  }

  // PRODUCTION MODE placeholder — will be implemented when API key is available
  return NextResponse.json({
    analysis: generateDevAnalysis(analysisData),
    generatedAt: new Date().toISOString(),
    cached: false,
  });
}
