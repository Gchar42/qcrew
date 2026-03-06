/**
 * Optional review gate: when REVIEW_GATE_PASSWORD is set, the site requires
 * that password before allowing access. Use for Riot verification (private demo URL).
 * Cookie name and hash algorithm must match between middleware (Edge) and API (Node).
 */

const REVIEW_COOKIE_NAME = "statgap_review";

export function getReviewCookieName(): string {
  return REVIEW_COOKIE_NAME;
}

/** Node (API route): compute expected cookie value from env password. */
export async function getReviewCookieValueNode(password: string): Promise<string> {
  const { createHash } = await import("crypto");
  return createHash("sha256").update(password).digest("hex");
}

/** Edge (middleware): compute expected cookie value. Uses Web Crypto. */
export async function getReviewCookieValueEdge(password: string): Promise<string> {
  const buf = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(password)
  );
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
