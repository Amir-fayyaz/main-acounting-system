export interface DependencyProbe {
  readonly name: string;
  check(): Promise<void>;
}

export type DependencyStatus = 'up' | 'down';

export interface DependencyCheck {
  readonly name: string;
  readonly status: DependencyStatus;
  readonly latencyMs: number;
  readonly error?: string;
}

export interface ReadinessReport {
  readonly status: 'ready' | 'not-ready';
  readonly checks: readonly DependencyCheck[];
}
