import { describe, expect, it } from 'vitest';

import { createTenantContext } from '../../../../shared/tenant/tenant-context.js';
import { TenantScope } from '../../../../shared/tenant/tenant-scope.js';
import { TenantContextMissingError } from '../../../../shared/tenant/tenant.errors.js';
import {
  aFiscalYear,
  InMemoryFiscalYearRepository,
  PassthroughTransactionBoundary,
  RecordingFiscalYearEvents,
} from '../../../../../test/support/accounting-doubles.js';
import { InMemoryActivePeriodRepository, InMemoryFiscalPeriodRepository } from '../../../../../test/support/fiscal-period-doubles.js';
import {
  PersistenceError,
  PersistenceFailureKind,
} from '../../../../shared/persistence/persistence-error.js';
import { FiscalPeriodDuplicateError } from '../../domain/errors/fiscal-period.errors.js';
import { generateFiscalPeriodId } from '../../domain/value-objects/fiscal-period-id.js';
import { generateFiscalYearId } from '../../domain/value-objects/fiscal-year-id.js';
import { tenantReferenceFrom } from '../../domain/value-objects/tenant-reference.js';
import { GenerateFiscalPeriods } from '../commands/generate-fiscal-periods.command.js';
import { GenerateFiscalPeriodsUseCase } from './generate-fiscal-periods.use-case.js';

/**
 * The generate-periods use case over in-memory repositories (FIS-004). The
 * MySQL-only halves of the contract — the unique key behind the idempotency
 * and the scope filter in the adapter — are proven in
 * `test/fiscal-period-persistence.e2e-spec.ts`.
 */

const TENANT_A = '018f0d3c-6d0f-7a4b-9d4e-2b3c4d5e6f70';
const TENANT_B = '018f0d3d-6d0f-7a4b-9d4e-2b3c4d5e6f71';

interface Harness {
  readonly years: InMemoryFiscalYearRepository;
  readonly periods: InMemoryFiscalPeriodRepository;
  readonly activePeriods: InMemoryActivePeriodRepository;
  readonly events: RecordingFiscalYearEvents;
  readonly boundary: PassthroughTransactionBoundary;
  readonly generate: GenerateFiscalPeriodsUseCase;
}

function harness(): Harness {
  const years = new InMemoryFiscalYearRepository();
  const periods = new InMemoryFiscalPeriodRepository();
  const activePeriods = new InMemoryActivePeriodRepository();
  const events = new RecordingFiscalYearEvents();
  const boundary = new PassthroughTransactionBoundary();

  return {
    years,
    periods,
    activePeriods,
    events,
    boundary,
    generate: new GenerateFiscalPeriodsUseCase(years, periods, activePeriods, events, boundary),
  };
}

/** Runs tenant-scoped work the way the trusted entry point does. */
function inTenant<T>(tenantId: string, work: () => Promise<T>): Promise<T> {
  return TenantScope.run(createTenantContext(tenantId), work);
}

function generateCommand(fiscalYearId: string): GenerateFiscalPeriods {
  return new GenerateFiscalPeriods({ fiscalYearId });
}

describe('GenerateFiscalPeriodsUseCase', () => {
  describe('generation', () => {
    it('persists the year’s twelve open monthly periods and returns them in order', async () => {
      const app = harness();
      const year = aFiscalYear(tenantReferenceFrom(TENANT_A), 'FY1405');
      app.years.seed(year);

      const outcome = await inTenant(TENANT_A, () =>
        app.generate.execute(generateCommand(year.id.value)),
      );

      expect(outcome.isOk()).toBe(true);
      const view = outcome.valueOrThrow();
      expect(view.fiscalYearId).toBe(year.id.value);
      expect(view.jalaliYear).toBe(1405);
      expect(view.periods).toHaveLength(12);
      expect(view.periods[0]).toMatchObject({
        sequence: 1,
        // Farvardin has 31 days: 2026-03-21 through 2026-04-20.
        startDate: '2026-03-21',
        endDate: '2026-04-20',
        state: 'open',
      });
      expect(view.periods[11]).toMatchObject({
        sequence: 12,
        // Esfand of 1405 (not a leap year) has 29 days.
        startDate: '2027-02-20',
        endDate: '2027-03-20',
      });
      expect(app.periods.addCalls).toBe(12);
    });

    it('records FiscalPeriodsGenerated and seeds the active period for a fresh tenant', async () => {
      const app = harness();
      const year = aFiscalYear(tenantReferenceFrom(TENANT_A), 'FY1405');
      app.years.seed(year);

      const view = (
        await inTenant(TENANT_A, () => app.generate.execute(generateCommand(year.id.value)))
      ).valueOrThrow();

      expect(app.events.recorded.map((event) => event.name)).toEqual([
        'FiscalPeriodsGenerated',
        'ActivePeriodSelected',
      ]);
      expect(app.events.recorded[1]?.metadata.tenantId).toBe(TENANT_A);

      // Exactly one active period per tenant, from the moment the frame exists.
      expect(app.activePeriods.pointerOf(TENANT_A)?.value).toBe(view.periods[0]?.id);
    });

    it('does not move an active period the tenant already has', async () => {
      const app = harness();
      const year = aFiscalYear(tenantReferenceFrom(TENANT_A), 'FY1405');
      app.years.seed(year);

      // The tenant selected an active period before anything was generated.
      const existingActive = generateFiscalPeriodId();
      await app.activePeriods.activate(tenantReferenceFrom(TENANT_A), existingActive);

      await inTenant(TENANT_A, () => app.generate.execute(generateCommand(year.id.value)));

      expect(app.activePeriods.pointerOf(TENANT_A)?.value).toBe(existingActive.value);
      expect(app.events.recorded.map((event) => event.name)).toEqual(['FiscalPeriodsGenerated']);
    });

    it('opens exactly one transaction boundary for the whole operation', async () => {
      const app = harness();
      const year = aFiscalYear(tenantReferenceFrom(TENANT_A), 'FY1405');
      app.years.seed(year);

      await inTenant(TENANT_A, () => app.generate.execute(generateCommand(year.id.value)));

      expect(app.boundary.executions).toBe(1);
    });
  });

  describe('idempotency', () => {
    it('regenerating for the same year changes nothing', async () => {
      const app = harness();
      const year = aFiscalYear(tenantReferenceFrom(TENANT_A), 'FY1405');
      app.years.seed(year);

      const first = await inTenant(TENANT_A, () =>
        app.generate.execute(generateCommand(year.id.value)),
      );
      const addCallsAfterFirst = app.periods.addCalls;
      const eventsAfterFirst = app.events.recorded.length;

      const second = await inTenant(TENANT_A, () =>
        app.generate.execute(generateCommand(year.id.value)),
      );

      expect(second.isOk()).toBe(true);
      expect(second.valueOrThrow().periods).toEqual(first.valueOrThrow().periods);
      expect(app.periods.addCalls).toBe(addCallsAfterFirst);
      expect(app.events.recorded.length).toBe(eventsAfterFirst);
    });

    it('reports the store’s duplicate refusal as FISCAL_PERIOD_DUPLICATE', async () => {
      const app = harness();
      const year = aFiscalYear(tenantReferenceFrom(TENANT_A), 'FY1405');
      app.years.seed(year);
      app.periods.nextAddFailure = new PersistenceError(
        PersistenceFailureKind.CONFLICT,
        'FiscalPeriodRepository.add',
        { cause: new FiscalPeriodDuplicateError() },
      );

      await expect(
        inTenant(TENANT_A, () => app.generate.execute(generateCommand(year.id.value))),
      ).rejects.toMatchObject({ code: 'FISCAL_PERIOD_DUPLICATE' });
    });
  });

  describe('declines', () => {
    it('reports a missing year as FISCAL_YEAR_NOT_FOUND, including another company’s', async () => {
      const app = harness();
      const year = aFiscalYear(tenantReferenceFrom(TENANT_A), 'FY1405');
      app.years.seed(year);

      const missing = await inTenant(TENANT_B, () =>
        app.generate.execute(generateCommand(year.id.value)),
      );

      expect(missing.errorOrThrow()?.code).toBe('FISCAL_YEAR_NOT_FOUND');
      expect(app.periods.addCalls).toBe(0);
    });

    it('refuses a year that does not span exactly one Jalali year', async () => {
      const app = harness();
      // A Gregorian calendar year covers no 1 Farvardin to last Esfand, so
      // twelve monthly periods could never fill it without a gap or an overlap.
      const gregorianYear = aFiscalYear(
        tenantReferenceFrom(TENANT_A),
        'FY2024',
        '2024-01-01',
        '2024-12-31',
      );
      app.years.seed(gregorianYear);

      const outcome = await inTenant(TENANT_A, () =>
        app.generate.execute(generateCommand(gregorianYear.id.value)),
      );

      expect(outcome.errorOrThrow()?.code).toBe('FISCAL_PERIOD_STRUCTURE');
      expect(app.periods.addCalls).toBe(0);
    });

    it('fails closed when no tenant scope is established', async () => {
      const app = harness();

      await expect(
        app.generate.execute(generateCommand(generateFiscalYearId().value)),
      ).rejects.toBeInstanceOf(TenantContextMissingError);
    });
  });
});
