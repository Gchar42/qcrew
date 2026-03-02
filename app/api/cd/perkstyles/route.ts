import { unstable_cache } from "next/cache";
import { fetchPerkStylesCd } from "@/lib/runesCd";

const getCachedPerkStyles = unstable_cache(
  fetchPerkStylesCd,
  ["cd-perkstyles"],
  { revalidate: 86400 }
);

export async function GET() {
  const styles = await getCachedPerkStyles();
  if (!styles) {
    return Response.json(
      { error: "Failed to fetch CommunityDragon perk styles" },
      { status: 502 }
    );
  }
  return Response.json({ styles });
}
