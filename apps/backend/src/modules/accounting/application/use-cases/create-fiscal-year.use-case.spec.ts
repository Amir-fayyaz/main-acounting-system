import { describe, expect, it } from 'vitest';

import { createTenantContext } from '../../../../shared/tenant/tenant-context.js';
import { TenantScope } from '../../../../shared/tenant/tenant-scope.js';
import { TenantContextMissingError } from '../../../../shared/tenant/tenant.errors.js';
import {
  aFiscalYear,
  databaseRefusedDuplicateLabel,
  databaseRefusedOverlap,
  InMemoryFiscalYearRepository,
  PassthroughTransactionBoundary,
  RecordingFiscalYearEvents,
} from '../../../../../test/support/accounting-doubles.js';
import {
  InMemoryActivePeriodRepository,
  InMemoryFiscalPeriodRepository,
} from '../../../../../test/support/fiscal-period-doubles.js';
import { GenerateFiscalPeriodsUseCase } from './generate-fiscal-periods.use-case.js';
import { fiscalYearIdFrom } from '../../domain/value-objects/fiscal-year-id.js';
import { tenantReferenceFrom } from '../../domain/value-objects/tenant-reference.js';
import { CreateFiscalYear } from '../commands/create-fiscal-year.command.js';
import { CreateFiscalYearUseCase } from './create-fiscal-year.use-case.js';

/**
 * The create-fiscal-year use case over an in-memory repository (FIS-002,
 * design section 8.2). The MySQL-only halves of the contract — the triggers,
 * the unique key and the scope filter in the adapter — are proven in
 * `test/fiscal-year-persistence.e2e-spec.ts`.
 */

const TENANT_A = '018f0d3c-6d0f-7a4b-9d4e-2b3c4d5e6f70';
const TENANT_B = '018f0d3d-6d0f-7a4b-9d4e-2b3c4d5e6f71';

interface Harness {
  readonly repository: InMemoryFiscalYearRepository;
  readonly periodRepository: InMemoryFiscalPeriodRepository;
  readonly activePeriods: InMemoryActivePeriodRepository;
  readonly events: RecordingFiscalYearEvents;
  readonly boundary: PassthroughTransactionBoundary;
  readonly createFiscalYear: CreateFiscalYearUseCase;
}

function harness(): Harness {
  const repository = new InMemoryFiscalYearRepository();
  const periodRepository = new InMemoryFiscalPeriodRepository();
  const activePeriods = new InMemoryActivePeriodRepository();
  const events = new RecordingFiscalYearEvents();
  const boundary = new PassthroughTransactionBoundary();

  const generatePeriods = new GenerateFiscalPeriodsUseCase(
    repository,
    periodRepository,
    activePeriods,
    events,
    boundary,
  );

  return {
    repository,
    periodRepository,
    activePeriods,
    events,
    boundary,
    createFiscalYear: new CreateFiscalYearUseCase(repository, events, boundary, generatePeriods, {
      record: async () => undefined,
    }),
  };
}

/** Runs tenant-scoped work the way the trusted entry point does. */
function inTenant<T>(tenantId: string, work: () => Promise<T>): Promise<T> {
  return TenantScope.run(createTenantContext(tenantId), work);
}

function command(
  payload: { label: string; startDate: string; endDate: string } = {
    label: 'FY1405',
    startDate: '2026-03-21',
    endDate: '2027-03-20',
  },
): CreateFiscalYear {
  return new CreateFiscalYear(payload);
}

describe('CreateFiscalYearUseCase', () => {
  describe('creation', () => {
    it('creates an open year, persists it and records FiscalYearCreated', async () => {
      const app = harness();

      const outcome = await inTenant(TENANT_A, () => app.createFiscalYear.execute(command()));

      expect(outcome.isOk()).toBe(true);
      const view = outcome.valueOrThrow();
      expect(view).toMatchObject({
        tenantId: TENANT_A,
        label: 'FY1405',
        startDate: '2026-03-21',
        endDate: '2027-03-20',
        status: 'open',
        revision: 1,
      });
      expect(view.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
      expect(view.createdAt).toBe(view.updatedAt);
      expect(app.repository.addCalls).toBe(1);
      expect(app.repository.revisionOf(fiscalYearIdFrom(view.id))?.value).toBe(1);

      // Creating a year generates its periods in the same boundary: the year
      // event first, then the periods, then the seeded active pointer (FIS-004).
      expect(app.events.recorded.map((event) => event.name)).toEqual([
        'FiscalYearCreated',
        'FiscalPeriodsGenerated',
        'ActivePeriodSelected',
      ]);
      const event = app.events.recorded[0];
      expect(event?.name).toBe('FiscalYearCreated');
      expect(event?.metadata.tenantId).toBe(TENANT_A);
      expect(event?.data).toMatchObject({
        tenantId: TENANT_A,
        fiscalYearId: view.id,
        label: 'FY1405',
        startDate: '2026-03-21',
        endDate: '2027-03-20',
        status: 'open',
      });
    });

    it('generates the twelve contiguous monthly periods of the year', async () => {
      const app = harness();

      const outcome = await inTenant(TENANT_A, () => app.createFiscalYear.execute(command()));

      expect(outcome.isOk()).toBe(true);
      const yearId = fiscalYearIdFrom(outcome.valueOrThrow().id);
      const periods = app.periodRepository.storedBySequence(tenantReferenceFrom(TENANT_A), yearId);

      expect(periods).toHaveLength(12);
      expect(
        periods.map((period) => [period.sequence, period.range.startDate.toIsoString(), period.range.endDate.toIsoString()]),
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
      for (const period of periods) {
        expect(period.state.value).toBe('open');
      }
      // The tenant has never selected one before, so the first period becomes
      // the active one and stays the only one.
      expect(app.activePeriods.pointerOf(TENANT_A)?.value).toBe(periods[0]?.id.value);
    });

    it('runs the whole operation in one transaction — the generation call joins the open boundary', async () => {
      const app = harness();

      await inTenant(TENANT_A, () => app.createFiscalYear.execute(command()));

      // One `execute` for the creation itself, plus the generation's nested
      // call — which *joins* that transaction instead of opening a second one
      // (transaction-boundary nesting rule): no inner begin, no inner commit.
      expect(app.boundary.executions).toBe(2);
    });

    it('trims the label, so stored and given names cannot diverge', async () => {
      const app = harness();

      const outcome = await inTenant(TENANT_A, () =>
        app.createFiscalYear.execute(
          command({ label: '  FY1405  ', startDate: '2026-03-21', endDate: '2027-03-20' }),
        ),
      );
      expect(outcome.valueOrThrow().label).toBe('FY1405');
    });

    it('accepts the same range for another tenant — the rule is per company', async () => {
      const app = harness();
      app.repository.seed(aFiscalYear(tenantReferenceFrom(TENANT_A)));

      const outcome = await inTenant(TENANT_B, () => app.createFiscalYear.execute(command()));

      expect(outcome.isOk()).toBe(true);
      expect(outcome.valueOrThrow().tenantId).toBe(TENANT_B);
    });

    it('accepts a year adjacent to the tenant’s existing one', async () => {
      const app = harness();
      app.repository.seed(aFiscalYear(tenantReferenceFrom(TENANT_A), 'FY1405'));

      const outcome = await inTenant(TENANT_A, () =>
        app.createFiscalYear.execute(
          command({ label: 'FY1406', startDate: '2027-03-21', endDate: '2028-03-19' }),
        ),
      );

      expect(outcome.isOk()).toBe(true);
    });
  });

  describe('declines — nothing is written', () => {
    it('reports an overlapping year as FISCAL_YEAR_OVERLAP without persisting', async () => {
      const app = harness();
      app.repository.seed(aFiscalYear(tenantReferenceFrom(TENANT_A), 'FY1405'));

      const outcome = await inTenant(TENANT_A, () =>
        app.createFiscalYear.execute(
          command({ label: 'H2', startDate: '2026-10-01', endDate: '2027-10-01' }),
        ),
      );

      expect(outcome.isFail()).toBe(true);
      expect(outcome.errorOrThrow()?.code).toBe('FISCAL_YEAR_OVERLAP');
      expect(outcome.errorOrThrow()?.category).toBe('CONFLICT');
      expect(app.repository.addCalls).toBe(0);
      expect(app.events.recorded).toHaveLength(0);
    });

    it('reports a duplicate label as FISCAL_YEAR_LABEL_DUPLICATE without persisting', async () => {
      const app = harness();
      app.repository.seed(aFiscalYear(tenantReferenceFrom(TENANT_A), 'FY1405'));

      const outcome = await inTenant(TENANT_A, () =>
        app.createFiscalYear.execute(
          command({ label: 'FY1405', startDate: '2027-03-21', endDate: '2028-03-19' }),
        ),
      );

      expect(outcome.errorOrThrow()?.code).toBe('FISCAL_YEAR_LABEL_DUPLICATE');
      expect(outcome.errorOrThrow()?.category).toBe('CONFLICT');
      expect(app.repository.addCalls).toBe(0);
      expect(app.events.recorded).toHaveLength(0);
    });

    it('reports a reversed or zero-length range as FISCAL_YEAR_INVALID_RANGE', async () => {
      const app = harness();

      const reversed = await inTenant(TENANT_A, () =>
        app.createFiscalYear.execute(
          command({ label: 'Backwards', startDate: '2027-03-21', endDate: '2026-03-21' }),
        ),
      );
      const zeroLength = await inTenant(TENANT_A, () =>
        app.createFiscalYear.execute(
          command({ label: 'One day', startDate: '2026-03-21', endDate: '2026-03-21' }),
        ),
      );

      expect(reversed.errorOrThrow()?.code).toBe('FISCAL_YEAR_INVALID_RANGE');
      expect(zeroLength.errorOrThrow()?.code).toBe('FISCAL_YEAR_INVALID_RANGE');
      expect(app.repository.addCalls).toBe(0);
    });

    it('reports a blank or over-long label as a validation failure', async () => {
      const app = harness();

      const blank = await inTenant(TENANT_A, () =>
        app.createFiscalYear.execute(
          command({ label: '   ', startDate: '2026-03-21', endDate: '2027-03-20' }),
        ),
      );
      const tooLong = await inTenant(TENANT_A, () =>
        app.createFiscalYear.execute(
          command({ label: 'x'.repeat(101), startDate: '2026-03-21', endDate: '2027-03-20' }),
        ),
      );

      for (const outcome of [blank, tooLong]) {
        expect(outcome.errorOrThrow()?.code).toBe('VALIDATION_FAILED');
        expect(outcome.errorOrThrow()?.details[0]?.code).toBe('FISCAL_YEAR_LABEL_INVALID');
      }
      expect(app.repository.addCalls).toBe(0);
    });

    it('reports an unparseable date as a validation failure naming the field', async () => {
      const app = harness();

      const outcome = await inTenant(TENANT_A, () =>
        app.createFiscalYear.execute(
          command({ label: 'FY1405', startDate: '01-01-2024', endDate: '2027-03-20' }),
        ),
      );

      expect(outcome.errorOrThrow()?.code).toBe('VALIDATION_FAILED');
      expect(outcome.errorOrThrow()?.details[0]).toMatchObject({
        code: 'FISCAL_YEAR_DATE_INVALID',
        field: 'startDate',
      });
      expect(app.repository.addCalls).toBe(0);
    });

    it('fails closed when no tenant scope is established', async () => {
      const app = harness();

      await expect(app.createFiscalYear.execute(command())).rejects.toBeInstanceOf(
        TenantContextMissingError,
      );
      expect(app.repository.addCalls).toBe(0);
    });

    it('fails closed under the explicit system scope — a year belongs to a company', async () => {
      const app = harness();

      await expect(
        TenantScope.runAsSystem(() => app.createFiscalYear.execute(command())),
      ).rejects.toBeInstanceOf(TenantContextMissingError);
    });
  });

  describe('creating a year whose range is not one Jalali year is refused', () => {
    it('reports FISCAL_PERIOD_STRUCTURE and writes nothing', async () => {
      const app = harness();

      const outcome = await inTenant(TENANT_A, () =>
        app.createFiscalYear.execute(
          command({ label: 'Calendar', startDate: '2024-01-01', endDate: '2024-12-31' }),
        ),
      );

      expect(outcome.isFail()).toBe(true);
      expect(outcome.errorOrThrow()?.code).toBe('FISCAL_PERIOD_STRUCTURE');
      expect(app.repository.addCalls).toBe(0);
      expect(app.periodRepository.addCalls).toBe(0);
      expect(app.events.recorded).toHaveLength(0);
    });
  });

  describe('the database’s own refusal is mapped back to the domain codes', () => {
    it('maps the overlap trigger’s conflict to FISCAL_YEAR_OVERLAP', async () => {
      const app = harness();
      app.repository.nextAddFailure = databaseRefusedOverlap();

      const outcome = await inTenant(TENANT_A, () => app.createFiscalYear.execute(command()));

      expect(outcome.errorOrThrow()?.code).toBe('FISCAL_YEAR_OVERLAP');
      expect(app.events.recorded).toHaveLength(0);
    });

    it('maps the unique key’s conflict to FISCAL_YEAR_LABEL_DUPLICATE', async () => {
      const app = harness();
      app.repository.nextAddFailure = databaseRefusedDuplicateLabel();

      const outcome = await inTenant(TENANT_A, () => app.createFiscalYear.execute(command()));

      expect(outcome.errorOrThrow()?.code).toBe('FISCAL_YEAR_LABEL_DUPLICATE');
      expect(app.events.recorded).toHaveLength(0);
    });

    it('rethrows a persistence failure the module cannot interpret', async () => {
      const app = harness();
      app.repository.nextAddFailure = new Error('the store is unreachable');

      await expect(
        inTenant(TENANT_A, () => app.createFiscalYear.execute(command())),
      ).rejects.toThrow('the store is unreachable');
    });
  });
});
