export async function riotFetchJson<T = unknown>(url: string): Promise<T> {
  const key = process.env.RIOT_API_KEY;
  if (!key) throw new Error("Missing RIOT_API_KEY");

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

    const retryAfter = res.headers.get("retry-after");
    const baseDelay = retryAfter ? Number(retryAfter) * 1000 : 800 * attempt;
    const delay = Math.min(5000, Math.max(600, baseDelay));

    if (attempt >= 4) {
      const txt = await res.text().catch(() => "");
      throw new Error(`Riot 429 rate limit ${txt.slice(0, 160)}`);
    }

    await new Promise((r) => setTimeout(r, delay));
  }
}
