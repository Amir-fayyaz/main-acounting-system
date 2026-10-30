import { sql } from 'drizzle-orm';
import { datetime, mysqlTable, varchar } from 'drizzle-orm/mysql-core';
import type { Database } from '../../../../infrastructure/database/database.module.js';

/**
 * The user's selected company (IAM-009; doc 07: database-and-migrations).
 *
 * This table belongs to the identity module and records one durable preference
 * per user. It is deliberately not a session value and not a column on the user
 * row:
 *
 * - **One row per user.** `user_id` is the primary key, so the database itself
 *   guarantees that a user cannot hold two active companies. Selecting another
 *   company replaces the row instead of adding one.
 * - **Only identities.** The row carries the stable user identity and the
 *   stable tenant identity — no company name, status or permissions. The tenant
 *   module stays the authority on the company; authorization stays the
 *   authority on what the user may do there.
 * - **When it was selected.** `selected_at` is the instant of the latest
 *   selection, so a client can show when the workspace was last switched.
 *
 * There is no foreign key: the tenant table belongs to another module, and the
 * architecture forbids cross-module foreign keys (ADR-003 section 13). The
 * tenant's existence was proven by the membership the use case re-checks.
 */
export const ACTIVE_COMPANY_TABLE_NAME = 'user_active_companies';

export const userActiveCompanies = mysqlTable(ACTIVE_COMPANY_TABLE_NAME, {
  userId: varchar('user_id', { length: 64 }).primaryKey(),
  tenantId: varchar('tenant_id', { length: 64 }).notNull(),
  selectedAt: datetime('selected_at', { fsp: 3 }).notNull(),
});

/**
 * The active-company schema as versioned, reviewable DDL (doc 07: migrations
 * are owned, versioned and reviewable, and constraints are enforced in the
 * database too).
 *
 * It mirrors `user_active_companies` statement for statement — the Drizzle
 * table is the type-level truth, this is the executable one. Idempotent
 * (`IF NOT EXISTS`), so provisioning runs safely on any environment, any number
 * of times.
 */
export const ACTIVE_COMPANY_SCHEMA_VERSION = 1;

export const ACTIVE_COMPANY_DDL: readonly string[] = [
  `CREATE TABLE IF NOT EXISTS ${ACTIVE_COMPANY_TABLE_NAME} (
    user_id VARCHAR(64) NOT NULL,
    tenant_id VARCHAR(64) NOT NULL,
    selected_at DATETIME(3) NOT NULL,
    PRIMARY KEY (user_id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
];

/** Applies the active-company schema. Safe to call repeatedly. */
export async function ensureActiveCompanySchema(database: Database): Promise<void> {
  for (const statement of ACTIVE_COMPANY_DDL) {
    await database.execute(sql.raw(statement));
  }
}
