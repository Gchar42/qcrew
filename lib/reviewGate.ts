/**
 * Optional review gate: when REVIEW_GATE_PASSWORD is set, the site requires
 * that password before allowing access. Use for Riot verification (private demo URL).
 * Cookie name and hash algorithm must match between middleware (Edge) and API (Node).
 * Uses Web Crypto only so this file is safe to import from Edge (middleware).
 */

const REVIEW_COOKIE_NAME = "statgap_review";

export function getReviewCookieName(): string {
  return REVIEW_COOKIE_NAME;
}

/** Compute expected cookie value from password. Web Crypto only (Edge + Node 18+). */
export async function getReviewCookieValue(password: string): Promise<string> {
  const buf = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(password)
  );
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
