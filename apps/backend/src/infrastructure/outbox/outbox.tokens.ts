/**
 * Injection tokens for the outbox infrastructure (SHR-006).
 *
 * Consumers depend on these tokens and on the ports, never on the Drizzle or
 * Redis adapters, so the store or the transport can change without touching a
 * use case or the publisher (ADR-002, section 15).
 */

/** The write side (`OutboxRecorder`): record an event inside a transaction. */
export const OUTBOX_RECORDER = Symbol('OUTBOX_RECORDER');

/** The persistence boundary (`OutboxStore`). */
export const OUTBOX_STORE = Symbol('OUTBOX_STORE');

/** The publication boundary (`EventPublisherPort`). */
export const EVENT_PUBLISHER = Symbol('EVENT_PUBLISHER');

/** The batch publisher (`OutboxPublisher`). */
export const OUTBOX_PUBLISHER = Symbol('OUTBOX_PUBLISHER');

/** The Worker job (`RegisteredJob`, type `outbox.publish`). */
export const OUTBOX_PUBLISH_JOB = Symbol('OUTBOX_PUBLISH_JOB');

/** The Scheduler trigger (`RegisteredSchedule`) that makes the job run. */
export const OUTBOX_SCHEDULE = Symbol('OUTBOX_SCHEDULE');
