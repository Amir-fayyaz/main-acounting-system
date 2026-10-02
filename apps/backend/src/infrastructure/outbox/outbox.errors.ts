/**
 * Failures the outbox raises deliberately (SHR-006; ADR-004 sections 12-13).
 *
 * The two classes below are the *only* vocabulary the publisher needs: one
 * says "this record must never be attempted again", the other says "recording
 * happened outside the boundary that would have made it atomic". Everything
 * else that a publication attempt throws — a connection refused, a timeout, an
 * answer nobody understood — is treated as transient, because a publication
 * attempt has no business side effect of its own: it appends to a stream, and
 * a duplicate append is something consumers are contractually ready for
 * (ADR-004, section 15). That is the deliberate opposite of the job
 * dispatcher's stance, where an unclassified error is parked instead of
 * retried — see `job.errors.ts`.
 */

/**
 * Thrown when an event is recorded outside an open transaction.
 *
 * An outbox record only guarantees "the event and the state change commit
 * together" while it rides the same transaction, so a `record` call with no
 * boundary on the stack is a programming error, not a degraded mode: it fails
 * loudly and nothing is written (ADR-004, sections 6 and 14).
 */
export class OutboxTransactionRequiredError extends Error {
  public constructor() {
    super(
      'OutboxRecorder.record needs an open transaction: record the event inside the same ' +
        'TransactionBoundary.execute as the state change it reports, so both commit or ' +
        'roll back together.',
    );
    this.name = 'OutboxTransactionRequiredError';
    Object.freeze(this);
  }
}

/**
 * Thrown by an {@link EventPublisherPort} implementation for a failure that
 * can never succeed on any attempt — an envelope the transport refuses, a
 * contract violation. The publisher parks the record as `failed` immediately,
 * without spending the retry budget on a foregone conclusion.
 */
export class PermanentPublishError extends Error {
  public constructor(message: string, options?: { readonly cause?: unknown }) {
    super(message, options === undefined ? undefined : { cause: options.cause });
    this.name = 'PermanentPublishError';
    Object.freeze(this);
  }
}

/** Whether the failure means "stop, this will never work". */
export function isPermanentPublishFailure(error: unknown): boolean {
  return error instanceof PermanentPublishError;
}

/** How long the failure line stored in `last_failure` may get. */
const MAX_FAILURE_LENGTH = 500;

/**
 * Reduces any thrown value to the short, log-safe line the record keeps.
 *
 * The message is truncated so one oversized exception cannot bloat every
 * row it touches, and callers pass a redacted message in, because a driver
 * error is exactly where a connection string would otherwise surface
 * (06-security-engineering).
 */
export function describeFailure(error: unknown, redact: (text: string) => string): string {
  const name = error instanceof Error ? error.name : 'NonErrorThrown';
  const raw = error instanceof Error ? error.message : String(error);
  const line = `${name}: ${redact(raw)}`;

  return line.length > MAX_FAILURE_LENGTH ? `${line.slice(0, MAX_FAILURE_LENGTH - 3)}...` : line;
}
