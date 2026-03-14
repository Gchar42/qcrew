import type { Metadata } from "next";
import ChampionAnalysisClient from "./ChampionAnalysisClient";

type Params = { summonerName: string; championName: string };

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { summonerName, championName } = await params;
  const name = decodeURIComponent(summonerName);
  const champ = decodeURIComponent(championName);

  return {
    title: `${name}'s ${champ} Stats — StatGap.gg`,
    description: `${name}'s performance on ${champ}: win rate, KDA, and personalized improvement insights.`,
    robots: "noindex, follow",
    alternates: {
      canonical: `/profile/${encodeURIComponent(summonerName)}/champion/${encodeURIComponent(championName)}`,
    },
  };
}

export default async function ChampionAnalysisPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { summonerName, championName } = await params;
  const name = decodeURIComponent(summonerName);
  const champ = decodeURIComponent(championName);

  return <ChampionAnalysisClient summonerName={name} championName={champ} />;
}
