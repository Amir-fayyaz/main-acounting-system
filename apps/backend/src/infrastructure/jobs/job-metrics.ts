/**
 * The metrics port for the job infrastructure (FND-014).
 *
 * The dispatcher records through this port instead of importing the metrics
 * layer directly, so the job code stays honest about what it needs and a test
 * can substitute a recorder. The `MetricsService` implements it and
 * `JobsModule` binds the token to it.
 */

/** Injection token for the job metrics port (`JobMetrics`). */
export const JOB_METRICS = Symbol('JOB_METRICS');

/** The outcome of a job execution, as metrics speak it. */
export type JobExecutionStatus = 'success' | 'failure';

/** Records the lifetime of one job execution. */
export interface JobMetrics {
  /**
   * Observes one finished execution: the registered job type (low cardinality,
   * so the label set is bounded by the job catalog), whether it succeeded or
   * failed (retries and terminal failures are both failures) and how long the
   * attempt took.
   */
  observeExecution(jobName: string, status: JobExecutionStatus, durationSeconds: number): void;
}

/** The no-recording default, used when no metrics layer is bound. */
export class NoOpJobMetrics implements JobMetrics {
  observeExecution(_jobName: string, _status: JobExecutionStatus, _durationSeconds: number): void {}
}
