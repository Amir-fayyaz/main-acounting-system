/**
 * Domain events record meaningful state changes in the past tense. They are
 * plain, serializable facts and never carry infrastructure concerns.
 */
export interface DomainEvent {
  readonly occurredAt: Date;
  readonly eventName: string;
}
