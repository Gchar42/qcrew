import { sendWeeklyDigests } from "@/lib/discordNotifications";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Vercel Cron: run Mondays 9am UTC. Set CRON_SECRET in env. */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const auth = request.headers.get("authorization");
  if (secret && auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const result = await sendWeeklyDigests();
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    console.error("discord-weekly-digest cron:", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
