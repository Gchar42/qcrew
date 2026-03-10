import { notFound } from "next/navigation";
import SummonerProfileBeige from "@/components/SummonerProfileBeige";
import { getAccount } from "@/lib/riot-api";
import type { Metadata } from "next";

export default async function SummonerByRegionNameTagPage({
  params,
}: {
  params: Promise<{ region: string; name: string; tag: string }>;
}) {
  const { region, name: nameEnc, tag: tagEnc } = await params;
  const name = decodeURIComponent(nameEnc);
  const tag = decodeURIComponent(tagEnc);

  const account = await getAccount(region, name, tag);
  if (!account) notFound();

  const riotId = `${name}#${tag}`;
  return <SummonerProfileBeige riotId={riotId} region={region} />;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ region: string; name: string; tag: string }>;
}): Promise<Metadata> {
  const { region, name: nameEnc, tag: tagEnc } = await params;
  const name = decodeURIComponent(nameEnc);
  const tag = decodeURIComponent(tagEnc);
  const riotId = `${name}#${tag}`;
  const ogUrl = `/api/og?name=${encodeURIComponent(riotId)}`;

  return {
    title: `${riotId} — ${region.toUpperCase()} · Statgap`,
    description: `View ${riotId}'s League of Legends stats, match history, and ranked data on Statgap.gg`,
    openGraph: {
      title: `${riotId} — Statgap.gg`,
      description: `League of Legends stats for ${riotId} on ${region.toUpperCase()}`,
      images: [{ url: ogUrl, width: 1200, height: 630 }],
    },
    twitter: {
      card: "summary_large_image",
      title: `${riotId} — Statgap.gg`,
      images: [ogUrl],
    },
  };
}
