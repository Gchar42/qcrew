import type { MetadataRoute } from "next";
import { getChampions } from "@/lib/data-dragon";

const BASE_URL = "https://statgap.gg";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const champions = await getChampions();
  const championUrls: MetadataRoute.Sitemap = champions.map((c) => ({
    url: `${BASE_URL}/champions/${c.id}`,
    lastModified: new Date(),
    changeFrequency: "daily" as const,
    priority: 0.8,
  }));

  const staticUrls: MetadataRoute.Sitemap = [
    {
      url: BASE_URL,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1.0,
    },
    {
      url: `${BASE_URL}/tierlist`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/jungle-stats`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/runes`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.7,
    },
  ];

  return [...staticUrls, ...championUrls];
}
