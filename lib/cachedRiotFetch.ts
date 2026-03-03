/**
 * Server-only fetch to Riot API. Uses RIOT_API_KEY from env; never expose to client.
 */
export async function cachedRiotFetch(url: string) {
  const res = await fetch(url, {
    headers: { "X-Riot-Token": process.env.RIOT_API_KEY ?? "" },
  });

  const text = await res.text();

  return new Response(text, {
    status: res.status,
    headers: {
      "Content-Type": res.headers.get("content-type") ?? "application/json",
    },
  });
}
