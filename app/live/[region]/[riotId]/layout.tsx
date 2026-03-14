import type { Metadata } from "next";

type Props = {
  params: Promise<{ region: string; riotId: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { riotId } = await params;
  const decoded = decodeURIComponent(riotId);
  const display = decoded.includes("#") ? decoded : `${decoded}#LIVE`;

  return {
    title: `${display} Live Game — StatGap.gg`,
    robots: "noindex, nofollow",
  };
}

export default function LiveLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
