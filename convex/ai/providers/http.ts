const MAX_RETRIES = 2;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * fetch with up to 2 retries (0.5 s, 1.5 s) on network errors, 429 and 5xx.
 * Returns the last response, ok or not; throws only if the network never answered.
 */
export async function fetchWithRetry(
  url: string,
  init: RequestInit,
): Promise<Response> {
  for (let attempt = 0; ; attempt++) {
    try {
      const res = await fetch(url, init);
      const retryable = res.status === 429 || res.status >= 500;
      if (!retryable || attempt === MAX_RETRIES) return res;
    } catch (error) {
      if (attempt === MAX_RETRIES) throw error;
    }
    await sleep(500 * 3 ** attempt);
  }
}

/**
 * Provider error message from a JSON error body, for logs (never the request).
 * Google: `{ error: { message } }` · Cloudflare: `{ errors: [{ message }] }`.
 */
export async function errorDetail(res: Response): Promise<string> {
  try {
    const body = (await res.json()) as {
      error?: { message?: string };
      errors?: { message?: string }[];
    };
    const message = body.error?.message ?? body.errors?.[0]?.message ?? "";
    return String(message).slice(0, 200);
  } catch {
    return "";
  }
}
