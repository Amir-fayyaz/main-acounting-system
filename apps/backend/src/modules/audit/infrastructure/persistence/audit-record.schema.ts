import { sql } from 'drizzle-orm';
import {
  datetime,
  index,
  int,
  mediumtext,
  mysqlEnum,
  mysqlTable,
  varchar,
} from 'drizzle-orm/mysql-core';
import type { Database } from '../../../../infrastructure/database/database.module.js';

/**
 * The audit table (AUD-001; ADR-003 section 21; doc 07-database-and-migrations).
 *
 * This is the dedicated, durable home of the audit trail — the table ADR-015
 * section 6 requires to exist *beside* the logs, because an audit record is
 * business/security data and a log line is not a substitute for it. It belongs
 * to the Audit module: the Drizzle table object, the adapters and the DDL live
 * inside `infrastructure/persistence/`, and no other module may import any of
 * them (ADR-003 section 4). Other modules record through the published
 * application contract, never through a table.
 *
 * The columns are exactly the questions the trail must answer:
 *
 * - `id` — the record's own UUID identity, the primary key, so two records can
 *   never collapse into one and an id is never reused.
 * - `tenant_id` — the *resolved* company the fact belongs to. Nullable on
 *   purpose: a platform-level fact (a sign-in, a documented denial before any
 *   tenant scope exists) genuinely has no tenant, and storing a guess would be
 *   worse than storing nothing. There is deliberately no foreign key: a tenant
 *   is another module's data, and cross-module foreign keys are forbidden
 *   (ADR-001 section 5).
 * - `actor_type` / `actor_user_id` — who acted. The kind is a `NOT NULL` enum,
 *   so storage can never hold a state the domain does not define, and the id is
 *   nullable because `system` carries none; the adapter never writes a `user`
 *   row without one.
 * - `action` — the stable action name the owning module stated
 *   (`user.signed_in`, `purchase.approved`). Indexed, because "what happened" is
 *   the most common question asked of a trail.
 * - `target_type` / `target_id` — the resource the operation addressed, when it
 *   addressed one; an uninterpreted reference, so the table stays generic across
 *   every module.
 * - `outcome` — `success | failure | denied`, a `NOT NULL` enum: an audit record
 *   that does not say how the operation ended is not an audit record.
 * - `occurred_at` — the UTC instant, milliseconds precision; the time axis every
 *   query is ordered by.
 * - `correlation_id` / `causation_id` — how the fact is tied to the flow that
 *   produced it (SHR-003; ADR-015 section 2).
 * - `metadata` — the sanitized context, stored as its JSON text. It is
 *   `MEDIUMTEXT` rather than a JSON column for the same reason the outbox stores
 *   its payload as text: the adapter writes exactly the bytes it serialized and
 *   reads them back the same way, so the record does not depend on how a driver
 *   happens to map a JSON column. The value is always JSON by construction —
 *   the domain sanitized it — and it never contains credential material.
 * - `revision` — the optimistic-concurrency token of the shared write
 *   capability (SHR-008). An audit record is append-only, so it is always `1`;
 *   it exists so the module's write speaks the same vocabulary as every other
 *   module's, not because a record ever changes.
 *
 * The indexes mirror the filters the retrieval contract supports — tenant, time,
 * actor, action, target, outcome and correlation — so a trail read stays a
 * bounded index scan rather than a table walk.
 */
export const AUDIT_RECORD_TABLE_NAME = 'audit_records';

export const auditRecords = mysqlTable(
  AUDIT_RECORD_TABLE_NAME,
  {
    id: varchar('id', { length: 64 }).primaryKey(),
    tenantId: varchar('tenant_id', { length: 128 }),
    actorType: mysqlEnum('actor_type', ['user', 'system']).notNull(),
    actorUserId: varchar('actor_user_id', { length: 128 }),
    action: varchar('action', { length: 128 }).notNull(),
    targetType: varchar('target_type', { length: 128 }),
    targetId: varchar('target_id', { length: 128 }),
    outcome: mysqlEnum('outcome', ['success', 'failure', 'denied']).notNull(),
    occurredAt: datetime('occurred_at', { fsp: 3 }).notNull(),
    correlationId: varchar('correlation_id', { length: 128 }),
    causationId: varchar('causation_id', { length: 128 }),
    metadata: mediumtext('metadata'),
    revision: int('revision').notNull(),
  },
  (table) => [
    index('audit_records_tenant_occurred_index').on(table.tenantId, table.occurredAt),
    index('audit_records_actor_index').on(table.actorUserId, table.occurredAt),
    index('audit_records_action_index').on(table.action, table.occurredAt),
    index('audit_records_target_index').on(table.targetType, table.targetId, table.occurredAt),
    index('audit_records_outcome_index').on(table.outcome, table.occurredAt),
    index('audit_records_correlation_index').on(table.correlationId),
  ],
);

/**
 * The audit schema as versioned, reviewable DDL (doc 07: migrations are owned,
 * versioned and reviewable, and constraints are enforced in the database too).
 *
 * It mirrors `auditRecords` statement for statement — the Drizzle table is the
 * type-level truth, this is the executable one. Idempotent (`IF NOT EXISTS`), so
 * provisioning runs safely on any environment any number of times.
 */
export const AUDIT_RECORD_SCHEMA_VERSION = 1;

export const AUDIT_RECORD_DDL: readonly string[] = [
  `CREATE TABLE IF NOT EXISTS ${AUDIT_RECORD_TABLE_NAME} (
    id VARCHAR(64) NOT NULL,
    tenant_id VARCHAR(128) NULL,
    actor_type ENUM('user','system') NOT NULL,
    actor_user_id VARCHAR(128) NULL,
    action VARCHAR(128) NOT NULL,
    target_type VARCHAR(128) NULL,
    target_id VARCHAR(128) NULL,
    outcome ENUM('success','failure','denied') NOT NULL,
    occurred_at DATETIME(3) NOT NULL,
    correlation_id VARCHAR(128) NULL,
    causation_id VARCHAR(128) NULL,
    metadata MEDIUMTEXT NULL,
    revision INT NOT NULL,
    PRIMARY KEY (id),
    KEY audit_records_tenant_occurred_index (tenant_id, occurred_at),
    KEY audit_records_actor_index (actor_user_id, occurred_at),
    KEY audit_records_action_index (action, occurred_at),
    KEY audit_records_target_index (target_type, target_id, occurred_at),
    KEY audit_records_outcome_index (outcome, occurred_at),
    KEY audit_records_correlation_index (correlation_id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
];

/**
 * Applies the audit schema. Safe to call repeatedly: every statement is
 * idempotent, nothing is dropped and no data is rewritten (doc 07 — a
 * destructive migration without a recovery plan is not allowed, and an audit
 * table is the last place a `DROP` could ever be acceptable).
 */
export async function ensureAuditRecordSchema(database: Database): Promise<void> {
  for (const statement of AUDIT_RECORD_DDL) {
    await database.execute(sql.raw(statement));
  }
}
