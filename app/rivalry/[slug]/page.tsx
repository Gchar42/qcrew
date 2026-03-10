import RivalryClient from "./RivalryClient";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const decoded = decodeURIComponent(slug);
  const players = decoded.split("-vs-");
  if (players.length === 2) {
    return {
      title: `${players[0]} vs ${players[1]} — Rivalry · Statgap`,
      description: `Head-to-head stats between ${players[0]} and ${players[1]} on Statgap.gg`,
    };
  }
  return { title: "Rivalry · Statgap" };
}

export default async function RivalryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return <RivalryClient slug={slug} />;
}
