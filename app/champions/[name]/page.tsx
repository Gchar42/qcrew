import type { Metadata } from "next";
import ChampionDetailClient from "./ChampionDetailClient";
import { CURRENT_PATCH } from "@/lib/seo";

interface Props {
  params: Promise<{ name: string }>;
}

function championKeyToName(key: string): string {
  const formatted = key.replace(/([A-Z])/g, " $1").trim();
  return formatted.charAt(0).toUpperCase() + formatted.slice(1).toLowerCase();
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { name } = await params;
  const championName = championKeyToName(name);

  return {
    title: `${championName} Build, Runes & Stats — Patch ${CURRENT_PATCH}`,
    description: `${championName} has top-tier builds and runes this patch. Best builds, runes, counters, and item paths based on thousands of games analyzed.`,
    keywords: `${championName.toLowerCase()} build, ${championName.toLowerCase()} runes, ${championName.toLowerCase()} counters, ${championName.toLowerCase()} win rate, ${championName.toLowerCase()} guide`,
    openGraph: {
      images: [{ url: `/api/og/champion/${encodeURIComponent(name)}`, width: 1200, height: 630 }],
    },
    alternates: {
      canonical: `/champions/${encodeURIComponent(name)}`,
    },
  };
}

export default async function ChampionDetailPage({ params }: Props) {
  const { name } = await params;
  return <ChampionDetailClient championId={name} />;
}
