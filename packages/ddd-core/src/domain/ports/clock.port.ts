/** Injection token for the Clock port (framework-agnostic symbol). */
export const CLOCK = Symbol('CLOCK');

/**
 * Domain port for time. Infrastructure provides the real clock so domain and
 * application code stay deterministic and testable.
 */
export interface Clock {
  now(): Date;
}
