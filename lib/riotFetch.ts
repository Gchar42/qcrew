import { getRateLimitUntil, setRateLimitUntil } from "@/lib/sharedCache";

export class RiotRateLimitError extends Error {
  constructor(
    message: string,
    public readonly retryAfterMs: number
  ) {
    super(message);
    this.name = "RiotRateLimitError";
  }
}

/**
 * Fetch JSON from a Riot API URL. Uses RIOT_API_KEY.
 * @param url - Riot API URL (e.g. americas.api.riotgames.com/...)
 * @param routingRegion - e.g. "americas" | "europe" | "asia" | "sea"; used for shared rate-limit state. If omitted, rate-limit check/set is skipped.
 */
export async function riotFetchJson<T = unknown>(
  url: string,
  routingRegion?: string
): Promise<T> {
  const key = process.env.RIOT_API_KEY;
  if (!key) throw new Error("Missing RIOT_API_KEY");

  const region = routingRegion ?? inferRoutingFromUrl(url);

  if (region) {
    const until = await getRateLimitUntil(region);
    if (until != null && Date.now() < until) {
      const retryAfterMs = Math.max(1000, until - Date.now());
      throw new RiotRateLimitError(
        "Riot rate limited; do not call again for this region until window ends",
        retryAfterMs
      );
    }
  }

  let attempt = 0;

  while (true) {
    attempt++;

    const res = await fetch(url, {
      headers: { "X-Riot-Token": key },
      cache: "no-store",
    });

    if (res.status !== 429) {
      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        throw new Error(`Riot error ${res.status} ${txt.slice(0, 160)}`);
      }
      return res.json() as Promise<T>;
    }

    const retryAfterHeader = res.headers.get("retry-after");
    const retryAfterSec = retryAfterHeader ? Math.max(1, Number(retryAfterHeader)) : 5;
    const waitMs = retryAfterSec * 1000 + 2000;

    if (region) {
      const untilMs = Date.now() + waitMs;
      const ttlSec = Math.ceil(waitMs / 1000) + 5;
      await setRateLimitUntil(region, untilMs, ttlSec);
    }

    if (attempt >= 4) {
      throw new RiotRateLimitError(
        "Riot 429 rate limit exceeded; retry after window",
        waitMs
      );
    }

    await new Promise((r) => setTimeout(r, waitMs));
  }
}

function inferRoutingFromUrl(url: string): string | null {
  try {
    const u = new URL(url);
    const host = u.hostname.toLowerCase();
    if (host.includes("americas")) return "americas";
    if (host.includes("europe")) return "europe";
    if (host.includes("asia")) return "asia";
    if (host.includes("sea")) return "sea";
  } catch {
    // ignore
  }
  return null;
}
