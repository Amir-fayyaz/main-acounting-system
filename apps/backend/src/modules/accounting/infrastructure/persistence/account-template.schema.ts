import { sql } from 'drizzle-orm';
import { datetime, mysqlTable, unique, varchar } from 'drizzle-orm/mysql-core';

import type { Database } from '../../../../infrastructure/database/database.module.js';

export const ACCOUNT_TEMPLATE_APPLICATIONS_TABLE_NAME = 'account_template_applications';

export const accountTemplateApplications = mysqlTable(
  ACCOUNT_TEMPLATE_APPLICATIONS_TABLE_NAME,
  {
    tenantId: varchar('tenant_id', { length: 64 }).notNull(),
    templateVersion: varchar('template_version', { length: 64 }).notNull(),
    appliedAt: datetime('applied_at', { fsp: 3 }).notNull(),
  },
  (table) => [
    unique('account_template_applications_tenant_version_unique').on(
      table.tenantId,
      table.templateVersion,
    ),
  ],
);

export const ACCOUNT_TEMPLATE_SCHEMA_VERSION = 1;

export const ACCOUNT_TEMPLATE_DDL: readonly string[] = [
  `CREATE TABLE IF NOT EXISTS \`${ACCOUNT_TEMPLATE_APPLICATIONS_TABLE_NAME}\` (
    \`tenant_id\` varchar(64) NOT NULL,
    \`template_version\` varchar(64) NOT NULL,
    \`applied_at\` datetime(3) NOT NULL,
    CONSTRAINT \`account_template_applications_tenant_version_unique\` UNIQUE(\`tenant_id\`,\`template_version\`)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
];

export const ACCOUNT_TEMPLATE_DOWN_DDL: readonly string[] = [
  `DROP TABLE IF EXISTS \`${ACCOUNT_TEMPLATE_APPLICATIONS_TABLE_NAME}\``,
];

export async function ensureAccountTemplateSchema(database: Database): Promise<void> {
  for (const statement of ACCOUNT_TEMPLATE_DDL) {
    await database.execute(sql.raw(statement));
  }
}
