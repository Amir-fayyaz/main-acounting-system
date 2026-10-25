import { randomUUID } from 'node:crypto';
import { env } from 'node:process';

import { drizzle } from 'drizzle-orm/mysql2';
import { createPool, type Pool } from 'mysql2/promise';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { AppConfigService } from '../src/infrastructure/config/app-config.service.js';
import { loadConfiguration } from '../src/infrastructure/config/configuration.js';
import { loadDotEnvFiles } from '../src/infrastructure/config/dotenv.js';
import { DrizzleTransactionRunner } from '../src/infrastructure/database/drizzle-transaction-runner.js';
import { GenerateFiscalPeriods } from '../src/modules/accounting/application/commands/generate-fiscal-periods.command.js';
import { SelectActivePeriod } from '../src/modules/accounting/application/commands/select-active-period.command.js';
import { GenerateFiscalPeriodsUseCase } from '../src/modules/accounting/application/use-cases/generate-fiscal-periods.use-case.js';
import { SelectActivePeriodUseCase } from '../src/modules/accounting/application/use-cases/select-active-period.use-case.js';
import { FiscalYear } from '../src/modules/accounting/domain/aggregates/fiscal-year.js';
import { FiscalYearLabel } from '../src/modules/accounting/domain/value-objects/fiscal-year-label.js';
import { FiscalYearRange } from '../src/modules/accounting/domain/value-objects/fiscal-year-range.js';
import { fiscalPeriodIdFrom } from '../src/modules/accounting/domain/value-objects/fiscal-period-id.js';
import { tenantReferenceFrom } from '../src/modules/accounting/domain/value-objects/tenant-reference.js';
import { DrizzleFiscalYearRepository } from '../src/modules/accounting/infrastructure/persistence/drizzle-fiscal-year.repository.js';
import { DrizzleFiscalPeriodRepository } from '../src/modules/accounting/infrastructure/persistence/drizzle-fiscal-period.repository.js';
import { DrizzleActivePeriodRepository } from '../src/modules/accounting/infrastructure/persistence/drizzle-active-period.repository.js';
import {
  ensureAccountingSchema,
  FISCAL_YEAR_TABLE_NAME,
} from '../src/modules/accounting/infrastructure/persistence/fiscal-year.schema.js';
import {
  FISCAL_PERIODS_TABLE_NAME,
  TENANT_ACTIVE_PERIODS_TABLE_NAME,
} from '../src/modules/accounting/infrastructure/persistence/fiscal-period.schema.js';
import { createTenantContext } from '../src/shared/tenant/tenant-context.js';
import {
  TenantContextMissingError,
  TenantIsolationViolationError,
} from '../src/shared/tenant/tenant.errors.js';
import { TenantScope } from '../src/shared/tenant/tenant-scope.js';
import { createTransactionBoundary, type TransactionBoundary } from '../src/shared/transaction/transaction-boundary.js';
import { BusinessDate } from '../src/shared/time/business-date.js';
import { DateTime } from '../src/shared/time/date-time.js';

/**
 * Fiscal period persistence against a real MySQL server (FIS-004).
 *
 * The unit and application tests prove the generation rule and the use cases
 * over in-memory repositories; these prove the parts only a real server can:
 *
 * - **generation lands as twelve contiguous rows** and is idempotent at the
 *   storage level — the unique `(tenant_id, fiscal_year_id, sequence)` key
 *   refuses a duplicate month even for a bypassing raw `INSERT`;
 * - **the active-period rule holds under concurrency**: two simultaneous
 *   "select active" requests leave exactly one pointer row, and selecting a
 *   period other than the active one moves the flag;
 * - tenant isolation: company A cannot read, list, generate or activate for
 *   company B, and nothing runs with no tenant scope at all.
 *
 * Opt-in, so the required quality gate still runs without infrastructure:
 *
 * ```bash
 * pnpm infra:up
 * MYSQL_INTEGRATION=1 pnpm --filter @accounting-saas/backend test
 * ```
 */
const integrationEnabled = env.MYSQL_INTEGRATION === '1';

const TENANT_A = '018f0d3c-6d0f-7a4b-9d4e-2b3c4d5e6f70';
const TENANT_B = '018f0d3d-6d0f-7a4b-9d4e-2b3c4d5e6f71';

/** Runs `work` inside the scope of one tenant. */
function inTenant<T>(tenantId: string, work: () => Promise<T>): Promise<T> {
  return TenantScope.run(createTenantContext(tenantId), work);
}

describe.skipIf(!integrationEnabled)('fiscal period persistence (integration)', () => {
  let pool: Pool;
  let boundary: TransactionBoundary;
  let fiscalYears: DrizzleFiscalYearRepository;
  let periods: DrizzleFiscalPeriodRepository;
  let activePeriods: DrizzleActivePeriodRepository;
  let generate: GenerateFiscalPeriodsUseCase;
  let selectActive: SelectActivePeriodUseCase;

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

    const database = drizzle(pool);
    await ensureAccountingSchema(database);

    fiscalYears = new DrizzleFiscalYearRepository(database);
    periods = new DrizzleFiscalPeriodRepository(database);
    activePeriods = new DrizzleActivePeriodRepository(database);
    boundary = createTransactionBoundary(new DrizzleTransactionRunner(database));
    generate = new GenerateFiscalPeriodsUseCase(
      fiscalYears,
      periods,
      activePeriods,
      { record: async () => undefined },
      boundary,
    );
    selectActive = new SelectActivePeriodUseCase(
      periods,
      activePeriods,
      { record: async () => undefined },
      boundary,
    );
  });

  beforeEach(async () => {
    await pool.query(`DELETE FROM ${FISCAL_PERIODS_TABLE_NAME}`);
    await pool.query(`DELETE FROM ${TENANT_ACTIVE_PERIODS_TABLE_NAME}`);
    await pool.query(`DELETE FROM ${FISCAL_YEAR_TABLE_NAME}`);
  });

  afterAll(async () => {
    if (pool !== undefined) {
      await pool.query(`DROP TABLE IF EXISTS ${FISCAL_PERIODS_TABLE_NAME}`);
      await pool.query(`DROP TABLE IF EXISTS ${TENANT_ACTIVE_PERIODS_TABLE_NAME}`);
      await pool.end();
    }
  });

  /** Seeds one fiscal year for the tenant, through the real adapter. */
  async function seedYear(tenantId: string, label = 'FY1405'): Promise<FiscalYear> {
    const year = FiscalYear.create({
      tenantId: tenantReferenceFrom(tenantId),
      label: FiscalYearLabel.from(label),
      range: FiscalYearRange.of(
        BusinessDate.parse('2026-03-21'),
        BusinessDate.parse('2027-03-20'),
      ),
      now: DateTime.parse('2026-10-03T08:00:00.000Z'),
    });
    await inTenant(tenantId, () => fiscalYears.add(year));
    return year;
  }

  /**
   * The twelve expected monthly bounds of Jalali year 1405 (non-leap, Esfand
   * has 29 days) — the contiguity acceptance criterion, spelled out.
   */
  const EXPECTED_1405: readonly [number, string, string][] = [
    [1, '2026-03-21', '2026-04-19'],
    [2, '2026-04-20', '2026-05-20'],
    [3, '2026-05-21', '2026-06-20'],
    [4, '2026-06-21', '2026-07-21'],
    [5, '2026-07-22', '2026-08-21'],
    [6, '2026-08-22', '2026-09-21'],
    [7, '2026-09-22', '2026-10-21'],
    [8, '2026-10-22', '2026-11-20'],
    [9, '2026-11-21', '2026-12-20'],
    [10, '2026-12-21', '2027-01-19'],
    [11, '2027-01-20', '2027-02-18'],
    [12, '2027-02-19', '2027-03-20'],
  ];

  describe('generation against real MySQL', () => {
    it('creates a fiscal year with its twelve contiguous periods', async () => {
      const year = await seedYear(TENANT_A);

      const outcome = await inTenant(TENANT_A, () =>
        generate.execute(new GenerateFiscalPeriods({ fiscalYearId: year.id.value })),
      );

      expect(outcome.isOk()).toBe(true);
      const view = outcome.valueOrThrow();
      expect(view.jalaliYear).toBe(1405);
      expect(
        view.periods.map((p) => [p.sequence, p.startDate, p.endDate]),
      ).toEqual(EXPECTED_1405);

      const stored = await inTenant(TENANT_A, () =>
        periods.findByYear(year.id, tenantReferenceFrom(TENANT_A)),
      );
      expect(stored).toHaveLength(12);
      for (const loaded of stored) {
        expect(loaded.aggregate.state.value).toBe('open');
      }
    });

    it('is idempotent: generating twice changes nothing', async () => {
      const year = await seedYear(TENANT_A);
      await inTenant(TENANT_A, () =>
        generate.execute(new GenerateFiscalPeriods({ fiscalYearId: year.id.value })),
      );
      const first = await pool.query(`SELECT COUNT(*) AS count FROM ${FISCAL_PERIODS_TABLE_NAME}`);
      const countAfterFirst = Number((first[0] as Array<{ count: number }>)[0].count);

      const second = await inTenant(TENANT_A, () =>
        generate.execute(new GenerateFiscalPeriods({ fiscalYearId: year.id.value })),
      );

      expect(second.isOk()).toBe(true);
      const after = await pool.query(`SELECT COUNT(*) AS count FROM ${FISCAL_PERIODS_TABLE_NAME}`);
      expect(Number((after[0] as Array<{ count: number }>)[0].count)).toBe(countAfterFirst);
    });

    it('refuses a duplicate month at the storage level (unique key)', async () => {
      const year = await seedYear(TENANT_A);
      await inTenant(TENANT_A, () =>
        generate.execute(new GenerateFiscalPeriods({ fiscalYearId: year.id.value })),
      );

      const attempt = inTenant(TENANT_A, async () => {
        await pool.query(
          `INSERT INTO ${FISCAL_PERIODS_TABLE_NAME}
             (id, tenant_id, fiscal_year_id, jalali_year, sequence, start_date, end_date, state, revision, created_at, updated_at)
           VALUES (?, ?, ?, 1405, 1, '2026-03-21', '2026-04-19', 'open', 1, UTC_TIMESTAMP(3), UTC_TIMESTAMP(3))`,
          [randomUUID(), TENANT_A, year.id.value],
        );
      });

      await expect(attempt).rejects.toMatchObject({ code: 'ER_DUP_ENTRY' });
    });

    it('refuses a reversed range at the storage level (CHECK)', async () => {
      const year = await seedYear(TENANT_A);

      const attempt = inTenant(TENANT_A, async () => {
        await pool.query(
          `INSERT INTO ${FISCAL_PERIODS_TABLE_NAME}
             (id, tenant_id, fiscal_year_id, jalali_year, sequence, start_date, end_date, state, revision, created_at, updated_at)
           VALUES (?, ?, ?, 1405, 1, '2026-04-19', '2026-03-21', 'open', 1, UTC_TIMESTAMP(3), UTC_TIMESTAMP(3))`,
          [randomUUID(), TENANT_A, year.id.value],
        );
      });

      await expect(attempt).rejects.toMatchObject({
        code: 'ER_CHECK_CONSTRAINT_VIOLATED',
      });
    });
  });

  describe('the active-period rule', () => {
    it('selects an active period and the previous one stops being active', async () => {
      const year = await seedYear(TENANT_A);
      await inTenant(TENANT_A, () =>
        generate.execute(new GenerateFiscalPeriods({ fiscalYearId: year.id.value })),
      );

      // Generation seeded the first period; selecting another moves the flag.
      const stored = await inTenant(TENANT_A, () =>
        periods.findByYear(year.id, tenantReferenceFrom(TENANT_A)),
      );
      const first = stored[0]?.aggregate;
      const sixth = stored[5]?.aggregate;
      if (first === undefined || sixth === undefined) {
        throw new Error('the year must have twelve periods');
      }
      expect(await activePeriod(TENANT_A)).toBe(first.id.value);

      await inTenant(TENANT_A, () =>
        selectActive.execute(new SelectActivePeriod({ periodId: sixth.id.value })),
      );

      expect(await activePeriod(TENANT_A)).toBe(sixth.id.value);
      const [rows] = await pool.query(
        `SELECT COUNT(*) AS count FROM ${TENANT_ACTIVE_PERIODS_TABLE_NAME} WHERE tenant_id = ?`,
        [TENANT_A],
      );
      expect(Number((rows as Array<{ count: number }>)[0].count)).toBe(1);
    });

    it('refuses to select a closed period', async () => {
      const year = await seedYear(TENANT_A);
      await inTenant(TENANT_A, () =>
        generate.execute(new GenerateFiscalPeriods({ fiscalYearId: year.id.value })),
      );
      const stored = await inTenant(TENANT_A, () =>
        periods.findByYear(year.id, tenantReferenceFrom(TENANT_A)),
      );
      const first = stored[0]?.aggregate;
      if (first === undefined) {
        throw new Error('the year must have twelve periods');
      }
      await pool.query(
        `UPDATE ${FISCAL_PERIODS_TABLE_NAME} SET state = 'closed' WHERE id = ?`,
        [first.id.value],
      );

      const outcome = await inTenant(TENANT_A, () =>
        selectActive.execute(new SelectActivePeriod({ periodId: first.id.value })),
      );

      expect(outcome.errorOrThrow()?.code).toBe('FISCAL_PERIOD_NOT_OPEN');
    });

    it('leaves exactly one active period under two concurrent selections', async () => {
      const year = await seedYear(TENANT_A);
      await inTenant(TENANT_A, () =>
        generate.execute(new GenerateFiscalPeriods({ fiscalYearId: year.id.value })),
      );
      const stored = await inTenant(TENANT_A, () =>
        periods.findByYear(year.id, tenantReferenceFrom(TENANT_A)),
      );
      const third = stored[2]?.aggregate;
      const ninth = stored[8]?.aggregate;
      if (third === undefined || ninth === undefined) {
        throw new Error('the year must have twelve periods');
      }

      // The two requests race through the same single-statement pointer move.
      const [one, two] = await Promise.all([
        inTenant(TENANT_A, () =>
          selectActive.execute(new SelectActivePeriod({ periodId: third.id.value })),
        ),
        inTenant(TENANT_A, () =>
          selectActive.execute(new SelectActivePeriod({ periodId: ninth.id.value })),
        ),
      ]);
      expect(one.isOk()).toBe(true);
      expect(two.isOk()).toBe(true);

      const [rows] = await pool.query(
        `SELECT COUNT(*) AS count FROM ${TENANT_ACTIVE_PERIODS_TABLE_NAME} WHERE tenant_id = ?`,
        [TENANT_A],
      );
      expect(Number((rows as Array<{ count: number }>)[0].count)).toBe(1);

      const winner = await activePeriod(TENANT_A);
      expect(winner === third.id.value || winner === ninth.id.value).toBe(true);
    });
  });

  describe('tenant isolation', () => {
    it('cannot generate another company’s periods', async () => {
      const year = await seedYear(TENANT_B);

      const outcome = await inTenant(TENANT_A, () =>
        generate.execute(new GenerateFiscalPeriods({ fiscalYearId: year.id.value })),
      );

      expect(outcome.errorOrThrow()?.code).toBe('FISCAL_YEAR_NOT_FOUND');
      const [rows] = await pool.query(
        `SELECT COUNT(*) AS count FROM ${FISCAL_PERIODS_TABLE_NAME}`,
      );
      expect(Number((rows as Array<{ count: number }>)[0].count)).toBe(0);
    });

    it('cannot activate for another company’s pointer', async () => {
      await expect(
        inTenant(TENANT_A, () =>
          activePeriods.activate(tenantReferenceFrom(TENANT_B), fiscalPeriodIdFrom(randomUUID())),
        ),
      ).rejects.toBeInstanceOf(TenantIsolationViolationError);
    });

    it('refuses every period read with no scope at all — fail closed', async () => {
      const year = await seedYear(TENANT_A);

      await expect(
        periods.findByYear(year.id, tenantReferenceFrom(TENANT_A)),
      ).rejects.toBeInstanceOf(TenantContextMissingError);
      await expect(
        activePeriods.periodIdFor(tenantReferenceFrom(TENANT_A)),
      ).rejects.toBeInstanceOf(TenantContextMissingError);
    });

    it('selects another company’s period successfully — the scope filter rules', async () => {
      const foreignYear = await seedYear(TENANT_B);
      await inTenant(TENANT_B, () =>
        generate.execute(new GenerateFiscalPeriods({ fiscalYearId: foreignYear.id.value })),
      );
      const stored = await inTenant(TENANT_B, () =>
        periods.findByYear(foreignYear.id, tenantReferenceFrom(TENANT_B)),
      );
      const first = stored[0]?.aggregate;
      if (first === undefined) {
        throw new Error('the year must have twelve periods');
      }

      // Tenant A reads tenant B's period: the adapter filters by the ambient
      // scope, so the id simply does not resolve.
      const outcome = await inTenant(TENANT_A, () =>
        selectActive.execute(new SelectActivePeriod({ periodId: first.id.value })),
      );

      expect(outcome.errorOrThrow()?.code).toBe('FISCAL_PERIOD_NOT_FOUND');
      const [rows] = await pool.query(
        `SELECT COUNT(*) AS count FROM ${TENANT_ACTIVE_PERIODS_TABLE_NAME}`,
      );
      expect(Number((rows as Array<{ count: number }>)[0].count)).toBe(0);
    });
  });

  async function activePeriod(tenantId: string): Promise<string | undefined> {
    const [rows] = await pool.query(
      `SELECT period_id FROM ${TENANT_ACTIVE_PERIODS_TABLE_NAME} WHERE tenant_id = ?`,
      [tenantId],
    );
    const row = (rows as Array<{ period_id: string }>)[0];
    return row?.period_id;
  }
});
