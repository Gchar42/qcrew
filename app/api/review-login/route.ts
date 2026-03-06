import { NextRequest, NextResponse } from "next/server";
import { getReviewCookieName, getReviewCookieValueNode } from "@/lib/reviewGate";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const password = process.env.REVIEW_GATE_PASSWORD;
  if (!password) {
    return NextResponse.json({ error: "Review gate not configured" }, { status: 400 });
  }

  let body: { password?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const submitted = (body.password ?? "").trim();
  if (submitted !== password) {
    return NextResponse.json({ error: "Invalid password" }, { status: 401 });
  }

  const value = await getReviewCookieValueNode(password);
  const response = NextResponse.json({ ok: true });
  response.cookies.set(getReviewCookieName(), value, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // 7 days
  });
  return response;
}
