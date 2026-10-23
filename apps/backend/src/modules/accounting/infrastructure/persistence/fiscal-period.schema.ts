import {
  boolean,
  date,
  datetime,
  index,
  int,
  mysqlEnum,
  mysqlTable,
  unique,
  varchar,
} from 'drizzle-orm/mysql-core';

export const FISCAL_PERIOD_TABLE_NAME = 'fiscal_periods';

export const fiscalPeriods = mysqlTable(
  FISCAL_PERIOD_TABLE_NAME,
  {
    id: varchar('id', { length: 64 }).primaryKey(),
    tenantId: varchar('tenant_id', { length: 64 }).notNull(),
    fiscalYearId: varchar('fiscal_year_id', { length: 64 }).notNull(),
    sequenceNumber: int('sequence_number').notNull(),
    label: varchar('label', { length: 100 }).notNull(),
    startDate: date('start_date', { mode: 'string' }).notNull(),
    endDate: date('end_date', { mode: 'string' }).notNull(),
    status: mysqlEnum('status', ['open', 'closed']).notNull().default('open'),
    isActive: boolean('is_active').notNull().default(false),
    reopenReason: varchar('reopen_reason', { length: 500 }),
    revision: int('revision').notNull().default(1),
    createdAt: datetime('created_at', { fsp: 3 }).notNull(),
    updatedAt: datetime('updated_at', { fsp: 3 }).notNull(),
  },
  (table) => [
    unique('fiscal_periods_year_seq_unique').on(
      table.tenantId,
      table.fiscalYearId,
      table.sequenceNumber,
    ),
    index('fiscal_periods_tenant_year_idx').on(table.tenantId, table.fiscalYearId),
    index('fiscal_periods_tenant_active_idx').on(table.tenantId, table.isActive),
  ],
);
