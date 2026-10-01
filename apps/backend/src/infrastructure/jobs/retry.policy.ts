/**
 * The bounded retry policy (FND-007, ADR-008 section 6; ADR-004 section 12).
 *
 * Retry is deliberately explicit:
 *
 * - only a `retryable` failure is retried — a business rejection or an
 *   unexpected error is parked instead of repeated;
 * - the attempt budget is bounded by configuration, so a failing job can never
 *   loop forever;
 * - the delay grows exponentially and is capped, then jittered so a batch of
 *   jobs that failed together does not retry in lockstep.
 */
export interface RetryPolicy {
  readonly maxAttempts: number;
  readonly baseDelayMs: number;
  readonly maxDelayMs: number;
}

/** Whether another attempt is allowed after `attempt` failed. */
export function hasAttemptsRemaining(attempt: number, maxAttempts: number): boolean {
  return attempt < maxAttempts;
}

/**
 * Backoff for the retry that follows a failed `attempt`, in milliseconds.
 *
 * The exponential term is capped at `maxDelayMs` first, then multiplied by a
 * 50–100% jitter factor. `random` is injectable so the value is deterministic in
 * tests.
 */
export function computeBackoffDelayMs(
  attempt: number,
  policy: RetryPolicy,
  random: () => number = Math.random,
): number {
  const exponential = Math.min(policy.maxDelayMs, policy.baseDelayMs * 2 ** (attempt - 1));
  const jitter = 0.5 + random() * 0.5;

  return Math.max(0, Math.round(exponential * jitter));
}
