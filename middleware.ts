import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getReviewCookieName, getReviewCookieValue } from "@/lib/reviewGate";

const RIOT_VERIFICATION_CODE = "68551e54-8f32-4ca9-86c3-2861d94704e8";

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  if (pathname === "/riot.txt" || pathname === "//riot.txt") {
    return new Response(RIOT_VERIFICATION_CODE, {
      headers: { "Content-Type": "text/plain" },
    });
  }

  const reviewPassword = process.env.REVIEW_GATE_PASSWORD;
  const isReviewLogin = pathname === "/review-login" || pathname === "/api/review-login";
  if (reviewPassword && !isReviewLogin) {
    const expected = await getReviewCookieValue(reviewPassword);
    const cookie = request.cookies.get(getReviewCookieName())?.value;
    if (cookie !== expected) {
      const url = request.nextUrl.clone();
      url.pathname = "/review-login";
      if (pathname !== "/") url.searchParams.set("next", pathname);
      return NextResponse.redirect(url);
    }
  }

  const response = NextResponse.next({
    request: { headers: request.headers },
  });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) {
    return response;
  }

  const supabase = createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const isAuthCallback = pathname === "/auth/callback";

  if (isAuthCallback) {
    return response;
  }

  await supabase.auth.getUser();
  return response;
}

export const config = {
  matcher: [
    "/auth",
    "/auth/callback",
    "/riot.txt",
    "//riot.txt",
    "/((?!_next/static|_next/image|favicon.ico|.*\\.).*)",
  ],
};
