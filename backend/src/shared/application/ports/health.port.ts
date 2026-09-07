/**
 * Health-check contract (BACKLOG P1.1). Infrastructure probes implement
 * HealthIndicator and the composition root binds HEALTH_INDICATORS to the
 * array of registered instances, so the readiness endpoint can aggregate
 * dependency state without coupling the controller to concrete adapters
 * (Postgres, Redis, ...).
 */

export type HealthStatus = 'ok' | 'error';

export interface HealthIndicatorResult {
  readonly name: string;
  readonly status: HealthStatus;
  readonly latencyMs: number;
  readonly message?: string;
  readonly details?: Readonly<Record<string, unknown>>;
}

export interface HealthIndicator {
  readonly name: string;
  check(): Promise<HealthIndicatorResult>;
}

/** Aggregate payload returned by the readiness endpoint. */
export interface HealthReport {
  readonly status: HealthStatus;
  readonly checks: readonly HealthIndicatorResult[];
  readonly timestamp: string;
  readonly uptimeSeconds: number;
  readonly version: string;
}

/** Token bound to the array of registered HealthIndicator instances. */
export const HEALTH_INDICATORS = Symbol('HEALTH_INDICATORS');
