/**
 * Injection token for the `RateLimiter` port (SEC-001).
 *
 * The port is an interface (erased at runtime), so consumers and providers
 * meet through this symbol rather than through the type itself.
 */
export const RATE_LIMITER = Symbol('RATE_LIMITER');
