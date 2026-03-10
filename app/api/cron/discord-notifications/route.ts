import { checkRankUpsAndNotify } from "@/lib/discordNotifications";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Vercel Cron: run every 15–30 min. Set CRON_SECRET in env and add to vercel.json. */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const auth = request.headers.get("authorization");
  if (secret && auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const result = await checkRankUpsAndNotify();
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    console.error("discord-notifications cron:", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
