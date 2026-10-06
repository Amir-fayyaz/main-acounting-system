import { sql } from 'drizzle-orm';
import {
  datetime,
  index,
  int,
  mysqlEnum,
  mysqlTable,
  uniqueIndex,
  varchar,
} from 'drizzle-orm/mysql-core';
import type { Database } from '../../../../infrastructure/database/database.module.js';

/**
 * The membership table (IAM-003; doc 07: database-and-migrations).
 *
 * This table belongs to the identity module and only that module reaches it:
 * the Drizzle table object, the adapter and the DDL all live inside this
 * module's `infrastructure/persistence/`, and no other module may import any of
 * them (ADR-002 sections 8 and 12; enforced by `src/modules/module-boundaries.spec.ts`).
 *
 * Columns are exactly the relationship this stage requires — no user or tenant
 * business data is duplicated here (the acceptance criteria require it):
 *
 * - `id` — the stable UUID membership identity; also the primary key, so the
 *   database enforces that no two memberships share an id and that an id is
 *   never reused for another relationship.
 * - `user_id` — the identity of the user the membership belongs to. A bare
 *   identity, not a copy of the user's name, email or status.
 * - `tenant_id` — the stable tenant identity. A bare identity, not a copy of the
 *   tenant's name or status; the tenant module stays the authority on the tenant.
 * - `status` — the two-state lifecycle, a `NOT NULL` enum so storage can never
 *   hold a state the domain does not define.
 * - `revision` — the optimistic-concurrency token (SHR-008): the adapter's
 *   compare-and-swap writes `revision = expected + 1` and matches on the old
 *   value, so a stale write affects zero rows.
 * - `created_at` / `updated_at` — UTC instants. `created_at` never changes;
 *   `updated_at` advances on every accepted lifecycle change.
 *
 * The unique key on `(user_id, tenant_id)` is the persistence-level enforcement
 * of the duplicate rule: at most one membership per pair, whatever its state, so
 * a re-join reactivates the preserved record and can never create a second one.
 * The `tenant_id` index serves the tenant-members read; the unique key's leading
 * `user_id` serves the user-memberships read, so no separate user index is added.
 *
 * There are deliberately no foreign keys here. `tenants` belongs to another
 * module, and the architecture forbids cross-module foreign keys (ADR-003
 * section 13); the user side is kept symmetric — a bare identity reference,
 * like the tenant side — so the relationship carries no constraint that would
 * tie it to either module's lifecycle. Existence of both identities is checked
 * by the application inside the same transaction as the insert.
 */
export const MEMBERSHIP_TABLE_NAME = 'memberships';

export const memberships = mysqlTable(
  MEMBERSHIP_TABLE_NAME,
  {
    id: varchar('id', { length: 64 }).primaryKey(),
    userId: varchar('user_id', { length: 64 }).notNull(),
    tenantId: varchar('tenant_id', { length: 64 }).notNull(),
    status: mysqlEnum('status', ['active', 'inactive']).notNull(),
    revision: int('revision').notNull(),
    createdAt: datetime('created_at', { fsp: 3 }).notNull(),
    updatedAt: datetime('updated_at', { fsp: 3 }).notNull(),
  },
  (table) => [
    uniqueIndex('memberships_user_tenant_unique').on(table.userId, table.tenantId),
    index('memberships_tenant_index').on(table.tenantId),
  ],
);

/**
 * The membership schema as versioned, reviewable DDL (doc 07: migrations are
 * owned, versioned and reviewable, and constraints are enforced in the database
 * too).
 *
 * It mirrors `memberships` statement for statement — the Drizzle table is the
 * type-level truth, this is the executable one. Idempotent (`IF NOT EXISTS`),
 * so provisioning runs safely on any environment, any number of times.
 */
export const MEMBERSHIP_SCHEMA_VERSION = 1;

export const MEMBERSHIP_DDL: readonly string[] = [
  `CREATE TABLE IF NOT EXISTS ${MEMBERSHIP_TABLE_NAME} (
    id VARCHAR(64) NOT NULL,
    user_id VARCHAR(64) NOT NULL,
    tenant_id VARCHAR(64) NOT NULL,
    status ENUM('active','inactive') NOT NULL,
    revision INT NOT NULL,
    created_at DATETIME(3) NOT NULL,
    updated_at DATETIME(3) NOT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY memberships_user_tenant_unique (user_id, tenant_id),
    KEY memberships_tenant_index (tenant_id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
];

/**
 * Applies the membership schema. Safe to call repeatedly: every statement is
 * idempotent, nothing is dropped and no data is rewritten (doc 07 — a
 * destructive migration without a recovery plan is not allowed). When the
 * workspace grows a migration runner, this becomes the module's next migration.
 */
export async function ensureMembershipSchema(database: Database): Promise<void> {
  for (const statement of MEMBERSHIP_DDL) {
    await database.execute(sql.raw(statement));
  }
}
