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
    title: `${name}'s ${champ} Performance Analysis | StatGap.gg`,
    description: `Deep dive into ${name}'s ${champ} gameplay — stats vs benchmarks, matchup win rates, trend analysis, and AI coaching insights on StatGap.gg`,
    openGraph: {
      title: `${name}'s ${champ} Analysis — StatGap.gg`,
      description: `See how ${name} performs on ${champ} compared to their rank tier`,
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
