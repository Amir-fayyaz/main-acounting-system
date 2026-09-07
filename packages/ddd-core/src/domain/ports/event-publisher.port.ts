import type { DomainEvent } from '../domain-event';

/** Injection token for the EventPublisher port (framework-agnostic symbol). */
export const EVENT_PUBLISHER = Symbol('EVENT_PUBLISHER');

/**
 * Domain port for publishing domain events after an aggregate is saved.
 * Adapters may fan out to a broker directly or persist to an outbox within
 * the same transaction for reliable delivery.
 */
export interface EventPublisher {
  publish(event: DomainEvent): Promise<void>;
}
