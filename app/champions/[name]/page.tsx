import ChampionDetailClient from "./ChampionDetailClient";

interface Props {
  params: Promise<{ name: string }>;
}

export default async function ChampionDetailPage({ params }: Props) {
  const { name } = await params;
  return <ChampionDetailClient championId={name} />;
}
