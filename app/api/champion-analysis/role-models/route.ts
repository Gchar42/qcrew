import { NextResponse } from "next/server";
import { getTierComparisons } from "@/lib/championRoleModels";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const tier = searchParams.get("tier") ?? "GOLD";

  const tiers = getTierComparisons(tier, 3);

  return NextResponse.json({ tiers });
}
