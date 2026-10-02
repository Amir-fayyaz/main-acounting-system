/**
 * The outbox record model (SHR-006; ADR-004 section 14, ADR-005 sections 6-7).
 *
 * An outbox record is the durable stand-in for one domain event: it is written
 * in the same database transaction as the state change that produced the event,
 * and it is what a publisher later turns into a real publication. Everything
 * here is generic — an event's name, version and envelope — and carries no
 * business field, so the outbox can never become a back door into a module's
 * data (ADR-003).
 *
 * The record deliberately stores the queryable metadata (tenant, correlation,
 * causation, type, version) as columns *and* the full serialized envelope as
 * one opaque payload: the columns answer operational questions ("what is
 * stuck?", "whose events are these?"), the payload is exactly what reaches the
 * stream, byte for byte, on every attempt.
 */

/**
 * Publication lifecycle of one record. Every transition is taken by the
 * publisher and is deterministic (SHR-006, section "Publication state"):
 *
 * ```text
 * pending ──── claim ────► publishing ── ok ────► published
 *    ▲                        │  │
 *    │                  transient   permanent / attempts exhausted
 *    │                        │  │
 *    │ requeue (manual)       ▼  ▼
 *    └──── failed ◄────────────┘  └──── retrying ── due ──► publishing
 * ```
 *
 * - `pending` — recorded inside the transaction, not yet attempted.
 * - `publishing` — claimed by one publisher run; the claim token identifies
 *   the run, so a crashed run's records are recognizable and recoverable.
 * - `retrying` — a transient failure; due again at `nextAttemptAt`.
 * - `failed` — permanent, or the attempt budget is spent. Kept forever for
 *   investigation and manual recovery (ADR-004, section 12).
 * - `published` — delivered to the publication boundary. Terminal.
 */
export type OutboxPublicationState = 'pending' | 'publishing' | 'published' | 'retrying' | 'failed';

/** The states a due record may be claimed from. */
export const OUTBOX_CLAIMABLE_STATES: readonly OutboxPublicationState[] = ['pending', 'retrying'];

/**
 * One outbox record as the publisher reads it.
 *
 * `eventId` is the event's `metadata.messageId` — the identity consumers
 * deduplicate on. It is assigned once, when the record is written, and never
 * changes: a retry republishes the *same* event, it does not mint a new one
 * (ADR-004, section 15).
 */
export interface OutboxRecord {
  /** Unique outbox identifier: the row's own identity, independent of the event. */
  readonly id: string;
  /** Stable event identity — `metadata.messageId`, fixed for every attempt. */
  readonly eventId: string;
  /** Contract name of the event (`AccountingDocumentPosted`). */
  readonly eventType: string;
  /** Contract version of the event (ADR-005, section 11). */
  readonly eventVersion: number;
  /** The serialized event envelope, published verbatim. */
  readonly payload: string;
  readonly tenantId?: string;
  readonly correlationId?: string;
  readonly causationId?: string;
  /** When the record was written — inside the originating transaction. */
  readonly createdAt: Date;
  readonly state: OutboxPublicationState;
  /** How many times a run has claimed this record. Incremented by the claim. */
  readonly attemptCount: number;
  readonly lastAttemptAt?: Date;
  /** Last failure, reduced to a short, redaction-safe line. */
  readonly lastFailure?: string;
  readonly publishedAt?: Date;
  /** When the record becomes due again; `undefined` means due now. */
  readonly nextAttemptAt?: Date;
  /** Token of the run currently holding the record; `undefined` when unclaimed. */
  readonly claimId?: string;
}

/**
 * What the write side hands to the store: a record before it enters the
 * lifecycle. The state starts at `pending` and the attempt budget at zero —
 * neither is a caller's choice.
 */
export interface NewOutboxRecord {
  readonly id: string;
  readonly eventId: string;
  readonly eventType: string;
  readonly eventVersion: number;
  readonly payload: string;
  readonly tenantId?: string;
  readonly correlationId?: string;
  readonly causationId?: string;
  readonly createdAt: Date;
}
