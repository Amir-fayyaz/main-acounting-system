/**
 * Injection tokens for the job infrastructure (FND-007).
 *
 * Consumers depend on the token and the port, never on the Redis adapter, so
 * the queue implementation can change without touching a job or a process
 * (ADR-002, section 15).
 */

/** The registered jobs (`RegisteredJob`) this process can execute. */
export const JOB_DEFINITIONS = Symbol('JOB_DEFINITIONS');

/** The queue port (`JobQueuePort`). */
export const JOB_QUEUE = Symbol('JOB_QUEUE');

/** The execution logging hook (`JobLogger`). */
export const JOB_LOGGER = Symbol('JOB_LOGGER');

/** The idempotency port (`IdempotencyGuard`). */
export const IDEMPOTENCY_GUARD = Symbol('IDEMPOTENCY_GUARD');

/** The periodic triggers the Scheduler owns. */
export const SCHEDULED_JOB_DEFINITIONS = Symbol('SCHEDULED_JOB_DEFINITIONS');
