import { unstable_cache } from "next/cache";

const VERSIONS_URL =
  "https://ddragon.leagueoflegends.com/api/versions.json";

async function fetchVersion(): Promise<string | null> {
  const res = await fetch(VERSIONS_URL, { next: { revalidate: 3600 } });
  if (!res.ok) return null;
  const versions = (await res.json()) as string[];
  return versions?.[0] ?? null;
}

const getCachedVersion = unstable_cache(
  fetchVersion,
  ["ddragon-version"],
  { revalidate: 3600 }
);

export async function GET() {
  const version = await getCachedVersion();
  if (!version) {
    return Response.json(
      { error: "Failed to fetch Data Dragon version" },
      { status: 502 }
    );
  }
  return Response.json({ version });
}
