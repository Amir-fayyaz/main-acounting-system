import type { JobErrorCategory, JobFailure } from './job.types.js';

/**
 * Base class for a failure a job raises deliberately.
 *
 * The category is what the infrastructure acts on: only `retryable` is retried
 * (ADR-008, section 6). Anything else is parked rather than repeated, because a
 * blind retry can duplicate a business effect it never confirmed (ADR-004,
 * section 12).
 */
export class JobExecutionError extends Error {
  public readonly category: JobErrorCategory;

  constructor(message: string, category: JobErrorCategory, options?: { cause?: unknown }) {
    super(message, options);
    this.name = new.target.name;
    this.category = category;
  }
}

/** A transient failure (timeout, unavailable dependency) that may be retried. */
export class RetryableJobError extends JobExecutionError {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, 'retryable', options);
  }
}

/** A failure that must not be retried (business rejection, invalid payload). */
export class TerminalJobError extends JobExecutionError {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, 'terminal', options);
  }
}

/** Thrown when a job is enqueued with a type no process has registered. */
export class UnknownJobTypeError extends Error {
  constructor(type: string) {
    super(`No job definition is registered for type "${type}"`);
    this.name = 'UnknownJobTypeError';
  }
}

/**
 * Reduces any thrown value to the recorded failure.
 *
 * Only an explicit `RetryableJobError` is retryable. An unexpected error is
 * classified `unknown`, which the dispatcher treats as terminal, because the
 * infrastructure must never assume an operation it did not understand is safe
 * to repeat.
 */
export function classifyJobError(error: unknown): JobFailure {
  if (error instanceof JobExecutionError) {
    return { name: error.name, message: error.message, category: error.category };
  }

  if (error instanceof Error) {
    return { name: error.name, message: error.message, category: 'unknown' };
  }

  return { name: 'NonErrorThrown', message: String(error), category: 'unknown' };
}
