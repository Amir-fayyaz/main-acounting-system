/**
 * Per-route rate-limit policy declaration (SEC-001).
 *
 * Applied with `@RateLimit({ ... })` on a handler. The guard reads this
 * metadata and enforces the declared limits before the handler runs.
 */
import { SetMetadata, type CustomDecorator } from '@nestjs/common';

/** Metadata key carrying the rate-limit policy of an operation. */
export const RATE_LIMIT_POLICY_METADATA = 'RATE_LIMIT_POLICY';

/**
 * What a rate-limited operation requires.
 *
 * `perIp` limits by the client's IP address (resolved from the connection,
 * never from a client-supplied header).
 * `perIdentity` limits by an identity hint read from the validated request
 * body (e.g. `email` for sign-in). The hint value is never logged or persisted.
 */
export interface RateLimitPolicy {
  /** Logical scope, e.g. `auth.sign-in`. Keys are namespaced by scope. */
  readonly scope: string;
  /** Apply a per-IP limit using `maxPerIp` from configuration. */
  readonly perIp?: boolean;
  /**
   * Apply a per-identity limit using `maxPerIdentity` from configuration.
   * The value is the request body field holding the identity hint (e.g. `'email'`).
   * The raw value is never logged or persisted.
   */
  readonly perIdentity?: string;
}

/** Declares that an operation is rate-limited. */
export const RateLimit = (policy: RateLimitPolicy): CustomDecorator =>
  SetMetadata(RATE_LIMIT_POLICY_METADATA, policy);
