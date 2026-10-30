import { sql } from 'drizzle-orm';
import { check, datetime, mysqlTable, varchar } from 'drizzle-orm/mysql-core';

/** Platform authorities have no tenant column and cannot be tenant roles. */
export const platformAuthorizations = mysqlTable(
  'platform_authorizations',
  {
    userId: varchar('user_id', { length: 64 }).primaryKey(),
    role: varchar('role', { length: 64 }).notNull(),
    grantedAt: datetime('granted_at', { fsp: 3 }).notNull(),
  },
  (table) => [check('platform_authorizations_role_check', sql`${table.role} = 'system-admin'`)],
);
