import { Inject, Injectable, type OnModuleInit } from '@nestjs/common';
import { count, inArray } from 'drizzle-orm';
import { MetricsService } from '../observability/metrics.service.js';
import { type Database } from '../database/database.module.js';
import { DATABASE } from '../database/database.tokens.js';
import { outboxEvents } from './persistence/outbox.schema.js';

/**
 * The outbox states that mean "not successfully published yet".
 *
 * `publishing` is included deliberately: a record claimed by a publisher that
 * then crashes stays there until the stale-claim release runs, and "stuck
 * publishing" is exactly the outbox lag the alert must see (ADR-015, section
 * 7). Only `published` (and terminal `failed`, which no longer moves) are
 * excluded — a pile of dead-lettered records is a separate operational issue
 * and would otherwise pin the gauge up forever.
 */
const OUTBOX_UNPUBLISHED_STATES = ['pending', 'retrying', 'publishing'] as const;

/**
 * Sources the `outbox_pending_events` gauge from the outbox table (FND-017).
 *
 * The metrics layer must not depend on the outbox, and the `OutboxStore` port
 * must not grow a count method for metrics' sake — it is the vocabulary of the
 * publisher, not of monitoring. This binder is the one place that joins them:
 * it reads the shared `Database` directly (a plain `SELECT count(*)`, no
 * transaction boundary, no tenant scope — the gauge is intentionally global)
 * and hands the metrics service a provider that runs on every scrape.
 *
 * A failing read is swallowed by the gauge's collect step, which keeps the
 * gauge at its last value instead of failing the whole scrape.
 */
@Injectable()
export class OutboxMetricsBinder implements OnModuleInit {
  constructor(
    @Inject(DATABASE) private readonly database: Database,
    private readonly metrics: MetricsService,
  ) {}

  onModuleInit(): void {
    this.metrics.setOutboxPendingProvider(async () => {
      const [row] = await this.database
        .select({ value: count() })
        .from(outboxEvents)
        .where(inArray(outboxEvents.state, [...OUTBOX_UNPUBLISHED_STATES]));

      return row?.value ?? 0;
    });
  }
}
