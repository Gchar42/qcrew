import type { Metadata } from "next";
import HomeLanding from "@/components/HomeLanding";
import { REGIONS } from "@/lib/riot-regions";

export const metadata: Metadata = {
  title: "StatGap.gg — The Fastest League of Legends Stats Site",
  description:
    "Free LoL stats, builds, tier lists, and player profiles. Updated every 2 hours. No login required. Built to help you improve.",
  alternates: {
    canonical: "/",
  },
};

export default function Home() {
  return <HomeLanding regions={REGIONS} />;
}
