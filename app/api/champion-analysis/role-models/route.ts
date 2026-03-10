import { NextResponse } from "next/server";
import { getRoleModels } from "@/lib/championRoleModels";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const champion = searchParams.get("champion") ?? "";
  const tier = searchParams.get("tier") ?? "GOLD";

  if (!champion) {
    return NextResponse.json({ error: "champion is required" }, { status: 400 });
  }

  const roleModels = getRoleModels(champion, tier, 3);

  return NextResponse.json({ roleModels });
}
