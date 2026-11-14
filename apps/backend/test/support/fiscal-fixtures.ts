import {
  aFiscalPeriod,
  InMemoryActivePeriodRepository,
  InMemoryFiscalPeriodRepository,
} from './fiscal-period-doubles.js';
import { InMemoryFiscalYearRepository } from './accounting-doubles.js';
import { FiscalYear } from '../../src/modules/accounting/domain/aggregates/fiscal-year.js';
import type { FiscalPeriod } from '../../src/modules/accounting/domain/aggregates/fiscal-period.js';
import { FiscalPeriodGenerationPolicy } from '../../src/modules/accounting/domain/policies/fiscal-period-generation.policy.js';
import { FiscalYearLabel } from '../../src/modules/accounting/domain/value-objects/fiscal-year-label.js';
import { FiscalYearRange } from '../../src/modules/accounting/domain/value-objects/fiscal-year-range.js';
import {
  tenantReferenceFrom,
  type TenantReference,
} from '../../src/modules/accounting/domain/value-objects/tenant-reference.js';
import { DefaultPeriodGuard } from '../../src/modules/accounting/application/services/default-period-guard.service.js';
import { BusinessDate } from '../../src/shared/time/business-date.js';
import { DateTime } from '../../src/shared/time/date-time.js';
import { jalaliYearBounds } from '../../src/shared/time/jalali-calendar.js';
import type { FiscalYearRepository } from '../../src/modules/accounting/domain/repositories/fiscal-year.repository.js';
import type { FiscalPeriodRepository } from '../../src/modules/accounting/domain/repositories/fiscal-period.repository.js';
import type { ActivePeriodRepository } from '../../src/modules/accounting/domain/repositories/active-period.repository.js';

export const DEFAULT_FIXTURE_TENANT = '018f0d3c-6d0f-7a4b-9d4e-2b3c4d5e6f70';
const FIXTURE_NOW = DateTime.parse('2026-10-03T08:00:00.000Z');

/**
 * Standard test dates generated for boundary, closed-period, and posting tests.
 */
export interface FiscalScenarioDates {
  /** A date situated strictly inside the closed period (e.g. Farvardin 15th). */
  readonly closedDate: BusinessDate;
  /** A UTC instant resolving to the closed business date in Asia/Tehran. */
  readonly closedInstant: Date;
  /** A date situated strictly inside the open period (e.g. Ordibehesht 15th). */
  readonly openDate: BusinessDate;
  /** A UTC instant resolving to the open business date in Asia/Tehran. */
  readonly openInstant: Date;
  /** A date situated outside any configured fiscal year (e.g. 1 year prior). */
  readonly outsideYearDate: BusinessDate;
  /** A UTC instant situated outside any configured fiscal year. */
  readonly outsideYearInstant: Date;
  /** First calendar date of the fiscal year (1 Farvardin). */
  readonly yearStart: BusinessDate;
  /** Last calendar date of the fiscal year (29 or 30 Esfand). */
  readonly yearEnd: BusinessDate;
}

/**
 * A ready-to-use company fixture with a fiscal year, one closed period,
 * and one open active period (FIS-008).
 *
 * Designed for immediate reuse across:
 * - Accounting tests (journal entry posting guard, period closure)
 * - Purchase tests (vendor invoice booking guard)
 * - Inventory tests (stock receipt / movement guard)
 */
export interface FiscalCompanyFixture {
  readonly tenantId: string;
  readonly tenantRef: TenantReference;
  readonly fiscalYear: FiscalYear;
  readonly periods: readonly FiscalPeriod[];
  readonly closedPeriod: FiscalPeriod;
  readonly openPeriod: FiscalPeriod;
  readonly activePeriod: FiscalPeriod;
  readonly fiscalYearRepository: InMemoryFiscalYearRepository;
  readonly fiscalPeriodRepository: InMemoryFiscalPeriodRepository;
  readonly activePeriodRepository: InMemoryActivePeriodRepository;
  readonly periodGuard: DefaultPeriodGuard;
  readonly dates: FiscalScenarioDates;
}

export interface FiscalCompanyFixtureOptions {
  /** The tenant identity (UUID). Defaults to DEFAULT_FIXTURE_TENANT. */
  readonly tenantId?: string;
  /** The Jalali calendar year. Defaults to 1405. */
  readonly jalaliYear?: number;
  /** Sequence number of the period to seed as closed (1..12). Defaults to 1 (Farvardin). */
  readonly closedSequence?: number;
  /** Sequence number of the period to seed as open and active (1..12). Defaults to 2 (Ordibehesht). */
  readonly activeSequence?: number;
  /** Label for the fiscal year. Defaults to `FY${jalaliYear}`. */
  readonly yearLabel?: string;
}

/**
 * Builds an in-memory company fixture containing:
 * - A tenant
 * - A 12-month fiscal year (e.g. FY1405)
 * - One closed period (default: month 1 / Farvardin)
 * - One open and active period (default: month 2 / Ordibehesht)
 * - Remaining periods (3..12) initialized as open
 * - Seeded in-memory repositories and a configured `DefaultPeriodGuard`
 * - Convenient business dates and instants for testing guards and workflows
 *
 * @example
 * ```ts
 * // In Purchase or Inventory tests:
 * const fixture = createFiscalCompanyFixture();
 *
 * // Test posting into closed period is rejected:
 * await expect(
 *   purchaseService.bookInvoice(fixture.tenantId, invoice, fixture.dates.closedDate),
 * ).rejects.toThrow(PeriodClosedError);
 *
 * // Test posting into open period succeeds:
 * const result = await purchaseService.bookInvoice(
 *   fixture.tenantId,
 *   invoice,
 *   fixture.dates.openDate,
 * );
 * expect(result.isSuccess()).toBe(true);
 * ```
 */
export function createFiscalCompanyFixture(
  options: FiscalCompanyFixtureOptions = {},
): FiscalCompanyFixture {
  const tenantId = options.tenantId ?? DEFAULT_FIXTURE_TENANT;
  const tenantRef = tenantReferenceFrom(tenantId);
  const jalaliYear = options.jalaliYear ?? 1405;
  const closedSequence = options.closedSequence ?? 1;
  const activeSequence = options.activeSequence ?? 2;
  const yearLabel = options.yearLabel ?? `FY${jalaliYear}`;

  const yearBounds = jalaliYearBounds(jalaliYear);
  const fiscalYear = FiscalYear.create({
    tenantId: tenantRef,
    label: FiscalYearLabel.from(yearLabel),
    range: FiscalYearRange.of(yearBounds.start, yearBounds.end),
    now: FIXTURE_NOW,
  });

  const plan = FiscalPeriodGenerationPolicy.plan(fiscalYear.range).valueOrThrow();

  const periods: FiscalPeriod[] = plan.periods.map((p) =>
    aFiscalPeriod({
      tenantId: tenantRef,
      fiscalYearId: fiscalYear.id,
      jalaliYear,
      sequence: p.sequence,
      startDate: p.startDate,
      endDate: p.endDate,
      state: p.sequence === closedSequence ? 'closed' : 'open',
    }),
  );

  const closedPeriod = periods.find((p) => p.sequence === closedSequence)!;
  const openPeriod = periods.find((p) => p.sequence === activeSequence)!;
  const activePeriod = openPeriod;

  const fiscalYearRepository = new InMemoryFiscalYearRepository();
  fiscalYearRepository.seed(fiscalYear);

  const fiscalPeriodRepository = new InMemoryFiscalPeriodRepository();
  for (const period of periods) {
    fiscalPeriodRepository.seed(period);
  }

  const activePeriodRepository = new InMemoryActivePeriodRepository();
  activePeriodRepository.activate(tenantRef, activePeriod.id);

  const periodGuard = new DefaultPeriodGuard(fiscalPeriodRepository);

  const closedStart = BusinessDate.parse(closedPeriod.range.startDate.toIsoString());
  const closedDate = closedStart.addDays(14);
  const closedInstant = new Date(closedDate.toUtcStartOfDayMillis() + 12 * 3600_000);

  const openStart = BusinessDate.parse(openPeriod.range.startDate.toIsoString());
  const openDate = openStart.addDays(14);
  const openInstant = new Date(openDate.toUtcStartOfDayMillis() + 12 * 3600_000);

  const outsideYearDate = yearBounds.start.addDays(-365);
  const outsideYearInstant = new Date(outsideYearDate.toUtcStartOfDayMillis() + 12 * 3600_000);

  const dates: FiscalScenarioDates = {
    closedDate,
    closedInstant,
    openDate,
    openInstant,
    outsideYearDate,
    outsideYearInstant,
    yearStart: yearBounds.start,
    yearEnd: yearBounds.end,
  };

  return {
    tenantId,
    tenantRef,
    fiscalYear,
    periods,
    closedPeriod,
    openPeriod,
    activePeriod,
    fiscalYearRepository,
    fiscalPeriodRepository,
    activePeriodRepository,
    periodGuard,
    dates,
  };
}

/**
 * Seeds a real persistence store (e.g. Drizzle / MySQL repositories) with the
 * company fiscal scenario (fiscal year, 1 closed period, 1 active open period).
 */
export async function seedFiscalCompanyIntoAdapters(
  adapters: {
    readonly fiscalYears: FiscalYearRepository;
    readonly periods: FiscalPeriodRepository;
    readonly activePeriods: ActivePeriodRepository;
  },
  options: FiscalCompanyFixtureOptions = {},
): Promise<{
  readonly tenantId: string;
  readonly fiscalYear: FiscalYear;
  readonly periods: readonly FiscalPeriod[];
  readonly closedPeriod: FiscalPeriod;
  readonly openPeriod: FiscalPeriod;
  readonly activePeriod: FiscalPeriod;
  readonly dates: FiscalScenarioDates;
}> {
  const fixture = createFiscalCompanyFixture(options);

  await adapters.fiscalYears.add(fixture.fiscalYear);
  for (const period of fixture.periods) {
    await adapters.periods.add(period);
  }
  await adapters.activePeriods.activate(fixture.tenantRef, fixture.activePeriod.id);

  return {
    tenantId: fixture.tenantId,
    fiscalYear: fixture.fiscalYear,
    periods: fixture.periods,
    closedPeriod: fixture.closedPeriod,
    openPeriod: fixture.openPeriod,
    activePeriod: fixture.activePeriod,
    dates: fixture.dates,
  };
}
