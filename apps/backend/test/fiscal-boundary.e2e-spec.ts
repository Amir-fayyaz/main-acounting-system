import { describe, expect, it } from 'vitest';

import { BusinessDate } from '../src/shared/time/business-date.js';
import { DateTime } from '../src/shared/time/date-time.js';
import {
  businessDateFromJalali,
  businessDateFromMillis,
  isJalaliLeapYear,
  jalaliDaysInMonth,
  jalaliYearBounds,
} from '../src/shared/time/jalali-calendar.js';
import { InvalidPrimitiveError } from '../src/shared/primitives/invalid-primitive-error.js';
import { TenantScope } from '../src/shared/tenant/tenant-scope.js';
import { createTenantContext } from '../src/shared/tenant/tenant-context.js';
import { tenantReferenceFrom } from '../src/modules/accounting/domain/value-objects/tenant-reference.js';
import { FiscalPeriod } from '../src/modules/accounting/domain/aggregates/fiscal-period.js';
import {
  PeriodClosedError,
  PeriodNotDefinedError,
  ReopenReasonRequiredError,
} from '../src/modules/accounting/domain/errors/fiscal-period.errors.js';
import { DefaultPeriodGuard } from '../src/modules/accounting/application/services/default-period-guard.service.js';
import { CloseFiscalPeriodUseCase } from '../src/modules/accounting/application/use-cases/close-fiscal-period.use-case.js';
import { ReopenFiscalPeriodUseCase } from '../src/modules/accounting/application/use-cases/reopen-fiscal-period.use-case.js';
import { CloseFiscalPeriod } from '../src/modules/accounting/application/commands/close-fiscal-period.command.js';
import { ReopenFiscalPeriod } from '../src/modules/accounting/application/commands/reopen-fiscal-period.command.js';

import { aFiscalPeriod, InMemoryFiscalPeriodRepository } from './support/fiscal-period-doubles.js';
import { aFiscalYear } from './support/accounting-doubles.js';
import { PassthroughTransactionBoundary } from './support/membership-doubles.js';
import { TEST_PRINCIPAL } from './support/test-principal.js';
import type { Authorization } from '../src/modules/identity/application/ports/authorization.port.js';
import type { AuditRecorder } from '../src/modules/audit/application/ports/audit-recorder.port.js';
import type { FiscalPeriodEventRecorder } from '../src/modules/accounting/application/ports/fiscal-period-event-recorder.port.js';
import { Result } from '../src/shared/errors/result.js';
import { createFiscalCompanyFixture, DEFAULT_FIXTURE_TENANT } from './support/fiscal-fixtures.js';

const TENANT_A = DEFAULT_FIXTURE_TENANT;
const TENANT_B = '018f0d3d-6d0f-7a4b-9d4e-2b3c4d5e6f71';
const TEST_NOW = DateTime.parse('2026-10-03T08:00:00.000Z');

const permissiveAuthorization: Authorization = {
  authorize: async () =>
    Result.ok({
      userId: TEST_PRINCIPAL.userId,
      tenantId: TENANT_A,
      permissions: ['accounting.period.manage'],
      membershipStatus: 'active',
    }),
  permits: () => true,
};

const silentAudit: AuditRecorder = {
  record: async () => undefined,
};

const silentEvents: FiscalPeriodEventRecorder = {
  record: async () => undefined,
};

/** Runs work inside a tenant scope */
function inTenant<T>(tenantId: string, work: () => Promise<T>): Promise<T> {
  return TenantScope.run(createTenantContext(tenantId), work);
}

/**
 * Boundary and Closed-Period Test Suite (FIS-008).
 *
 * Verifies the hardest cases of fiscal behavior across:
 * 1. Dates outside every year and inside no period
 * 2. Closed period refused, reopen then accepted
 * 3. Year boundaries: last moment of Esfand, first moment of Farvardin, leap and non-leap years
 * 4. Time zone edge: instants around midnight Asia/Tehran resolving to the right business date
 * 5. Concurrency: post vs close and optimistic revision semantics
 * 6. Tenant isolation for years and periods
 * 7. Guard bypass and mutation verification
 * 8. Reusable fixture validation for Purchase, Inventory, and Accounting modules
 */
describe('Fiscal Boundary and Closed-Period Test Suite (FIS-008)', () => {
  describe('1. Date outside every year and inside no period', () => {
    it('refuses with PERIOD_NOT_DEFINED when date is years before any configured fiscal year', async () => {
      const fixture = createFiscalCompanyFixture({ jalaliYear: 1405 });
      const priorDate = BusinessDate.parse('2024-01-01');

      await expect(fixture.periodGuard.assertPostable(fixture.tenantId, priorDate)).rejects.toThrow(
        PeriodNotDefinedError,
      );
    });

    it('refuses with PERIOD_NOT_DEFINED when date is years after any configured fiscal year', async () => {
      const fixture = createFiscalCompanyFixture({ jalaliYear: 1405 });
      const futureDate = BusinessDate.parse('2029-06-15');

      await expect(
        fixture.periodGuard.assertPostable(fixture.tenantId, futureDate),
      ).rejects.toThrow(PeriodNotDefinedError);
    });

    it('refuses with PERIOD_NOT_DEFINED when date falls into a gap between two disconnected fiscal years', async () => {
      const tenantRef = tenantReferenceFrom(TENANT_A);
      const periods = new InMemoryFiscalPeriodRepository();
      const guard = new DefaultPeriodGuard(periods);

      // Seed Year 1403 (ends 2025-03-20) and Year 1405 (starts 2026-03-21) leaving Year 1404 missing
      const year1403 = aFiscalYear(tenantRef, 'FY1403');
      const period1403 = aFiscalPeriod({
        tenantId: tenantRef,
        fiscalYearId: year1403.id,
        jalaliYear: 1403,
        sequence: 12,
        startDate: '2025-02-19',
        endDate: '2025-03-20',
        state: 'open',
      });
      periods.seed(period1403);

      const year1405 = aFiscalYear(tenantRef, 'FY1405');
      const period1405 = aFiscalPeriod({
        tenantId: tenantRef,
        fiscalYearId: year1405.id,
        jalaliYear: 1405,
        sequence: 1,
        startDate: '2026-03-21',
        endDate: '2026-04-20',
        state: 'open',
      });
      periods.seed(period1405);

      // Date in 1404 (gap)
      const gapDate = BusinessDate.parse('2025-08-15');
      await expect(guard.assertPostable(TENANT_A, gapDate)).rejects.toThrow(PeriodNotDefinedError);
    });

    it('refuses with PERIOD_NOT_DEFINED when a fiscal year exists but periods have not been generated yet', async () => {
      const periods = new InMemoryFiscalPeriodRepository();
      const guard = new DefaultPeriodGuard(periods);

      // Period repository has no periods for 1405
      const dateIn1405 = BusinessDate.parse('2026-04-10');
      await expect(guard.assertPostable(TENANT_A, dateIn1405)).rejects.toThrow(
        PeriodNotDefinedError,
      );
    });
  });

  describe('2. Closed period refused; reopen then accepted', () => {
    it('refuses posting when date falls into a closed period with PERIOD_CLOSED', async () => {
      const fixture = createFiscalCompanyFixture({ closedSequence: 1, activeSequence: 2 });

      // closedDate is inside period 1 (Farvardin)
      await expect(
        fixture.periodGuard.assertPostable(fixture.tenantId, fixture.dates.closedDate),
      ).rejects.toThrow(PeriodClosedError);

      // Also fails when passed as JavaScript Date instant
      await expect(
        fixture.periodGuard.assertPostable(fixture.tenantId, fixture.dates.closedInstant),
      ).rejects.toThrow(PeriodClosedError);
    });

    it('refuses reopening a period without a non-empty business reason', async () => {
      const fixture = createFiscalCompanyFixture({ closedSequence: 1, activeSequence: 2 });
      const boundary = new PassthroughTransactionBoundary();
      const reopenUseCase = new ReopenFiscalPeriodUseCase(
        fixture.fiscalPeriodRepository,
        silentEvents,
        silentAudit,
        permissiveAuthorization,
        boundary,
      );

      await inTenant(fixture.tenantId, async () => {
        const failEmpty = await reopenUseCase.execute(
          new ReopenFiscalPeriod({
            periodId: fixture.closedPeriod.id.value,
            reason: '',
            principal: TEST_PRINCIPAL,
          }),
        );
        expect(failEmpty.isFail()).toBe(true);
        expect(failEmpty.errorOrThrow()).toBeInstanceOf(ReopenReasonRequiredError);

        const failWhitespace = await reopenUseCase.execute(
          new ReopenFiscalPeriod({
            periodId: fixture.closedPeriod.id.value,
            reason: '   ',
            principal: TEST_PRINCIPAL,
          }),
        );
        expect(failWhitespace.isFail()).toBe(true);
        expect(failWhitespace.errorOrThrow()).toBeInstanceOf(ReopenReasonRequiredError);
      });
    });

    it('allows posting immediately once the closed period is reopened with a valid reason', async () => {
      const fixture = createFiscalCompanyFixture({ closedSequence: 1, activeSequence: 2 });
      const boundary = new PassthroughTransactionBoundary();
      const reopenUseCase = new ReopenFiscalPeriodUseCase(
        fixture.fiscalPeriodRepository,
        silentEvents,
        silentAudit,
        permissiveAuthorization,
        boundary,
      );

      // Verify it is initially refused
      await expect(
        fixture.periodGuard.assertPostable(fixture.tenantId, fixture.dates.closedDate),
      ).rejects.toThrow(PeriodClosedError);

      // Reopen period with valid business justification
      await inTenant(fixture.tenantId, async () => {
        const res = await reopenUseCase.execute(
          new ReopenFiscalPeriod({
            periodId: fixture.closedPeriod.id.value,
            reason: 'Auditor post-closing adjustments requested for Farvardin',
            principal: TEST_PRINCIPAL,
          }),
        );
        expect(res.isOk()).toBe(true);
        expect(res.valueOrThrow().state).toBe('open');
      });

      // Now assertPostable succeeds
      const postable = await fixture.periodGuard.assertPostable(
        fixture.tenantId,
        fixture.dates.closedDate,
      );
      expect(postable.id).toBe(fixture.closedPeriod.id.value);
      expect(postable.sequence).toBe(1);
      expect(postable.startDate).toBe(fixture.closedPeriod.range.startDate.toIsoString());
      expect(postable.endDate).toBe(fixture.closedPeriod.range.endDate.toIsoString());
    });

    it('refuses posting once a previously open period is closed by an authorized use case', async () => {
      const fixture = createFiscalCompanyFixture({ closedSequence: 1, activeSequence: 2 });
      const boundary = new PassthroughTransactionBoundary();
      const closeUseCase = new CloseFiscalPeriodUseCase(
        fixture.fiscalPeriodRepository,
        fixture.activePeriodRepository,
        silentEvents,
        silentAudit,
        permissiveAuthorization,
        boundary,
      );

      // Period 2 (openDate) is initially open and postable
      const beforeClose = await fixture.periodGuard.assertPostable(
        fixture.tenantId,
        fixture.dates.openDate,
      );
      expect(beforeClose.id).toBe(fixture.openPeriod.id.value);
      expect(beforeClose.sequence).toBe(2);

      // Move active pointer to period 3 first (domain invariant: active period cannot be closed)
      await fixture.activePeriodRepository.activate(fixture.tenantRef, fixture.periods[2].id);

      // Close period 2
      await inTenant(fixture.tenantId, async () => {
        const closeRes = await closeUseCase.execute(
          new CloseFiscalPeriod({
            periodId: fixture.openPeriod.id.value,
            principal: TEST_PRINCIPAL,
          }),
        );
        expect(closeRes.isOk()).toBe(true);
        expect(closeRes.valueOrThrow().state).toBe('closed');
      });

      // Now posting to period 2 must be refused
      await expect(
        fixture.periodGuard.assertPostable(fixture.tenantId, fixture.dates.openDate),
      ).rejects.toThrow(PeriodClosedError);
    });
  });

  describe('3. Year boundaries: last moment of Esfand, first moment of Farvardin, leap and non-leap years', () => {
    it('tiles the exact boundary between non-leap 1404 Esfand and 1405 Farvardin with zero gap and zero overlap', async () => {
      const tenantRef = tenantReferenceFrom(TENANT_A);
      const periodsRepo = new InMemoryFiscalPeriodRepository();
      const guard = new DefaultPeriodGuard(periodsRepo);

      // Jalali 1404 is non-leap (365 days): Esfand has 29 days
      expect(isJalaliLeapYear(1404)).toBe(false);
      expect(jalaliDaysInMonth(1404, 12)).toBe(29);
      const bounds1404 = jalaliYearBounds(1404);
      // Last day of Esfand 1404 is 2026-03-20
      expect(bounds1404.end.toIsoString()).toBe('2026-03-20');

      // Jalali 1405 is non-leap: Farvardin starts on 2026-03-21
      const bounds1405 = jalaliYearBounds(1405);
      expect(bounds1405.start.toIsoString()).toBe('2026-03-21');

      // Seed Period 12 of 1404 (Esfand)
      const year1404 = aFiscalYear(tenantRef, 'FY1404');
      const period1404_12 = aFiscalPeriod({
        tenantId: tenantRef,
        fiscalYearId: year1404.id,
        jalaliYear: 1404,
        sequence: 12,
        startDate: '2026-02-20',
        endDate: '2026-03-20',
        state: 'open',
      });
      periodsRepo.seed(period1404_12);

      // Seed Period 1 of 1405 (Farvardin)
      const year1405 = aFiscalYear(tenantRef, 'FY1405');
      const period1405_1 = aFiscalPeriod({
        tenantId: tenantRef,
        fiscalYearId: year1405.id,
        jalaliYear: 1405,
        sequence: 1,
        startDate: '2026-03-21',
        endDate: '2026-04-20',
        state: 'open',
      });
      periodsRepo.seed(period1405_1);

      // Assert exact boundary resolution
      const lastMomentOfEsfand = BusinessDate.parse('2026-03-20');
      const esfandResult = await guard.assertPostable(TENANT_A, lastMomentOfEsfand);
      expect(esfandResult.fiscalYearId).toBe(year1404.id.value);
      expect(esfandResult.sequence).toBe(12);
      expect(esfandResult.endDate).toBe('2026-03-20');

      const firstMomentOfFarvardin = BusinessDate.parse('2026-03-21');
      const farvardinResult = await guard.assertPostable(TENANT_A, firstMomentOfFarvardin);
      expect(farvardinResult.fiscalYearId).toBe(year1405.id.value);
      expect(farvardinResult.sequence).toBe(1);
      expect(farvardinResult.startDate).toBe('2026-03-21');
    });

    it('correctly handles Jalali leap year 1403 where Esfand has 30 days', async () => {
      const tenantRef = tenantReferenceFrom(TENANT_A);
      const periodsRepo = new InMemoryFiscalPeriodRepository();
      const guard = new DefaultPeriodGuard(periodsRepo);

      // Jalali 1403 is a 366-day leap year
      expect(isJalaliLeapYear(1403)).toBe(true);
      expect(jalaliDaysInMonth(1403, 12)).toBe(30);

      const bounds1403 = jalaliYearBounds(1403);
      // Day 30 of Esfand 1403 is 2025-03-20
      expect(bounds1403.end.toIsoString()).toBe('2025-03-20');

      const year1403 = aFiscalYear(tenantRef, 'FY1403');
      const period1403_12 = aFiscalPeriod({
        tenantId: tenantRef,
        fiscalYearId: year1403.id,
        jalaliYear: 1403,
        sequence: 12,
        startDate: '2025-02-19',
        endDate: '2025-03-20',
        state: 'open',
      });
      periodsRepo.seed(period1403_12);

      const year1404 = aFiscalYear(tenantRef, 'FY1404');
      const period1404_1 = aFiscalPeriod({
        tenantId: tenantRef,
        fiscalYearId: year1404.id,
        jalaliYear: 1404,
        sequence: 1,
        startDate: '2025-03-21',
        endDate: '2025-04-20',
        state: 'open',
      });
      periodsRepo.seed(period1404_1);

      // 30th of Esfand 1403 (leap day) maps to period 12 of 1403
      const leapDay = BusinessDate.parse('2025-03-20');
      const leapRes = await guard.assertPostable(TENANT_A, leapDay);
      expect(leapRes.fiscalYearId).toBe(year1403.id.value);
      expect(leapRes.sequence).toBe(12);

      // Next day 2025-03-21 is Farvardin 1 of 1404
      const nextDay = BusinessDate.parse('2025-03-21');
      const nextRes = await guard.assertPostable(TENANT_A, nextDay);
      expect(nextRes.fiscalYearId).toBe(year1404.id.value);
      expect(nextRes.sequence).toBe(1);
    });

    it('strictly rejects non-existent 30th of Esfand in non-leap years', () => {
      // 1404 and 1405 are non-leap years
      expect(isJalaliLeapYear(1404)).toBe(false);
      expect(isJalaliLeapYear(1405)).toBe(false);

      expect(() => businessDateFromJalali(1404, 12, 30)).toThrow(InvalidPrimitiveError);
      expect(() => businessDateFromJalali(1405, 12, 30)).toThrow(InvalidPrimitiveError);
    });
  });

  describe('4. Time zone edge: instants around midnight Asia/Tehran resolve to the right business date', () => {
    it('resolves 2026-03-20T20:29:59.999Z to Esfand 1404 and 20:30:00.000Z to Farvardin 1405', async () => {
      const tenantRef = tenantReferenceFrom(TENANT_A);
      const periodsRepo = new InMemoryFiscalPeriodRepository();
      const guard = new DefaultPeriodGuard(periodsRepo);

      // Year 1404 Period 12 (Esfand) ending 2026-03-20
      const year1404 = aFiscalYear(tenantRef, 'FY1404');
      const period1404_12 = aFiscalPeriod({
        tenantId: tenantRef,
        fiscalYearId: year1404.id,
        jalaliYear: 1404,
        sequence: 12,
        startDate: '2026-02-20',
        endDate: '2026-03-20',
        state: 'open',
      });
      periodsRepo.seed(period1404_12);

      // Year 1405 Period 1 (Farvardin) starting 2026-03-21
      const year1405 = aFiscalYear(tenantRef, 'FY1405');
      const period1405_1 = aFiscalPeriod({
        tenantId: tenantRef,
        fiscalYearId: year1405.id,
        jalaliYear: 1405,
        sequence: 1,
        startDate: '2026-03-21',
        endDate: '2026-04-20',
        state: 'open',
      });
      periodsRepo.seed(period1405_1);

      // In Asia/Tehran (UTC+03:30):
      // 2026-03-20T20:29:59.999Z -> 2026-03-20 23:59:59.999 (last instant of Esfand 1404)
      const justBeforeTehranMidnight = new Date('2026-03-20T20:29:59.999Z');
      const beforeRes = await guard.assertPostable(TENANT_A, justBeforeTehranMidnight);
      expect(beforeRes.fiscalYearId).toBe(year1404.id.value);
      expect(beforeRes.sequence).toBe(12);

      // 2026-03-20T20:30:00.000Z -> 2026-03-21 00:00:00.000 (first instant of Farvardin 1405)
      const exactTehranMidnight = new Date('2026-03-20T20:30:00.000Z');
      const afterRes = await guard.assertPostable(TENANT_A, exactTehranMidnight);
      expect(afterRes.fiscalYearId).toBe(year1405.id.value);
      expect(afterRes.sequence).toBe(1);
    });

    it('resolves mid-year midnight instants across month boundaries consistently', async () => {
      // 1405-07-30 (Mehr 30) is 2026-10-22
      // 1405-08-01 (Aban 1) is 2026-10-23
      const justBefore = Date.parse('2026-10-22T20:29:59.999Z');
      const exactMidnight = Date.parse('2026-10-22T20:30:00.000Z');

      expect(businessDateFromMillis(justBefore).toIsoString()).toBe('2026-10-22');
      expect(businessDateFromMillis(exactMidnight).toIsoString()).toBe('2026-10-23');
    });

    it('produces the exact same business date regardless of the host server timezone', () => {
      const instant = Date.parse('2026-03-20T21:00:00.000Z');
      // In Asia/Tehran, 21:00 UTC is 00:30 the next day (2026-03-21)
      const bDate = businessDateFromMillis(instant);
      expect(bDate.toIsoString()).toBe('2026-03-21');
    });
  });

  describe('5. Concurrency: post vs close', () => {
    it('detects concurrent modifications via optimistic concurrency Revision', async () => {
      const fixture = createFiscalCompanyFixture();
      const initialRev = fixture.fiscalPeriodRepository.revisionOf(fixture.openPeriod.id);
      expect(initialRev).toBeDefined();

      // Simulate a concurrent close that updates the period and increments revision
      const periodToClose = FiscalPeriod.rehydrate(fixture.openPeriod.snapshot());
      periodToClose.close(TEST_NOW);
      const receipt = await fixture.fiscalPeriodRepository.update(periodToClose, initialRev!);
      expect(receipt.revision.equals(initialRev!.next())).toBe(true);

      // Any concurrent writer holding the old revision is rejected with StaleRevision
      const stalePeriod = FiscalPeriod.rehydrate(fixture.openPeriod.snapshot());
      await expect(
        fixture.fiscalPeriodRepository.update(stalePeriod, initialRev!),
      ).rejects.toThrow();
    });

    it('refuses posting if a period closes concurrently before posting completes', async () => {
      const fixture = createFiscalCompanyFixture();
      const boundary = new PassthroughTransactionBoundary();
      const closeUseCase = new CloseFiscalPeriodUseCase(
        fixture.fiscalPeriodRepository,
        fixture.activePeriodRepository,
        silentEvents,
        silentAudit,
        permissiveAuthorization,
        boundary,
      );

      // Verify period 2 is initially open
      const firstCheck = await fixture.periodGuard.assertPostable(
        fixture.tenantId,
        fixture.dates.openDate,
      );
      expect(firstCheck.sequence).toBe(2);

      // Move active pointer to period 3 first (active period cannot be closed)
      await fixture.activePeriodRepository.activate(fixture.tenantRef, fixture.periods[2].id);

      // Concurrent closing action executes
      await inTenant(fixture.tenantId, async () => {
        const closeRes = await closeUseCase.execute(
          new CloseFiscalPeriod({
            periodId: fixture.openPeriod.id.value,
            principal: TEST_PRINCIPAL,
          }),
        );
        expect(closeRes.isOk()).toBe(true);
      });

      // Subsequent assertion by in-flight or subsequent posting detects closed state
      await expect(
        fixture.periodGuard.assertPostable(fixture.tenantId, fixture.dates.openDate),
      ).rejects.toThrow(PeriodClosedError);
    });
  });

  describe('6. Tenant isolation for years and periods', () => {
    it('never resolves Tenant A dates against Tenant B periods even with identical calendar ranges', async () => {
      const periodsRepo = new InMemoryFiscalPeriodRepository();
      const guard = new DefaultPeriodGuard(periodsRepo);

      // Company A has period for Farvardin 1405
      const periodA = aFiscalPeriod({
        tenantId: tenantReferenceFrom(TENANT_A),
        fiscalYearId: aFiscalYear(tenantReferenceFrom(TENANT_A)).id,
        jalaliYear: 1405,
        sequence: 1,
        startDate: '2026-03-21',
        endDate: '2026-04-20',
        state: 'open',
      });
      periodsRepo.seed(periodA);

      // Querying with Tenant B on that date throws PERIOD_NOT_DEFINED
      const postingDate = BusinessDate.parse('2026-04-05');
      await expect(guard.assertPostable(TENANT_B, postingDate)).rejects.toThrow(
        PeriodNotDefinedError,
      );

      // Querying with Tenant A succeeds
      const resA = await guard.assertPostable(TENANT_A, postingDate);
      expect(resA.id).toBe(periodA.id.value);
    });

    it('isolates closed period state: closing Tenant A period does not affect Tenant B', async () => {
      const periodsRepo = new InMemoryFiscalPeriodRepository();
      const guard = new DefaultPeriodGuard(periodsRepo);

      const postingDate = BusinessDate.parse('2026-04-05');

      // Tenant A period is CLOSED
      const periodA = aFiscalPeriod({
        tenantId: tenantReferenceFrom(TENANT_A),
        fiscalYearId: aFiscalYear(tenantReferenceFrom(TENANT_A)).id,
        jalaliYear: 1405,
        sequence: 1,
        startDate: '2026-03-21',
        endDate: '2026-04-20',
        state: 'closed',
      });
      periodsRepo.seed(periodA);

      // Tenant B period is OPEN
      const periodB = aFiscalPeriod({
        tenantId: tenantReferenceFrom(TENANT_B),
        fiscalYearId: aFiscalYear(tenantReferenceFrom(TENANT_B)).id,
        jalaliYear: 1405,
        sequence: 1,
        startDate: '2026-03-21',
        endDate: '2026-04-20',
        state: 'open',
      });
      periodsRepo.seed(periodB);

      // Tenant A is refused
      await expect(guard.assertPostable(TENANT_A, postingDate)).rejects.toThrow(PeriodClosedError);

      // Tenant B is accepted
      const resB = await guard.assertPostable(TENANT_B, postingDate);
      expect(resB.id).toBe(periodB.id.value);
    });
  });

  describe('7. Guard bypass and mutation verification', () => {
    /**
     * Simulated posting workflow representing how Purchase, Inventory, or
     * Accounting transactions consume the PeriodGuard before posting.
     */
    class SimulatedPostingWorkflow {
      public postedEntries: Array<{ tenantId: string; date: BusinessDate; amount: number }> = [];

      public constructor(
        private readonly guard: DefaultPeriodGuard,
        private readonly bypassGuard: boolean = false,
      ) {}

      public async postTransaction(
        tenantId: string,
        date: BusinessDate,
        amount: number,
      ): Promise<void> {
        if (!this.bypassGuard) {
          // Normal, safe workflow: always check guard first
          await this.guard.assertPostable(tenantId, date);
        }
        // Commit transaction
        this.postedEntries.push({ tenantId, date, amount });
      }
    }

    it('demonstrates that a safe workflow relying on PeriodGuard rejects closed-period postings', async () => {
      const fixture = createFiscalCompanyFixture({ closedSequence: 1, activeSequence: 2 });
      const safeWorkflow = new SimulatedPostingWorkflow(fixture.periodGuard, false);

      // Posting to closed period throws and nothing is recorded
      await expect(
        safeWorkflow.postTransaction(fixture.tenantId, fixture.dates.closedDate, 1_000_000),
      ).rejects.toThrow(PeriodClosedError);
      expect(safeWorkflow.postedEntries).toHaveLength(0);

      // Posting to open period succeeds and records entry
      await safeWorkflow.postTransaction(fixture.tenantId, fixture.dates.openDate, 1_000_000);
      expect(safeWorkflow.postedEntries).toHaveLength(1);
    });

    it('fails closed-period protection if the guard is bypassed (mutation verification)', async () => {
      const fixture = createFiscalCompanyFixture({ closedSequence: 1, activeSequence: 2 });
      // Bypassed workflow: simulates a developer forgetting to invoke assertPostable
      const brokenWorkflow = new SimulatedPostingWorkflow(fixture.periodGuard, true);

      // The post incorrectly succeeds into a closed period, demonstrating that without
      // the guard, closed-period integrity is compromised!
      await brokenWorkflow.postTransaction(fixture.tenantId, fixture.dates.closedDate, 500_000);
      expect(brokenWorkflow.postedEntries).toHaveLength(1);
      expect(brokenWorkflow.postedEntries[0].date.equals(fixture.dates.closedDate)).toBe(true);
    });
  });

  describe('8. Reusable fixture validation (Purchase, Inventory, Accounting scenarios)', () => {
    it('provides a complete fixture with 1 closed and 1 open period ready for downstream modules', async () => {
      const fixture = createFiscalCompanyFixture();

      expect(fixture.periods).toHaveLength(12);
      expect(fixture.closedPeriod.isOpen()).toBe(false);
      expect(fixture.openPeriod.isOpen()).toBe(true);
      expect(fixture.activePeriod.id.value).toBe(fixture.openPeriod.id.value);

      // Guard works directly off the fixture
      await expect(
        fixture.periodGuard.assertPostable(fixture.tenantId, fixture.dates.closedDate),
      ).rejects.toThrow(PeriodClosedError);

      const postable = await fixture.periodGuard.assertPostable(
        fixture.tenantId,
        fixture.dates.openDate,
      );
      expect(postable.id).toBe(fixture.openPeriod.id.value);
    });
  });
});
