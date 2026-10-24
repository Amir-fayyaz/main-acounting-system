/**
 * Readiness wait for `pnpm run dev:local` (Dev bootstrap).
 *
 * Polls `GET /api/health/ready` until it reports success (2xx) or the timeout
 * expires (default 120 s, because the API is compiled before it starts). The
 * `fetch` implementation and delay function are injectable for unit tests.
 */

export class ReadyTimeoutError extends Error {
  constructor(url, timeoutMs) {
    super(
      `Timed out after ${Math.round(timeoutMs / 1000)}s waiting for the API to be ready at ${url}.`,
    );
    this.name = 'ReadyTimeoutError';
    this.url = url;
  }
}

export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Resolves one trailing-slash-free base prefix, e.g. `/api`. */
export function normalizeApiPrefix(prefix) {
  const value = (prefix ?? '/api').trim();
  const normalized = value.startsWith('/')
    ? value.replace(/\/+$/, '')
    : `/${value.replace(/\/+$/, '')}`;
  return normalized === '/' ? '' : normalized;
}

export function buildReadyUrl({ port, prefix = '/api', host = 'localhost' }) {
  return `http://${host}:${port}${normalizeApiPrefix(prefix)}/health/ready`;
}

/**
 * Polls `url` with `fetchImpl` until a 2xx response arrives. Non-2xx and
 * network errors are retried, never thrown; only a timeout throws.
 */
export async function waitForReady(
  url,
  { timeoutMs = 120_000, intervalMs = 1_000, fetchImpl = fetch, delayFn = sleep } = {},
) {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    try {
      const response = await fetchImpl(url, { signal: AbortSignal.timeout(3_000) });
      if (response.ok) return response;
    } catch {
      // Not ready yet (connection refused, timeout, non-2xx) — retry until the deadline.
    }
    if (Date.now() >= deadline) throw new ReadyTimeoutError(url, timeoutMs);
    await delayFn(Math.min(intervalMs, Math.max(0, deadline - Date.now())));
  }
}
