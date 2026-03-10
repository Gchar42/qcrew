import { clearDiscordSessionCookie } from "@/lib/discordSession";
import { NextResponse } from "next/server";

export async function POST() {
  const res = NextResponse.json({ ok: true });
  const { name, value, options } = clearDiscordSessionCookie();
  res.cookies.set(name, value, options as Record<string, unknown>);
  return res;
}
