export async function fetchJson<T>(url: string) {
  const res = await fetch(url, { cache: "no-store" });
  const contentType = res.headers.get("content-type") || "";

  let payload: unknown = null;
  if (contentType.includes("application/json")) {
    payload = await res.json();
  } else {
    payload = await res.text();
  }

  if (!res.ok) {
    const message =
      typeof payload === "string"
        ? payload
        : (payload as { error?: string; message?: string })?.error ||
          (payload as { error?: string; message?: string })?.message ||
          "Request failed";
    const err = new Error(`${res.status} ${message}`);
    (err as Error & { status?: number }).status = res.status;
    throw err;
  }

  return payload as T;
}

export async function fetchJsonWithRetry<T>(url: string, tries = 3) {
  let lastErr: Error | null = null;

  for (let i = 0; i < tries; i += 1) {
    try {
      return await fetchJson<T>(url);
    } catch (e) {
      lastErr = e as Error;
      const status = (e as Error & { status?: number })?.status;

      if (status === 429 || status === 503) {
        const delay = 400 * Math.pow(2, i);
        await new Promise((r) => setTimeout(r, delay));
        continue;
      }

      throw e;
    }
  }

  throw lastErr;
}

export async function mapWithConcurrency<TInput, TOutput>(
  inputs: TInput[],
  limit: number,
  fn: (input: TInput) => Promise<TOutput>
) {
  const results: TOutput[] = new Array(inputs.length) as TOutput[];
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < inputs.length) {
      const current = nextIndex;
      nextIndex += 1;
      results[current] = await fn(inputs[current]);
    }
  }

  const workers = Array.from(
    { length: Math.min(limit, inputs.length) },
    () => worker()
  );
  await Promise.all(workers);

  return results;
}
