/**
 * A periodic trigger owned by the Scheduler (FND-007, ADR-008 section 9).
 *
 * The Scheduler only *enqueues*: a schedule names the job type to produce and
 * the interval to produce it on, and the resulting work runs through the same
 * queue and Worker as a manually enqueued job. No business logic belongs here —
 * the schedule is never the source of truth for whether work should happen.
 */
export interface ScheduledJobDefinition<TPayload = unknown> {
  /** Identity of the schedule itself (used to claim its slot). */
  readonly type: string;
  /** The registered job type this schedule enqueues. */
  readonly jobType: string;
  readonly intervalMs: number;
  readonly companyId?: string;
  payload(now: Date): TPayload;
}

/** The payload-erased view held by the Scheduler. */
export interface RegisteredSchedule {
  readonly type: string;
  readonly jobType: string;
  readonly intervalMs: number;
  readonly companyId?: string;
  payload(now: Date): unknown;
}

export function defineScheduledJob<TPayload>(
  definition: ScheduledJobDefinition<TPayload>,
): RegisteredSchedule {
  return definition as RegisteredSchedule;
}
