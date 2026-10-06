import { sql } from 'drizzle-orm';
import {
  datetime,
  index,
  int,
  mysqlEnum,
  mysqlTable,
  primaryKey,
  varchar,
} from 'drizzle-orm/mysql-core';
import type { Database } from '../../../../infrastructure/database/database.module.js';

/**
 * The role tables (IAM-004; doc 07: database-and-migrations).
 *
 * Two tables, because a role and its capability set have different shapes:
 *
 * - `roles` — the aggregate row. `id` is the stable UUID identity and the
 *   primary key; `tenant_id` is the tenant boundary the role belongs to; `name`
 *   is the mutable label; `status` is the two-state lifecycle; `revision` is the
 *   optimistic-concurrency token (SHR-008); `created_at` / `updated_at` are UTC
 *   instants. The `tenant_id` index serves the tenant role list.
 * - `role_permissions` — the role's capability set, one row per (role, key). Its
 *   composite primary key *is* the duplicate rule: the same capability cannot be
 *   granted to a role twice, enforced by the database as well as by the
 *   aggregate.
 *
 * There are deliberately no foreign keys: `roles` is tenant-owned and the
 * architecture forbids cross-module foreign keys (ADR-003 section 13), and the
 * child rows are always written together with their parent in one transaction.
 */
export const ROLE_TABLE_NAME = 'roles';
export const ROLE_PERMISSION_TABLE_NAME = 'role_permissions';

export const roles = mysqlTable(
  ROLE_TABLE_NAME,
  {
    id: varchar('id', { length: 64 }).primaryKey(),
    tenantId: varchar('tenant_id', { length: 64 }).notNull(),
    name: varchar('name', { length: 100 }).notNull(),
    status: mysqlEnum('status', ['active', 'inactive']).notNull(),
    revision: int('revision').notNull(),
    createdAt: datetime('created_at', { fsp: 3 }).notNull(),
    updatedAt: datetime('updated_at', { fsp: 3 }).notNull(),
  },
  (table) => [index('roles_tenant_index').on(table.tenantId)],
);

export const rolePermissions = mysqlTable(
  ROLE_PERMISSION_TABLE_NAME,
  {
    roleId: varchar('role_id', { length: 64 }).notNull(),
    permissionKey: varchar('permission_key', { length: 120 }).notNull(),
  },
  (table) => [primaryKey({ columns: [table.roleId, table.permissionKey] })],
);

/**
 * The role schema as versioned, reviewable DDL (doc 07: migrations are owned,
 * versioned and reviewable, and constraints are enforced in the database too).
 *
 * Idempotent (`IF NOT EXISTS`), so provisioning runs safely on any environment,
 * any number of times.
 */
export const ROLE_SCHEMA_VERSION = 1;

export const ROLE_DDL: readonly string[] = [
  `CREATE TABLE IF NOT EXISTS ${ROLE_TABLE_NAME} (
    id VARCHAR(64) NOT NULL,
    tenant_id VARCHAR(64) NOT NULL,
    name VARCHAR(100) NOT NULL,
    status ENUM('active','inactive') NOT NULL,
    revision INT NOT NULL,
    created_at DATETIME(3) NOT NULL,
    updated_at DATETIME(3) NOT NULL,
    PRIMARY KEY (id),
    KEY roles_tenant_index (tenant_id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  `CREATE TABLE IF NOT EXISTS ${ROLE_PERMISSION_TABLE_NAME} (
    role_id VARCHAR(64) NOT NULL,
    permission_key VARCHAR(120) NOT NULL,
    PRIMARY KEY (role_id, permission_key)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
];

/**
 * Applies the role schema. Safe to call repeatedly: every statement is
 * idempotent, nothing is dropped and no data is rewritten (doc 07).
 */
export async function ensureRoleSchema(database: Database): Promise<void> {
  for (const statement of ROLE_DDL) {
    await database.execute(sql.raw(statement));
  }
}
