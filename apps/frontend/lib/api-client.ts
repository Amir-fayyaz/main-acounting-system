import { getServerApiBaseUrl } from './env';

/**
 * Minimal client for the backend's operational endpoints.
 *
 * The response types mirror the backend contract. They will move into a shared
 * contract package (TECH-013) once the versioned REST API from ADR-013 exists;
 * duplicating them before that point would create a second source of truth.
 */
export interface DependencyCheck {
  readonly name: string;
  readonly status: 'up' | 'down';
  readonly latencyMs: number;
  readonly error?: string;
}

export interface ReadinessReport {
  readonly status: 'ready' | 'not-ready';
  readonly checks: readonly DependencyCheck[];
}

export type BackendStatus =
  | { readonly reachable: true; readonly report: ReadinessReport }
  | { readonly reachable: false; readonly error: string };

/**
 * Reads the backend readiness report.
 *
 * A 503 response still carries the report, so it is parsed like a success. A
 * transport failure is returned as an explicit `reachable: false` value instead of
 * being swallowed or throwing into the page.
 */
export async function fetchBackendReadiness(): Promise<BackendStatus> {
  const url = `${getServerApiBaseUrl()}/health/ready`;

  try {
    const response = await fetch(url, { cache: 'no-store' });
    const report = (await response.json()) as ReadinessReport;

    return { reachable: true, report };
  } catch (error) {
    return {
      reachable: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
