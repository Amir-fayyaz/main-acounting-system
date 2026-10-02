import type { JobEnvelope, JobExecutionContext, JobExecutionResult } from './job.types.js';

/**
 * A unit of work the Worker can execute (FND-007).
 *
 * A definition declares only what the infrastructure needs: a stable type name,
 * an optional payload version, an optional attempt budget, and an optional
 * idempotency key. The payload's meaning belongs to the module that registers
 * the job; the queue never interprets it.
 */
export interface JobDefinition<TPayload = unknown> {
  /** Stable, namespaced type (`sample.echo`, later `sales.post-invoice`). */
  readonly type: string;
  /** Payload contract version (default `1`). */
  readonly version?: number;
  /** Attempt budget for this type; defaults to `jobs.maxAttempts`. */
  readonly maxAttempts?: number;
  /**
   * Declares that this job's work belongs to one tenant (SHR-007; ADR-008
   * section 12). The dispatcher restores `envelope.companyId` as the ambient
   * tenant context before `execute`, and refuses to run the job at all when
   * the envelope carries none — a job without owner context does not run.
   */
  readonly tenantScoped?: boolean;
  /**
   * Derives the idempotency key for a job instance. When present, the dispatcher
   * claims the key before executing and skips a duplicate delivery that has
   * already completed successfully.
   */
  readonly idempotencyKey?: (
    payload: TPayload,
    envelope: JobEnvelope<TPayload>,
  ) => string | undefined;
  execute(context: JobExecutionContext<TPayload>): Promise<JobExecutionResult | void>;
}

/**
 * The payload-erased view the registry stores and the Worker executes.
 *
 * A registry cannot know every payload type at once, and holding
 * `JobDefinition<unknown>` would make the typed definitions unassignable
 * (`idempotencyKey` is contravariant in its payload). `defineJob` applies the
 * single, contained cast that erases the payload after the author has been
 * checked against their own payload type.
 */
export interface RegisteredJob {
  readonly type: string;
  readonly version?: number;
  readonly maxAttempts?: number;
  /** See `JobDefinition.tenantScoped`; the dispatcher enforces it. */
  readonly tenantScoped?: boolean;
  readonly idempotencyKey?: (
    payload: unknown,
    envelope: JobEnvelope<unknown>,
  ) => string | undefined;
  execute(context: JobExecutionContext): Promise<JobExecutionResult | void>;
}

/**
 * Declares a job definition without losing the payload type.
 *
 * ```ts
 * export const echoJob = defineJob<EchoPayload>({ type: 'sample.echo', execute: ... });
 * ```
 */
export function defineJob<TPayload>(definition: JobDefinition<TPayload>): RegisteredJob {
  return definition as RegisteredJob;
}
