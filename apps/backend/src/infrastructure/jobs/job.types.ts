/**
 * The background-job contract shared by the API, the Worker and the Scheduler
 * (FND-007, ADR-008).
 *
 * Only infrastructure concerns live here. A payload is carried opaquely: the
 * queue never inspects it, and business semantics stay in the module that owns
 * the job type (ADR-002, section 14).
 */

/**
 * Lifecycle states of a job as the infrastructure models them (ADR-008,
 * section 5). A business process may have richer states; those belong to the
 * owning module, not to this contract.
 */
export type JobStatus = 'queued' | 'running' | 'completed' | 'retrying' | 'failed';

/**
 * Why an execution stopped.
 *
 * - `retryable` — a transient failure the infrastructure may retry.
 * - `terminal`  — a failure that must not be retried (a business rejection, an
 *                  exhausted attempt budget).
 * - `unknown`   — an unexpected error. It is treated as **not** safe to retry,
 *                  because a blind retry may duplicate a business effect
 *                  (ADR-004, section 12; ADR-008, section 6).
 */
export type JobErrorCategory = 'retryable' | 'terminal' | 'unknown';

/** A failure reduced to what the infrastructure records and logs. */
export interface JobFailure {
  readonly name: string;
  readonly message: string;
  readonly category: JobErrorCategory;
}

/**
 * Everything the queue needs to carry a unit of work.
 *
 * `companyId` is the tenant/owner context of ADR-008, section 12. It is optional
 * here because no business job exists yet; a domain job sets it, and the
 * infrastructure passes it through untouched so the Worker can never run a job
 * without its owner context.
 */
export interface JobEnvelope<TPayload = unknown> {
  readonly jobId: string;
  readonly type: string;
  /** Contract version of the payload, so a breaking change can add a new one (ADR-005, section 11). */
  readonly version: number;
  readonly payload: TPayload;
  /** 1-based attempt number this envelope represents. */
  readonly attempt: number;
  readonly maxAttempts: number;
  /** Trace id carried from the caller to the Worker (ADR-008, section 13). */
  readonly correlationId: string;
  readonly companyId?: string;
  readonly createdAt: string;
  /** Which process produced the job: `api`, `worker`, `scheduler`, ... */
  readonly enqueuedBy: string;
}

/** The envelope plus the lifecycle state the infrastructure tracks. */
export interface JobRecord<TPayload = unknown> extends JobEnvelope<TPayload> {
  readonly status: JobStatus;
  readonly updatedAt: string;
  readonly startedAt?: string;
  readonly completedAt?: string;
  readonly lastError?: JobFailure;
}

/**
 * Structured logging fields an execution emits (FND-007, 10-observability).
 * They are the data a metrics/monitoring layer will later read; a full
 * observability stack is explicitly out of scope for this issue.
 */
export interface JobLogFields {
  readonly jobId: string;
  readonly type: string;
  readonly attempt: number;
  readonly maxAttempts: number;
  readonly correlationId: string;
  readonly status?: JobStatus;
  readonly durationMs?: number;
  readonly companyId?: string;
  readonly error?: JobFailure;
  readonly detail?: Readonly<Record<string, unknown>>;
}

/** Where a job's execution progress is reported. */
export interface JobLogger {
  info(message: string, fields: JobLogFields): void;
  warn(message: string, fields: JobLogFields): void;
  error(message: string, fields: JobLogFields): void;
}

/**
 * The idempotency primitive the infrastructure offers a job (ADR-004,
 * section 11; ADR-008, section 6).
 *
 * `claim` returns `true` only for the first caller for a key, so a duplicate
 * delivery can be recognized. The infrastructure cannot decide whether a
 * business operation is safe to repeat; it only makes a job able to enforce
 * that decision.
 */
export interface IdempotencyGuard {
  claim(key: string, ttlSeconds: number): Promise<boolean>;
  release(key: string): Promise<void>;
}

/** Everything a job implementation receives when it runs. */
export interface JobExecutionContext<TPayload = unknown> {
  readonly jobId: string;
  readonly type: string;
  readonly attempt: number;
  readonly maxAttempts: number;
  readonly correlationId: string;
  readonly companyId?: string;
  readonly payload: TPayload;
  /** Aborted on shutdown so a long job can stop cooperatively (ADR-008, section 8). */
  readonly signal: AbortSignal;
  readonly logger: JobLogger;
  readonly idempotency: IdempotencyGuard;
}

/** What a successful execution reports back. */
export interface JobExecutionResult {
  readonly outcome: 'completed' | 'skipped-duplicate';
  readonly detail?: Readonly<Record<string, unknown>>;
}
