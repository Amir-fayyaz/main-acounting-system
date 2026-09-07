import { Entity } from './entity';
import type { DomainEvent } from './domain-event';

/**
 * Base class for aggregate roots: an entity that is the consistency boundary
 * of a cluster of entities. External actors only ever reference the aggregate
 * root, and state changes are published as domain events via pullEvents().
 */
export abstract class AggregateRoot<TId> extends Entity<TId> {
  private readonly events: DomainEvent[] = [];

  protected addEvent(event: DomainEvent): void {
    this.events.push(event);
  }

  /** Returns and clears all pending domain events (destructive read). */
  pullEvents(): DomainEvent[] {
    return this.events.splice(0);
  }
}
