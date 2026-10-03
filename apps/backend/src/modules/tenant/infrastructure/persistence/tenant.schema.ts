import { sql } from 'drizzle-orm';
import { datetime, index, int, mysqlEnum, mysqlTable, varchar } from 'drizzle-orm/mysql-core';
import type { Database } from '../../../../infrastructure/database/database.module.js';

/**
 * The tenant table (IAM-001; doc 07-database-and-migrations).
 *
 * This table belongs to the tenant module, and only that module reaches
 * it: the Drizzle table object, the adapter and the DDL all live inside the
 * module's `infrastructure/persistence/`, and no other module may import any of
 * them (ADR-003 section 4; enforced by `src/modules/module-boundaries.spec.ts`).
 *
 * Columns are exactly the tenant-level information this stage requires:
 *
 * - `id` — the stable UUID identity, also the tenant boundary value. It is the
 *   primary key, so the database enforces that no two tenants share an id and
 *   that an id is never reused for another tenant.
 * - `name` — the mutable display name, bounded to match `TenantName`.
 * - `status` — the two-state lifecycle, a `NOT NULL` enum so storage can never
 *   hold a state the domain does not define.
 * - `revision` — the optimistic-concurrency token (SHR-008): the adapter's
 *   compare-and-swap writes `revision = expected + 1` and matches on the old
 *   value, so a stale write affects zero rows.
 * - `created_at` / `updated_at` — UTC instants. `created_at` never changes;
 *   `updated_at` advances on every accepted write.
 *
 * There are deliberately no foreign keys here: a tenant is the root boundary,
 * and the architecture forbids cross-module foreign keys (ADR-001 section 5).
 */
export const TENANT_TABLE_NAME = 'tenants';

export const tenants = mysqlTable(
  TENANT_TABLE_NAME,
  {
    id: varchar('id', { length: 64 }).primaryKey(),
    name: varchar('name', { length: 200 }).notNull(),
    status: mysqlEnum('status', ['active', 'inactive']).notNull(),
    revision: int('revision').notNull(),
    createdAt: datetime('created_at', { fsp: 3 }).notNull(),
    updatedAt: datetime('updated_at', { fsp: 3 }).notNull(),
  },
  (table) => [index('tenants_name_index').on(table.name)],
);

/**
 * The tenant schema as versioned, reviewable DDL (doc 07: migrations are owned,
 * versioned and reviewable, and constraints are enforced in the database too).
 *
 * It mirrors `tenants` statement for statement — the Drizzle table is the
 * type-level truth, this is the executable one. Idempotent (`IF NOT EXISTS`),
 * so provisioning runs safely on any environment, any number of times.
 */
export const TENANT_SCHEMA_VERSION = 1;

export const TENANT_DDL: readonly string[] = [
  `CREATE TABLE IF NOT EXISTS ${TENANT_TABLE_NAME} (
    id VARCHAR(64) NOT NULL,
    name VARCHAR(200) NOT NULL,
    status ENUM('active','inactive') NOT NULL,
    revision INT NOT NULL,
    created_at DATETIME(3) NOT NULL,
    updated_at DATETIME(3) NOT NULL,
    PRIMARY KEY (id),
    KEY tenants_name_index (name)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
];

/**
 * Applies the tenant schema. Safe to call repeatedly: every statement is
 * idempotent, nothing is dropped and no data is rewritten (doc 07 — a
 * destructive migration without a recovery plan is not allowed). When the
 * workspace grows a migration runner, this becomes the module's first
 * migration.
 */
export async function ensureTenantSchema(database: Database): Promise<void> {
  for (const statement of TENANT_DDL) {
    await database.execute(sql.raw(statement));
  }
}
