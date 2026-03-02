import { unstable_cache } from "next/cache";
import { fetchPerksCd } from "@/lib/runesCd";

const getCachedPerks = unstable_cache(
  fetchPerksCd,
  ["cd-perks"],
  { revalidate: 86400 }
);

export async function GET() {
  const perks = await getCachedPerks();
  if (!perks) {
    return Response.json(
      { error: "Failed to fetch CommunityDragon perks" },
      { status: 502 }
    );
  }
  return Response.json({ perks });
}
