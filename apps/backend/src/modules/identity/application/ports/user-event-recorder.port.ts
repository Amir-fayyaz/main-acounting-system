import type { DomainEvent } from '../../../../shared/messaging/domain-event.js';

/**
 * The outbox boundary as this module's use cases see it (IAM-002; SHR-006).
 *
 * The application layer must not depend on the concrete `OutboxRecorder` in
 * `src/infrastructure/`, so it depends on this one-method port instead. The
 * infrastructure module wires the port to the outbox recorder, which already
 * satisfies it structurally: `record` writes a `pending` row in the caller's
 * open transaction and refuses to run without one, so the event commits and
 * rolls back with the state change beside it.
 */
export interface UserEventRecorder {
  record(event: DomainEvent<unknown>): Promise<void>;
}
