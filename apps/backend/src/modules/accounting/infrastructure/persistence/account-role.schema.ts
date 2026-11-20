import {
  index,
  mysqlEnum,
  mysqlTable,
  unique,
  varchar,
  datetime,
  foreignKey,
} from 'drizzle-orm/mysql-core';
import { accounts } from './account.schema.js';

/**
 * System roles required by the accounting module.
 * Keep this list stable: persisted values are part of the database contract.
 */
export const ACCOUNT_ROLE_VALUES = [
  'inventory',
  'payable',
  'input_vat',
  'purchase_discount',
] as const;

export type AccountRole = (typeof ACCOUNT_ROLE_VALUES)[number];

export const accountRoleMappings = mysqlTable(
  'account_role_mappings',
  {
    tenantId: varchar('tenant_id', { length: 64 }).notNull(),
    role: mysqlEnum('role', ACCOUNT_ROLE_VALUES).notNull(),
    accountId: varchar('account_id', { length: 64 }).notNull(),
    createdAt: datetime('created_at', { fsp: 3 }).notNull(),
    updatedAt: datetime('updated_at', { fsp: 3 }).notNull(),
  },
  (table) => [
    // A tenant can map each accounting role only once.
    unique('account_role_mappings_tenant_role_unique').on(table.tenantId, table.role),
    index('account_role_mappings_tenant_account_index').on(table.tenantId, table.accountId),
    // The mapped account must belong to the same tenant.
    foreignKey({
      name: 'account_role_mappings_tenant_account_fk',
      columns: [table.tenantId, table.accountId],
      foreignColumns: [accounts.tenantId, accounts.id],
    }).onDelete('restrict'),
  ],
);
