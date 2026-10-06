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
 * The membership-role assignment table (IAM-004; doc 07: database-and-migrations).
 *
 * One row per (Membership, Role) assignment:
 *
 * - `id` — the stable UUID assignment identity and primary key;
 * - `tenant_id` — the tenant both the membership and the role belong to, so an
 *   assignment can never straddle tenants;
 * - `membership_id` / `role_id` — the two identities the assignment relates,
 *   never copies of their data;
 * - `status` — the assignment lifecycle (active / inactive); removal deactivates
 *   rather than deletes, so the row is the tenant's access history;
 * - `revision` — the optimistic-concurrency token (SHR-008);
 * - `created_at` / `updated_at` — UTC instants.
 *
 * The unique key on `(membership_id, role_id)` is the persistence-level
 * enforcement of the duplicate rule: at most one assignment per pair whatever its
 * state, so re-assigning reactivates the preserved record and can never create a
 * second one. Its leading `membership_id` also serves the "roles of a
 * membership" read; the `tenant_id` index serves the tenant-wide scans.
 *
 * There are no foreign keys: both referenced entities are tenant-owned and the
 * architecture forbids cross-module foreign keys (ADR-003 section 13).
 */
export const MEMBERSHIP_ROLE_TABLE_NAME = 'membership_roles';

export const membershipRoles = mysqlTable(
  MEMBERSHIP_ROLE_TABLE_NAME,
  {
    id: varchar('id', { length: 64 }).primaryKey(),
    tenantId: varchar('tenant_id', { length: 64 }).notNull(),
    membershipId: varchar('membership_id', { length: 64 }).notNull(),
    roleId: varchar('role_id', { length: 64 }).notNull(),
    status: mysqlEnum('status', ['active', 'inactive']).notNull(),
    revision: int('revision').notNull(),
    createdAt: datetime('created_at', { fsp: 3 }).notNull(),
    updatedAt: datetime('updated_at', { fsp: 3 }).notNull(),
  },
  (table) => [
    uniqueIndex('membership_roles_pair_unique').on(table.membershipId, table.roleId),
    index('membership_roles_tenant_index').on(table.tenantId),
  ],
);

/**
 * The assignment schema as versioned, reviewable DDL (doc 07). Idempotent
 * (`IF NOT EXISTS`), so provisioning runs safely on any environment.
 */
export const MEMBERSHIP_ROLE_SCHEMA_VERSION = 1;

export const MEMBERSHIP_ROLE_DDL: readonly string[] = [
  `CREATE TABLE IF NOT EXISTS ${MEMBERSHIP_ROLE_TABLE_NAME} (
    id VARCHAR(64) NOT NULL,
    tenant_id VARCHAR(64) NOT NULL,
    membership_id VARCHAR(64) NOT NULL,
    role_id VARCHAR(64) NOT NULL,
    status ENUM('active','inactive') NOT NULL,
    revision INT NOT NULL,
    created_at DATETIME(3) NOT NULL,
    updated_at DATETIME(3) NOT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY membership_roles_pair_unique (membership_id, role_id),
    KEY membership_roles_tenant_index (tenant_id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
];

/**
 * Applies the assignment schema. Safe to call repeatedly: every statement is
 * idempotent, nothing is dropped and no data is rewritten (doc 07).
 */
export async function ensureMembershipRoleSchema(database: Database): Promise<void> {
  for (const statement of MEMBERSHIP_ROLE_DDL) {
    await database.execute(sql.raw(statement));
  }
}
