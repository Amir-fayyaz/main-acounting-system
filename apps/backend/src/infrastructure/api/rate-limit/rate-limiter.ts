/**
 * Framework-free rate-limiting contract (SEC-001).
 *
 * The contract is HTTP-agnostic and free of any Redis type: it names what a
 * rate limiter must do, not how it does it. Consumers (the guard) depend on
 * this interface only; the Redis-backed implementation lives beside it.
 */

/** Identifies one rate-limit bucket. */
export interface RateLimitKey {
  /** Logical scope, e.g. `auth.sign-in`. Keys are namespaced by scope. */
  readonly scope: string;
  /** The subject being limited: an IP address, an email hash, a token digest. */
  readonly subject: string;
}

/** The outcome of consuming one unit from a bucket. */
export interface RateLimitDecision {
  /** Whether the request may proceed. */
  readonly allowed: boolean;
  /** How many units remain in the window after this consumption. */
  readonly remaining: number;
  /** The configured maximum for the window. */
  readonly limit: number;
  /** Epoch milliseconds when the current window resets. */
  readonly resetAtMs: number;
  /** When true, the backing store was unreachable and the decision is a
   *  fail-safe fallback, not a measured count. Callers must treat this as
   *  "denied" for credential-bearing flows. */
  readonly unavailable?: boolean;
}

/** The port a rate-limit adapter must implement. */
export interface RateLimiter {
  /**
   * Consumes one unit for `key` and returns the decision.
   *
   * When `limit` is provided it overrides the adapter's default limit for
   * this call, so one adapter can enforce both per-IP and per-identity
   * thresholds. Implementations must never throw when the backing store is
   * unavailable; they return `unavailable: true` instead.
   */
  consume(key: RateLimitKey, limit?: number): Promise<RateLimitDecision>;
}
