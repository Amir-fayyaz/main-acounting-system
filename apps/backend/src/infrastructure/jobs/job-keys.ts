/**
 * Redis keys used by the job infrastructure (FND-007).
 *
 * Every key is namespaced by environment, so a development worker and a test
 * run sharing one Redis instance never consume each other's jobs. Redis is
 * infrastructure only (TECH-007): job lifecycle state here is operational, and
 * a durable, business-visible execution record belongs in MySQL when a domain
 * job needs one.
 */
export interface JobKeys {
  readonly namespace: string;
  /** Redis Stream that carries job envelopes to the Worker. */
  readonly stream: string;
  /** Consumer group that guarantees each envelope is delivered once per attempt. */
  readonly group: string;
  /** Sorted set of retries waiting for their backoff to elapse. */
  readonly delayed: string;
  /** Key holding one job's lifecycle record. */
  state(jobId: string): string;
  /** Key holding an idempotency claim. */
  idempotency(key: string): string;
  /** Key holding when a periodic trigger last produced work. */
  schedule(type: string): string;
}

export function jobKeys(environment: string): JobKeys {
  const namespace = `jobs:${environment}`;

  return {
    namespace,
    stream: `${namespace}:stream`,
    group: `${namespace}:workers`,
    delayed: `${namespace}:delayed`,
    state: (jobId) => `${namespace}:state:${jobId}`,
    idempotency: (key) => `${namespace}:idempotency:${key}`,
    schedule: (type) => `${namespace}:schedule:${type}`,
  };
}

/**
 * How long a completed or permanently failed job record is kept. Records are
 * observability data, not business truth: the queue trims, Redis may evict, and
 * a durable execution record is a later concern.
 */
export const JOB_STATE_TTL_SECONDS = {
  completed: 24 * 60 * 60,
  failed: 7 * 24 * 60 * 60,
} as const;

/** How long an idempotency claim is honoured, so a duplicate delivery is skipped. */
export const IDEMPOTENCY_TTL_SECONDS = 24 * 60 * 60;

/** How long a delivered-but-unacknowledged job may sit before another Worker reclaims it. */
export const JOB_VISIBILITY_TIMEOUT_MS = 60_000;
