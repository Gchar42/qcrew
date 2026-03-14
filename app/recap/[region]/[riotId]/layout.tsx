import type { Metadata } from "next";

type Props = {
  params: Promise<{ region: string; riotId: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { region, riotId } = await params;
  const decoded = decodeURIComponent(riotId);

  return {
    title: `${decoded}'s 2025 Season Recap — StatGap.gg`,
    openGraph: {
      images: [{ url: `/api/og/recap/${encodeURIComponent(region)}/${encodeURIComponent(riotId)}`, width: 1200, height: 630 }],
    },
  };
}

export default function RecapLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
