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
import { FISCAL_YEAR_STATUS_VALUES } from '../../domain/value-objects/fiscal-year-status.js';
import { FISCAL_PERIOD_DDL } from './fiscal-period.schema.js';

/**
 * The fiscal year table (FIS-002; design section 6).
 *
 * This table belongs to the accounting module, and only that module reaches
 * it: the Drizzle table object, the adapter and the DDL all live inside the
 * module's `infrastructure/persistence/`, and no other module may import any
 * of them (ADR-003 section 4; enforced by `src/modules/module-boundaries.spec.ts`).
 *
 * Columns are exactly the fiscal year-level information this stage requires:
 *
 * - `id` — the stable UUID identity. Primary key, so an id is never reused.
 * - `tenant_id` — the owning tenant, **NOT NULL**. The overlap rule is scoped
 *   by it, and the index below leads with it, so the overlap probe narrows to
 *   one company's handful of years.
 * - `label` — the human name, bounded to match `FiscalYearLabel` and unique
 *   per tenant, so `FY2024` means one year in one company.
 * - `start_date` / `end_date` — the inclusive range, both `DATE` civil days
 *   with no time and no timezone.
 * - `status` — the two-state lifecycle, a `NOT NULL` enum so storage can never
 *   hold a state the domain does not define.
 * - `revision` — the optimistic-concurrency token (SHR-008).
 * - `created_at` / `updated_at` — UTC instants.
 *
 * Three constraints carry the ticket's rules at the storage layer:
 *
 * - `UNIQUE (tenant_id, label)` — one name per company.
 * - `KEY (tenant_id, start_date, end_date)` — serves the overlap probe.
 * - `CHECK (start_date < end_date)` — the minimum range, enforced by the
 *   database: a zero-length or reversed year cannot be stored even by a write
 *   that bypasses the domain.
 *
 * The cross-row non-overlap rule itself needs more than a `CHECK` (a MySQL
 * `CHECK` sees only its own row), so it is enforced by the two triggers in
 * {@link FISCAL_YEAR_TRIGGER_DDL} — the same predicate as the domain policy,
 * restated so a write that bypasses the application is still refused.
 *
 * There are deliberately no foreign keys: no cross-module foreign keys are
 * allowed (ADR-001 section 5), and the tenant is another module's table.
 */
export const FISCAL_YEAR_TABLE_NAME = 'fiscal_years';

export const fiscalYears = mysqlTable(
  FISCAL_YEAR_TABLE_NAME,
  {
    id: varchar('id', { length: 64 }).primaryKey(),
    tenantId: varchar('tenant_id', { length: 64 }).notNull(),
    label: varchar('label', { length: 100 }).notNull(),
    // `mode: 'string'` keeps the civil day as `YYYY-MM-DD` text: a JS `Date`
    // would attach a timezone to a day that deliberately has none, and a date
    // written in Tehran and stored in UTC must not shift by a day either way.
    startDate: date('start_date', { mode: 'string' }).notNull(),
    endDate: date('end_date', { mode: 'string' }).notNull(),
    status: mysqlEnum('status', FISCAL_YEAR_STATUS_VALUES).notNull(),
    revision: int('revision').notNull(),
    createdAt: datetime('created_at', { fsp: 3 }).notNull(),
    updatedAt: datetime('updated_at', { fsp: 3 }).notNull(),
  },
  (table) => [
    unique('fiscal_years_tenant_label_unique').on(table.tenantId, table.label),
    index('fiscal_years_tenant_range_index').on(table.tenantId, table.startDate, table.endDate),
    check('fiscal_years_range_check', sql`start_date < end_date`),
  ],
);

/**
 * The fiscal year schema as versioned, reviewable DDL (doc 07: migrations are
 * owned, versioned and reviewable, and constraints are enforced in the
 * database too).
 *
 * It mirrors `fiscalYears` statement for statement — the Drizzle table is the
 * type-level truth, this is the executable one. Idempotent (`IF NOT EXISTS`),
 * so provisioning runs safely on any environment, any number of times.
 */
export const FISCAL_YEAR_SCHEMA_VERSION = 1;

export const FISCAL_YEAR_DDL: readonly string[] = [
  `CREATE TABLE IF NOT EXISTS ${FISCAL_YEAR_TABLE_NAME} (
    id VARCHAR(64) NOT NULL,
    tenant_id VARCHAR(64) NOT NULL,
    label VARCHAR(100) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status ENUM('open','closed') NOT NULL,
    revision INT NOT NULL,
    created_at DATETIME(3) NOT NULL,
    updated_at DATETIME(3) NOT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY fiscal_years_tenant_label_unique (tenant_id, label),
    KEY fiscal_years_tenant_range_index (tenant_id, start_date, end_date),
    CONSTRAINT fiscal_years_range_check CHECK (start_date < end_date)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
];

/**
 * The overlap triggers — the database's own copy of the domain rule (design
 * section 6.2).
 *
 * MySQL has no `EXCLUDE` constraint and a `CHECK` cannot see other rows, so a
 * cross-row rule can only be enforced procedurally. Two `BEFORE` triggers, one
 * per write path, refuse any year of the same tenant that shares a day with an
 * existing one — the exact predicate of `FiscalYearOverlapPolicy`:
 *
 * ```sql
 * tenant_id = NEW.tenant_id AND id <> NEW.id
 *   AND start_date <= NEW.end_date AND end_date >= NEW.start_date
 * ```
 *
 * `id <> NEW.id` excludes the row being updated from its own check, so a year
 * may be updated in place without colliding with itself. The refusal is
 * `SIGNAL SQLSTATE '45000'` with the message `FISCAL_YEAR_OVERLAP`, which the
 * adapter recognises and translates (the same vocabulary the domain uses, so
 * the two implementations stay pinned together by the integration test).
 *
 * Each trigger is written as a **single statement**: the drizzle MySQL
 * migrator splits a file on `--> statement-breakpoint` and sends one statement
 * per chunk, so a `BEGIN … END` body must never be split, and `DELIMITER` — a
 * mysql-client directive — is deliberately not used. MySQL has no
 * `CREATE TRIGGER IF NOT EXISTS`, so each creation is preceded by
 * `DROP TRIGGER IF EXISTS`: idempotent, and it never drops a table.
 */
export const FISCAL_YEAR_TRIGGER_DDL: readonly string[] = [
  `DROP TRIGGER IF EXISTS fiscal_years_no_overlap_insert`,
  `CREATE TRIGGER fiscal_years_no_overlap_insert BEFORE INSERT ON ${FISCAL_YEAR_TABLE_NAME}
FOR EACH ROW
BEGIN
  IF EXISTS (
    SELECT 1 FROM ${FISCAL_YEAR_TABLE_NAME}
    WHERE tenant_id = NEW.tenant_id
      AND id <> NEW.id
      AND start_date <= NEW.end_date
      AND end_date >= NEW.start_date
  ) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'FISCAL_YEAR_OVERLAP';
  END IF;
END`,
  `DROP TRIGGER IF EXISTS fiscal_years_no_overlap_update`,
  `CREATE TRIGGER fiscal_years_no_overlap_update BEFORE UPDATE ON ${FISCAL_YEAR_TABLE_NAME}
FOR EACH ROW
BEGIN
  IF EXISTS (
    SELECT 1 FROM ${FISCAL_YEAR_TABLE_NAME}
    WHERE tenant_id = NEW.tenant_id
      AND id <> NEW.id
      AND start_date <= NEW.end_date
      AND end_date >= NEW.start_date
  ) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'FISCAL_YEAR_OVERLAP';
  END IF;
END`,
];

/**
 * Applies the accounting schema this ticket owns. Safe to call repeatedly:
 * every table statement is idempotent, every trigger is dropped-then-created,
 * nothing is dropped as a table and no data is rewritten (doc 07 — a
 * destructive migration without a recovery plan is not allowed).
 *
 * @remarks Creating a trigger requires `log_bin_trust_function_creators=1`
 * (or `SUPER`) on a MySQL server with binary logging on — the deployment
 * requirement recorded in the design, section 6.4; `docker-compose.yml` sets
 * it for local development.
 */
export async function ensureAccountingSchema(database: Database): Promise<void> {
  for (const statement of [
    ...FISCAL_YEAR_DDL,
    ...FISCAL_PERIOD_DDL,
    ...FISCAL_YEAR_TRIGGER_DDL,
  ]) {
    await database.execute(sql.raw(statement));
  }
}
