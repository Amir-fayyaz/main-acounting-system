import { sql } from 'drizzle-orm';
import {
  datetime,
  index,
  int,
  mysqlEnum,
  mysqlTable,
  primaryKey,
  uniqueIndex,
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
  (table) => [
    index('roles_tenant_index').on(table.tenantId),
    // Per-company uniqueness: the same role name may exist in different
    // tenants, never twice inside one (TNT-002).
    uniqueIndex('roles_tenant_name_unique').on(table.tenantId, table.name),
  ],
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
export const ROLE_SCHEMA_VERSION = 2;

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
    KEY roles_tenant_index (tenant_id),
    UNIQUE KEY roles_tenant_name_unique (tenant_id, name)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  `CREATE TABLE IF NOT EXISTS ${ROLE_PERMISSION_TABLE_NAME} (
    role_id VARCHAR(64) NOT NULL,
    permission_key VARCHAR(120) NOT NULL,
    PRIMARY KEY (role_id, permission_key)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
];

/**
 * Idempotent migration statements that upgrade an existing roles table to
 * schema v2 (per-tenant unique name). Safe on empty and seeded databases:
 * `CREATE UNIQUE INDEX IF NOT EXISTS` is not portable on MySQL, so we probe
 * information_schema and only add the index when missing.
 */
export const ROLE_MIGRATION_V2_UP: readonly string[] = [
  // Applied programmatically in ensureRoleSchema — see addTenantNameUniqueIfMissing.
];

/** Reverse of v2: drop the per-tenant name unique key (keeps the table). */
export const ROLE_MIGRATION_V2_DOWN: readonly string[] = [
  `ALTER TABLE ${ROLE_TABLE_NAME} DROP INDEX roles_tenant_name_unique`,
];

/**
 * Applies the role schema. Safe to call repeatedly: every statement is
 * idempotent, nothing is dropped and no data is rewritten (doc 07).
 * Also ensures the v2 unique index exists on already-provisioned databases.
 */
export async function ensureRoleSchema(database: Database): Promise<void> {
  for (const statement of ROLE_DDL) {
    await database.execute(sql.raw(statement));
  }
  await addTenantNameUniqueIfMissing(database);
}

async function addTenantNameUniqueIfMissing(database: Database): Promise<void> {
  const rows = await database.execute(
    sql.raw(
      `SELECT 1 AS present FROM information_schema.statistics
       WHERE table_schema = DATABASE()
         AND table_name = '${ROLE_TABLE_NAME}'
         AND index_name = 'roles_tenant_name_unique'
       LIMIT 1`,
    ),
  );
  const found =
    Array.isArray(rows) && rows.length > 0 ? rows : ((rows as { rows?: unknown[] }).rows ?? []);
  if ((found as unknown[]).length === 0) {
    await database.execute(
      sql.raw(
        `ALTER TABLE ${ROLE_TABLE_NAME} ADD UNIQUE KEY roles_tenant_name_unique (tenant_id, name)`,
      ),
    );
  }
}

/**
 * Rolls back the v2 unique index. Safe when the index is absent (MySQL
 * raises if missing — callers should catch or check first in tests).
 */
export async function rollbackRoleSchemaV2(database: Database): Promise<void> {
  for (const statement of ROLE_MIGRATION_V2_DOWN) {
    try {
      await database.execute(sql.raw(statement));
    } catch {
      // Index already absent — idempotent rollback for empty DBs.
    }
  }
}
