import { NextRequest } from "next/server";
import { getSampleBuild, type ChampionBuild } from "@/lib/sampleChampionBuilds";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  const { name } = await params;
  if (!name) {
    return Response.json({ error: "Champion name required" }, { status: 400 });
  }

  const role = req.nextUrl.searchParams.get("role") ?? undefined;

  try {
    const build = await getBuildData(name, role);

    if (!build) {
      return Response.json(
        { error: `No build data for "${name}"`, available: false },
        { status: 404 }
      );
    }

    return Response.json({
      ...build,
      dataSource: "sample",
    });
  } catch (err) {
    console.error("Build API error:", err);
    return Response.json({ error: "Failed to load build" }, { status: 500 });
  }
}

/**
 * Currently returns sample data.
 * In production, this queries the champion_builds table filtering for
 * one-trick / high-elo player builds (>50% WR, >40% play rate).
 */
async function getBuildData(
  championName: string,
  _role?: string
): Promise<ChampionBuild | null> {
  return getSampleBuild(championName);
}
