import { randomUUID } from 'node:crypto';

import type { DomainEvent } from '../../shared/messaging/domain-event.js';
import { TransactionContext } from '../../shared/transaction/transaction-context.js';
import { OutboxTransactionRequiredError } from './outbox.errors.js';
import type { OutboxStore } from './outbox-store.port.js';

/**
 * The write side of the outbox (SHR-006; ADR-004 section 14, ADR-005
 * section 10): where a use case turns "this fact happened" into a record that
 * commits with the state change it reports.
 *
 * ```ts
 * // application/commands/post-invoice.ts — inside TransactionBoundary.execute
 * await this.outbox.record(new InvoicePosted(causedBy(command) → data));
 * ```
 *
 * Two rules carry the whole pattern:
 *
 * - **Same transaction, enforced.** `record` refuses to run with no boundary
 *   open ({@link OutboxTransactionRequiredError}), because a record written
 *   outside the boundary would be a second, independent write — the exact
 *   dual write ADR-004 section 14 exists to prevent. Inside one, the store
 *   writes through `scopedDatabase`, so the row rides the use case's
 *   connection: commit together, roll back together, invisible to other
 *   connections until the commit.
 * - **The event's identity is fixed here.** The row stores the envelope as
 *   `JSON.stringify(event.toJSON())` once; `eventId` is that envelope's
 *   `metadata.messageId`. Every later attempt republishes these bytes, so
 *   consumers always see one identity for one fact (ADR-004, section 15).
 *
 * Nothing above knows a column, a driver or a state: serialization and the
 * lifecycle belong to the store and the publisher.
 */
export class OutboxRecorder {
  public constructor(private readonly store: OutboxStore) {}

  /**
   * Records `event` as a `pending` outbox row in the caller's transaction.
   *
   * Rejects — writing nothing — when no boundary is open, or when the envelope
   * cannot be serialized; in both cases the use case's boundary sees a failed
   * operation and rolls the state change back with it.
   */
  public async record(event: DomainEvent<unknown>): Promise<void> {
    if (TransactionContext.current() === undefined) {
      throw new OutboxTransactionRequiredError();
    }

    const snapshot = event.toJSON();
    const payload = JSON.stringify(snapshot);

    await this.store.add({
      id: randomUUID(),
      eventId: snapshot.metadata.messageId,
      eventType: snapshot.name,
      eventVersion: snapshot.metadata.version,
      payload,
      ...(snapshot.metadata.tenantId !== undefined ? { tenantId: snapshot.metadata.tenantId } : {}),
      ...(snapshot.metadata.correlationId !== undefined
        ? { correlationId: snapshot.metadata.correlationId }
        : {}),
      ...(snapshot.metadata.causationId !== undefined
        ? { causationId: snapshot.metadata.causationId }
        : {}),
      createdAt: new Date(),
    });
  }
}
