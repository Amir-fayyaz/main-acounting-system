import { describe, expect, it } from 'vitest';
import {
  aFiscalPeriod,
  InMemoryFiscalPeriodRepository,
} from '../../../../../test/support/fiscal-period-doubles.js';
import { aFiscalYear } from '../../../../../test/support/accounting-doubles.js';
import { tenantReferenceFrom } from '../../domain/value-objects/tenant-reference.js';
import { DefaultPeriodGuard } from './default-period-guard.service.js';
import { BusinessDate } from '../../../../shared/time/business-date.js';
import { ErrorCategory } from '../../../../shared/errors/error-category.js';
import {
  PeriodClosedError,
  PeriodNotDefinedError,
} from '../../domain/errors/fiscal-period.errors.js';

const TENANT_A = '018f0d3c-6d0f-7a4b-9d4e-2b3c4d5e6f70';
const TENANT_B = '018f0d3d-6d0f-7a4b-9d4e-2b3c4d5e6f71';

describe('PeriodGuard.assertPostable (FIS-006)', () => {
  function harness() {
    const periods = new InMemoryFiscalPeriodRepository();
    const guard = new DefaultPeriodGuard(periods);
    return { periods, guard };
  }

  it('returns PostablePeriod for a date inside an open period', async () => {
    const { periods, guard } = harness();
    const year = aFiscalYear(tenantReferenceFrom(TENANT_A), 'FY1405');
    const period = aFiscalPeriod({
      tenantId: tenantReferenceFrom(TENANT_A),
      fiscalYearId: year.id,
      jalaliYear: 1405,
      sequence: 1,
      startDate: '2026-03-21',
      endDate: '2026-04-19',
      state: 'open',
    });
    periods.seed(period);

    const res = await guard.assertPostable(TENANT_A, BusinessDate.parse('2026-04-05'));

    expect(res.id).toBe(period.id.value);
    expect(res.fiscalYearId).toBe(year.id.value);
    expect(res.sequence).toBe(1);
    expect(res.startDate).toBe('2026-03-21');
    expect(res.endDate).toBe('2026-04-19');
  });

  it('returns PostablePeriod on exact boundary dates (first and last day)', async () => {
    const { periods, guard } = harness();
    const year = aFiscalYear(tenantReferenceFrom(TENANT_A), 'FY1405');
    const period = aFiscalPeriod({
      tenantId: tenantReferenceFrom(TENANT_A),
      fiscalYearId: year.id,
      jalaliYear: 1405,
      sequence: 2,
      startDate: '2026-04-20',
      endDate: '2026-05-20',
      state: 'open',
    });
    periods.seed(period);

    const startRes = await guard.assertPostable(TENANT_A, BusinessDate.parse('2026-04-20'));
    expect(startRes.id).toBe(period.id.value);

    const endRes = await guard.assertPostable(TENANT_A, BusinessDate.parse('2026-05-20'));
    expect(endRes.id).toBe(period.id.value);
  });

  it('accepts a standard JavaScript Date instance', async () => {
    const { periods, guard } = harness();
    const year = aFiscalYear(tenantReferenceFrom(TENANT_A), 'FY1405');
    const period = aFiscalPeriod({
      tenantId: tenantReferenceFrom(TENANT_A),
      fiscalYearId: year.id,
      jalaliYear: 1405,
      sequence: 1,
      startDate: '2026-03-21',
      endDate: '2026-04-19',
      state: 'open',
    });
    periods.seed(period);

    const jsDate = new Date('2026-04-01T10:00:00.000Z');
    const res = await guard.assertPostable(TENANT_A, jsDate);

    expect(res.id).toBe(period.id.value);
  });

  describe('boundary instants around the Asia/Tehran offset (FIS-BR-09; DEC-04)', () => {
    function seedAdjacentPeriods() {
      const { periods, guard } = harness();
      const year = aFiscalYear(tenantReferenceFrom(TENANT_A), 'FY1405');
      const first = aFiscalPeriod({
        tenantId: tenantReferenceFrom(TENANT_A),
        fiscalYearId: year.id,
        jalaliYear: 1405,
        sequence: 1,
        startDate: '2026-03-21',
        endDate: '2026-04-20',
        state: 'open',
      });
      const second = aFiscalPeriod({
        tenantId: tenantReferenceFrom(TENANT_A),
        fiscalYearId: year.id,
        jalaliYear: 1405,
        sequence: 2,
        startDate: '2026-04-21',
        endDate: '2026-05-21',
        state: 'open',
      });
      periods.seed(first);
      periods.seed(second);
      return { guard, first, second };
    }

    it('assigns the last Tehran instant of a period to that period', async () => {
      const { guard, first } = seedAdjacentPeriods();

      // 2026-04-20T23:59:59.999+03:30, i.e. the last instant of period 1.
      const lastInstantOfFirst = new Date('2026-04-20T20:29:59.999Z');
      const res = await guard.assertPostable(TENANT_A, lastInstantOfFirst);

      expect(res.id).toBe(first.id.value);
      expect(res.sequence).toBe(1);
    });

    it('assigns the first Tehran instant of the next day to the next period', async () => {
      const { guard, second } = seedAdjacentPeriods();

      // 2026-04-21T00:00:00.000+03:30, the same instant as 20:30Z the day before.
      const firstInstantOfSecond = new Date('2026-04-20T20:30:00.000Z');
      const res = await guard.assertPostable(TENANT_A, firstInstantOfSecond);

      expect(res.id).toBe(second.id.value);
      expect(res.sequence).toBe(2);
    });

    it('refuses a Tehran instant before the first period begins', async () => {
      const { guard } = seedAdjacentPeriods();

      // 2026-03-21T00:00:00.000+03:30 is the first instant of the year; one
      // millisecond earlier is still 1404 and no period covers it.
      const justBeforeTheYear = new Date('2026-03-20T20:29:59.999Z');

      await expect(guard.assertPostable(TENANT_A, justBeforeTheYear)).rejects.toMatchObject({
        code: 'PERIOD_NOT_DEFINED',
        category: ErrorCategory.BUSINESS_RULE,
      });
    });

    it('starts the first period exactly at the Tehran midnight of its first day', async () => {
      const { guard, first } = seedAdjacentPeriods();

      // 2026-03-21T00:00:00.000+03:30 = 2026-03-20T20:30:00.000Z.
      const firstInstantOfYear = new Date('2026-03-20T20:30:00.000Z');
      const res = await guard.assertPostable(TENANT_A, firstInstantOfYear);

      expect(res.id).toBe(first.id.value);
    });
  });

  it('refuses with PERIOD_CLOSED when date is inside a closed period', async () => {
    const { periods, guard } = harness();
    const year = aFiscalYear(tenantReferenceFrom(TENANT_A), 'FY1405');
    const closedPeriod = aFiscalPeriod({
      tenantId: tenantReferenceFrom(TENANT_A),
      fiscalYearId: year.id,
      jalaliYear: 1405,
      sequence: 1,
      startDate: '2026-03-21',
      endDate: '2026-04-19',
      state: 'closed',
    });
    periods.seed(closedPeriod);

    await expect(guard.assertPostable(TENANT_A, BusinessDate.parse('2026-04-01'))).rejects.toThrow(
      PeriodClosedError,
    );
    await expect(
      guard.assertPostable(TENANT_A, BusinessDate.parse('2026-04-01')),
    ).rejects.toMatchObject({
      code: 'PERIOD_CLOSED',
      category: ErrorCategory.BUSINESS_RULE,
    });
  });

  it('refuses with PERIOD_NOT_DEFINED when date is outside every fiscal year/period', async () => {
    const { periods, guard } = harness();
    const year = aFiscalYear(tenantReferenceFrom(TENANT_A), 'FY1405');
    const period = aFiscalPeriod({
      tenantId: tenantReferenceFrom(TENANT_A),
      fiscalYearId: year.id,
      jalaliYear: 1405,
      sequence: 1,
      startDate: '2026-03-21',
      endDate: '2026-04-19',
      state: 'open',
    });
    periods.seed(period);

    await expect(guard.assertPostable(TENANT_A, BusinessDate.parse('2025-01-01'))).rejects.toThrow(
      PeriodNotDefinedError,
    );
    await expect(
      guard.assertPostable(TENANT_A, BusinessDate.parse('2025-01-01')),
    ).rejects.toMatchObject({
      code: 'PERIOD_NOT_DEFINED',
      category: ErrorCategory.BUSINESS_RULE,
    });
  });

  it('maintains tenant isolation: tenant A date is never resolved against tenant B period', async () => {
    const { periods, guard } = harness();
    const yearB = aFiscalYear(tenantReferenceFrom(TENANT_B), 'FY1405');
    const periodB = aFiscalPeriod({
      tenantId: tenantReferenceFrom(TENANT_B),
      fiscalYearId: yearB.id,
      jalaliYear: 1405,
      sequence: 1,
      startDate: '2026-03-21',
      endDate: '2026-04-19',
      state: 'open',
    });
    periods.seed(periodB);

    await expect(guard.assertPostable(TENANT_A, BusinessDate.parse('2026-04-01'))).rejects.toThrow(
      PeriodNotDefinedError,
    );
  });
});
