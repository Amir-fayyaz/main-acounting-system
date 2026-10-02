import { Module } from '@nestjs/common';
import { AppConfigModule } from '../config/app-config.module.js';
import { AppConfigService } from '../config/app-config.service.js';
import { SECRET_REDACTOR } from '../config/app-config.tokens.js';
import type { SecretHolder } from '../config/secrets.js';
import { DatabaseModule, type Database } from '../database/database.module.js';
import { DATABASE } from '../database/database.tokens.js';
import { RedisModule } from '../redis/redis.module.js';
import type { EventPublisherPort } from './event-publisher.port.js';
import { createOutboxPublishJob, createOutboxPublishSchedule } from './outbox-jobs.js';
import { OutboxRecorder } from './outbox-recorder.js';
import { OutboxPublisher } from './outbox.publisher.js';
import type { OutboxStore } from './outbox-store.port.js';
import { DrizzleOutboxStore } from './persistence/drizzle-outbox-store.js';
import { RedisEventPublisher } from './redis-event-publisher.js';
import {
  EVENT_PUBLISHER,
  OUTBOX_PUBLISH_JOB,
  OUTBOX_PUBLISHER,
  OUTBOX_RECORDER,
  OUTBOX_SCHEDULE,
  OUTBOX_STORE,
} from './outbox.tokens.js';

/**
 * Transactional-outbox infrastructure (SHR-006; ADR-004 section 14,
 * ADR-005 sections 6-7).
 *
 * The module binds the three ports to their adapters and exposes the hooks the
 * rest of the system uses: the **recorder**, which a use case calls inside its
 * transaction, and the **job plus schedule**, which make the Worker publish
 * what was recorded. The adapters stay behind their tokens, so a consumer can
 * never reach past a port (ADR-002, section 15).
 *
 * It owns no business rule and no consumer: the records it stores are generic
 * event envelopes, and handling them belongs to the module that published the
 * event (ADR-003).
 */
@Module({
  imports: [AppConfigModule, DatabaseModule, RedisModule],
  providers: [
    {
      provide: OUTBOX_STORE,
      useFactory: (database: Database): OutboxStore => new DrizzleOutboxStore(database),
      inject: [DATABASE],
    },
    {
      provide: OUTBOX_RECORDER,
      useFactory: (store: OutboxStore): OutboxRecorder => new OutboxRecorder(store),
      inject: [OUTBOX_STORE],
    },
    { provide: EVENT_PUBLISHER, useClass: RedisEventPublisher },
    {
      provide: OUTBOX_PUBLISHER,
      useFactory: (
        store: OutboxStore,
        eventPublisher: EventPublisherPort,
        config: AppConfigService,
        secrets: SecretHolder,
      ): OutboxPublisher => new OutboxPublisher(store, eventPublisher, config.outbox, secrets),
      inject: [OUTBOX_STORE, EVENT_PUBLISHER, AppConfigService, SECRET_REDACTOR],
    },
    {
      provide: OUTBOX_PUBLISH_JOB,
      useFactory: (publisher: OutboxPublisher) => createOutboxPublishJob(publisher),
      inject: [OUTBOX_PUBLISHER],
    },
    {
      provide: OUTBOX_SCHEDULE,
      useFactory: (config: AppConfigService) =>
        createOutboxPublishSchedule(config.outbox.publishIntervalMs),
      inject: [AppConfigService],
    },
  ],
  exports: [OUTBOX_RECORDER, OUTBOX_PUBLISHER, OUTBOX_STORE, OUTBOX_PUBLISH_JOB, OUTBOX_SCHEDULE],
})
export class OutboxModule {}
