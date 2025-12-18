// Edge-compatible delay function (timers/promises not available in Edge Runtime)
const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

const DEFAULT_TIMEOUT_MS = Number(process.env.SUPABASE_FETCH_TIMEOUT_MS || 10_000);
const MAX_RETRIES = Number(process.env.SUPABASE_FETCH_MAX_RETRIES || 2);

function createAbortSignal(timeoutMs: number) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  return { signal: controller.signal, clear: () => clearTimeout(timer) };
}

function shouldRetry(response: Response) {
  return response.status === 429 || response.status >= 500;
}

function getBackoffMs(attempt: number) {
  // Exponential backoff with jitter
  const base = 200 * 2 ** attempt;
  return base + Math.floor(Math.random() * 100);
}

/**
 * Fetch wrapper with timeout and basic retry logic for Supabase requests.
 */
export async function supabaseFetch(
  input: RequestInfo | URL,
  init?: RequestInit,
  opts?: { timeoutMs?: number }
): Promise<Response> {
  const timeoutMs = opts?.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const { signal, clear } = createAbortSignal(timeoutMs);
    try {
      const response = await fetch(input, { ...init, signal });
      clear();

      if (attempt < MAX_RETRIES && shouldRetry(response)) {
        const backoff = getBackoffMs(attempt);
        await delay(backoff);
        continue;
      }

      return response;
    } catch (err) {
      clear();
      const isAbort = err instanceof Error && err.name === 'AbortError';
      const isLastAttempt = attempt === MAX_RETRIES;

      if (isLastAttempt || isAbort) {
        throw err;
      }

      const backoff = getBackoffMs(attempt);
      await delay(backoff);
    }
  }

  // Should be unreachable
  throw new Error('supabaseFetch exhausted retries');
}
