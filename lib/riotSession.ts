/**
 * Signed cookie for Riot RSO session (puuid) so guide creation can verify the author.
 * Mirrors the pattern from lib/discordSession.ts.
 */

import { createHmac, timingSafeEqual } from "crypto";

const COOKIE_NAME = "statgap_riot_session";
const MAX_AGE = 60 * 60 * 24 * 30; // 30 days

function getSecret(): string {
  const s = process.env.RIOT_SESSION_SECRET ?? process.env.DISCORD_SESSION_SECRET;
  if (!s || s.length < 16) throw new Error("RIOT_SESSION_SECRET (or DISCORD_SESSION_SECRET) must be set and at least 16 chars");
  return s;
}

function sign(value: string): string {
  const secret = getSecret();
  const hmac = createHmac("sha256", secret).update(value).digest("hex");
  return `${value}.${hmac}`;
}

function verify(signed: string): string | null {
  const i = signed.lastIndexOf(".");
  if (i === -1) return null;
  const value = signed.slice(0, i);
  const expectedHmac = createHmac("sha256", getSecret()).update(value).digest("hex");
  const actualHmac = signed.slice(i + 1);
  try {
    if (timingSafeEqual(Buffer.from(expectedHmac, "hex"), Buffer.from(actualHmac, "hex"))) return value;
  } catch {
    return null;
  }
  return null;
}

export function setRiotSessionCookie(puuid: string): { name: string; value: string; options: Record<string, unknown> } {
  return {
    name: COOKIE_NAME,
    value: sign(puuid),
    options: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax" as const,
      maxAge: MAX_AGE,
      path: "/",
    },
  };
}

export function clearRiotSessionCookie(): { name: string; value: string; options: Record<string, unknown> } {
  return {
    name: COOKIE_NAME,
    value: "",
    options: { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax" as const, maxAge: 0, path: "/" },
  };
}

export function getRiotPuuidFromCookie(cookieHeader: string | null): string | null {
  if (!cookieHeader) return null;
  const match = cookieHeader.match(new RegExp(`${COOKIE_NAME}=([^;]+)`));
  if (!match) return null;
  return verify(decodeURIComponent(match[1].trim()));
}
