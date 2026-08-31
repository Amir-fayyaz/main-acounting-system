import { Entity } from './entity';

export interface DomainEvent {
  readonly occurredAt: Date;
  readonly eventName: string;
}

export abstract class AggregateRoot<TId> extends Entity<TId> {
  private readonly events: DomainEvent[] = [];

  protected addEvent(event: DomainEvent): void { this.events.push(event); }
  pullEvents(): DomainEvent[] { return this.events.splice(0); }
}
