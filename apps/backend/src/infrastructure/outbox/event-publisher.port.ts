/**
 * The event-publishing boundary (SHR-006; ADR-005 section 7).
 *
 * The outbox publisher hands one *already serialized* event envelope to this
 * port and nothing else: no ORM type, no entity, no module-own shape — the
 * same `{ kind, name, metadata, data }` snapshot SHR-003 produced, which is
 * exactly what reaches the stream on every attempt. The port is the approved
 * seam ADR-005 names between the Outbox Dispatcher and the internal event bus;
 * Redis Streams is its MVP implementation, and because it is a port, a
 * different transport replaces it without touching the publisher.
 *
 * Contract of an implementation:
 *
 * - **At-least-once.** `publish` may be called again for an event that
 *   already went out — the publisher retries whatever failed *and* whatever
 *   succeeded-but-was-never-recorded. Duplicates are a designed possibility,
 *   never suppressed by the transport (ADR-004, section 15).
 * - **Failures are transient unless they say otherwise.** Throw whatever the
 *   transport threw; the publisher treats it as retryable. Throw a
 *   `PermanentPublishError` for a failure no retry could fix.
 * - **`eventId` is the dedup key.** It is stable across attempts by
 *   construction, so a consumer can drop a duplicate delivery.
 */
export interface PublishedEvent {
  /** Stable event identity — `metadata.messageId`, unchanged across retries. */
  readonly eventId: string;
  /** Contract name of the event. */
  readonly eventType: string;
  /** Contract version of the event. */
  readonly eventVersion: number;
  /** The serialized event envelope, published verbatim. */
  readonly payload: string;
}

export interface EventPublisherPort {
  /** Delivers one serialized event. Rejects when the attempt did not reach the transport. */
  publish(event: PublishedEvent): Promise<void>;
}
