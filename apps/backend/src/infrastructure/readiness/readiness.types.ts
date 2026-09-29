/**
 * Token for the dependency probes used by readiness reporting. Probes are injected
 * as data so the service itself stays free of I/O and can be unit tested without
 * a database, Redis or an object store.
 */
export const READINESS_PROBES = Symbol('READINESS_PROBES');

export interface DependencyProbe {
  readonly name: string;
  check(): Promise<void>;
}

export type DependencyStatus = 'up' | 'down';

/**
 * Why a dependency is down.
 *
 * This is deliberately a closed, machine-readable vocabulary instead of the
 * driver's message: the response has to stay stable, minimal and free of
 * sensitive internal details (06-security-engineering: an error output must not
 * disclose secrets or internal information). Driver text can embed connection
 * details, so it is logged server-side — redacted — and never serialized.
 */
export type DependencyFailureReason = 'timeout' | 'unavailable';

export interface DependencyCheck {
  readonly name: string;
  readonly status: DependencyStatus;
  readonly latencyMs: number;
  /** Present only when `status` is `down`. */
  readonly reason?: DependencyFailureReason;
}

/**
 * The readiness response body (HTTP 200 when ready, 503 when not).
 *
 * Shape is part of the operational contract consumed by Docker health checks
 * and the frontend status panel, so fields are only ever added, not renamed.
 */
export interface ReadinessReport {
  readonly status: 'ready' | 'not-ready';
  readonly checks: readonly DependencyCheck[];
}
