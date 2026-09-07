import { Entity } from './entity';
import type { DomainEvent } from './domain-event';

/**
 * Base class for aggregate roots: an entity that is the consistency boundary
 * of a cluster of entities. External actors only ever reference the aggregate
 * root, and state changes are published as domain events through
 * `getDomainEvents()` / `clearEvents()`.
 *
 * Lifecycle:
 *   - state-changing behavior calls `addDomainEvent(event)` to record
 *     a fact in the past tense.
 *   - the application layer reads pending events with
 *     `getDomainEvents()` (non-destructive).
 *   - once events are safely dispatched / persisted, the application
 *     layer calls `clearEvents()` to mark the list as published.
 */
export abstract class AggregateRoot<TId> extends Entity<TId> {
  private readonly events: DomainEvent[] = [];

  /** Records a domain event produced by a state change. */
  protected addDomainEvent(event: DomainEvent): void {
    this.events.push(event);
  }

  /** Returns the list of events recorded since the last `clearEvents()`. */
  getDomainEvents(): readonly DomainEvent[] {
    return this.events;
  }

  /** Wipes recorded events. Call after they have been dispatched. */
  clearEvents(): void {
    this.events.length = 0;
  }
}
