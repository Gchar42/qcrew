import type { Metadata } from "next";
import PatchHistoryClient from "./PatchHistoryClient";

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
    title: `${champ} Patch History | ${name} | StatGap.gg`,
    description: `Complete patch notes history for ${champ} - every buff, nerf, and adjustment across all League of Legends patches.`,
  };
}

export default async function PatchHistoryPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { summonerName, championName } = await params;
  const name = decodeURIComponent(summonerName);
  const champ = decodeURIComponent(championName);

  return <PatchHistoryClient summonerName={name} championName={champ} />;
}
