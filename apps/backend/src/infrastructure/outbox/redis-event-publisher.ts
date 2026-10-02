import { Injectable } from '@nestjs/common';

// A value import, not `import type`: Nest reads the constructor's reflected
// `design:paramtypes`, and a type-only import compiles away — the injector
// would see `undefined` for this dependency.
import { AppConfigService } from '../config/app-config.service.js';
import { RedisConnectionService } from '../redis/redis-connection.service.js';
import type { EventPublisherPort, PublishedEvent } from './event-publisher.port.js';

type RedisClient = ReturnType<RedisConnectionService['getClient']>;

/** Stream field carrying the serialized event envelope. */
const EVENT_FIELD = 'event';

/** Upper bound on the stream length; the outbox row stays the durable record. */
const STREAM_MAX_LENGTH = 100_000;

/**
 * The internal event bus of ADR-005, section 7: the outbox dispatcher appends
 * to a Redis Stream, and consumers attach through consumer groups — streams
 * because they persist and replay, never Pub/Sub, which cannot (ADR-005,
 * section 7; FND-007).
 *
 * The fields are the envelope plus two lookup columns (`eventId`,
 * `eventType`) so an operator reading the stream can see what is flowing
 * without parsing every payload. `eventId` is the dedup key consumers
 * collapse duplicates on: the same record reaches this method on every retry,
 * with the same id, and that is by design (ADR-004, section 15).
 *
 * Redis stays transport only (TECH-007): the outbox row in MySQL remains the
 * source of truth until the publisher marks it published — if this call fails,
 * the record is retried, never lost and never rewritten.
 *
 * Nothing connects eagerly: the first `publish` opens the connection, so the
 * API process can hold this adapter while Redis is down.
 */
@Injectable()
export class RedisEventPublisher implements EventPublisherPort {
  private readonly streamKey: string;

  public constructor(
    private readonly connection: RedisConnectionService,
    config: AppConfigService,
  ) {
    this.streamKey = `events:${config.environment.name}:stream`;
  }

  public async publish(event: PublishedEvent): Promise<void> {
    const client = await this.client();

    await client.xAdd(
      this.streamKey,
      '*',
      {
        [EVENT_FIELD]: event.payload,
        eventId: event.eventId,
        eventType: event.eventType,
      },
      { TRIM: { strategy: 'MAXLEN', strategyModifier: '~', threshold: STREAM_MAX_LENGTH } },
    );
  }

  private async client(): Promise<RedisClient> {
    await this.connection.ensureConnected();

    return this.connection.getClient();
  }
}
