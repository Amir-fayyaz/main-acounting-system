import type { DomainEvent } from '../../../../shared/messaging/domain-event.js';
import type { TransactionBoundary } from '../../../../shared/transaction/transaction-boundary.js';
import type { AuthenticationAuditRecorder } from '../../application/ports/authentication-audit-recorder.port.js';

/**
 * The authentication audit adapter (IAM-005; ADR-003 section 21;
 * ADR-010 section 9; SHR-006).
 *
 * The application port says *what* must be recorded; this adapter says *where*,
 * and it records it in the one durable, cross-cutting place the project already
 * has: the transactional outbox. That is deliberate — the architecture gives
 * audit a central owner (ADR-003 section 21) and states that a log is not a
 * substitute for an audit record (ADR-015 section 6), so inventing a private
 * audit table here would create exactly the second mechanism the issue forbids.
 * The events written here are the same records the central Audit capability will
 * read when it lands.
 *
 * The one behaviour that needs care is the transaction: the outbox recorder
 * refuses to write outside a boundary, because a record that committed
 * separately from the state change it reports could lie about it. Audit records
 * have the opposite problem — the interesting half of them describe operations
 * that changed *nothing* (a failed sign-in, a rejected token), so there is no
 * boundary to join. The adapter therefore opens one when the caller has none:
 *
 * - inside a use case's transaction (a successful sign-in, a credential change)
 *   `boundary.execute` *joins* that boundary, so the audit record commits with
 *   the fact or not at all;
 * - outside one (a rejected attempt) it opens its own short transaction, so the
 *   record is durable even though the operation failed.
 *
 * A record that cannot be written propagates as a failure. Losing a security
 * record silently would be worse than failing the request that should have
 * produced it, and failing closed is the rule this architecture states for
 * security decisions (ADR-010 section 13).
 */
export class OutboxAuthenticationAuditRecorder implements AuthenticationAuditRecorder {
  public constructor(
    private readonly recorder: DomainEventRecorder,
    private readonly boundary: TransactionBoundary,
  ) {}

  /** Records `event` durably, joining the caller's transaction when one is open. */
  public async record(event: DomainEvent<unknown>): Promise<void> {
    await this.boundary.execute(() => this.recorder.record(event));
  }
}

/**
 * The write side of the outbox, as this adapter needs it.
 *
 * Declared structurally rather than imported from the infrastructure outbox
 * module, so the adapter depends on the shape it uses — the same way the
 * application's event-recorder ports do — and not on the concrete recorder.
 */
export interface DomainEventRecorder {
  record(event: DomainEvent<unknown>): Promise<void>;
}
