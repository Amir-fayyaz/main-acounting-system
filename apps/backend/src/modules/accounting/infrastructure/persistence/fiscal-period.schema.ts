import { sql } from 'drizzle-orm';
import {
  check,
  date,
  datetime,
  index,
  int,
  mysqlEnum,
  mysqlTable,
  unique,
  varchar,
} from 'drizzle-orm/mysql-core';
import type { Database } from '../../../../infrastructure/database/database.module.js';
import { FISCAL_PERIOD_STATE_VALUES } from '../../domain/value-objects/fiscal-period-state.js';

/**
 * The fiscal period tables (FIS-004).
 *
 * These tables belong to the accounting module, and only that module reaches
 * them: the Drizzle table objects, the adapters and the DDL all live inside
 * the module's `infrastructure/persistence/`, and no other module may import
 * any of them (ADR-003 section 4; enforced by `src/modules/module-boundaries.spec.ts`).
 *
 * `fiscal_periods` holds exactly the period-level information this ticket
 * requires:
 *
 * - `id` — the stable UUID identity. Primary key, so an id is never reused.
 * - `tenant_id` — the owning tenant, **NOT NULL**. The active-period rule is
 *   scoped by it, and the index below leads with it.
 * - `fiscal_year_id` — the year the period is a slice of. There are
 *   deliberately no foreign keys: no cross-module foreign keys are allowed
 *   (ADR-001 section 5), and the fiscal year lives in this module too, so the
 *   use case's load-before-write sequence plus the unique key below keep the
 *   reference consistent without one.
 * - `jalali_year` — the Jalali calendar year the month belongs to.
 * - `sequence` — the month position, 1 (Farvardin) through 12 (Esfand).
 * - `start_date` / `end_date` — the inclusive range, both `DATE` civil days
 *   with no time and no timezone (`mode: 'string'`, as for fiscal years — a
 *   JS `Date` would attach a timezone to a day that deliberately has none).
 * - `state` — the two-state lifecycle, a `NOT NULL` enum so storage can never
 *   hold a state the domain does not define.
 * - `revision` — the optimistic-concurrency token (SHR-008).
 * - `created_at` / `updated_at` — UTC instants.
 *
 * Two constraints carry the ticket's rules at the storage layer:
 *
 * - `UNIQUE (tenant_id, fiscal_year_id, sequence)` — one month per year per
 *   company, so a second generation pass and a concurrent sibling generation
 *   both read as the same landing (the storage half of the idempotency rule);
 * - `CHECK (start_date < end_date)` — enforced by the database, so a
 *   zero-length or reversed period cannot be stored even by a write that
 *   bypasses the domain.
 *
 * `tenant_active_periods` is the active-period rule, in its entirety: one row
 * per tenant (`tenant_id` is the primary key), whose `period_id` is the single
 * active period. Its projection — at most one active period per tenant, and a
 * move that swaps old and new in one atomic statement — is enforced by the
 * primary key and the adapter's single upsert statement (`ActivePeriod.select`
 * use case), never by two racing writes.
 */
export const FISCAL_PERIODS_TABLE_NAME = 'fiscal_periods';
export const TENANT_ACTIVE_PERIODS_TABLE_NAME = 'tenant_active_periods';

export const fiscalPeriods = mysqlTable(
  FISCAL_PERIODS_TABLE_NAME,
  {
    id: varchar('id', { length: 64 }).primaryKey(),
    tenantId: varchar('tenant_id', { length: 64 }).notNull(),
    fiscalYearId: varchar('fiscal_year_id', { length: 64 }).notNull(),
    jalaliYear: int('jalali_year').notNull(),
    sequence: int('sequence').notNull(),
    // `mode: 'string'` keeps the civil day as `YYYY-MM-DD` text; a JS `Date`
    // would attach a timezone to a day that deliberately has none.
    startDate: date('start_date', { mode: 'string' }).notNull(),
    endDate: date('end_date', { mode: 'string' }).notNull(),
    state: mysqlEnum('state', FISCAL_PERIOD_STATE_VALUES).notNull(),
    revision: int('revision').notNull(),
    createdAt: datetime('created_at', { fsp: 3 }).notNull(),
    updatedAt: datetime('updated_at', { fsp: 3 }).notNull(),
  },
  (table) => [
    unique('fiscal_periods_year_sequence_unique').on(
      table.tenantId,
      table.fiscalYearId,
      table.sequence,
    ),
    index('fiscal_periods_tenant_year_index').on(table.tenantId, table.fiscalYearId, table.sequence),
    index('fiscal_periods_tenant_range_index').on(table.tenantId, table.startDate, table.endDate),
    check('fiscal_periods_range_check', sql`start_date < end_date`),
  ],
);

export const tenantActivePeriods = mysqlTable(TENANT_ACTIVE_PERIODS_TABLE_NAME, {
  tenantId: varchar('tenant_id', { length: 64 }).primaryKey(),
  periodId: varchar('period_id', { length: 64 }).notNull(),
  updatedAt: datetime('updated_at', { fsp: 3 }).notNull(),
});

/**
 * The fiscal period schema as versioned, reviewable DDL (doc 07: migrations are
 * owned, versioned and reviewable, and constraints are enforced in the
 * database too).
 *
 * It mirrors the table objects statement for statement — the Drizzle tables
 * are the type-level truth, this is the executable one. Idempotent
 * (`IF NOT EXISTS`), so provisioning runs safely on any environment, any
 * number of times.
 */
export const FISCAL_PERIOD_SCHEMA_VERSION = 1;

export const FISCAL_PERIOD_DDL: readonly string[] = [
  `CREATE TABLE IF NOT EXISTS ${FISCAL_PERIODS_TABLE_NAME} (
    id VARCHAR(64) NOT NULL,
    tenant_id VARCHAR(64) NOT NULL,
    fiscal_year_id VARCHAR(64) NOT NULL,
    jalali_year INT NOT NULL,
    sequence INT NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    state ENUM('open','closed') NOT NULL,
    revision INT NOT NULL,
    created_at DATETIME(3) NOT NULL,
    updated_at DATETIME(3) NOT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY fiscal_periods_year_sequence_unique (tenant_id, fiscal_year_id, sequence),
    KEY fiscal_periods_tenant_year_index (tenant_id, fiscal_year_id, sequence),
    KEY fiscal_periods_tenant_range_index (tenant_id, start_date, end_date),
    CONSTRAINT fiscal_periods_range_check CHECK (start_date < end_date)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  `CREATE TABLE IF NOT EXISTS ${TENANT_ACTIVE_PERIODS_TABLE_NAME} (
    tenant_id VARCHAR(64) NOT NULL,
    period_id VARCHAR(64) NOT NULL,
    updated_at DATETIME(3) NOT NULL,
    PRIMARY KEY (tenant_id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
];

/**
 * Applies the period schema this ticket owns. Safe to call repeatedly: every
 * statement is idempotent and no data is rewritten (doc 07 — a destructive
 * migration without a recovery plan is not allowed).
 */
export async function ensureFiscalPeriodSchema(database: Database): Promise<void> {
  for (const statement of FISCAL_PERIOD_DDL) {
    await database.execute(sql.raw(statement));
  }
}
