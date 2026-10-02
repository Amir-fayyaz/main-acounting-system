import { sql } from 'drizzle-orm';
import {
  index,
  int,
  mysqlEnum,
  mysqlTable,
  uniqueIndex,
  datetime,
  mediumtext,
  varchar,
} from 'drizzle-orm/mysql-core';
import type { Database } from '../../database/database.module.js';

/**
 * The outbox table (SHR-006; ADR-004 section 14).
 *
 * Infrastructure owns this table, not a domain module: it stores generic event
 * envelopes — a name, a version, a metadata block — and no business field, so
 * no module's data can leak through it (ADR-003). It lives in MySQL because
 * the whole point of the record is that it commits in the *same transaction*
 * as the state change beside it; Redis is never the source of truth for an
 * unpublished event (ADR-005, section 7).
 *
 * Columns split into three groups:
 *
 * - **identity** — `id` is the row's own, `event_id` is the event's
 *   `metadata.messageId`, unique so one fact has exactly one record and no
 *   retry can ever create a second;
 * - **queryable metadata** — type, version, tenant, correlation, causation,
 *   so an operator can find "what is stuck, for whom" without parsing payloads;
 * - **lifecycle** — state, attempts, timestamps, the failure line, the claim
 *   token: the audit trail of every publication attempt.
 *
 * `payload` keeps the envelope exactly as it was serialized; nothing
 * re-serializes it on the way out, so every attempt publishes identical bytes.
 */
export const OUTBOX_TABLE_NAME = 'outbox_events';

export const outboxEvents = mysqlTable(
  OUTBOX_TABLE_NAME,
  {
    id: varchar('id', { length: 64 }).primaryKey(),
    eventId: varchar('event_id', { length: 128 }).notNull(),
    eventType: varchar('event_type', { length: 128 }).notNull(),
    eventVersion: int('event_version').notNull(),
    payload: mediumtext('payload').notNull(),
    tenantId: varchar('tenant_id', { length: 128 }),
    correlationId: varchar('correlation_id', { length: 128 }),
    causationId: varchar('causation_id', { length: 128 }),
    createdAt: datetime('created_at', { fsp: 3 }).notNull(),
    state: mysqlEnum('state', [
      'pending',
      'publishing',
      'published',
      'retrying',
      'failed',
    ]).notNull(),
    attemptCount: int('attempt_count').notNull().default(0),
    lastAttemptAt: datetime('last_attempt_at', { fsp: 3 }),
    lastFailure: mediumtext('last_failure'),
    publishedAt: datetime('published_at', { fsp: 3 }),
    nextAttemptAt: datetime('next_attempt_at', { fsp: 3 }),
    claimId: varchar('claim_id', { length: 64 }),
  },
  (table) => [
    // One fact, one record: a duplicate eventId is a bug, not a retry.
    uniqueIndex('outbox_events_event_id_unique').on(table.eventId),
    // The claim's hot path: state plus due time, oldest first.
    index('outbox_events_state_due_index').on(table.state, table.nextAttemptAt),
    // The audit question "what happened, when" in arrival order.
    index('outbox_events_created_at_index').on(table.createdAt),
  ],
);

/**
 * The outbox's schema, as versioned, reviewable DDL (doc 07: migrations are
 * owned, versioned and reviewable; constraints are enforced in the database
 * too). It mirrors `outboxEvents` statement for statement — the Drizzle table
 * is the type-level truth, this is the executable one.
 *
 * Idempotent on purpose (`IF NOT EXISTS`), so provisioning runs safely on any
 * environment, any number of times. When the workspace grows a migration
 * runner for the first module table, this becomes its first migration.
 */
export const OUTBOX_SCHEMA_VERSION = 1;

export const OUTBOX_DDL: readonly string[] = [
  `CREATE TABLE IF NOT EXISTS ${OUTBOX_TABLE_NAME} (
    id VARCHAR(64) NOT NULL,
    event_id VARCHAR(128) NOT NULL,
    event_type VARCHAR(128) NOT NULL,
    event_version INT NOT NULL,
    payload MEDIUMTEXT NOT NULL,
    tenant_id VARCHAR(128) NULL,
    correlation_id VARCHAR(128) NULL,
    causation_id VARCHAR(128) NULL,
    created_at DATETIME(3) NOT NULL,
    state ENUM('pending','publishing','published','retrying','failed') NOT NULL,
    attempt_count INT NOT NULL DEFAULT 0,
    last_attempt_at DATETIME(3) NULL,
    last_failure MEDIUMTEXT NULL,
    published_at DATETIME(3) NULL,
    next_attempt_at DATETIME(3) NULL,
    claim_id VARCHAR(64) NULL,
    PRIMARY KEY (id),
    UNIQUE KEY outbox_events_event_id_unique (event_id),
    KEY outbox_events_state_due_index (state, next_attempt_at),
    KEY outbox_events_created_at_index (created_at)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
];

/**
 * Applies the outbox schema. Safe to call repeatedly: every statement is
 * idempotent, nothing is dropped and no data is rewritten (doc 07 — a
 * destructive migration without a recovery plan is not allowed, and this one
 * is neither destructive nor a rewrite).
 */
export async function ensureOutboxSchema(database: Database): Promise<void> {
  for (const statement of OUTBOX_DDL) {
    await database.execute(sql.raw(statement));
  }
}
