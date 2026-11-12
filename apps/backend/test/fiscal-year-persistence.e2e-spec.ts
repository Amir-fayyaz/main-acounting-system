import { randomUUID } from 'node:crypto';
import { env } from 'node:process';

import { drizzle } from 'drizzle-orm/mysql2';
import { createPool, type Pool } from 'mysql2/promise';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { AppConfigService } from '../src/infrastructure/config/app-config.service.js';
import { loadConfiguration } from '../src/infrastructure/config/configuration.js';
import { loadDotEnvFiles } from '../src/infrastructure/config/dotenv.js';
import type { Database } from '../src/infrastructure/database/database.module.js';
import { DrizzleTransactionRunner } from '../src/infrastructure/database/drizzle-transaction-runner.js';
import { CreateFiscalYearUseCase } from '../src/modules/accounting/application/use-cases/create-fiscal-year.use-case.js';
import { CreateFiscalYear } from '../src/modules/accounting/application/commands/create-fiscal-year.command.js';
import { FiscalYear } from '../src/modules/accounting/domain/aggregates/fiscal-year.js';
import { fiscalYearIdFrom } from '../src/modules/accounting/domain/value-objects/fiscal-year-id.js';
import { FiscalYearLabel } from '../src/modules/accounting/domain/value-objects/fiscal-year-label.js';
import { FiscalYearRange } from '../src/modules/accounting/domain/value-objects/fiscal-year-range.js';
import { tenantReferenceFrom } from '../src/modules/accounting/domain/value-objects/tenant-reference.js';
import { DrizzleFiscalYearRepository } from '../src/modules/accounting/infrastructure/persistence/drizzle-fiscal-year.repository.js';
import { DrizzleFiscalPeriodRepository } from '../src/modules/accounting/infrastructure/persistence/drizzle-fiscal-period.repository.js';
import { DrizzleActivePeriodRepository } from '../src/modules/accounting/infrastructure/persistence/drizzle-active-period.repository.js';
import {
  FISCAL_PERIODS_TABLE_NAME,
  TENANT_ACTIVE_PERIODS_TABLE_NAME,
} from '../src/modules/accounting/infrastructure/persistence/fiscal-period.schema.js';
import { GenerateFiscalPeriodsUseCase } from '../src/modules/accounting/application/use-cases/generate-fiscal-periods.use-case.js';
import {
  ensureAccountingSchema,
  FISCAL_YEAR_TABLE_NAME,
} from '../src/modules/accounting/infrastructure/persistence/fiscal-year.schema.js';
import { BusinessDate } from '../src/shared/time/business-date.js';
import { DateTime } from '../src/shared/time/date-time.js';
import { createTenantContext } from '../src/shared/tenant/tenant-context.js';
import { TenantScope } from '../src/shared/tenant/tenant-scope.js';
import {
  TenantContextMissingError,
  TenantIsolationViolationError,
} from '../src/shared/tenant/tenant.errors.js';
import type { TransactionBoundary } from '../src/shared/transaction/transaction-boundary.js';
import { createTransactionBoundary } from '../src/shared/transaction/transaction-boundary.js';
import {
  aFiscalYear,
  RecordingFiscalYearEvents,
} from './support/accounting-doubles.js';

/**
 * Fiscal year persistence against a real MySQL server (FIS-002).
 *
 * The unit and application tests prove the domain rule and the use case over
 * an in-memory repository; these prove the parts only a real server can:
 *
 * - **the database refuses an overlap even when the domain is bypassed** — a
 *   raw `INSERT`/`UPDATE` that never touched the application is stopped by the
 *   triggers, with the same `FISCAL_YEAR_OVERLAP` vocabulary the domain uses;
 * - adjacency, cross-tenant ranges, the range `CHECK` and the per-tenant label
 *   unique key behave exactly as the design recorded them;
 * - **tenant isolation**: with tenant A's scope, tenant B's years cannot be
 *   listed, read by id, nor written;
 * - the migration's triggers are live (`SHOW TRIGGERS`).
 *
 * Opt-in, so the required quality gate still runs without infrastructure:
 *
 * ```bash
 * pnpm infra:up
 * MYSQL_INTEGRATION=1 pnpm --filter @accounting-saas/backend test
 * ```
 *
 * The schema is applied by `ensureAccountingSchema` (the module's idempotent
 * DDL, triggers included) on top of the migrated database, and the table is
 * dropped afterwards, so the run leaves no migration implied.
 */
const integrationEnabled = env.MYSQL_INTEGRATION === '1';

const TABLE = FISCAL_YEAR_TABLE_NAME;

const TENANT_A = '018f0d3c-6d0f-7a4b-9d4e-2b3c4d5e6f70';
const TENANT_B = '018f0d3d-6d0f-7a4b-9d4e-2b3c4d5e6f71';

/** Runs `work` inside the scope of one tenant. */
function inTenant<T>(tenantId: string, work: () => Promise<T>): Promise<T> {
  return TenantScope.run(createTenantContext(tenantId), work);
}

describe.skipIf(!integrationEnabled)('fiscal year persistence (integration)', () => {
  let pool: Pool;
  let database: Database;
  let boundary: TransactionBoundary;
  let repository: DrizzleFiscalYearRepository;
  let periodRepository: DrizzleFiscalPeriodRepository;
  let createFiscalYearUseCase: CreateFiscalYearUseCase;

  beforeAll(async () => {
    loadDotEnvFiles();

    const config = new AppConfigService(
      loadConfiguration({
        NODE_ENV: 'test',
        MYSQL_HOST: env.MYSQL_HOST,
        MYSQL_PORT: env.MYSQL_PORT,
        MYSQL_DATABASE: env.MYSQL_DATABASE,
        MYSQL_USER: env.MYSQL_USER,
        MYSQL_PASSWORD: env.MYSQL_PASSWORD,
      }),
    );

    pool = createPool({
      host: config.database.host,
      port: config.database.port,
      user: config.database.user,
      password: config.database.password,
      database: config.database.name,
      connectionLimit: 10,
      waitForConnections: true,
      queueLimit: 0,
      timezone: 'Z',
    });

    database = drizzle(pool);
    await ensureAccountingSchema(database);

    repository = new DrizzleFiscalYearRepository(database);
    periodRepository = new DrizzleFiscalPeriodRepository(database);
    const activePeriodRepository = new DrizzleActivePeriodRepository(database);
    boundary = createTransactionBoundary(new DrizzleTransactionRunner(database));
    // The real use case under the real schema: creating a year generates its
    // periods in the same transaction (FIS-004).
    createFiscalYearUseCase = new CreateFiscalYearUseCase(
      repository,
      new RecordingFiscalYearEvents(),
      boundary,
      new GenerateFiscalPeriodsUseCase(
        repository,
        periodRepository,
        activePeriodRepository,
        new RecordingFiscalYearEvents(),
        boundary,
      ),
      { record: async () => undefined },
    );
  });

  beforeEach(async () => {
    await pool.query(`DELETE FROM ${TABLE}`);
    await pool.query(`DELETE FROM ${FISCAL_PERIODS_TABLE_NAME}`);
    await pool.query(`DELETE FROM ${TENANT_ACTIVE_PERIODS_TABLE_NAME}`);
  });

  afterAll(async () => {
    if (pool !== undefined) {
      await pool.query(`DROP TABLE IF EXISTS ${FISCAL_PERIODS_TABLE_NAME}`);
      await pool.query(`DROP TABLE IF EXISTS ${TENANT_ACTIVE_PERIODS_TABLE_NAME}`);
      await pool.query(`DROP TABLE IF EXISTS ${TABLE}`);
      await pool.query('DROP TRIGGER IF EXISTS fiscal_years_no_overlap_insert');
      await pool.query('DROP TRIGGER IF EXISTS fiscal_years_no_overlap_update');
      await pool.end();
    }
  });

  /**
   * A raw `INSERT` that never touches the domain, the use case or the adapter
   * — the write a bypassing script, a future migration or another tool would
   * perform. The database alone must refuse an overlap.
   */
  async function rawInsert(
    tenantId: string,
    label: string,
    startDate: string,
    endDate: string,
  ): Promise<void> {
    await pool.query(
      `INSERT INTO ${TABLE}
         (id, tenant_id, label, start_date, end_date, status, revision, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, 'open', 1, UTC_TIMESTAMP(3), UTC_TIMESTAMP(3))`,
      [randomUUID(), tenantId, label, startDate, endDate],
    );
  }

  describe('the migration’s triggers are live', () => {
    it('installed both overlap triggers', async () => {
      const [rows] = await pool.query(`SHOW TRIGGERS LIKE '${TABLE}'`);
      const names = (rows as Array<{ Trigger: string }>).map((row) => row.Trigger).sort();

      expect(names).toEqual(['fiscal_years_no_overlap_insert', 'fiscal_years_no_overlap_update']);
    });
  });

  describe('the use case against real MySQL', () => {
    it('creates a Jalali year with its periods and round-trips it through the repository', async () => {
      const events = new RecordingFiscalYearEvents();
      const create = createFiscalYearUseCase;

      const created = await inTenant(TENANT_A, () =>
        create.execute(
          new CreateFiscalYear({
            label: 'FY1405',
            startDate: '2026-03-21',
            endDate: '2027-03-20',
          }),
        ),
      );

      expect(created.isOk()).toBe(true);
      const view = created.valueOrThrow();
      expect(view).toMatchObject({
        tenantId: TENANT_A,
        label: 'FY1405',
        startDate: '2026-03-21',
        endDate: '2027-03-20',
        status: 'open',
        revision: 1,
      });
      expect(events.recorded.map((event) => event.name)).toEqual(['FiscalYearCreated']);

      const stored = await inTenant(TENANT_A, () => repository.get(fiscalYearIdFrom(view.id)));
      expect(stored?.revision.value).toBe(1);
      expect(stored?.aggregate.label.value).toBe('FY1405');
      expect(stored?.aggregate.range.startDate.toIsoString()).toBe('2026-03-21');

      // The twelve monthly periods are stored, in sequence and in the year's
      // own bounds.
      const periods = await inTenant(TENANT_A, () =>
        periodRepository.findByYear(fiscalYearIdFrom(view.id), tenantReferenceFrom(TENANT_A)),
      );
      expect(periods).toHaveLength(12);
      expect(
        periods.map((p) => [p.aggregate.sequence, p.aggregate.range.startDate.toIsoString(), p.aggregate.range.endDate.toIsoString()]),
      ).toEqual([
        // Months 1-6 have 31 days, months 7-11 have 30, Esfand has 29 in
        // the non-leap 1405 (FIS-003).
        [1, '2026-03-21', '2026-04-20'],
        [2, '2026-04-21', '2026-05-21'],
        [3, '2026-05-22', '2026-06-21'],
        [4, '2026-06-22', '2026-07-22'],
        [5, '2026-07-23', '2026-08-22'],
        [6, '2026-08-23', '2026-09-22'],
        [7, '2026-09-23', '2026-10-22'],
        [8, '2026-10-23', '2026-11-21'],
        [9, '2026-11-22', '2026-12-21'],
        [10, '2026-12-22', '2027-01-20'],
        [11, '2027-01-21', '2027-02-19'],
        [12, '2027-02-20', '2027-03-20'],
      ]);
    });

    it('refuses an overlapping year through the domain and writes nothing', async () => {
      const create = createFiscalYearUseCase;

      await inTenant(TENANT_A, () =>
        create.execute(
          new CreateFiscalYear({
            label: 'FY1405',
            startDate: '2026-03-21',
            endDate: '2027-03-20',
          }),
        ),
      );

      const declined = await inTenant(TENANT_A, () =>
        create.execute(
          new CreateFiscalYear({
            label: 'H2-1405',
            startDate: '2026-10-01',
            endDate: '2027-10-01',
          }),
        ),
      );

      expect(declined.errorOrThrow()?.code).toBe('FISCAL_YEAR_OVERLAP');

      const [rows] = await pool.query(`SELECT COUNT(*) AS count FROM ${TABLE}`);
      expect(Number((rows as Array<{ count: number }>)[0].count)).toBe(1);
    });
  });

  describe('the database refuses an overlap even when the domain is bypassed', () => {
    it('refuses a raw INSERT overlapping an existing year of the same tenant', async () => {
      await rawInsert(TENANT_A, 'FY2024', '2024-01-01', '2024-12-31');

      const attempt = rawInsert(TENANT_A, 'H2-2024', '2024-06-01', '2025-06-30');

      await expect(attempt).rejects.toMatchObject({
        code: 'ER_SIGNAL_EXCEPTION',
        message: 'FISCAL_YEAR_OVERLAP',
      });
    });

    it('refuses a raw INSERT sharing exactly one day with an existing year', async () => {
      await rawInsert(TENANT_A, 'FY2024', '2024-01-01', '2024-12-31');

      // The inclusive end: 2024-12-31 belongs to both ranges.
      await expect(
        rawInsert(TENANT_A, 'FY2025', '2024-12-31', '2025-12-31'),
      ).rejects.toMatchObject({ code: 'ER_SIGNAL_EXCEPTION', message: 'FISCAL_YEAR_OVERLAP' });
    });

    it('refuses a raw UPDATE that would create an overlap, keeping the row unchanged', async () => {
      await rawInsert(TENANT_A, 'FY2024', '2024-01-01', '2024-12-31');
      await rawInsert(TENANT_A, 'FY2026', '2026-01-01', '2026-12-31');

      const move = pool.query(
        `UPDATE ${TABLE} SET start_date = '2024-06-01', end_date = '2027-06-30' WHERE label = 'FY2026'`,
      );

      await expect(move).rejects.toMatchObject({
        code: 'ER_SIGNAL_EXCEPTION',
        message: 'FISCAL_YEAR_OVERLAP',
      });

      const [rows] = await pool.query(
        `SELECT start_date, end_date FROM ${TABLE} WHERE label = 'FY2026'`,
      );
      // The raw pool returns DATE columns as instants; the pool runs in UTC, so
      // the civil day is recovered by slicing the ISO text.
      const stored = (rows as Array<{ start_date: Date; end_date: Date }>)[0];
      expect(stored?.start_date.toISOString().slice(0, 10)).toBe('2026-01-01');
      expect(stored?.end_date.toISOString().slice(0, 10)).toBe('2026-12-31');
    });

    it('keeps blocking with a closed year — closure is not an exemption', async () => {
      await rawInsert(TENANT_A, 'FY2024', '2024-01-01', '2024-12-31');
      await pool.query(`UPDATE ${TABLE} SET status = 'closed' WHERE label = 'FY2024'`);

      await expect(
        rawInsert(TENANT_A, 'Copy', '2024-01-01', '2024-12-31'),
      ).rejects.toMatchObject({ code: 'ER_SIGNAL_EXCEPTION', message: 'FISCAL_YEAR_OVERLAP' });
    });

    it('allows adjacent years of the same tenant — no common day', async () => {
      await rawInsert(TENANT_A, 'FY2024', '2024-01-01', '2024-12-31');
      await rawInsert(TENANT_A, 'FY2025', '2025-01-01', '2025-12-31');

      const [rows] = await pool.query(`SELECT COUNT(*) AS count FROM ${TABLE}`);
      expect(Number((rows as Array<{ count: number }>)[0].count)).toBe(2);
    });

    it('allows the same range for a different tenant', async () => {
      await rawInsert(TENANT_A, 'FY2024', '2024-01-01', '2024-12-31');
      await rawInsert(TENANT_B, 'FY2024', '2024-01-01', '2024-12-31');

      const [rows] = await pool.query(`SELECT COUNT(*) AS count FROM ${TABLE}`);
      expect(Number((rows as Array<{ count: number }>)[0].count)).toBe(2);
    });
  });

  describe('the table’s own constraints', () => {
    it('refuses a range whose start is not before its end (CHECK)', async () => {
      await expect(
        rawInsert(TENANT_A, 'Backwards', '2025-01-01', '2024-12-31'),
      ).rejects.toMatchObject({ code: 'ER_CHECK_CONSTRAINT_VIOLATED' });

      await expect(
        rawInsert(TENANT_A, 'One day', '2024-01-01', '2024-01-01'),
      ).rejects.toMatchObject({ code: 'ER_CHECK_CONSTRAINT_VIOLATED' });
    });

    it('refuses a duplicate label within one tenant and allows the same label across tenants', async () => {
      await rawInsert(TENANT_A, 'FY2024', '2024-01-01', '2024-12-31');

      await expect(
        rawInsert(TENANT_A, 'FY2024', '2025-01-01', '2025-12-31'),
      ).rejects.toMatchObject({ code: 'ER_DUP_ENTRY' });

      await rawInsert(TENANT_B, 'FY2024', '2025-01-01', '2025-12-31');
    });
  });

  describe('tenant isolation', () => {
    async function seedYear(
      tenantId: string,
      label: string,
      startDate: string,
      endDate: string,
    ): Promise<FiscalYear> {
      const fiscalYear = aFiscalYear(
        tenantReferenceFrom(tenantId),
        label,
        startDate,
        endDate,
        DateTime.parse('2026-10-03T08:00:00.000Z'),
      );
      await inTenant(tenantId, () => repository.add(fiscalYear));
      return fiscalYear;
    }

    it('lists only the scope’s own years', async () => {
      await seedYear(TENANT_A, 'FY-A', '2024-01-01', '2024-12-31');
      await seedYear(TENANT_B, 'FY-B', '2024-01-01', '2024-12-31');

      const years = await inTenant(TENANT_A, () =>
        repository.findByTenant(tenantReferenceFrom(TENANT_A)),
      );

      expect(years.map((year) => year.aggregate.label.value)).toEqual(['FY-A']);
    });

    it('cannot read another tenant’s year by id — it is simply not there', async () => {
      const foreign = await seedYear(TENANT_B, 'FY-B', '2024-01-01', '2024-12-31');

      const read = await inTenant(TENANT_A, () => repository.get(foreign.id));

      expect(read).toBeUndefined();
    });

    it('refuses to list another tenant’s years by criterion', async () => {
      await expect(
        inTenant(TENANT_A, () => repository.findByTenant(tenantReferenceFrom(TENANT_B))),
      ).rejects.toBeInstanceOf(TenantIsolationViolationError);
    });

    it('refuses to store another tenant’s year', async () => {
      const foreign = FiscalYear.create({
        tenantId: tenantReferenceFrom(TENANT_B),
        label: FiscalYearLabel.from('Sneaky'),
        range: FiscalYearRange.of(
          BusinessDate.parse('2030-01-01'),
          BusinessDate.parse('2030-12-31'),
        ),
        now: DateTime.parse('2026-10-03T08:00:00.000Z'),
      });

      await expect(inTenant(TENANT_A, () => repository.add(foreign))).rejects.toBeInstanceOf(
        TenantIsolationViolationError,
      );

      const [rows] = await pool.query(`SELECT COUNT(*) AS count FROM ${TABLE}`);
      expect(Number((rows as Array<{ count: number }>)[0].count)).toBe(0);
    });

    it('refuses every tenant-scoped read with no scope at all — fail closed', async () => {
      await expect(
        repository.findByTenant(tenantReferenceFrom(TENANT_A)),
      ).rejects.toBeInstanceOf(TenantContextMissingError);
    });
  });
});
