/**
 * Application-owned outbound port for the transactional outbox pattern.
 * Adapters persist messages in the same database transaction as the business
 * change, then a relay publishes them to the broker exactly once.
 */
export interface OutboxMessage {
  readonly eventId: string;
  readonly eventName: string;
  readonly aggregateId?: string;
  readonly correlationId?: string;
  readonly payload: Record<string, unknown>;
  readonly occurredAt: Date;
}

export interface OutboxPort {
  append(message: OutboxMessage): Promise<void>;
}
