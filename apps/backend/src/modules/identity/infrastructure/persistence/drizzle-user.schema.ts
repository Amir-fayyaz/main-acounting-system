import { sql } from 'drizzle-orm';
import { datetime, int, mysqlEnum, mysqlTable, varchar } from 'drizzle-orm/mysql-core';
import type { Database } from '../../../../infrastructure/database/database.module.js';

/**
 * The user table (IAM-002; doc 07: database-and-migrations).
 *
 * This table belongs to the identity module and only that module reaches it:
 * the Drizzle table object, the adapter and the DDL all live inside this
 * module's `infrastructure/persistence/`, and no other module may import any of
 * them (ADR-002 sections 8 and 12; enforced by `src/modules/module-boundaries.spec.ts`).
 *
 * Columns are exactly the user-level information this stage requires — no
 * tenant, no role, no tenant permissions, no company-specific status (the
 * acceptance criteria require tenant independence):
 *
 * - `id` — the stable UUID identity; also the primary key, so the database
 *   enforces that no two users share an id and that an id is never reused for
 *   another person.
 * - `display_name` — the mutable display name, bounded to match `UserName`.
 * - `email` — the normalized primary contact email, unique at the table level so
 *   the identity-module invariant is enforced in storage too (ADR-003 section 12).
 * - `status` — the two-state lifecycle, a `NOT NULL` enum so storage can never
 *   hold a state the domain does not define.
 * - `revision` — the optimistic-concurrency token (SHR-008): the adapter's
 *   compare-and-swap writes `revision = expected + 1` and matches on the old
 *   value, so a stale write affects zero rows.
 * - `created_at` / `updated_at` — UTC instants. `created_at` never changes;
 *   `updated_at` advances on every accepted write.
 *
 * There are deliberately no foreign keys here: a user is a tenant-independent
 * identity root, and the architecture forbids cross-module foreign keys
 * (ADR-003 section 13).
 */
export const USER_TABLE_NAME = 'users';

export const users = mysqlTable(
  USER_TABLE_NAME,
  {
    id: varchar('id', { length: 64 }).primaryKey(),
    displayName: varchar('display_name', { length: 200 }).notNull(),
    email: varchar('email', { length: 254 }).notNull().unique(),
    status: mysqlEnum('status', ['active', 'inactive']).notNull(),
    revision: int('revision').notNull(),
    createdAt: datetime('created_at', { fsp: 3 }).notNull(),
    updatedAt: datetime('updated_at', { fsp: 3 }).notNull(),
  },
  // The unique constraint on `email` is the only index it needs: a second
  // non-unique index on the same column would be redundant.
  () => [],
);

/**
 * The user schema as versioned, reviewable DDL (doc 07: migrations are owned,
 * versioned and reviewable, and constraints are enforced in the database too).
 *
 * It mirrors `users` statement for statement — the Drizzle table is the
 * type-level truth, this is the executable one. Idempotent (`IF NOT EXISTS`),
 * so provisioning runs safely on any environment, any number of times.
 */
export const USER_SCHEMA_VERSION = 1;

export const USER_DDL: readonly string[] = [
  `CREATE TABLE IF NOT EXISTS ${USER_TABLE_NAME} (
    id VARCHAR(64) NOT NULL,
    display_name VARCHAR(200) NOT NULL,
    email VARCHAR(254) NOT NULL,
    status ENUM('active','inactive') NOT NULL,
    revision INT NOT NULL,
    created_at DATETIME(3) NOT NULL,
    updated_at DATETIME(3) NOT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY users_email_unique (email)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
];

/**
 * Applies the user schema. Safe to call repeatedly: every statement is
 * idempotent, nothing is dropped and no data is rewritten (doc 07 — a
 * destructive migration without a recovery plan is not allowed). When the
 * workspace grows a migration runner, this becomes the module's first migration.
 */
export async function ensureUserSchema(database: Database): Promise<void> {
  for (const statement of USER_DDL) {
    await database.execute(sql.raw(statement));
  }
}
